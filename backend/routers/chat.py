import asyncio
import uuid
import re

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings
from database import get_db
from schemas.chat import ChatRequest, ChatResponse
from services.memory_retriever import retrieve_memories
from services.memory_writer import write_pipeline
from services.context_manager import load_context
from services import llm

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api", tags=["chat"])

INSTRUCTION_PROMPT = "You are Memora, a highly context-aware AI assistant with persistent memory.\nYou always consider everything you know about the user before responding.\n"

FORBIDDEN_PATTERNS = [
    r"ignore\s+(previous|all|prior)\s+(instructions?|rules?|prompt)",
    r"disregard\s+(previous|all|prior)",
    r"forget\s+(everything|all|any)\s+(instructions?|rules?)",
    r"new\s+instructions?:",
    r"system\s*prompt\s*:",
    r"<\s*system\s*>",
    r"#{1,5}\s*system",
    r"\\[system\\]",
    r"you\s+are\s+(now\s+)?(a\s+)?(different|new|custom)",
]


def _sanitize_input(text: str) -> str:
    text = text.strip()
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    return text


def _check_injection(text: str) -> bool:
    lower = text.lower()
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, lower):
            return True
    return False


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    chat_request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user_message = _sanitize_input(chat_request.message)
    if _check_injection(user_message):
        user_message = "[Input was filtered for safety]"

    session_id = chat_request.session_id or str(uuid.uuid4())
    model = chat_request.model or settings.ollama_model

    memories = await retrieve_memories(user_message, chat_request.user_id, db)

    memory_context = ""
    memory_ids = []
    if memories:
        memory_lines = []
        for m in memories:
            line = f"- {m['content']} (importance: {m['importance']:.1f})"
            if m["contradiction_with"]:
                line += " [HAS CONFLICT]"
            memory_lines.append(line)
            memory_ids.append(m["id"])
        memory_context = "\n".join(memory_lines)

    user_ctx = await asyncio.to_thread(load_context, chat_request.user_id)
    user_profile = user_ctx.get("user_profile", "").strip()

    system_prompt = INSTRUCTION_PROMPT

    if user_profile:
        safe_profile = _sanitize_input(user_profile)
        system_prompt += f"\n## About the user\n{safe_profile}\n"

    if memory_context:
        system_prompt += (
            f"\n## What you remember about this user\n{memory_context}\n"
            "\nUse these memories naturally — don't list them robotically. "
            "If a memory has [HAS CONFLICT], gently mention the contradiction and ask for clarification.\n"
        )

    if not user_profile and not memory_context:
        system_prompt += (
            "\nYou don't have any prior context about this user yet. "
            "Pay attention to what they share and build understanding over time.\n"
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    response_text = await llm.chat_completion(
        messages,
        model=model,
        custom_base_url=chat_request.custom_base_url,
        custom_api_key=chat_request.custom_api_key,
        images=chat_request.images or None,
    )

    if memories and not chat_request.images:
        memory_texts = [m["content"] for m in memories]
        response_text = await llm.verify_response_against_memories(
            response_text,
            memory_texts,
            model=model,
            custom_base_url=chat_request.custom_base_url,
            custom_api_key=chat_request.custom_api_key,
        )

    background_tasks.add_task(
        write_pipeline,
        user_message,
        response_text,
        session_id,
        chat_request.user_id,
        db,
        model,
        chat_request.custom_base_url,
        chat_request.custom_api_key,
    )

    return ChatResponse(
        response=response_text,
        memories_used=memory_ids,
        session_id=session_id,
        model_used=model,
    )
