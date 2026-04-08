import asyncio
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import async_session
from models.memory import Memory
from services import embeddings, vector_store, llm
from services.broadcaster import manager
from services.contradiction import check_contradictions
from services.llm import summarize_memories

# Session-only memories decay 10× faster than normal memories
SESSION_ONLY_LAMBDA = settings.decay_lambda * 10.0


async def write_pipeline(
    user_message: str,
    assistant_response: str,
    session_id: str,
    user_id: str,
    db: AsyncSession | None = None,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
):
    # Create a new session if none provided (for background tasks)
    if db is None:
        async with async_session() as new_session:
            await _write_pipeline_internal(
                user_message,
                assistant_response,
                session_id,
                user_id,
                new_session,
                model,
                custom_base_url,
                custom_api_key,
            )
    else:
        await _write_pipeline_internal(
            user_message,
            assistant_response,
            session_id,
            user_id,
            db,
            model,
            custom_base_url,
            custom_api_key,
        )


async def _write_pipeline_internal(
    user_message: str,
    assistant_response: str,
    session_id: str,
    user_id: str,
    db: AsyncSession,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
):
    # Single LLM call that returns content + importance + is_session_only
    items = await llm.classify_and_score_memories(
        user_message,
        assistant_response,
        model=model,
        custom_base_url=custom_base_url,
        custom_api_key=custom_api_key,
    )
    if not items:
        return

    for item in items:
        await _store_single_memory(
            item["content"],
            item["importance"],
            item["is_session_only"],
            session_id,
            user_id,
            db,
        )


async def _store_single_memory(
    content: str,
    importance: float,
    is_session_only: bool,
    session_id: str,
    user_id: str,
    db: AsyncSession,
):
    embedding = await asyncio.to_thread(embeddings.embed_text, content)

    results = vector_store.query_similar(
        embedding, n_results=5, where={"user_id": user_id}
    )
    if results["distances"] and results["distances"][0]:
        for i, dist in enumerate(results["distances"][0]):
            sim = 1 - dist
            if sim >= settings.dedup_threshold:
                return
            if sim >= settings.merge_threshold and sim < settings.dedup_threshold:
                existing_id = results["ids"][0][i]
                related_text = results["documents"][0][i]
                merged = await summarize_memories([related_text, content])
                memory = await db.get(Memory, existing_id)
                if memory:
                    memory.content = merged
                    memory.importance = max(memory.importance, importance)
                    memory.decay_score = 1.0
                    await db.commit()
                    new_embedding = await asyncio.to_thread(
                        embeddings.embed_text, merged
                    )
                    vector_store.update_memory(
                        existing_id,
                        new_embedding,
                        merged,
                        {
                            "user_id": user_id,
                            "importance": memory.importance,
                            "created_at": memory.created_at.isoformat()
                            if memory.created_at
                            else "",
                            "is_session_only": str(memory.is_session_only),
                            "session_id": memory.session_id or "",
                        },
                    )
                    await manager.broadcast("memory_updated", memory.to_dict())
                    return

    lambda_rate = SESSION_ONLY_LAMBDA if is_session_only else settings.decay_lambda

    memory = Memory(
        user_id=user_id,
        session_id=session_id,
        content=content,
        importance=importance,
        decay_score=1.0,
        lambda_rate=lambda_rate,
        is_session_only=is_session_only,
    )
    db.add(memory)
    await db.commit()
    await db.refresh(memory)

    vector_store.add_memory(
        memory_id=memory.id,
        embedding=embedding,
        content=content,
        metadata={
            "user_id": user_id,
            "importance": importance,
            "created_at": memory.created_at.isoformat() if memory.created_at else "",
            "is_session_only": str(is_session_only),
            "session_id": session_id or "",
        },
    )

    await manager.broadcast("memory_created", memory.to_dict())

    # Only run contradiction check for cross-session memories (worth the LLM cost)
    if not is_session_only:
        asyncio.create_task(check_contradictions(memory.id, embedding, user_id, db))
