# Memora — Design Specification

An AI agent with a persistent, evolving belief system. Not a database — a memory architecture with semantic deduplication, contradiction detection, Ebbinghaus decay, and user-controlled memory curation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | FastAPI monolith + async background tasks | Right complexity for local single-user; easy to debug, all state in one place |
| LLM | Ollama (qwen2.5-coder:7b) | Local, free, fast, OpenAI-compatible API |
| Embedding model | all-MiniLM-L6-v2 (sentence-transformers) | Fast local inference, good semantic quality for this scale |
| NLI model | cross-encoder/nli-deberta-v3-small | Small but accurate entailment/contradiction classifier |
| Vector store | ChromaDB | Simple setup, metadata filtering, cosine similarity built-in |
| Metadata store | SQLite via SQLAlchemy | Lightweight, zero-config, perfect for local tool |
| Frontend | Vite + React + Tailwind + themes | Polished UI with theme support, fast dev cycle |
| State management | Zustand | Minimal boilerplate for memory store + WebSocket sync |
| User scoping | user_id from day one, no auth yet | Multi-user ready without auth overhead now |
| Real-time updates | WebSocket for memory inspector | Live decay, contradiction, and CRUD updates |

---

## Architecture

### System overview

```
Browser (React SPA)
  |
  |-- REST  POST /api/chat         --> Chat router --> LLM service + Memory retriever
  |-- REST  GET/PATCH/DELETE /api/memories --> Memory router --> SQLite + ChromaDB
  |-- WS    /ws/memories            --> Live memory state push
  |
FastAPI (single process)
  |
  |-- Services layer
  |     |-- llm.py           : Ollama HTTP client (streaming optional)
  |     |-- embeddings.py    : sentence-transformers wrapper
  |     |-- vector_store.py  : ChromaDB wrapper
  |     |-- memory_writer.py : write pipeline (classify, embed, dedup, store)
  |     |-- memory_retriever.py : retrieval + re-ranking + decay
  |     |-- contradiction.py : NLI cross-encoder
  |     |-- curator.py       : scheduled decay + merge + cleanup
  |     |-- broadcaster.py   : WebSocket connection manager
  |
  |-- Storage
        |-- SQLite  : memory metadata (importance, decay, flags, timestamps, contradiction links)
        |-- ChromaDB: embeddings + metadata filtering
```

### Request flow: chat message

1. User sends message via `POST /api/chat`
2. Embed the user query using sentence-transformers
3. Retrieve top-20 candidates from ChromaDB by cosine similarity
4. Re-rank by: `(cosine_sim * 0.5) + (recency_weight * 0.3) + (importance * 0.2)`
5. Apply decay: `score * exp(-lambda * days_since_access)`
6. Take top-5, assemble as "Memory context:" block in system prompt
7. Call Ollama with system prompt + memory context + conversation history
8. Return response to user
9. **Background task**: run write pipeline on the user message + agent response

### Write pipeline (background task)

1. Ask Ollama: "Is this worth remembering?" (classify)
2. If yes: generate embedding via sentence-transformers
3. Cosine similarity check against existing memories (threshold ~0.92)
   - Near-duplicate found (>=0.92): update access timestamp, skip write
   - New memory: assign importance score (Ollama: "rate 1-10"), compute decay seed
4. Write vector to ChromaDB + metadata to SQLite
5. Trigger contradiction check on semantically close memories (cosine_sim > 0.75)
6. Broadcast update via WebSocket to memory inspector

### Contradiction detector (runs after every write)

1. Find all existing memories with cosine_sim > 0.75 to the new memory
2. For each pair: run NLI cross-encoder (nli-deberta-v3-small)
   - Labels: entailment / neutral / contradiction
3. If contradiction detected:
   - Flag both records in SQLite (`contradiction_with: [memory_id]`)
   - On next retrieval: surface the conflict to the LLM
   - LLM decides: which is newer/more reliable? Resolve or ask user
4. Broadcast contradiction to memory inspector via WebSocket

### Memory curator (runs on session end + configurable interval)

