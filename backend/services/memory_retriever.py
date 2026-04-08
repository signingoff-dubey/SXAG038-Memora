import asyncio
import math
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.memory import Memory
from services import embeddings, vector_store


async def retrieve_memories(query: str, user_id: str, db: AsyncSession) -> list[dict]:
    embedding = await asyncio.to_thread(embeddings.embed_text, query)

    results = vector_store.query_similar(
        embedding,
        n_results=settings.retrieval_candidates,
        where={"user_id": user_id},
    )

    if not results["ids"] or not results["ids"][0]:
        return []

    memory_ids = results["ids"][0]
    distances = results["distances"][0]

    stmt = select(Memory).where(Memory.id.in_(memory_ids))
    result = await db.execute(stmt)
    db_memories = {m.id: m for m in result.scalars().all()}

    now = datetime.now(timezone.utc)
    scored = []

    for i, mem_id in enumerate(memory_ids):
        mem = db_memories.get(mem_id)
        if not mem:
            continue

        cosine_sim = 1 - distances[i]

        days_since = (now - mem.last_accessed_at).total_seconds() / 86400.0
        recency = math.exp(-0.1 * days_since)

        importance_norm = mem.importance / 10.0

        base_score = (
            settings.weight_cosine * cosine_sim
            + settings.weight_recency * recency
            + settings.weight_importance * importance_norm
        )

        if mem.is_pinned:
            decay = 1.0
        else:
            decay = math.exp(-mem.lambda_rate * days_since)

        final_score = base_score * decay

        scored.append({
            "memory": mem,
            "score": final_score,
            "cosine_sim": cosine_sim,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[: settings.context_memories]

    for item in top:
        mem = item["memory"]
        mem.access_count += 1
        mem.last_accessed_at = now
        days_since = (now - mem.created_at).total_seconds() / 86400.0
        if not mem.is_pinned:
            mem.decay_score = math.exp(-mem.lambda_rate * days_since)
        else:
            mem.decay_score = 1.0

    await db.commit()

    return [
        {
            "id": item["memory"].id,
            "content": item["memory"].content,
            "importance": item["memory"].importance,
            "score": item["score"],
            "is_pinned": item["memory"].is_pinned,
            "contradiction_with": item["memory"].contradiction_with or [],
        }
        for item in top
    ]
