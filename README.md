# Memora — Context-Aware AI Agent with Persistent Memory

Memora is an AI agent with a persistent, evolving belief system. Not a database — a memory architecture that tracks what the agent believes, how confident it is, when that belief was formed, and whether two beliefs conflict.

---

## Features

### Memory System
- **Persistent cross-session memory** — remembers user facts, preferences, and context across conversations
- **Session-only memories** — transient facts (one-off queries, task context) are labelled `session-only` with a Clock badge; they decay 10× faster and are never injected into future sessions
- **Smart importance scoring** — single LLM pass classifies AND scores memories; task requests ("write me code", "explain X") are excluded outright; identity facts (name, profession) score 9-10; session-only memories are capped at importance 3
- **Semantic deduplication** — "prefers dark mode" and "likes dark interfaces" are the same belief
- **Contradiction detection** — NLI model flags conflicting beliefs; LLM adjudicates
- **Ebbinghaus decay** — memories fade naturally; pinned memories never decay
- **RAG verification pass** — after every LLM response, a second pass checks whether the reply contradicts any retrieved memories and self-corrects if needed

### Memory Inspector (right panel)
- **Grouped sections** — Pinned / Conflicts / Cross-session / Session-only, each collapsible
- **Importance slider** — click any importance chip to open an inline 1–10 slider; hit Save to persist
- **Search** — live filter across all memory content
- **Export / Import** — download all memories as JSON or import a backup file
- **User memory controls** — pin (keep forever), flag (safe to auto-delete), or manually delete any memory

### Chat
- **Markdown rendering** — assistant responses render full GFM markdown (headers, lists, tables, blockquotes, horizontal rules, bold/italic, links)
- **Syntax-highlighted code blocks** — language header bar with one-click copy; line numbers for blocks > 4 lines; light/dark theme aware
- **Image / vision support** — attach PNG/JPG/GIF/WebP images; `+` button activates for vision-capable models (llava, llama3.2-vision, moondream, etc.)
- **Auto-capitalise** — textarea auto-capitalises the first letter
- **Cursor tracking** — focus always returns to the input box after sending a message

### Settings
- **Who Am I profile** — fill a free-text description; saved to `backend/data/context_<user_id>.json` and injected into every system prompt
- **Analytics dashboard** — shows Total / Pinned / Conflicts / Session-only counts, average importance, average memory health, and the top 3 memories by importance
- **Clear chat history** — wipes all sessions from localStorage with a confirmation step

### Models
- **Auto model detection** — fetches installed Ollama models on page load and auto-selects one if the stored model is not available
- **Vision badge** — 👁 shown on models that support image input
- **Multi-model support** — choose any locally installed Ollama model, or connect any OpenAI-compatible API with a custom key

### RAG Pipeline (`rag_assistant/`)
- **`MemoraRAGPipeline`** — reusable Python class backed by Memora's own services (same all-MiniLM-L6-v2 embeddings, shared ChromaDB collection, same Ollama/OpenAI-compatible LLM client)
- **One source of truth** — all retrieval and generation uses the backend's service modules; no duplicate embedding or DB connections
- `add_memory()` — real-time indexing of new facts into ChromaDB
- `get_stats()` — vector store document count + active model info

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
│   ├── data/                     # ← auto-created at runtime
│   │   └── context_default.json  # persisted user profile (per user_id)
│   ├── models/
│   │   ├── memory.py             # Memory ORM model (incl. is_session_only)
│   │   └── session.py            # Session ORM model
│   ├── schemas/
│   │   ├── memory.py             # Pydantic memory schemas (incl. importance update)
│   │   └── chat.py               # ChatRequest / ChatResponse
│   ├── routers/
│   │   ├── chat.py               # POST /api/chat (context + memories + RAG verify)
│   │   ├── memories.py           # CRUD /api/memories (incl. importance + session-only PATCH)
│   │   ├── context.py            # GET/POST /api/context
│   │   ├── websocket.py          # WS /ws/memories
│   │   └── health.py             # GET /api/health, /api/models
│   └── services/
│       ├── llm.py                # Ollama + OpenAI-compatible + vision + RAG verify
│       ├── embeddings.py         # sentence-transformers wrapper
│       ├── vector_store.py       # ChromaDB wrapper
│       ├── memory_writer.py      # write pipeline (classify+score → embed → store)
│       ├── memory_retriever.py   # retrieval + re-ranking + decay
│       ├── contradiction.py      # NLI cross-encoder
│       ├── curator.py            # decay computation + merge + cleanup
│       ├── context_manager.py    # read/write context JSON files
│       └── broadcaster.py        # WebSocket connection manager
├── rag_assistant/
│   └── chains/
│       └── rag_chain.py          # MemoraRAGPipeline — reusable RAG class
└── frontend/
    └── src/
        ├── App.tsx               # layout + auto session init + model detection
        ├── api/client.ts         # axios wrapper + all API types
        ├── store/memoryStore.ts  # Zustand store (sessions, model, profile, installedModels)
        ├── utils/visionModels.ts # pattern-match vision capability detection
        ├── hooks/
        │   ├── useChat.ts        # send message + image forwarding
        │   ├── useMemories.ts    # pin/flag/delete/updateImportance/toggleSessionOnly
        │   └── useWebSocket.ts   # live memory updates
        └── components/
            ├── Chat/
            │   ├── ChatWindow.tsx
            │   ├── MessageBubble.tsx   # markdown + syntax-highlighted code blocks
            │   └── ChatInput.tsx       # textarea + image attach + ModelSelector
            ├── MemoryInspector/
            │   ├── MemoryInspector.tsx # grouped sections + search + export/import
            │   ├── MemoryCard.tsx      # importance slider + session-only badge
            │   ├── DecayBar.tsx
            │   ├── ConflictBadge.tsx
            │   └── ImportanceChip.tsx
            └── Layout/
                ├── ChatHistory.tsx     # left sidebar: session list
                ├── ModelSelector.tsx   # model dropdown + installed badges + custom API
                ├── SettingsModal.tsx   # Profile tab + Analytics dashboard
                └── ThemeToggle.tsx
