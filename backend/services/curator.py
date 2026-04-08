import asyncio
import math
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.memory import Memory
from services import vector_store, embeddings, llm
from services.broadcaster import manager


async def run_curation(user_id: str, db: AsyncSession):
    await _decay_and_delete(user_id, db)
    await _merge_similar(user_id, db)


async def _decay_and_delete(user_id: str, db: AsyncSession):
    stmt = select(Memory).where(Memory.user_id == user_id)
    result = await db.execute(stmt)
    memories = result.scalars().all()

    now = datetime.now(timezone.utc)
    to_delete = []

    for mem in memories:
        if mem.is_pinned:
            mem.decay_score = 1.0
            continue

        days = (now - mem.last_accessed_at).total_seconds() / 86400.0
        mem.decay_score = math.exp(-mem.lambda_rate * days)

        threshold = (
            settings.deletion_threshold_unimportant
            if mem.is_flagged_unimportant
            else settings.deletion_threshold
        )

        if mem.decay_score < threshold:
            to_delete.append(mem)

    for mem in to_delete:
        vector_store.delete_memory(mem.id)
        await db.delete(mem)
        await manager.broadcast("memory_deleted", {"id": mem.id})

    await db.commit()


async def _merge_similar(user_id: str, db: AsyncSession):
    stmt = select(Memory).where(Memory.user_id == user_id, Memory.is_pinned == False)
    result = await db.execute(stmt)
    memories = list(result.scalars().all())

    if len(memories) < 2:
        return

    texts = [m.content for m in memories]
    all_embeddings = await asyncio.to_thread(embeddings.embed_texts, texts)

    clusters: list[list[int]] = []
    used = set()

    for i in range(len(memories)):
        if i in used:
            continue
        cluster = [i]
        used.add(i)
        for j in range(i + 1, len(memories)):
            if j in used:
                continue
            sim = embeddings.cosine_similarity(all_embeddings[i], all_embeddings[j])
            if sim >= settings.merge_threshold:
                cluster.append(j)
                used.add(j)
        if len(cluster) >= 2:
            clusters.append(cluster)

    for cluster_indices in clusters:
        cluster_memories = [memories[i] for i in cluster_indices]
        cluster_texts = [m.content for m in cluster_memories]

        merged_text = await llm.summarize_memories(cluster_texts)
        best_importance = max(m.importance for m in cluster_memories)
        newest_ts = max(m.last_accessed_at for m in cluster_memories)

        keeper = cluster_memories[0]
        keeper.content = merged_text
        keeper.importance = best_importance
        keeper.last_accessed_at = newest_ts
        keeper.updated_at = datetime.now(timezone.utc)

        new_embedding = await asyncio.to_thread(embeddings.embed_text, merged_text)
        vector_store.update_memory(
            keeper.id, new_embedding, merged_text,
            {"user_id": user_id, "importance": best_importance, "created_at": keeper.created_at.isoformat()},
        )

        for mem in cluster_memories[1:]:
            vector_store.delete_memory(mem.id)
            await db.delete(mem)
            await manager.broadcast("memory_deleted", {"id": mem.id})

        await manager.broadcast("memory_updated", keeper.to_dict())

    await db.commit()
