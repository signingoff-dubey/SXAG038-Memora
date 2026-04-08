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


async def classify_worth_remembering(
    user_message: str,
    assistant_response: str,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
) -> list[str]:
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
        model=model,
        custom_base_url=custom_base_url,
        custom_api_key=custom_api_key,
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


async def score_importance(
    memory_text: str,
    model: str | None = None,
    custom_base_url: str | None = None,
    custom_api_key: str | None = None,
) -> float:
    prompt = (
        "Rate the importance of remembering this fact about a user on a scale of 1-10.\n"
        "1 = trivial/transient, 10 = core identity/critical preference.\n"
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
