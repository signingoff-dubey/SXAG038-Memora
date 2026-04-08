import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.memory import Memory
from services import embeddings, vector_store, llm
from services.broadcaster import manager
from services.contradiction import check_contradictions


async def write_pipeline(user_message: str, assistant_response: str, session_id: str, user_id: str, db: AsyncSession):
    facts = await llm.classify_worth_remembering(user_message, assistant_response)
    if not facts:
        return

    for fact in facts:
        await _store_single_memory(fact, session_id, user_id, db)


async def _store_single_memory(content: str, session_id: str, user_id: str, db: AsyncSession):
    embedding = await asyncio.to_thread(embeddings.embed_text, content)

    results = vector_store.query_similar(
        embedding, n_results=5, where={"user_id": user_id}
    )

    if results["distances"] and results["distances"][0]:
        for dist in results["distances"][0]:
            similarity = 1 - dist
            if similarity >= settings.dedup_threshold:
                return

    importance = await llm.score_importance(content)

    memory = Memory(
        user_id=user_id,
        session_id=session_id,
        content=content,
        importance=importance,
        decay_score=1.0,
        lambda_rate=settings.decay_lambda,
    )
    db.add(memory)
    await db.commit()
    await db.refresh(memory)

    vector_store.add_memory(
        memory_id=memory.id,
        embedding=embedding,
        content=content,
        metadata={"user_id": user_id, "importance": importance, "created_at": memory.created_at.isoformat()},
    )

    await manager.broadcast("memory_created", memory.to_dict())

    asyncio.create_task(check_contradictions(memory.id, embedding, user_id, db))
