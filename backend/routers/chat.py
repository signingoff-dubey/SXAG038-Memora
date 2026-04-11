import asyncio
import json as _json
import re
import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings
from database import get_db, async_session
from schemas.chat import ChatRequest
from services.memory_retriever import retrieve_memories
from services.memory_writer import write_pipeline
from services.context_manager import load_context
from services.web_search import format_web_results, search_web, should_search_web
from services import llm
from models.message import Message

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api", tags=["chat"])

INSTRUCTION_PROMPT = (
    "You are Cortex, a highly context-aware AI assistant with persistent memory.\n"
    "You always consider everything you know about the user before responding.\n"
)

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


@router.post("/chat")
@limiter.limit("10/minute")
async def chat(
    request: Request,
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    user_message = _sanitize_input(chat_request.message)
    if _check_injection(user_message):
        user_message = "[Input was filtered for safety]"

    session_id = chat_request.session_id or str(uuid.uuid4())
    model = chat_request.model or settings.ollama_model

    # ── Persist User Message ──────────────────────────────────────────────────
    async with db.begin_nested():
        db.add(Message(
            session_id=session_id,
            user_id=chat_request.user_id,
            role="user",
            content=user_message
        ))
    await db.commit()

    # ── Memory retrieval ───────────────────────────────────────────────────────
    memories = await retrieve_memories(
        user_message, chat_request.user_id, db, session_id
    )
    memory_context = ""
    memory_ids: list[str] = []
    if memories:
        lines = []
        for m in memories:
            line = f"- {m['content']} (importance: {m['importance']:.1f})"
            if m["contradiction_with"]:
                line += " [HAS CONFLICT]"
            lines.append(line)
            memory_ids.append(m["id"])
        memory_context = "\n".join(lines)

    # ── Web search (optional, based on message heuristics) ─────────────────────
    needs_search, search_query = should_search_web(user_message)
    web_context = ""
    if needs_search:
        web_results = await search_web(search_query)
        web_context = format_web_results(web_results)

    # ── User profile ───────────────────────────────────────────────────────────
    user_ctx = await asyncio.to_thread(load_context, chat_request.user_id)
    user_profile = user_ctx.get("user_profile", "").strip()

    # ── Build system prompt ───────────────────────────────────────────────────
    system_prompt = INSTRUCTION_PROMPT

    if user_profile:
        system_prompt += f"\n## About the user\n{_sanitize_input(user_profile)}\n"

    if memory_context:
        system_prompt += (
            f"\n## What you remember about this user\n{memory_context}\n"
            "\nUse these memories naturally — don't list them robotically. "
            "If a memory has [HAS CONFLICT], gently mention the contradiction and ask for clarification.\n"
        )

    if web_context:
        system_prompt += f"\n{web_context}\n"

    if not user_profile and not memory_context:
        system_prompt += (
            "\nYou don't have any prior context about this user yet. "
            "Pay attention to what they share and build understanding over time.\n"
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # ── Streaming response ────────────────────────────────────────────────────
    async def event_stream():
        parts: list[str] = []

        try:
            async for token in llm.chat_completion_stream(
                messages,
                model=model,
                custom_base_url=chat_request.custom_base_url,
                custom_api_key=chat_request.custom_api_key,
                images=chat_request.images or None,
            ):
                parts.append(token)
                yield f"data: {_json.dumps({'token': token})}\n\n"
        except Exception as e:
            yield f"data: {_json.dumps({'error': str(e)})}\n\n"
            return

        assembled = "".join(parts)

        # RAG verification pass (runs after all tokens sent — transparent to user)
        if memories and not chat_request.images:
            memory_texts = [m["content"] for m in memories]
            verified = await llm.verify_response_against_memories(
                assembled,
                memory_texts,
                model=model,
                custom_base_url=chat_request.custom_base_url,
                custom_api_key=chat_request.custom_api_key,
            )
            if verified != assembled:
                # Send the corrected full response so client can replace
                yield f"data: {_json.dumps({'correction': verified})}\n\n"
                assembled = verified

        # Done event with metadata
        yield f"data: {_json.dumps({'done': True, 'session_id': session_id, 'memories_used': memory_ids, 'model_used': model, 'web_search_used': needs_search})}\n\n"

        # Persist Assistant Message
        async with async_session() as db_session:
            async with db_session.begin():
                db_session.add(Message(
                    session_id=session_id,
                    user_id=chat_request.user_id,
                    role="assistant",
                    content=assembled
                ))
            await db_session.commit()

        # Memory writing — new session (write_pipeline handles db=None)
        asyncio.create_task(
            write_pipeline(
                user_message,
                assembled,
                session_id,
                chat_request.user_id,
                None,  # fresh DB session created internally
                model,
                chat_request.custom_base_url,
                chat_request.custom_api_key,
            )
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/chat/export")
async def export_chat(
    session_id: str,
    user_id: str = "default",
    db: AsyncSession = Depends(get_db)
):
    """Export the full conversation as Markdown."""
    from fastapi.responses import Response

    stmt = select(Message).where(
        Message.user_id == user_id, 
        Message.session_id == session_id
    ).order_by(Message.created_at.asc())
    
    result = await db.execute(stmt)
    messages = result.scalars().all()

    if not messages:
        # Fallback to memories if no message logs found
        from models.memory import Memory
        stmt_mem = select(Memory).where(Memory.user_id == user_id, Memory.session_id == session_id)
        mems = (await db.execute(stmt_mem)).scalars().all()
        
        md = f"# Chat Export - Session {session_id}\n\n"
        md += "_No message logs found. Exporting extracted facts._\n\n"
        for m in mems:
            md += f"- **{m.content}**\n"
    else:
        md = f"# Conversation Export\n\n**Session ID:** `{session_id}`\n\n---\n\n"
        for msg in messages:
            role_name = "Assistant" if msg.role == "assistant" else "User"
            md += f"### {role_name}\n{msg.content}\n\n"

    return Response(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=chat_{session_id}.md"}
    )
