import type { MemoryData } from '../api/client';
import type { ChatMessage, ChatSession } from '../store/memoryStore';

const D = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

export const DEMO_MEMORIES: MemoryData[] = [
  // ── Pinned core identity ──────────────────────────────────────────────────
  {
    id: 'demo-1', user_id: 'default', session_id: null,
    content: "User's name is Alex Chen",
    importance: 9.5, decay_score: 1.0, lambda_rate: 0.05,
    is_pinned: true, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 22,
    created_at: D(14), last_accessed_at: D(0.5), updated_at: D(14),
  },
  {
    id: 'demo-6', user_id: 'default', session_id: null,
    content: 'Alex follows a vegetarian diet',
    importance: 8.5, decay_score: 1.0, lambda_rate: 0.05,
    is_pinned: true, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 9,
    created_at: D(6), last_accessed_at: D(1), updated_at: D(6),
  },
  {
    id: 'demo-15', user_id: 'default', session_id: null,
    content: 'Alex is allergic to shellfish — never suggest dishes containing it',
    importance: 9.0, decay_score: 1.0, lambda_rate: 0.05,
    is_pinned: true, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 5,
    created_at: D(0), last_accessed_at: D(0), updated_at: D(0),
  },
  // ── High-importance long-term ─────────────────────────────────────────────
  {
    id: 'demo-2', user_id: 'default', session_id: null,
    content: 'Alex is a senior full-stack developer at a fintech startup in San Francisco',
    importance: 8.5, decay_score: 0.92, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 11,
    created_at: D(12), last_accessed_at: D(1), updated_at: D(12),
  },
  {
    id: 'demo-13', user_id: 'default', session_id: null,
    content: "Alex is building a memory-aware AI assistant called Memora as a side project",
    importance: 8.0, decay_score: 0.96, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 7,
    created_at: D(1), last_accessed_at: D(0.5), updated_at: D(1),
  },
  {
    id: 'demo-3', user_id: 'default', session_id: null,
    content: 'Alex prefers TypeScript over plain JavaScript for all new projects',
    importance: 7.5, decay_score: 0.88, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 8,
    created_at: D(10), last_accessed_at: D(2), updated_at: D(10),
  },
  {
    id: 'demo-4', user_id: 'default', session_id: null,
    content: 'Primary tech stack: React + FastAPI + PostgreSQL',
    importance: 7.0, decay_score: 0.85, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 6,
    created_at: D(8), last_accessed_at: D(3), updated_at: D(8),
  },
  {
    id: 'demo-7', user_id: 'default', session_id: null,
    content: 'Alex lives in San Francisco, CA',
    importance: 7.0, decay_score: 0.87, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 4,
    created_at: D(5), last_accessed_at: D(2), updated_at: D(5),
  },
  {
    id: 'demo-8', user_id: 'default', session_id: null,
    content: 'Alex is actively learning Rust for systems programming',
    importance: 6.5, decay_score: 0.82, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 3,
    created_at: D(4), last_accessed_at: D(3), updated_at: D(4),
  },
  // ── Conflicting pair ──────────────────────────────────────────────────────
  {
    id: 'demo-9', user_id: 'default', session_id: null,
    content: 'Alex strongly prefers working fully remotely',
    importance: 6.0, decay_score: 0.79, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: ['demo-10'], access_count: 5,
    created_at: D(4), last_accessed_at: D(2), updated_at: D(4),
  },
  {
    id: 'demo-10', user_id: 'default', session_id: null,
    content: 'Alex recently started going to the office three days a week',
    importance: 5.5, decay_score: 0.81, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: ['demo-9'], access_count: 3,
    created_at: D(3), last_accessed_at: D(1), updated_at: D(3),
  },
  // ── Moderate importance ───────────────────────────────────────────────────
  {
    id: 'demo-5', user_id: 'default', session_id: null,
    content: 'Alex enjoys rock climbing on weekends — goes to Mission Cliffs gym',
    importance: 6.0, decay_score: 0.78, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 4,
    created_at: D(7), last_accessed_at: D(4), updated_at: D(7),
  },
  {
    id: 'demo-11', user_id: 'default', session_id: null,
    content: "Alex has a golden retriever named Max",
    importance: 5.0, decay_score: 0.73, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 2,
    created_at: D(3), last_accessed_at: D(3), updated_at: D(3),
  },
  {
    id: 'demo-12', user_id: 'default', session_id: null,
    content: 'Alex uses VS Code with Vim keybindings as primary editor',
    importance: 4.5, decay_score: 0.68, lambda_rate: 0.05,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: false,
    contradiction_with: [], access_count: 2,
    created_at: D(2), last_accessed_at: D(2), updated_at: D(2),
  },
  // ── Session-only ──────────────────────────────────────────────────────────
  {
    id: 'demo-14', user_id: 'default', session_id: 'demo-session',
    content: 'Currently debugging a React useEffect infinite loop in the Memora frontend',
    importance: 2.0, decay_score: 0.6, lambda_rate: 0.5,
    is_pinned: false, is_flagged_unimportant: false, is_session_only: true,
    contradiction_with: [], access_count: 1,
    created_at: D(0), last_accessed_at: D(0), updated_at: D(0),
  },
];

