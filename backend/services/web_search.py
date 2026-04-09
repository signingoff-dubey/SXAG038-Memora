import asyncio
import logging

logger = logging.getLogger(__name__)

# Search triggers — if the message contains any of these, auto-search
_SEARCH_TRIGGERS = [
    "@web", "[web]",
    "what is the latest", "what are the latest", "latest news",
    "current price", "stock price", "weather",
    "what happened", "news about", "recent news",
    "tell me about", "search for", "look up", "find information",
    "who is ", "where is ", "when did ", "how does ",
    "this week", "today's", "right now", "as of today",
]


async def search_web(query: str, max_results: int = 5) -> list[dict]:
    """
    DuckDuckGo web search — no API key required.
    Returns list of { title, url, snippet }.
    """
    try:
        from duckduckgo_search import DDGS  # type: ignore

        def _sync() -> list[dict]:
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=max_results))

        raw = await asyncio.to_thread(_sync)
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", ""),
            }
            for r in raw
            if r.get("body")
        ]
    except ImportError:
        logger.warning("duckduckgo_search not installed — web search disabled.")
        return []
    except Exception as e:
        logger.warning(f"Web search failed for '{query}': {e}")
        return []


def should_search_web(message: str) -> tuple[bool, str]:
    """
    Heuristic: decide whether this message needs a live web search.
    Returns (should_search, refined_query).
    """
    lower = message.lower().strip()

    # Explicit opt-in prefix
    for prefix in ("@web ", "[web] "):
        if lower.startswith(prefix):
            query = message[len(prefix):].strip()
            return True, query or message

    # Keyword triggers
    for trigger in _SEARCH_TRIGGERS[2:]:  # skip @web / [web]
        if trigger in lower:
            return True, message

    return False, message


def format_web_results(results: list[dict]) -> str:
    """Format results for injection into the system prompt."""
    if not results:
        return ""
    lines = ["\n## 🌐 Live web search results"]
    for i, r in enumerate(results, 1):
        lines.append(f"\n{i}. **{r['title']}**")
        if r["snippet"]:
            lines.append(f"   {r['snippet']}")
        lines.append(f"   Source: {r['url']}")
    lines.append(
        "\nCite relevant sources when answering. Prefer the web results for current/live information."
    )
    return "\n".join(lines)
