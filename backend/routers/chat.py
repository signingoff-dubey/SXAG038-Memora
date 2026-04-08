import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.chat import ChatRequest, ChatResponse
from services.memory_retriever import retrieve_memories
from services.memory_writer import write_pipeline
from services import llm

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    session_id = request.session_id or str(uuid.uuid4())

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

    system_prompt = (
        "You are Memora, an AI assistant with persistent memory. "
        "You remember facts about the user across conversations.\n"
    )
    if memory_context:
        system_prompt += (
            "\nHere are your memories about this user:\n"
            f"{memory_context}\n\n"
            "Use these memories naturally in your responses. "
            "If you notice a conflict flag, mention the contradiction and ask the user to clarify.\n"
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.message},
    ]

    response_text = await llm.chat_completion(messages)

    background_tasks.add_task(
        write_pipeline,
        request.message,
        response_text,
        session_id,
        request.user_id,
        db,
    )

    return ChatResponse(
        response=response_text,
        memories_used=memory_ids,
        session_id=session_id,
    )