```

---

## Setup

### Prerequisites

- Python 3.10+ (3.12 recommended — avoid 3.14 with ChromaDB)
- Node.js 18+
- [Ollama](https://ollama.com) installed and running locally

### 1. Pull models

```bash
# Text model (required)
ollama pull qwen2.5-coder:7b

# Vision model (optional — enables image uploads)
ollama pull llava:7b
```

Any other model works too — Memora auto-detects what you have installed.

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The `data/` directory and database migrations run automatically on first start.

### 3. Frontend

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
    │                      "- prefers dark mode (importance: 8.0)"
    │                      (session-only memories excluded from cross-session retrieval)
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
    │  task requests → excluded entirely
    │  session-only  → capped at importance 3, decay 10× faster
    │  identity      → importance 9-10, persists across all sessions
    ▼
embed + deduplicate + contradiction check + store
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
  "images": ["base64string", "..."]
}
```

Images are raw base64 strings (no `data:` prefix). The backend detects Ollama vs OpenAI-compatible endpoints and formats the payload accordingly.

### Memories

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/memories?user_id=default` | List all |
| GET | `/api/memories/{id}` | Get one |
| PATCH | `/api/memories/{id}` | Update pin / flag / content / importance / session-only |
| DELETE | `/api/memories/{id}` | Delete |

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

Used by the frontend on page load to detect installed models and auto-select.

### WebSocket

```
WS /ws/memories
```
Events: `memory_created`, `memory_updated`, `memory_deleted`, `contradiction_detected`

### Health

```
GET /api/health   →  { "status": "ok", "ollama": "connected", "model": "..." }
```

---

## Memory Card Controls

| Control | Action |
|---------|--------|
| 📌 Pin | Locks memory permanently — never decays, never auto-deleted |
| Importance chip (click) | Opens inline 1–10 slider to adjust importance and persist |
| ⬇ Flag | Marks as unimportant — lower deletion threshold, safe for auto-cleanup |
| 🕐 Session-only badge | Identifies session-scoped memories; click refresh icon to toggle |
| 🗑 Delete | Immediate manual deletion from SQLite + ChromaDB |

---

## Memory Inspector Panel

The right panel groups memories into four sections:

| Section | Contents |
|---------|----------|
| **Pinned** | Manually pinned memories (never decay) |
| **Conflicts** | Memories flagged with contradictions — needs resolution |
| **Cross-session** | Persistent long-term memories (identity, preferences, skills) |
| **Session only** | Transient facts from the current conversation; fade 10× faster |

Use the **search bar** (magnifying glass icon) to filter across all memory content.
Use the **export** button (download icon) to save all memories as a JSON file.
Use the **import** button (upload icon) to restore memories from a JSON backup.

---

## Image / Vision Support

Click the **`+`** button in the chat input to attach images.

- If the selected model supports vision (llava, llama3.2-vision, moondream, qwen2-vl, gemma3, etc.), images are sent with the message.
- If the model does **not** support vision, a warning banner appears instead.
- Vision capability is detected by model name pattern — no extra API calls needed.
- Custom API connections (OpenAI, Groq, etc.) are assumed to be vision-capable.

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
print(result.sources)         # [{content, score, metadata}, ...]
print(result.correction_applied)  # True if verifier rewrote the answer
```

It uses the **same** all-MiniLM-L6-v2 embeddings, the **same** ChromaDB collection, and the **same** LLM client as the backend — one source of truth for all retrieval and generation.

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

Override any of these via environment variables or a `.env` file in `backend/`.

---

## Demo Scenarios

1. **Set your profile** — open Settings (⚙ gear icon), fill "Who am I?", save. Now every response is personalised without you re-explaining yourself.

2. **Cross-session memory** — tell Memora something ("I'm learning Rust"), close the tab, reopen. Start a new chat — it still knows.

3. **Analytics** — open Settings → Analytics tab to see total memories, pinned count, conflict count, session-only count, average importance, average health, and your top 3 memories.

4. **Image analysis** — switch to `llava:7b` in the model selector, click `+`, upload a screenshot or photo, ask "what's in this image?".

5. **Contradiction detection** — say "I love spicy food", then "I hate anything spicy". Watch the red conflict badge appear in the Memory Inspector under the Conflicts section.

6. **Importance tuning** — click the importance chip on any memory card to open the slider; drag it, hit Save. The new score immediately affects retrieval ranking.

7. **Memory health** — flag a memory as unimportant. Come back after a few days and watch its decay bar shrink. The curator background job will eventually auto-delete it.

8. **Session-only vs cross-session** — ask Memora to "write a Python script to sort a list". The task request is excluded from memory entirely. Mention "I really enjoy Python" — that gets stored as a cross-session preference at importance 7.

9. **Custom API** — click the model selector → "Custom API key…", paste an OpenAI (or Groq/Together/etc.) base URL and key. The entire memory + context pipeline still runs locally; only the final LLM call goes to the cloud.

10. **Export / import memories** — use the download button in the Memory Inspector to backup all memories, then restore them later with the upload button.
