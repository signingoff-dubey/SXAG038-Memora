import httpx

from config import settings


def _is_openai_compatible(base_url: str) -> bool:
    """Detect if this is an OpenAI-compatible endpoint (not Ollama)."""
    return "openai.com" in base_url or "/v1" in base_url


def _build_openai_messages(messages: list[dict], images: list[str] | None) -> list[dict]:
    """
    Convert messages to OpenAI vision format when images are present.
    Images are attached to the last user message.
    """
    if not images:
        return messages

    result = []
    for i, msg in enumerate(messages):
        if msg["role"] == "user" and i == len(messages) - 1:
            content: list[dict] = [{"type": "text", "text": msg["content"]}]
            for b64 in images:
                # Accept raw base64 or data URLs
                url = b64 if b64.startswith("data:") else f"data:image/jpeg;base64,{b64}"
                content.append({"type": "image_url", "image_url": {"url": url}})
            result.append({"role": "user", "content": content})
        else:
            result.append(msg)
    return result


def _build_ollama_messages(messages: list[dict], images: list[str] | None) -> list[dict]:
    """
    Attach images to the last user message for Ollama's native format.
    Strips data URL prefix — Ollama wants raw base64.
    """
    if not images:
        return messages

    raw_images = []
    for b64 in images:
        if "," in b64:          # data:image/jpeg;base64,<data>
            raw_images.append(b64.split(",", 1)[1])
        else:
            raw_images.append(b64)

    result = []
    for i, msg in enumerate(messages):
        if msg["role"] == "user" and i == len(messages) - 1:
            result.append({**msg, "images": raw_images})
        else:
            result.append(msg)
    return result


