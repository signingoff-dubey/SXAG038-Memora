# Memora v4.5 — Context-Aware AI Agent with Persistent Memory

Memora is an AI agent with a persistent, evolving belief system. Not a database — a memory architecture that tracks what the agent believes, how confident it is, when that belief was formed, and whether two beliefs conflict.

---

## Release Notes

### v4.5 (latest)
#### 🔌 No-LLM Detection + Netlify Stability

- **No LLM banner** — when no Ollama model is installed and no custom API key is configured, a yellow warning banner appears above the chat input: "No LLM detected — Install Ollama and pull a model, or connect a cloud API key." Two action buttons (**Install model** / **Add API key**) open the model selector popup directly so the user can resolve the issue in one click.
- **Netlify blank-screen fix** — Netlify's `/* → index.html` catch-all was returning HTML for `/api/*` requests. Axios saw HTTP 200, skipped the error path, and stored an HTML string as the `memories` array. Components then called `.filter()` on a string, crashing React and blanking the page. Fixed with: (1) a `/api/* → 404` redirect rule added before the catch-all in `netlify.toml`, and (2) an `Array.isArray` guard in `fetchMemories` and `modelsApi.list()` so non-array responses are silently ignored instead of crashing the store.

### v4.5 (earlier)
#### 🧠 Session-Isolated Memory + Bug Fixes

- **Session-isolated retrieval** — long-term (cross-session) memories and session-only memories are now properly scoped. The retrieval pipeline filters by `session_id` so session-only facts from session A are never injected into session B.
- **Memory type badges** — every memory card now shows an explicit type tag: `🧠 long-term` (Brain icon, persistent across all sessions) or `⏱ session-only` (Clock icon, scoped to one session).
- **Memory Inspector labels** — sections renamed to "Long-term memories" and "Session-only context" for clarity.
- **ChromaDB metadata sync** — `is_session_only` and `session_id` are now kept in sync in the vector store on every update (content edits, importance changes, session-type toggles). Previously these fields could fall out of sync after a PATCH, causing silent retrieval failures.
- **Memory write merge path** — `session_id` is now included in ChromaDB metadata when two similar memories are merged, fixing a case where merged memories became invisible to session-scoped queries.
- **Race condition fix** — the `useMemories` hook no longer issues its own unconditional fetch on mount. All memory fetching is session-aware and owned by `App.tsx`.
- **WebSocket local mode** — WebSocket now correctly connects to `ws://127.0.0.1:8000` when Local Backend mode is active, instead of trying to reach the Netlify host.
- **Netlify build fix** — `netlify.toml` corrected to use `base = "frontend"` so the Vite build runs from the right directory.
- **Loading state** — `isLoadingMemories` flag added to the store so the UI can indicate when a memory fetch is in flight.

### v4.0
#### ☁️ Hybrid Mode (Cloud UI + Local AI)

You can use the hosted interface while keeping your data and AI processing on your local machine:

