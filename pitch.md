# Cortex: Context-Aware AI Agent with Persistent Memory

## Project Overview

Cortex is an innovative AI agent that maintains persistent, evolving memory across sessions. Unlike traditional chatbot frameworks that treat memory as simple storage, Cortex implements a sophisticated belief system that tracks what the agent knows, how confident it is, when knowledge was acquired, and whether conflicting information exists.

---

## Problem Statement

Current AI assistants have a critical limitation: they **forget everything** after each conversation. Users must repeatedly share preferences, facts, and context. Existing solutions treat memory as simple key-value storage, missing crucial aspects of human memory:

- **Belief confidence** — not all information is equally certain
- **Contradictions** — conflicting information goes undetected  
- **Natural decay** — unimportant memories should fade over time
- **Semantic relationships** — similar meanings should be recognized

---

## Key Features

### 1. Persistent Cross-Session Memory
Memories persist across conversations. The agent recalls user preferences, facts, and context from previous sessions.

### 2. Semantic Deduplication
The system understands that "prefers dark mode" and "likes dark interfaces" represent the same belief, preventing memory bloat.

### 3. Contradiction Detection
Uses NLI (Natural Language Inference) to detect conflicting beliefs. When a user states contradictory information, the system flags it and uses LLM adjudication to resolve.

### 4. Ebbinghaus Decay
Implements the forgetting curve — memories naturally fade over time unless reinforced. Pinned memories never decay.

### 5. User Memory Controls
- **Pin** — keep memory forever
- **Flag** — mark as unimportant (lower retention threshold)
- **Delete** — manual removal

### 6. Multi-Model Support
Works with any Ollama model or any OpenAI-compatible API endpoint.

### 7. Live Memory Inspector
Real-time sidebar showing importance scores, decay visualization, and conflict badges via WebSocket.

---

## Technical Architecture

| Component | Technology |
|-----------|------------|
| Backend | FastAPI + async SQLAlchemy |
| Database | SQLite (metadata) + ChromaDB (vectors) |
| Embeddings | sentence-transformers |
| Contradiction Detection | cross-encoder NLI model |
| LLM | Ollama / OpenAI-compatible API |
| Frontend | Vite + React 19 + TypeScript + Tailwind |
| Realtime | WebSocket |

---

## Innovation Highlights

1. **Belief System, Not Database** — Tracks confidence levels and formation timestamps
2. **NLI-Powered Contradiction Detection** — Automatically detects conflicting memories
3. **Psychologically-Inspired Decay** — Ebbinghaus forgetting curve for natural memory management
4. **Semantic Understanding** — Knows that "dark mode" and "dark interface" are the same

---

## Use Cases

- **Personal AI Assistant** — Remembers preferences, habits, and context
- **Customer Service** — Maintains customer history across interactions
- **Education** — Tracks student learning history and misconceptions
- **Research** — Maintains belief state about evolving knowledge domains

---

## Demo Scenarios

1. **Cross-session memory** — Close chat, reopen, agent recalls previous preferences
2. **Contradiction detection** — Say "I love spicy food" then "I hate anything spicy" — conflict badge appears
3. **Model switching** — Switch between local and cloud AI models mid-conversation
4. **Memory inspector** — Live sidebar with decay bars and conflict visualization

---

## Setup Requirements

- Python 3.10+
- Node.js 18+
- Ollama (optional, for local models)

---

## Conclusion

Cortex represents a significant step forward in AI memory architecture. By implementing a belief system rather than simple storage, it brings AI assistants closer to human-like memory retention and reasoning. This project demonstrates advanced understanding of memory psychology, semantic processing, and real-time systems.