1. For each memory: compute `current_score = base_score * exp(-lambda * days_since_last_access)`
2. If `current_score < 0.15` AND memory is not pinned AND not flagged important: mark for deletion
3. If memory is flagged unimportant by user: lower deletion threshold to 0.30
4. Find clusters of similar memories (cosine_sim > 0.88):
   - Merge into a single summarized memory (call Ollama to summarize N->1)
   - Preserve highest importance score + most recent timestamp
5. Execute deletions: remove from both ChromaDB and SQLite
6. Broadcast changes via WebSocket

---

## Data Model

### SQLite: `memories` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique memory identifier |
| user_id | TEXT | User scoping (default: "default") |
| session_id | TEXT | Session that created this memory |
| content | TEXT | The memory text |
| importance | FLOAT | 1-10 score from LLM |
| decay_score | FLOAT | Current computed decay value |
| lambda_rate | FLOAT | Decay rate constant (default 0.05) |
| is_pinned | BOOLEAN | User pinned — never decays, never auto-deleted |
| is_flagged_unimportant | BOOLEAN | User flagged — safe for LLM to auto-clean |
| contradiction_with | JSON | List of memory IDs this contradicts |
| access_count | INTEGER | Times retrieved for context |
| created_at | DATETIME | When the memory was created |
| last_accessed_at | DATETIME | Last time retrieved or updated |
| updated_at | DATETIME | Last modification timestamp |

### SQLite: `sessions` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Session identifier |
| user_id | TEXT | User this session belongs to |
| started_at | DATETIME | Session start |
| ended_at | DATETIME | Session end (nullable) |

### ChromaDB collection: `memora_memories`

Each document stored with:
- **id**: matches SQLite memory UUID
- **embedding**: from sentence-transformers
- **document**: the memory text
- **metadata**: `{ user_id, importance, created_at }`

---

## API Endpoints

### Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send message, get response with memory-augmented context |

**Request body:**
```json
{
  "message": "string",
  "session_id": "string (optional, auto-generated if missing)",
  "user_id": "string (optional, default: 'default')"
}
```

**Response:**
```json
{
  "response": "string",
  "memories_used": ["uuid", ...],
  "session_id": "string"
}
```

### Memories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/memories` | List all memories for user (with decay scores, flags) |
| GET | `/api/memories/{id}` | Get single memory details |
| PATCH | `/api/memories/{id}` | Update: pin, flag unimportant, edit content |
| DELETE | `/api/memories/{id}` | Manual delete |

**PATCH body (all fields optional):**
```json
{
  "is_pinned": true,
  "is_flagged_unimportant": false,
  "content": "updated text (re-embeds)"
}
```

### WebSocket

| Path | Description |
|------|-------------|
| `/ws/memories` | Pushes real-time updates: new memories, decay changes, contradictions, deletions |

**Message format (server -> client):**
```json
{
  "event": "memory_created | memory_updated | memory_deleted | contradiction_detected",
  "data": { ... }
}
```

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server status, model load status, DB connectivity |

---

## Frontend

### Layout

Two-panel layout:
- **Left (main)**: Chat window — message bubbles, input bar
- **Right (sidebar)**: Memory inspector — scrollable list of memory cards, sortable by importance/recency/decay

### Memory card anatomy

Each card displays:
- **Content**: the memory text
- **Importance chip**: score 1-10 with color coding
- **Decay bar**: visual meter (green > yellow > red as it decays)
- **Contradiction badge**: red warning if conflicting memory exists, shows the conflict
- **Pinned badge**: green lock icon for pinned memories (decay bar stays full)
- **Action icons**:
  - Pin (lock icon): mark as important, prevents auto-deletion and decay
  - Flag down (arrow icon): mark as unimportant, safe for auto-cleanup
  - Delete (trash icon): immediate manual deletion
- **Timestamp**: relative time since creation

### Themes

Minimum two themes:
- **Dark** (default): dark slate backgrounds, high contrast text
- **Light**: clean white/gray, soft shadows

Theme toggle in the top bar. Themes defined via CSS variables in Tailwind config, switched by a class on `<html>`. Stored in localStorage.

### State management

Zustand store with:
- `memories[]`: all memories for current user
- `addMemory()`, `updateMemory()`, `removeMemory()`: synced via WebSocket
- `chatMessages[]`: conversation history
- `theme`: current theme name

### WebSocket hook