1. **Launch Brain**: Run [**server.bat**](server.bat) on your computer.
2. **Access UI**: Visit [**memora-kabir.netlify.app**](https://memora-kabir.netlify.app).
3. **Enable Local Backend**: In Settings, toggle "Local Backend" on. The green 🟢 badge confirms the connection.

- One-click startup: `run.bat` starts Ollama, Backend, and Frontend and opens browser tabs automatically.
- Ollama integration: `ollama serve` is started automatically by the startup script.
- Security: authentication middleware, per-memory authorization, rate limiting, prompt-injection mitigation, per-user WebSocket scoping.
- Performance: DB indexes on Memory model; LLM response caching.
- Frontend: memory leak fixes, improved hook dependencies.
- Infrastructure: cross-platform networking on `127.0.0.1`; enhanced Pydantic data validation.

---

## Features

### Memory System
- **Persistent cross-session memory** — remembers user facts, preferences, and context across conversations
- **Session-isolated memories** — transient facts from a conversation are labelled `session-only`, scoped to that session only, decay 10× faster, and are never injected into future sessions
- **Smart importance scoring** — single LLM pass classifies AND scores memories; task requests ("write me code", "explain X") are excluded outright; identity facts (name, profession) score 9–10; session-only memories are capped at importance 3
- **Semantic deduplication** — "prefers dark mode" and "likes dark interfaces" are the same belief
- **Contradiction detection** — NLI model flags conflicting beliefs; LLM adjudicates
- **Ebbinghaus decay** — memories fade naturally; pinned memories never decay
- **RAG verification pass** — after every LLM response, a second pass checks whether the reply contradicts any retrieved memories and self-corrects if needed

### Memory Inspector (right panel)
- **Grouped sections** — Pinned / Conflicts / Long-term memories / Session-only context, each collapsible
- **Memory type badges** — `🧠 long-term` (Brain, persistent) or `⏱ session-only` (Clock, scoped) shown on every card
- **Importance slider** — click any importance chip to open an inline 1–10 slider; hit Save to persist
- **Search** — live filter across all memory content
- **Export / Import** — download all memories as JSON or import a backup file
- **User memory controls** — pin (keep forever), flag (safe to auto-delete), or manually delete any memory

### Chat
- **Markdown rendering** — assistant responses render full GFM markdown (headers, lists, tables, blockquotes, bold/italic, links)
- **Syntax-highlighted code blocks** — language header bar with one-click copy; line numbers for blocks > 4 lines; light/dark theme aware
- **Image / vision support** — attach PNG/JPG/GIF/WebP images; `+` button activates for vision-capable models (llava, llama3.2-vision, moondream, etc.)
- **Auto-capitalise** — textarea auto-capitalises the first letter
- **Cursor tracking** — focus always returns to the input box after sending

### Settings
- **Who Am I profile** — fill a free-text description; saved to `backend/data/context_<user_id>.json` and injected into every system prompt
- **Analytics dashboard** — Total / Pinned / Conflicts / Session-only counts, average importance, average memory health, top 3 memories by importance
- **Clear chat history** — wipes all sessions from localStorage with a confirmation step

### Models
- **Auto model detection** — fetches installed Ollama models on page load and auto-selects one if the stored model is not available
- **No-LLM banner** — if no Ollama model is installed and no API key is configured, a warning banner appears above the chat input with one-click **Install model** and **Add API key** buttons that open the model selector immediately
- **Vision badge** — 👁 shown on models that support image input
- **Multi-model support** — choose any locally installed Ollama model, or connect any OpenAI-compatible API with a custom key

### Infrastructure
- **One-click startup** — `run.bat` initialises Ollama, Backend, and Frontend, then opens browser tabs.
- **Cross-platform network stability** — standardised on `127.0.0.1` to avoid IPv6/IPv4 `ECONNREFUSED` issues.
- **Netlify deployment** — frontend auto-deploys to Netlify on push; backend runs locally via `server.bat`; Local Backend toggle in Settings routes all traffic to `localhost:8000`.
- **Netlify API isolation** — `/api/*` paths return 404 instead of the SPA fallback, preventing HTML responses from corrupting the frontend store.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + async SQLAlchemy |
| Database | SQLite (metadata) + ChromaDB (vectors) |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` |
| Contradiction | `cross-encoder/nli-deberta-v3-small` |
| LLM | Ollama (any model) or custom OpenAI-compatible API |
| Vision | Ollama multimodal models (llava, llama3.2-vision, moondream …) |
| Context | Per-user `context_<id>.json` files in `backend/data/` |
| Frontend | Vite + React 19 + TypeScript + Tailwind CSS |
| Markdown | react-markdown + remark-gfm + react-syntax-highlighter |
| State | Zustand + localStorage |
| Realtime | WebSocket (FastAPI native) |

---

## File Structure

```
memora/
├── backend/
│   ├── main.py                   # FastAPI app, lifespan, CORS
│   ├── config.py                 # pydantic-settings env config
│   ├── database.py               # SQLAlchemy async engine + safe migrations
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/                     # ← auto-created at runtime
│   │   └── context_default.json  # persisted user profile (per user_id)
│   ├── models/
│   │   ├── memory.py             # Memory ORM (is_session_only, session_id, decay fields)
│   │   └── session.py            # Session ORM model
│   ├── schemas/
│   │   ├── memory.py             # Pydantic memory schemas
│   │   └── chat.py               # ChatRequest / ChatResponse
│   ├── routers/
│   │   ├── chat.py               # POST /api/chat (context + memories + RAG verify)
│   │   ├── memories.py           # CRUD /api/memories (session_id filtering + full ChromaDB sync)
│   │   ├── context.py            # GET/POST /api/context
│   │   ├── websocket.py          # WS /ws/memories
│   │   └── health.py             # GET /api/health, /api/models
│   └── services/
│       ├── llm.py                # Ollama + OpenAI-compatible + vision + RAG verify
│       ├── embeddings.py         # sentence-transformers wrapper
│       ├── vector_store.py       # ChromaDB wrapper (add/query/update/update_metadata/delete)
│       ├── memory_writer.py      # write pipeline (classify+score → embed → dedup → store)
│       ├── memory_retriever.py   # retrieval + session filtering + re-ranking + decay
│       ├── contradiction.py      # NLI cross-encoder contradiction detection
│       ├── curator.py            # decay computation + merge + cleanup
│       ├── context_manager.py    # read/write context JSON files
│       └── broadcaster.py        # WebSocket connection manager
├── rag_assistant/
│   ├── llm_config.py             # LLM client config for the RAG pipeline
│   ├── chains/
│   │   └── rag_chain.py          # MemoraRAGPipeline — reusable RAG class
│   ├── embeddings/
│   │   └── embedding_service.py  # embedding wrapper used by the RAG pipeline
│   ├── memory/
│   │   └── conversation_memory.py # conversation history management
│   └── vectorstore/
│       └── vector_store.py       # vector store interface for the RAG pipeline
├── run.bat                       # one-click startup (Ollama + backend + frontend)
├── server.bat                    # backend-only startup (for hybrid Netlify mode)
├── netlify.toml                  # Netlify build config (base = frontend)
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── src/
        ├── App.tsx               # layout + session init + session-scoped memory fetch
        ├── api/client.ts         # axios wrapper + all API types (session_id param on list)
        ├── store/memoryStore.ts  # Zustand store (sessions, memories, isLoadingMemories)
        ├── utils/visionModels.ts # pattern-match vision capability detection
        ├── hooks/
        │   ├── useChat.ts        # send message + image forwarding
        │   ├── useMemories.ts    # pin/flag/delete/updateImportance/toggleSessionOnly
        │   └── useWebSocket.ts   # live memory updates (local-backend aware)
        └── components/
            ├── Chat/
            │   ├── ChatWindow.tsx
            │   ├── MessageBubble.tsx   # markdown + syntax-highlighted code blocks
            │   └── ChatInput.tsx       # textarea + image attach + ModelSelector
            ├── MemoryInspector/
            │   ├── MemoryInspector.tsx # grouped sections + search + export/import
            │   ├── MemoryCard.tsx      # long-term/session-only badge + importance slider
            │   ├── DecayBar.tsx
            │   ├── ConflictBadge.tsx
            │   └── ImportanceChip.tsx
            └── Layout/
                ├── ChatHistory.tsx     # left sidebar: session list
                ├── ModelSelector.tsx   # model dropdown + vision badges + custom API
                ├── SettingsModal.tsx   # Profile tab + Analytics dashboard
                └── ThemeToggle.tsx
```

---

## Setup

### Prerequisites

- Python 3.10+ (3.12 recommended — avoid 3.14 with ChromaDB)
- Node.js 18+
- [Ollama](https://ollama.com) installed and running locally

### Quick Start (Recommended)

```bash
run.bat
```

This will:
1. Check for Python and Node.js.
2. Install backend and frontend dependencies.
3. Start Ollama, the Backend, and the Frontend.
4. Automatically open the app and API docs in your browser.

### Hybrid Mode (Netlify UI + local backend)

1. Push code to GitHub — Netlify auto-deploys the frontend.
2. Run `server.bat` on your machine to start the local backend.
3. Open the Netlify URL → Settings → enable **Local Backend**.
4. All API and WebSocket traffic is routed to `http://127.0.0.1:8000`.

---

### Manual Setup (Alternative)

#### 1. Pull models

```bash
# Text model (required)
ollama pull qwen2.5-coder:7b

# Vision model (optional)
ollama pull llava:7b
```

#### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## How Context Awareness Works

Every chat request passes through four layers before the LLM responds:

```
User message
    │
    ▼
1. Load context file  ─── backend/data/context_default.json
    │                      { "user_profile": "I'm Kabir, a developer..." }
    ▼
2. Retrieve memories  ─── ChromaDB vector search → re-ranked top-5
    │                      filtered by session_id (session-only) or global (long-term)
    │                      "- prefers dark mode (importance: 8.0)"
    ▼
3. Build system prompt ── profile + memories injected before every reply
    │
    ▼
4. RAG verification  ──── second LLM pass checks response against memories
    │                      self-corrects if response contradicts known facts
    ▼
LLM response (markdown-rendered in chat)
```

After the response is sent, a background task runs the **memory write pipeline**:

```
conversation turn
    │
    ▼
classify_and_score_memories()   ← single LLM call
    │  returns: [{content, importance, is_session_only}]
    │  task requests        → excluded entirely
    │  session-only facts   → capped at importance 3, decay 10× faster
    │  identity facts       → importance 9-10, persists across all sessions
    ▼
embed → deduplicate → contradiction check → store
    (is_session_only + session_id written to both SQLite and ChromaDB)
```

---

## API Reference

### Chat

```
POST /api/chat
```
```json
{
  "message": "string",
  "session_id": "optional uuid",
  "user_id": "default",
  "model": "qwen2.5-coder:7b",
  "custom_base_url": "https://api.openai.com/v1",
  "custom_api_key": "sk-...",
  "images": ["base64string"]
}
```

Images are raw base64 strings (no `data:` prefix). The backend detects Ollama vs OpenAI-compatible endpoints and formats accordingly.

### Memories

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/memories?user_id=default` | List global memories only |
| GET | `/api/memories?user_id=default&session_id=<uuid>` | List global + session-scoped memories |
| GET | `/api/memories/{id}` | Get one |
| PATCH | `/api/memories/{id}` | Update pin / flag / content / importance / session-only |
| DELETE | `/api/memories/{id}` | Delete from SQLite + ChromaDB |

**PATCH body** (all fields optional):
```json
{
  "is_pinned": true,
  "is_flagged_unimportant": false,
  "content": "updated text",
  "importance": 7.5,
  "is_session_only": false
}
```

All PATCH operations keep ChromaDB metadata fully in sync (including `is_session_only` and `session_id`).

### Context Profile

```
GET  /api/context?user_id=default
POST /api/context
```
```json
{
  "user_id": "default",
  "user_profile": "I'm Kabir. I'm a software developer who loves building AI tools..."
}
```

Returns `{ "user_id", "user_profile", "updated_at" }`.

### Models

```
GET /api/models   →  { "models": [{ "name": "llava:7b", "size": ... }] }
```

### WebSocket

```
WS /ws/memories?user_id=default
```
Events: `memory_created`, `memory_updated`, `memory_deleted`, `contradiction_detected`

Connects to `ws://127.0.0.1:8000` when Local Backend mode is active.

### Health

```
GET /api/health   →  { "status": "ok", "ollama": "connected", "model": "..." }
```

---

## Memory Card Controls

| Control | Action |
|---------|--------|
| `🧠 long-term` badge | Memory persists across all sessions |
| `⏱ session-only` badge | Memory is scoped to one session; decays 10× faster |
| 📌 Pin | Locks memory permanently — never decays, never auto-deleted |
| Importance chip (click) | Opens inline 1–10 slider; hit Save to persist |
| ⬇ Flag | Marks as unimportant — lower deletion threshold, safe for auto-cleanup |
| 🗑 Delete | Immediate deletion from SQLite + ChromaDB |

---

## Memory Inspector Panel

The right panel groups memories into four sections:

| Section | Contents |
|---------|----------|
| **Pinned** | Manually pinned memories (never decay) |
| **Conflicts** | Memories flagged with contradictions — needs resolution |
| **Long-term memories** | Persistent facts (identity, preferences, skills) — shared across all sessions |
| **Session-only context** | Transient facts from the current conversation; fade 10× faster; scoped to this session |

Use the **search bar** to filter across all memory content.
Use the **export** button to save all memories as a JSON file.
Use the **import** button to restore memories from a JSON backup.

---

## Image / Vision Support

Click the **`+`** button in the chat input to attach images.

- If the selected model supports vision (llava, llama3.2-vision, moondream, qwen2-vl, gemma3, etc.), images are sent with the message.
- If the model does **not** support vision, a warning banner appears.
- Vision capability is detected by model name pattern — no extra API calls needed.
- Custom API connections (OpenAI, Groq, etc.) are assumed vision-capable.

**Vision models you can `ollama pull`:**

| Model | Size | Notes |
|-------|------|-------|
| `llava:7b` | 4.7 GB | Fast, good general vision |
| `llava:13b` | 8.0 GB | Better quality |
| `llama3.2-vision` | 7.9 GB | Meta's vision model |
| `moondream` | 1.7 GB | Lightweight, very fast |
| `qwen2-vl` | ~5 GB | Strong OCR/document understanding |

---

## RAG Pipeline (`rag_assistant/`)

The `MemoraRAGPipeline` class in `rag_assistant/chains/rag_chain.py` provides a standalone, reusable RAG interface backed by Memora's own services:

```python
from rag_assistant.chains.rag_chain import get_rag_pipeline, MemoraRAGQuery

pipeline = get_rag_pipeline(model="qwen2.5-coder:7b")

result = await pipeline.query(MemoraRAGQuery(
    question="What programming languages does the user know?",
    user_id="default",
    top_k=5,
    run_verification=True,   # self-corrects if response contradicts memories
))

print(result.answer)
print(result.sources)              # [{content, score, metadata}, ...]
print(result.correction_applied)   # True if verifier rewrote the answer
```

Uses the same `all-MiniLM-L6-v2` embeddings, the same ChromaDB collection, and the same LLM client as the backend — one source of truth for all retrieval and generation.

---

## Key Parameters (`config.py`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `dedup_threshold` | 0.92 | Skip write if near-duplicate exists |
| `contradiction_threshold` | 0.75 | Cosine threshold for NLI pairs |
| `merge_threshold` | 0.88 | Cosine threshold for summarization merge |
| `decay_lambda` | 0.05 | Ebbinghaus forgetting curve rate |
| `decay_lambda × 10` | 0.50 | Effective decay rate for session-only memories |
| `deletion_threshold` | 0.15 | Auto-delete below this score |
| `deletion_threshold_unimportant` | 0.30 | Higher threshold for flagged memories |
| `retrieval_candidates` | 20 | Top-N from ChromaDB before re-rank |
| `context_memories` | 5 | Memories injected into system prompt |

Override any via environment variables or a `.env` file in `backend/`.

---

## Demo Scenarios

1. **Set your profile** — open Settings (⚙), fill "Who am I?", save. Every response is now personalised without re-explaining yourself.

2. **Cross-session memory** — tell Memora something ("I'm learning Rust"), close the tab, reopen in a new session. It still knows.

3. **Session isolation** — open two sessions. A session-only memory from session A (e.g. "help me sort a list") is never visible in session B.

4. **Analytics** — open Settings → Analytics to see total, pinned, conflict, session-only counts, average importance, average health, and top 3 memories.

5. **Image analysis** — switch to `llava:7b`, click `+`, upload a screenshot, ask "what's in this image?".

6. **Contradiction detection** — say "I love spicy food", then "I hate anything spicy". Watch the red conflict badge appear in the Conflicts section.

7. **Importance tuning** — click the importance chip on any memory card, drag the slider, hit Save. New score immediately affects retrieval ranking.

8. **Memory health** — flag a memory as unimportant. Watch its decay bar shrink over time; the curator job will eventually auto-delete it.

9. **Custom API** — in the model selector, enter an OpenAI/Groq/Together base URL and key. The memory pipeline still runs locally; only the final LLM call goes to the cloud.

10. **Export / import** — download all memories as JSON from the Memory Inspector, then restore them with the upload button.
