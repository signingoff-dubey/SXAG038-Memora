import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import async_session
from models.memory import Memory
from services import vector_store
from services.broadcaster import manager

logger = logging.getLogger(__name__)
_nli_model = None


def get_nli_model():
    global _nli_model
    if _nli_model is None:
        from sentence_transformers import CrossEncoder

        _nli_model = CrossEncoder(settings.nli_model)
    return _nli_model


def nli_predict(text_a: str, text_b: str) -> dict:
    model = get_nli_model()
    scores = model.predict([(text_a, text_b)])
    labels = ["contradiction", "entailment", "neutral"]
    score_list = scores[0].tolist() if hasattr(scores[0], "tolist") else list(scores[0])
    best_idx = score_list.index(max(score_list))
    return {
        "label": labels[best_idx],
        "scores": dict(zip(labels, score_list)),
    }


async def check_contradictions(
    memory_id: str, embedding: list[float], user_id: str, db: AsyncSession | None = None
):
    # Create a new session if none provided (for background tasks)
    if db is None:
        async with async_session() as new_session:
            await _check_contradictions_internal(
                memory_id, embedding, user_id, new_session
            )
    else:
        await _check_contradictions_internal(memory_id, embedding, user_id, db)


async def _check_contradictions_internal(
    memory_id: str, embedding: list[float], user_id: str, db: AsyncSession
):
    try:
        results = vector_store.query_similar(
            embedding,
            n_results=10,
            where={"user_id": user_id},
        )

        if not results["ids"] or not results["ids"][0]:
            return

        candidate_ids = results["ids"][0]
        distances = results["distances"][0]

        stmt = select(Memory).where(Memory.id.in_(candidate_ids))
        result = await db.execute(stmt)
        db_memories = {m.id: m for m in result.scalars().all()}

        new_memory = db_memories.get(memory_id)
        if not new_memory:
            return

        for i, cand_id in enumerate(candidate_ids):
            if cand_id == memory_id:
                continue

            similarity = 1 - distances[i]
            if similarity < settings.contradiction_threshold:
                continue

            cand_memory = db_memories.get(cand_id)
            if not cand_memory:
                continue

            nli_result = await asyncio.to_thread(
                nli_predict, new_memory.content, cand_memory.content
            )

            if nli_result["label"] == "contradiction":
                existing_new = new_memory.contradiction_with or []
                existing_cand = cand_memory.contradiction_with or []

                if cand_id not in existing_new:
                    new_memory.contradiction_with = existing_new + [cand_id]
                if memory_id not in existing_cand:
                    cand_memory.contradiction_with = existing_cand + [memory_id]

                await db.commit()

                await manager.broadcast(
                    "contradiction_detected",
                    {
                        "memory_a": new_memory.to_dict(),
                        "memory_b": cand_memory.to_dict(),
                        "nli_scores": nli_result["scores"],
                    },
                )
    except Exception as e:
        logger.error(f"Contradiction check failed: {e}")
