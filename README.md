# Memora — Context-Aware AI Agent with Persistent Memory

Memora is an AI agent with a persistent, evolving belief system. Not a database — a memory architecture that tracks what the agent believes, how confident it is, when that belief was formed, and whether two beliefs conflict.

---

## Features

- **Persistent cross-session memory** — remembers user facts, preferences, and context across conversations
- **User context profile** — fill in a "Who am I" description in Settings; injected into every AI response so the model always knows who it's talking to
- **Context file persistence** — user profile saved to `backend/data/context_<user_id>.json`; survived restarts, readable by external tools
- **Semantic deduplication** — "prefers dark mode" and "likes dark interfaces" are the same belief
- **Contradiction detection** — NLI model flags conflicting beliefs; LLM adjudicates
- **Ebbinghaus decay** — memories fade naturally; pinned memories never decay
- **User memory controls** — pin (keep forever), flag (safe to auto-delete), or manually delete any memory
- **Image / vision support** — attach PNG/JPG/GIF/WebP images; `+` button activates for vision-capable models (llava, llama3.2-vision, moondream, etc.)
- **Auto model detection** — on page load, fetches installed Ollama models and auto-selects one if the stored model isn't available; vision badge 👁 shown on supported models
- **Multi-model support** — choose any locally installed Ollama model, or connect any OpenAI-compatible API with a custom key
- **Persistent chat history** — sessions saved to localStorage, accessible from the left sidebar
- **Live memory inspector** — real-time sidebar showing importance, decay bars, and conflict badges via WebSocket
- **Neomorphism UI** — full light/dark theme with neumorphic shadow system

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
| State | Zustand + localStorage |
| Realtime | WebSocket (FastAPI native) |

---

## File Structure

```
memora/
├── backend/
│   ├── main.py                   # FastAPI app, lifespan, CORS
│   ├── config.py                 # pydantic-settings env config
│   ├── database.py               # SQLAlchemy async engine
│   ├── requirements.txt
│   ├── data/                     # ← auto-created at runtime
│   │   └── context_default.json  # persisted user profile (per user_id)
│   ├── models/
│   │   ├── memory.py             # Memory ORM model
│   │   └── session.py            # Session ORM model
│   ├── schemas/
│   │   ├── memory.py             # Pydantic memory schemas
│   │   └── chat.py               # ChatRequest / ChatResponse
│   ├── routers/
│   │   ├── chat.py               # POST /api/chat  (injects context + memories)
│   │   ├── memories.py           # CRUD  /api/memories
│   │   ├── context.py            # GET/POST /api/context  ← NEW
│   │   ├── websocket.py          # WS    /ws/memories
│   │   └── health.py             # GET /api/health, /api/models
│   └── services/
│       ├── llm.py                # Ollama + OpenAI-compatible + vision
│       ├── embeddings.py         # sentence-transformers wrapper
│       ├── vector_store.py       # ChromaDB wrapper
│       ├── memory_writer.py      # write pipeline (classify→embed→store)
│       ├── memory_retriever.py   # retrieval + re-ranking + decay
│       ├── contradiction.py      # NLI cross-encoder
│       ├── curator.py            # decay computation + merge + cleanup
│       ├── context_manager.py    # read/write context JSON files  ← NEW
│       └── broadcaster.py        # WebSocket connection manager
└── frontend/
    └── src/
        ├── App.tsx               # layout + auto session init + model detection
        ├── api/client.ts         # axios wrapper + all API types (incl. contextApi)
        ├── store/memoryStore.ts  # Zustand store (sessions, model, profile, installedModels)
        ├── utils/visionModels.ts # pattern-match vision capability detection
        ├── hooks/
        │   ├── useChat.ts        # send message + image forwarding
        │   ├── useMemories.ts    # pin/flag/delete memories
        │   └── useWebSocket.ts   # live memory updates
        └── components/
            ├── Chat/
            │   ├── ChatWindow.tsx
            │   ├── MessageBubble.tsx   # renders image grids + text
            │   └── ChatInput.tsx       # textarea + image attach + ModelSelector
            ├── MemoryInspector/
            │   ├── MemoryInspector.tsx
            │   ├── MemoryCard.tsx
            │   ├── DecayBar.tsx
            │   ├── ConflictBadge.tsx
            │   └── ImportanceChip.tsx
            └── Layout/
                ├── ChatHistory.tsx     # left sidebar: session list
                ├── ModelSelector.tsx   # model dropdown + installed badges + custom API
                ├── SettingsModal.tsx   # "Who am I" profile + context sync  ← NEW
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

The `data/` directory is created automatically on first run.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## How Context Awareness Works

Every chat request goes through three layers before reaching the LLM:

```
User message
    │
    ▼
1. Load context file  ─── backend/data/context_default.json
    │                      { "user_profile": "I'm Kabir, a developer..." }
    ▼
2. Retrieve memories  ─── ChromaDB vector search → re-ranked top-5
    │                      "- prefers dark mode (importance: 8.0)"
    ▼
3. Build system prompt ── profile + memories injected before every reply
    │
    ▼
LLM response
```

The **user profile** is set once in Settings → "Who am I?" and persists to disk.
**Memories** are auto-extracted from every conversation and build up over time.
Together they make every response genuinely context-aware, even across sessions.

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
| PATCH | `/api/memories/{id}` | Pin / flag / edit content |
| DELETE | `/api/memories/{id}` | Delete |

**PATCH body** (all fields optional):
```json
{ "is_pinned": true, "is_flagged_unimportant": false, "content": "updated text" }
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

## Memory Card Controls

| Icon | Action |
|------|--------|
| 📌 Pin | Locks memory permanently — never decays, never auto-deleted |
| ⬇ Flag | Marks as unimportant — lower deletion threshold, safe for auto-cleanup |
| 🗑 Delete | Immediate manual deletion from SQLite + ChromaDB |

---

## Key Parameters (`config.py`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `dedup_threshold` | 0.92 | Skip write if near-duplicate exists |
| `contradiction_threshold` | 0.75 | Cosine threshold for NLI pairs |
| `merge_threshold` | 0.88 | Cosine threshold for summarization merge |
| `decay_lambda` | 0.05 | Ebbinghaus forgetting curve rate |
| `deletion_threshold` | 0.15 | Auto-delete below this score |
| `deletion_threshold_unimportant` | 0.30 | Higher threshold for flagged memories |
| `retrieval_candidates` | 20 | Top-N from ChromaDB before re-rank |
| `context_memories` | 5 | Memories injected into system prompt |

Override any of these via environment variables or a `.env` file in `backend/`.

---

## Demo Scenarios

1. **Set your profile** — open Settings (⚙ gear icon), fill "Who am I?", save. Now every response is personalised without you re-explaining yourself.

2. **Cross-session memory** — tell Memora something ("I'm learning Rust"), close the tab, reopen. Start a new chat — it still knows.

3. **Image analysis** — switch to `llava:7b` in the model selector, click `+`, upload a screenshot or photo, ask "what's in this image?".

4. **Contradiction detection** — say "I love spicy food", then "I hate anything spicy". Watch the red conflict badge appear in the Memory Inspector.

5. **Model switching** — swap between installed models mid-conversation. The model selector shows a green "installed" badge on anything available locally, and a 👁 badge on vision models.

6. **Decay in action** — flag a memory as unimportant. Come back after a few days and watch its decay bar shrink. The curator background job will eventually auto-delete it.

7. **Custom API** — click the model selector → "Custom API key…", paste an OpenAI (or Groq/Together/etc.) base URL and key. The entire memory + context pipeline still runs locally; only the final LLM call goes to the cloud.
