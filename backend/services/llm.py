import httpx

from config import settings


async def chat_completion(messages: list[dict], temperature: float = 0.7) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": messages,
                "stream": False,
                "options": {"temperature": temperature},
            },
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]


async def classify_worth_remembering(user_message: str, assistant_response: str) -> list[str]:
    prompt = (
        "Extract facts, preferences, or personal information worth remembering from this conversation.\n"
        "Return ONLY a JSON array of short factual statements. If nothing is worth remembering, return [].\n"
        "Do not include greetings, small talk, or transient information.\n\n"
        f"User: {user_message}\nAssistant: {assistant_response}\n\n"
        "JSON array:"
    )
    result = await chat_completion(
        [{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    import json
    try:
        start = result.find("[")
        end = result.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(result[start:end])
    except (json.JSONDecodeError, ValueError):
        pass
    return []


async def score_importance(memory_text: str) -> float:
    prompt = (
        "Rate the importance of remembering this fact about a user on a scale of 1-10.\n"
        "1 = trivial/transient, 10 = core identity/critical preference.\n"
        "Return ONLY a number.\n\n"
        f"Fact: {memory_text}\n\nScore:"
    )
    result = await chat_completion(
        [{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    try:
        score = float("".join(c for c in result.strip() if c.isdigit() or c == "."))
        return max(1.0, min(10.0, score))
    except ValueError:
        return 5.0


async def summarize_memories(memories: list[str]) -> str:
    joined = "\n".join(f"- {m}" for m in memories)
    prompt = (
        "Combine these related memories into a single concise statement that preserves all key information.\n\n"
        f"Memories:\n{joined}\n\nCombined statement:"
    )
    return await chat_completion(
        [{"role": "user", "content": prompt}],
        temperature=0.3,
    )


async def resolve_contradiction(memory_a: str, memory_b: str) -> str:
    prompt = (
        "Two memories about the user contradict each other:\n"
        f"A: {memory_a}\n"
        f"B: {memory_b}\n\n"
        "Which is more likely correct given that B is newer? "
        "Should we keep A, keep B, keep both (if not actually contradictory), or ask the user?\n"
        "Return ONLY one of: KEEP_A, KEEP_B, KEEP_BOTH, ASK_USER"
    )
    result = await chat_completion(
        [{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    result = result.strip().upper()
    for option in ["KEEP_A", "KEEP_B", "KEEP_BOTH", "ASK_USER"]:
        if option in result:
            return option
    return "ASK_USER"