export const DEMO_SESSION_ID = 'demo-session';

export const DEMO_SESSION: ChatSession = {
  id: DEMO_SESSION_ID,
  title: 'Debugging React hooks',
  createdAt: Date.now() - 4_000_000,
  lastUpdated: Date.now() - 200_000,
  lastMessage: "That's exactly the fix — remove `data` from the dependency array.",
};

export const DEMO_MESSAGES: ChatMessage[] = [
  {
    role: 'user',
    content: "Hey! Can you help me debug this React hook? I think there's an infinite loop.",
    timestamp: Date.now() - 3_800_000,
  },
  {
    role: 'assistant',
    content:
      "Hi Alex! Infinite loops in hooks are almost always a **useEffect dependency array** issue.\n\nSince you're building Memora in React + TypeScript, I'm guessing this is in one of your frontend components?\n\nShare the code and I'll take a look 🔍",
    memoriesUsed: ['demo-1', 'demo-2', 'demo-13'],
    timestamp: Date.now() - 3_790_000,
  },
  {
    role: 'user',
    content: "Here's the hook:\n```ts\nuseEffect(() => {\n  fetchData();\n}, [data]);\n```",
    timestamp: Date.now() - 3_600_000,
  },
  {
    role: 'assistant',
    content:
      "Found it! 🎯\n\nYou're including `data` in the dependency array, but `fetchData()` updates `data` — which re-triggers the effect. Classic circular dependency.\n\n**Fix:**\n```ts\nuseEffect(() => {\n  fetchData();\n}, []); // run once on mount\n```\n\nOr if you truly need to re-fetch when something changes, use a different trigger value (like an ID or a dedicated `refetchKey` state) — never the data itself.\n\nWant me to walk through the Zustand pattern you're using in your store?",
    memoriesUsed: ['demo-1', 'demo-13', 'demo-3'],
    timestamp: Date.now() - 3_580_000,
  },
  {
    role: 'user',
    content: "That makes sense! Also, should I use useCallback for fetchData?",
    timestamp: Date.now() - 300_000,
  },
  {
    role: 'assistant',
    content:
      "Yes — wrap `fetchData` in `useCallback` if it's defined inside the component and passed as a dep:\n\n```ts\nconst fetchData = useCallback(async () => {\n  const result = await api.get('/data');\n  setData(result);\n}, []); // stable reference\n\nuseEffect(() => {\n  fetchData();\n}, [fetchData]);\n```\n\nThis keeps the reference stable so the effect doesn't re-run on every render. Since you prefer TypeScript, make sure to type the return: `useCallback<() => Promise<void>>`.",
    memoriesUsed: ['demo-1', 'demo-3'],
    timestamp: Date.now() - 280_000,
  },
];