`useWebSocket.ts` connects to `/ws/memories` on mount, dispatches events to Zustand store. Auto-reconnects on disconnect with exponential backoff.

---

## File Structure

```
memora/
  backend/
    main.py              # FastAPI app, lifespan events, CORS
    config.py            # Settings via pydantic-settings
    database.py          # SQLAlchemy engine + session factory
    models/
      __init__.py
      memory.py          # Memory ORM model
      session.py         # Session ORM model
    schemas/
      __init__.py
      memory.py          # Pydantic request/response schemas
      chat.py            # ChatRequest, ChatResponse
    routers/
      __init__.py
      chat.py            # POST /api/chat
      memories.py        # CRUD /api/memories
      websocket.py       # WS /ws/memories
      health.py          # GET /api/health
    services/
      __init__.py
      llm.py             # Ollama HTTP client
      embeddings.py      # sentence-transformers wrapper
      vector_store.py    # ChromaDB client wrapper
      memory_writer.py   # Write pipeline orchestration
      memory_retriever.py # Retrieval + re-ranking + decay
      contradiction.py   # NLI cross-encoder inference
      curator.py         # Decay computation + merge + cleanup
      broadcaster.py     # WebSocket connection manager
    requirements.txt
    .env.example
  frontend/
    src/
      main.tsx
      App.tsx             # Layout shell, theme provider, router
      components/
        Chat/
          ChatWindow.tsx
          MessageBubble.tsx
          ChatInput.tsx
        MemoryInspector/
          MemoryInspector.tsx   # Sidebar panel, sorting, filtering
          MemoryCard.tsx        # Single card with all controls
          DecayBar.tsx          # Animated decay meter
          ConflictBadge.tsx     # Contradiction warning + link
          ImportanceChip.tsx    # Score badge with color
        Layout/
          Sidebar.tsx
          ThemeToggle.tsx
      hooks/
        useChat.ts
        useMemories.ts
        useWebSocket.ts       # Live inspector updates
      store/
        memoryStore.ts        # Zustand store
      api/
        client.ts             # Axios/fetch wrapper
      styles/
        themes.ts             # Theme CSS variable definitions
        index.css             # Tailwind imports + base styles
    index.html
    package.json
    vite.config.ts
    tailwind.config.ts
    tsconfig.json
  .gitignore
  .env.example
```

---

## Key Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Dedup threshold | 0.92 cosine similarity | Skip write if near-duplicate found |
| Contradiction search | 0.75 cosine similarity | Find semantically close memories for NLI |
| Merge cluster threshold | 0.88 cosine similarity | Group for summarization |
| Decay lambda | 0.05 (default) | Ebbinghaus forgetting curve rate |
| Deletion threshold | 0.15 (normal), 0.30 (flagged unimportant) | Below this = candidate for deletion |
| Retrieval candidates | Top-20 from ChromaDB | Before re-ranking |
| Context memories | Top-5 after re-rank | Injected into system prompt |
| Re-rank weights | cosine 0.5, recency 0.3, importance 0.2 | Balances relevance, freshness, significance |

---

## What makes this hard (and impressive)

1. **Semantic deduplication**: "prefers dark mode" vs "likes dark interfaces" must be caught as the same belief. Threshold tuning is critical.

2. **Contradiction resolution**: NLI will flag "lives in Mumbai" vs "lives in Bangalore" correctly, but may also flag "prefers Python" vs "learning Rust" as a contradiction (it isn't). The LLM must adjudicate.

3. **Decay without amnesia**: Ebbinghaus curves work, but pinned memories (user's name, critical preferences) must have a decay floor of 1.0. Separation of access-decay from importance-floors is subtle.

4. **User control layer**: The pin/flag/delete system adds a human-in-the-loop override on top of the automated belief system. The curator must respect these flags absolutely.

5. **Cross-session coherence**: Memory state must load correctly after days/weeks. Session isolation by user_id. No cross-contamination.

---

## Demo targets

Three things that win the room:

1. **Cross-session memory** — close chat, reopen, agent remembers a preference from last session
2. **Contradiction surfacing** — say "I love spicy food", later say "I hate spicy food", watch the agent flag and resolve
3. **Memory inspector** — live panel showing stored memories with importance scores, decay bars, contradiction flags, and user pin/flag/delete controls
