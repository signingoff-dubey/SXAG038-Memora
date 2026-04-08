import asyncio
import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.memory import Memory
from schemas.memory import MemoryResponse, MemoryUpdate
from services import embeddings, vector_store
from services.broadcaster import manager

router = APIRouter(prefix="/api/memories", tags=["memories"])


@router.get("", response_model=list[MemoryResponse])
async def list_memories(user_id: str = "default", db: AsyncSession = Depends(get_db)):
    stmt = select(Memory).where(Memory.user_id == user_id).order_by(Memory.created_at.desc())
    result = await db.execute(stmt)
    memories = result.scalars().all()

    now = datetime.now(timezone.utc)
    for mem in memories:
        if mem.is_pinned:
            mem.decay_score = 1.0
        else:
            days = (now - mem.last_accessed_at).total_seconds() / 86400.0
            mem.decay_score = math.exp(-mem.lambda_rate * days)
    await db.commit()

    return memories


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(memory_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Memory).where(Memory.id == memory_id)
    result = await db.execute(stmt)
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


@router.patch("/{memory_id}", response_model=MemoryResponse)
async def update_memory(memory_id: str, update: MemoryUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Memory).where(Memory.id == memory_id)
    result = await db.execute(stmt)
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    if update.is_pinned is not None:
        memory.is_pinned = update.is_pinned
        if update.is_pinned:
            memory.decay_score = 1.0
            memory.is_flagged_unimportant = False

    if update.is_flagged_unimportant is not None:
        memory.is_flagged_unimportant = update.is_flagged_unimportant
        if update.is_flagged_unimportant:
            memory.is_pinned = False

    if update.content is not None and update.content != memory.content:
        memory.content = update.content
        memory.updated_at = datetime.now(timezone.utc)
        new_embedding = await asyncio.to_thread(embeddings.embed_text, update.content)
        vector_store.update_memory(
            memory.id, new_embedding, update.content,
            {"user_id": memory.user_id, "importance": memory.importance, "created_at": memory.created_at.isoformat()},
        )

    await db.commit()
    await db.refresh(memory)
    await manager.broadcast("memory_updated", memory.to_dict())
    return memory


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Memory).where(Memory.id == memory_id)
    result = await db.execute(stmt)
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    vector_store.delete_memory(memory.id)
    await db.delete(memory)
    await db.commit()
    await manager.broadcast("memory_deleted", {"id": memory_id})
    return {"status": "deleted"}
