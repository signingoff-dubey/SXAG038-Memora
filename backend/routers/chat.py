import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from schemas.chat import ChatRequest, ChatResponse
from services.memory_retriever import retrieve_memories
from services.memory_writer import write_pipeline
from services.context_manager import load_context
from services import llm

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    session_id = request.session_id or str(uuid.uuid4())
    model = request.model or settings.ollama_model

    # ── 1. Retrieve relevant memories ────────────────────────────────────────
    memories = await retrieve_memories(request.message, request.user_id, db)

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

    # ── 2. Load user profile from context.json (off-thread — sync file I/O) ──
    user_ctx = await asyncio.to_thread(load_context, request.user_id)
    user_profile = user_ctx.get("user_profile", "").strip()

    # ── 3. Build system prompt (profile → memories → instructions) ────────────
    system_prompt = (
        "You are Memora, a highly context-aware AI assistant with persistent memory.\n"
        "You always consider everything you know about the user before responding.\n"
    )

    if user_profile:
        system_prompt += (
            "\n## About the user\n"
            f"{user_profile}\n"
        )

    if memory_context:
        system_prompt += (
            "\n## What you remember about this user\n"
            f"{memory_context}\n"
            "\nUse these memories naturally — don't list them robotically. "
            "If a memory has [HAS CONFLICT], gently mention the contradiction and ask for clarification.\n"
        )

    if not user_profile and not memory_context:
        system_prompt += (
            "\nYou don't have any prior context about this user yet. "
            "Pay attention to what they share and build understanding over time.\n"
        )

    # ── 4. Call the LLM ───────────────────────────────────────────────────────
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.message},
    ]

    response_text = await llm.chat_completion(
        messages,
        model=model,
        custom_base_url=request.custom_base_url,
        custom_api_key=request.custom_api_key,
        images=request.images or None,
    )

    # ── 5. RAG verification pass (only when memories exist + no images) ────────
    # Checks the response against retrieved memories and self-corrects if needed.
    if memories and not request.images:
        memory_texts = [m["content"] for m in memories]
        response_text = await llm.verify_response_against_memories(
            response_text,
            memory_texts,
            model=model,
            custom_base_url=request.custom_base_url,
            custom_api_key=request.custom_api_key,
        )

    # ── 5. Persist memories in background ────────────────────────────────────
    background_tasks.add_task(
        write_pipeline,
        request.message,
        response_text,
        session_id,
        request.user_id,
        db,
        model,
        request.custom_base_url,
        request.custom_api_key,
    )

    return ChatResponse(
        response=response_text,
        memories_used=memory_ids,
        session_id=session_id,
        model_used=model,
    )
