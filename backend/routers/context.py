import asyncio

from fastapi import APIRouter
from pydantic import BaseModel

from services.context_manager import load_context, save_context

router = APIRouter(prefix="/api/context", tags=["context"])


class ContextUpdate(BaseModel):
    user_id: str = "default"
    user_profile: str


@router.get("")
async def get_context(user_id: str = "default"):
    """Retrieve the stored context profile for a user."""
    return await asyncio.to_thread(load_context, user_id)


@router.post("")
async def update_context(body: ContextUpdate):
    """Persist the user's 'Who am I' profile to disk."""
    return await asyncio.to_thread(save_context, body.user_id, body.user_profile)
