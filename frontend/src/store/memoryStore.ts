import { create } from 'zustand';
import type { MemoryData } from '../api/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  memoriesUsed?: string[];
  images?: string[];   // data URLs for display
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  lastMessage: string;
}

export interface CustomModelConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

const SESSIONS_KEY    = 'memora-sessions';
const MSGS_PREFIX     = 'memora-msgs-';
const MODEL_KEY       = 'memora-model';
const CUSTOM_CFG_KEY  = 'memora-custom-cfg';
const THEME_KEY       = 'memora-theme';
const HISTORY_KEY     = 'memora-history-open';
const PROFILE_KEY     = 'memora-user-profile';

function msgsKey(sessionId: string) {
  return MSGS_PREFIX + sessionId;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface MemoryStore {
  // Chat sessions
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];   // messages for the active session

  // Model config
  selectedModel: string;
  customConfig: CustomModelConfig | null;
  installedModels: string[];   // populated from /api/models on app load

  // User profile (persisted to localStorage + synced to backend)
  userProfile: string;

  // UI
  theme: 'light' | 'dark';
  historyOpen: boolean;

  // Memories (from backend)
  memories: MemoryData[];

  // ── Actions ──────────────────────────────────────────────────────────────
  // Sessions
  createSession: () => string;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  updateSessionMeta: (id: string, lastMessage: string) => void;

  // Messages
  addMessage: (msg: Omit<ChatMessage, 'timestamp'>) => void;
  setActiveSessionId: (id: string) => void;

  // Model
  setSelectedModel: (model: string) => void;
  setCustomConfig: (cfg: CustomModelConfig | null) => void;
  setInstalledModels: (models: string[]) => void;

  // User profile
  setUserProfile: (profile: string) => void;

  // Danger zone
  clearAllHistory: () => void;

  // Theme
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // History panel
  toggleHistory: () => void;

  // Memories
  setMemories: (memories: MemoryData[]) => void;
  addMemory: (memory: MemoryData) => void;
  updateMemory: (memory: MemoryData) => void;
  removeMemory: (id: string) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  sessions: LS.get<ChatSession[]>(SESSIONS_KEY, []),
  activeSessionId: null,
  messages: [],

  selectedModel: LS.get<string>(MODEL_KEY, 'qwen2.5-coder:7b'),
  customConfig: LS.get<CustomModelConfig | null>(CUSTOM_CFG_KEY, null),
  installedModels: [],

  userProfile: LS.get<string>(PROFILE_KEY, ''),

  theme: LS.get<'light' | 'dark'>(THEME_KEY, 'dark'),
  historyOpen: LS.get<boolean>(HISTORY_KEY, true),

  memories: [],

  // ── Sessions ─────────────────────────────────────────────────────────────

  createSession: () => {
    const id = crypto.randomUUID();
    const session: ChatSession = {
      id,
      title: 'New chat',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      lastMessage: '',
    };
    const sessions = [session, ...get().sessions];
    LS.set(SESSIONS_KEY, sessions);
    LS.set(msgsKey(id), []);
    set({ sessions, activeSessionId: id, messages: [] });
    return id;
  },

  loadSession: (id) => {
    const messages = LS.get<ChatMessage[]>(msgsKey(id), []);
    set({ activeSessionId: id, messages });
  },

  deleteSession: (id) => {
    LS.remove(msgsKey(id));
    const sessions = get().sessions.filter((s) => s.id !== id);
    LS.set(SESSIONS_KEY, sessions);
    const active = get().activeSessionId;
    if (active === id) {
      const next = sessions[0];
      if (next) {
        const messages = LS.get<ChatMessage[]>(msgsKey(next.id), []);
        set({ sessions, activeSessionId: next.id, messages });
      } else {
        set({ sessions, activeSessionId: null, messages: [] });
      }
    } else {
      set({ sessions });
    }
  },

  updateSessionMeta: (id, lastMessage) => {
    const sessions = get().sessions.map((s) => {
      if (s.id !== id) return s;
      const title =
        s.title === 'New chat' && lastMessage
          ? lastMessage.slice(0, 40) + (lastMessage.length > 40 ? '…' : '')
          : s.title;
      return { ...s, title, lastMessage, lastUpdated: Date.now() };
    });
    LS.set(SESSIONS_KEY, sessions);
    set({ sessions });
  },

  // ── Messages ─────────────────────────────────────────────────────────────

  addMessage: (msg) => {
    const full: ChatMessage = { ...msg, timestamp: Date.now() };
    const messages = [...get().messages, full];
    const activeSessionId = get().activeSessionId;
    if (activeSessionId) {
      LS.set(msgsKey(activeSessionId), messages);
    }
    set({ messages });
  },

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  // ── Model ─────────────────────────────────────────────────────────────────

  setSelectedModel: (model) => {
    LS.set(MODEL_KEY, model);
    set({ selectedModel: model });
  },

  setCustomConfig: (cfg) => {
    LS.set(CUSTOM_CFG_KEY, cfg);
    set({ customConfig: cfg });
  },

  setInstalledModels: (models) => set({ installedModels: models }),

  // ── User profile ──────────────────────────────────────────────────────────

  setUserProfile: (profile) => {
    LS.set(PROFILE_KEY, profile);
    set({ userProfile: profile });
  },

  // ── Danger zone ──────────────────────────────────────────────────────────

  clearAllHistory: () => {
    // Wipe every stored message list
    get().sessions.forEach((s) => LS.remove(msgsKey(s.id)));
    // Clear the session index
    LS.set(SESSIONS_KEY, []);
    // Create a fresh blank session immediately so the UI stays usable
    const id = crypto.randomUUID();
    const fresh = {
      id,
      title: 'New chat',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      lastMessage: '',
    };
    LS.set(SESSIONS_KEY, [fresh]);
    LS.set(msgsKey(id), []);
    set({ sessions: [fresh], activeSessionId: id, messages: [] });
  },

  // ── Theme ─────────────────────────────────────────────────────────────────

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    LS.set(THEME_KEY, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    set({ theme: next });
  },

  setTheme: (theme) => {
    LS.set(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  // ── History panel ─────────────────────────────────────────────────────────

  toggleHistory: () => {
    const next = !get().historyOpen;
    LS.set(HISTORY_KEY, next);
    set({ historyOpen: next });
  },

  // ── Memories ─────────────────────────────────────────────────────────────

  setMemories: (memories) => set({ memories }),

  addMemory: (memory) =>
    set((state) => ({
      memories: [memory, ...state.memories.filter((m) => m.id !== memory.id)],
    })),

  updateMemory: (memory) =>
    set((state) => ({
      memories: state.memories.map((m) => (m.id === memory.id ? memory : m)),
    })),

  removeMemory: (id) =>
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    })),
}));
