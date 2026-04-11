"""
Cortex RAG Pipeline
===================
Retrieval-Augmented Generation pipeline wired to Cortex's live memory store.

Responsibilities:
  1. Embed user query with the same all-MiniLM-L6-v2 model used by the backend.
  2. Retrieve the top-K most relevant memories from the shared ChromaDB collection.
  3. Build a context-enriched prompt and generate a response via Ollama.
  4. Run a verification pass — detect whether the response contradicts any
     retrieved memory and self-correct if needed.
  5. Index new extracted facts back into ChromaDB in real-time (write pipeline
     already handles this; this class exposes an explicit add_memory() helper).

All retrieval/generation goes through the backend's own service modules so
there is ONE source of truth for embeddings, ChromaDB, and LLM calls.
"""

import asyncio
import logging
import sys
import os
from dataclasses import dataclass, field
from typing import Optional

# Allow imports from the sibling `backend/` directory
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

logger = logging.getLogger(__name__)


@dataclass
class CortexRAGQuery:
    """Input to the Cortex RAG pipeline."""
    question: str
    user_id: str = "default"
    session_id: Optional[str] = None
    top_k: int = 5
    run_verification: bool = True   # set False for speed-critical paths


@dataclass
class CortexRAGResponse:
    """Output from the Cortex RAG pipeline."""
    answer: str
    sources: list[dict] = field(default_factory=list)
    verified: bool = False          # True  → passed or corrected by verifier
    correction_applied: bool = False  # True  → verifier rewrote the answer
    session_id: str = ""
    metadata: dict = field(default_factory=dict)


class CortexRAGPipeline:
    """
    RAG pipeline backed by Cortex's existing services.

    Uses:
      - backend.services.embeddings  → all-MiniLM-L6-v2
      - backend.services.vector_store → ChromaDB (cortex_memories collection)
      - backend.services.llm          → Ollama / OpenAI-compatible
    """

    SYSTEM_PROMPT = (
        "You are Cortex, a highly context-aware AI assistant with persistent memory.\n"
        "You always refer to what you know about the user before answering.\n"
        "Be concise, warm, and personally relevant.\n"
    )

    def __init__(
        self,
        model: Optional[str] = None,
        custom_base_url: Optional[str] = None,
        custom_api_key: Optional[str] = None,
    ):
        # Import backend services lazily so this module can be imported without
        # the backend being on PYTHONPATH at import-time.
        from backend.services import embeddings as _emb
        from backend.services import vector_store as _vs
        from backend.services import llm as _llm
        from backend.config import settings

        self._emb = _emb
        self._vs = _vs
        self._llm = _llm
        self._settings = settings

        self.model = model or settings.ollama_model
        self.custom_base_url = custom_base_url
        self.custom_api_key = custom_api_key

    # ── Public API ────────────────────────────────────────────────────────────

    async def query(self, rag_query: CortexRAGQuery) -> CortexRAGResponse:
        """Full RAG pipeline: retrieve → generate → verify."""
        import uuid
        session_id = rag_query.session_id or str(uuid.uuid4())

        # 1. Embed query
        query_embedding = await asyncio.to_thread(
            self._emb.embed_text, rag_query.question
        )

        # 2. Retrieve memories from ChromaDB
        results = self._vs.query_similar(
            query_embedding,
            n_results=rag_query.top_k,
            where={"user_id": rag_query.user_id},
        )

        memory_texts: list[str] = []
        sources: list[dict] = []
        if results.get("ids") and results["ids"][0]:
            docs = results.get("documents", [[]])[0]
            meta = results.get("metadatas", [[]])[0]
            dists = results.get("distances", [[]])[0]
            for doc, m, d in zip(docs, meta, dists):
                if doc:
                    memory_texts.append(doc)
                    sources.append({
                        "content": doc[:120] + ("…" if len(doc) > 120 else ""),
                        "score": round(1 - d, 3),
                        "metadata": m,
                    })

        # 3. Build prompt
        messages = self._build_messages(rag_query.question, memory_texts)

        # 4. Generate response
        answer = await self._llm.chat_completion(
            messages,
            model=self.model,
            custom_base_url=self.custom_base_url,
            custom_api_key=self.custom_api_key,
        )

        # 5. Verification pass (optional)
        correction_applied = False
        verified = False
        if rag_query.run_verification and memory_texts:
            corrected = await self._llm.verify_response_against_memories(
                answer,
                memory_texts,
                model=self.model,
                custom_base_url=self.custom_base_url,
                custom_api_key=self.custom_api_key,
            )
            verified = True
            if corrected != answer:
                answer = corrected
                correction_applied = True
                logger.info("RAG verifier rewrote the response.")

        return CortexRAGResponse(
            answer=answer,
            sources=sources,
            verified=verified,
            correction_applied=correction_applied,
            session_id=session_id,
            metadata={
                "memories_retrieved": len(memory_texts),
                "model": self.model,
            },
        )

    async def add_memory(self, content: str, user_id: str, memory_id: str,
                         importance: float = 5.0, created_at: str = "") -> None:
        """
        Index a fact into ChromaDB in real-time.
        (Normally called by memory_writer.py automatically after each chat turn.)
        Exposed here so external scripts can push facts directly.
        """
        embedding = await asyncio.to_thread(self._emb.embed_text, content)
        self._vs.add_memory(
            memory_id=memory_id,
            embedding=embedding,
            content=content,
            metadata={
                "user_id": user_id,
                "importance": importance,
                "created_at": created_at,
            },
        )
        logger.info(f"RAG: indexed memory {memory_id} for user {user_id}")

    def get_stats(self) -> dict:
        """Return basic stats about the vector store."""
        try:
            col = self._vs._collection  # type: ignore[attr-defined]
            count = col.count() if col else 0
        except Exception:
            count = -1
        return {
            "vector_store_documents": count,
            "model": self.model,
            "embedding_model": self._settings.embedding_model,
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _build_messages(self, question: str, memory_texts: list[str]) -> list[dict]:
        system = self.SYSTEM_PROMPT
        if memory_texts:
            mem_block = "\n".join(f"  - {m}" for m in memory_texts)
            system += (
                "\n## What you remember about this user\n"
                f"{mem_block}\n\n"
                "Draw on these memories naturally. Do not list them verbatim.\n"
            )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ]


# ── Convenience factory ───────────────────────────────────────────────────────

_pipeline: Optional[CortexRAGPipeline] = None


def get_rag_pipeline(
    model: Optional[str] = None,
    custom_base_url: Optional[str] = None,
    custom_api_key: Optional[str] = None,
) -> CortexRAGPipeline:
    """Return a (cached) CortexRAGPipeline instance."""
    global _pipeline
    if _pipeline is None or model or custom_base_url:
        _pipeline = CortexRAGPipeline(model, custom_base_url, custom_api_key)
    return _pipeline