async def chat_completion(
    messages: list[dict],
    temperature: float = 0.7,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
    images: list[str] | None = None,
) -> str:
    effective_model = model or settings.ollama_model
    base_url = custom_base_url or settings.ollama_base_url
    api_key = custom_api_key

    if api_key and _is_openai_compatible(base_url):
        # OpenAI-compatible endpoint (supports vision via content array)
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        endpoint = base_url.rstrip("/") + "/chat/completions"
        payload = {
            "model": effective_model,
            "messages": _build_openai_messages(messages, images),
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(endpoint, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    else:
        # Ollama endpoint — images go as base64 list on the message
        endpoint = base_url.rstrip("/") + "/api/chat"
        payload = {
            "model": effective_model,
            "messages": _build_ollama_messages(messages, images),
            "stream": False,
            "options": {"temperature": temperature},
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(endpoint, json=payload)
            resp.raise_for_status()
            return resp.json()["message"]["content"]


async def get_ollama_models(base_url: str | None = None) -> list[dict]:
    """Fetch list of locally available Ollama models."""
    url = (base_url or settings.ollama_base_url).rstrip("/") + "/api/tags"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            return data.get("models", [])
    except Exception:
        return []


async def classify_and_score_memories(
    user_message: str,
    assistant_response: str,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
) -> list[dict]:
    """
    Single LLM call that extracts facts AND scores them AND classifies
    whether they are session-specific or cross-session relevant.

    Returns list of:
      { "content": str, "importance": float, "is_session_only": bool }
    """
    import json
    prompt = (
        "Analyze this conversation and extract facts worth storing in long-term memory.\n\n"
        "## STRICT RULES\n"
        "INCLUDE (cross-session facts — persist across all future chats):\n"
        "  - User identity: name, age, job, location, nationality\n"
        "  - Persistent preferences: favourite tools, languages, foods, hobbies\n"
        "  - Long-term goals or projects the user keeps returning to\n"
        "  - Skills the user has or is developing\n"
        "  - Strong opinions on topics they care about\n\n"
        "EXCLUDE completely (return []):\n"
        "  - Greetings, small talk, pleasantries\n"
        "  - One-off task requests: 'write me code', 'explain X', 'help me debug Y'\n"
        "  - Results of tasks (the actual code, the explanation text)\n"
        "  - Questions the user asked in this session only\n\n"
        "SESSION-ONLY (include but mark is_session_only=true, importance 1–2):\n"
        "  - Topics the user asked about once that might hint at a very weak preference\n"
        "  - Very minor transient facts\n\n"
        "## IMPORTANCE SCALE\n"
        "  9–10 : Core identity (name, profession, nationality)\n"
        "  7–8  : Strong recurring preferences or skills\n"
        "  5–6  : Moderate preferences or interests\n"
        "  3–4  : Weak or speculative preferences\n"
        "  1–2  : Session-only or barely noteworthy\n\n"
        "## EXAMPLES\n"
        "User: 'Write Hello World in C'  → [] (pure task, nothing to remember)\n"
        "User: 'I love Python'          → [{content:'User prefers Python', importance:7, is_session_only:false}]\n"
        "User: 'My name is Kabir'       → [{content:'User name is Kabir', importance:9, is_session_only:false}]\n"
        "User: 'Can you help me sort a list?' → [] (one-off task)\n\n"
        "Return ONLY a valid JSON array. If nothing qualifies, return [].\n\n"
        f"User: {user_message}\n"
        f"Assistant: {assistant_response}\n\n"
        "JSON array:"
    )
    result = await chat_completion(
        [{"role": "user", "content": prompt}],
        temperature=0.1,
        model=model,
        custom_base_url=custom_base_url,
        custom_api_key=custom_api_key,
    )
    try:
        start = result.find("[")
        end = result.rfind("]") + 1
        if start >= 0 and end > start:
            raw = json.loads(result[start:end])
            cleaned = []
            for item in raw:
                if not isinstance(item, dict):
                    continue
                content = str(item.get("content", "")).strip()
                if not content:
                    continue
                try:
                    imp = float(item.get("importance", 5))
                    imp = max(1.0, min(10.0, imp))
                except (TypeError, ValueError):
                    imp = 5.0
                is_session = bool(item.get("is_session_only", False))
                # Enforce cap: session-only memories must not exceed importance 3
                if is_session:
                    imp = min(imp, 3.0)
                cleaned.append({
                    "content": content,
                    "importance": imp,
                    "is_session_only": is_session,
                })
            return cleaned
    except (json.JSONDecodeError, ValueError):
        pass
    return []


# Keep old function as thin wrapper for backward compat (curator/summarizer still use it)
async def classify_worth_remembering(
    user_message: str,
    assistant_response: str,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
) -> list[str]:
    items = await classify_and_score_memories(
        user_message, assistant_response, model, custom_base_url, custom_api_key
    )
    return [i["content"] for i in items]


async def score_importance(
    memory_text: str,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
) -> float:
    """Legacy single-fact scorer — used by curator merge. Kept for backward compat."""
    prompt = (
        "Rate how important this fact is for long-term memory about a user (1–10).\n"
        "Penalise heavily for: task requests, one-off code asks, session-specific questions.\n"
        "Reward highly for: identity, strong preferences, skills, long-term goals.\n"
        "1 = session-only / trivial  |  10 = core identity\n"
        "Return ONLY a number.\n\n"
        f"Fact: {memory_text}\n\nScore:"
    )
    result = await chat_completion(
        [{"role": "user", "content": prompt}],
        temperature=0.1,
        model=model,
        custom_base_url=custom_base_url,
        custom_api_key=custom_api_key,
    )
    try:
        score = float("".join(c for c in result.strip() if c.isdigit() or c == "."))
        return max(1.0, min(10.0, score))
    except ValueError:
        return 5.0


async def verify_response_against_memories(
    response: str,
    memories: list[str],
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
) -> str:
    """
    RAG verification pass: check whether the response contradicts any retrieved
    memories. If it does, return a corrected/amended response; otherwise return
    the original unchanged.

    Only runs when there are memories to check against.
    """
    if not memories:
        return response

    mem_text = "\n".join(f"  - {m}" for m in memories)
    prompt = (
        "You are a fact-checker. A response was generated for a user. "
        "Check whether the response CONTRADICTS any of the known facts about the user.\n\n"
        f"## Known facts about the user\n{mem_text}\n\n"
        f"## Response to verify\n{response}\n\n"
        "If the response is consistent with the known facts, reply with exactly: OK\n"
        "If the response contradicts a fact, reply with the CORRECTED full response "
        "that is consistent with what is known about the user. "
        "Do NOT add explanations — only output the corrected response or 'OK'."
    )
    result = await chat_completion(
        [{"role": "user", "content": prompt}],
        temperature=0.1,
        model=model,
        custom_base_url=custom_base_url,
        custom_api_key=custom_api_key,
    )
    result = result.strip()
    if result.upper() == "OK" or not result:
        return response
    return result


async def summarize_memories(
    memories: list[str],
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
) -> str:
    joined = "\n".join(f"- {m}" for m in memories)
    prompt = (
        "Combine these related memories into a single concise statement that preserves all key information.\n\n"
        f"Memories:\n{joined}\n\nCombined statement:"
    )
    return await chat_completion(
        [{"role": "user", "content": prompt}],
        temperature=0.3,
        model=model,
        custom_base_url=custom_base_url,
        custom_api_key=custom_api_key,
    )


async def resolve_contradiction(
    memory_a: str,
    memory_b: str,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
) -> str:
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
        model=model,
        custom_base_url=custom_base_url,
        custom_api_key=custom_api_key,
    )
    result = result.strip().upper()
    for option in ["KEEP_A", "KEEP_B", "KEEP_BOTH", "ASK_USER"]:
        if option in result:
            return option
    return "ASK_USER"
