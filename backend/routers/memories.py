import asyncio
import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.memory import Memory
from schemas.memory import MemoryResponse, MemoryUpdate
from services import embeddings, vector_store
from services.broadcaster import manager

router = APIRouter(prefix="/api/memories", tags=["memories"])


def _utcnow() -> datetime:
    return datetime.utcnow()


@router.get("", response_model=list[MemoryResponse])
async def list_memories(
    user_id: str = "default",
    session_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all memories for a user.
    If session_id is provided, include:
    1. Global memories (is_session_only = False)
    2. Session-only memories matching the provided session_id.
    """
    stmt = select(Memory).where(Memory.user_id == user_id)

    if session_id:
        # Filter: (global) OR (session_match)
        stmt = stmt.where(
            or_(Memory.is_session_only == False, Memory.session_id == session_id)
        )
    else:
        # If no session_id is provided, only return global memories
        stmt = stmt.where(Memory.is_session_only == False)

    stmt = stmt.order_by(Memory.is_session_only.asc(), Memory.created_at.desc())
    result = await db.execute(stmt)
    memories = result.scalars().all()

    now = _utcnow()
    for mem in memories:
        if mem.is_pinned:
            mem.decay_score = 1.0
        else:
            last = mem.last_accessed_at or now
            days = (now - last).total_seconds() / 86400.0
            mem.decay_score = math.exp(-mem.lambda_rate * days)
    await db.commit()

    return memories


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    memory_id: str, user_id: str = "default", db: AsyncSession = Depends(get_db)
):
    stmt = select(Memory).where(Memory.id == memory_id, Memory.user_id == user_id)
    result = await db.execute(stmt)
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


@router.patch("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: str,
    update: MemoryUpdate,
    user_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Memory).where(Memory.id == memory_id, Memory.user_id == user_id)
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

    if update.importance is not None:
        memory.importance = max(1.0, min(10.0, update.importance))

    if update.is_session_only is not None:
        memory.is_session_only = update.is_session_only

    content_changed = update.content is not None and update.content != memory.content
    if content_changed:
        memory.content = update.content
        memory.updated_at = _utcnow()

    await db.commit()
    await db.refresh(memory)

    # Always keep ChromaDB in sync — include every field used in retrieval filters
    current_metadata = {
        "user_id": memory.user_id,
        "importance": memory.importance,
        "created_at": memory.created_at.isoformat() if memory.created_at else "",
        "is_session_only": str(memory.is_session_only),
        "session_id": memory.session_id or "",
    }

    if content_changed:
        new_embedding = await asyncio.to_thread(embeddings.embed_text, memory.content)
        vector_store.update_memory(memory.id, new_embedding, memory.content, current_metadata)
    else:
        vector_store.update_memory_metadata(memory.id, current_metadata)

    await manager.broadcast("memory_updated", memory.to_dict())
    return memory


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str, user_id: str = "default", db: AsyncSession = Depends(get_db)
):
    stmt = select(Memory).where(Memory.id == memory_id, Memory.user_id == user_id)
    result = await db.execute(stmt)
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    vector_store.delete_memory(memory.id)
    await db.delete(memory)
    await db.commit()
    await manager.broadcast("memory_deleted", {"id": memory_id})
    return {"status": "deleted"}
