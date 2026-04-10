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

// ── Encrypted localStorage helpers ───────────────────────────────────────────
import { EncryptedLS } from '../utils/encryptedStorage';

const SESSIONS_KEY    = 'memora-sessions';
const MSGS_PREFIX     = 'memora-msgs-';
const MODEL_KEY       = 'memora-model';
const CUSTOM_CFG_KEY  = 'memora-custom-cfg';
const THEME_KEY       = 'memora-theme';
const HISTORY_KEY     = 'memora-history-open';
const PROFILE_KEY     = 'memora-user-profile';
const LOCAL_BA_KEY    = 'memora-local-backend';
const DEMO_MODE_KEY   = 'memora-demo-mode';

function msgsKey(sessionId: string) {
  return MSGS_PREFIX + sessionId;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface MemoryStore {
  initialized: boolean;
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
  localBackendActive: boolean;
  isDemoMode: boolean;

  // Streaming
  streamingResponse: string;

  // Memories (from backend)
  memories: MemoryData[];
  isLoadingMemories: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────
  initialize: () => Promise<void>;
  
  // Sessions
  createSession: () => string;
  loadSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
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

  // Local backend
  setLocalBackendActive: (active: boolean) => void;

  // Demo Mode
  setDemoMode: (active: boolean) => void;

  // Chat Actions
  sendMessageStream: (message: string, images?: string[]) => Promise<void>;
  exportChat: () => Promise<void>;

  // Memories
  setMemories: (memories: MemoryData[]) => void;
  fetchMemories: (userId?: string, sessionId?: string) => Promise<void>;
  addMemory: (memory: MemoryData) => void;
  updateMemory: (memory: MemoryData) => void;
  removeMemory: (id: string) => void;
  resolveConflict: (memoryIdA: string, memoryIdB: string) => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  initialized: false,
  sessions: [],
  activeSessionId: null,
  messages: [],

  selectedModel: 'qwen2.5-coder:7b',
  customConfig: null,
  installedModels: [],

  userProfile: '',

  theme: 'dark',
  historyOpen: true,
  localBackendActive: false,
  isDemoMode: false,

  streamingResponse: '',

  memories: [],
  isLoadingMemories: false,

  initialize: async () => {
    const [sessions, selectedModel, customConfig, userProfile, theme, historyOpen, localBackendActive, isDemoMode] = await Promise.all([
      EncryptedLS.get<ChatSession[]>(SESSIONS_KEY, []),
      EncryptedLS.get<string>(MODEL_KEY, 'qwen2.5-coder:7b'),
      EncryptedLS.get<CustomModelConfig | null>(CUSTOM_CFG_KEY, null),
      EncryptedLS.get<string>(PROFILE_KEY, ''),
      EncryptedLS.get<'light' | 'dark'>(THEME_KEY, 'dark'),
      EncryptedLS.get<boolean>(HISTORY_KEY, true),
      EncryptedLS.get<boolean>(LOCAL_BA_KEY, false),
      EncryptedLS.get<boolean>(DEMO_MODE_KEY, false),
    ]);
    
    set({
      initialized: true,
      sessions,
      selectedModel,
      customConfig,
      userProfile,
      theme,
      historyOpen,
      localBackendActive,
      isDemoMode,
    });
    
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  // ── Sessions ─────────────────────────────────────────────────────────────

  createSession: () => {
    const id = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const session: ChatSession = {
      id,
      title: 'New chat',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      lastMessage: '',
    };
    const sessions = [session, ...get().sessions];
    EncryptedLS.set(SESSIONS_KEY, sessions);
    EncryptedLS.set(msgsKey(id), []);
    set({ sessions, activeSessionId: id, messages: [] });
    return id;
  },

  loadSession: async (id) => {
    const messages = await EncryptedLS.get<ChatMessage[]>(msgsKey(id), []);
    set({ activeSessionId: id, messages });
  },

  deleteSession: async (id) => {
    await EncryptedLS.remove(msgsKey(id));
    const sessions = get().sessions.filter((s) => s.id !== id);
    await EncryptedLS.set(SESSIONS_KEY, sessions);
    const active = get().activeSessionId;
    if (active === id) {
      const next = sessions[0];
      if (next) {
        const messages = await EncryptedLS.get<ChatMessage[]>(msgsKey(next.id), []);
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
    EncryptedLS.set(SESSIONS_KEY, sessions);
    set({ sessions });
  },

  addMessage: (msg) => {
    const full: ChatMessage = { ...msg, timestamp: Date.now() };
    const messages = [...get().messages, full];
    const activeSessionId = get().activeSessionId;
    if (activeSessionId) {
      EncryptedLS.set(msgsKey(activeSessionId), messages);
    }
    set({ messages });
  },

  sendMessageStream: async (content, images) => {
    const { activeSessionId, selectedModel, customConfig, addMessage, updateSessionMeta } = get();
    if (!activeSessionId) return;

    addMessage({ role: 'user', content, images });
    updateSessionMeta(activeSessionId, content);

    set({ streamingResponse: ' ' });

    const { chatApi } = await import('../api/client');
    
    await chatApi.stream(
      {
        message: content,
        session_id: activeSessionId,
        user_id: 'default',
        model: selectedModel,
        custom_base_url: customConfig?.baseUrl,
        custom_api_key: customConfig?.apiKey,
        images: images,
      },
      (token) => {
        set((state) => ({ streamingResponse: state.streamingResponse + token }));
      },
      (done) => {
        const finalContent = get().streamingResponse.trim() || (done.correction || '');
        set({ streamingResponse: '' });
        addMessage({ 
          role: 'assistant', 
          content: finalContent,
          memoriesUsed: done.memories_used 
        });
        setTimeout(() => get().fetchMemories('default', activeSessionId), 1000);
      }
    );
  },

  exportChat: async () => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    const { chatApi } = await import('../api/client');
    await chatApi.export(activeSessionId);
  },

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  // ── Model ─────────────────────────────────────────────────────────────────

  setSelectedModel: (model) => {
    EncryptedLS.set(MODEL_KEY, model);
    set({ selectedModel: model });
  },

  setCustomConfig: (cfg) => {
    EncryptedLS.set(CUSTOM_CFG_KEY, cfg);
    set({ customConfig: cfg });
  },

  setInstalledModels: (models) => set({ installedModels: models }),

  // ── User profile ──────────────────────────────────────────────────────────

  setUserProfile: (profile) => {
    EncryptedLS.set(PROFILE_KEY, profile);
    set({ userProfile: profile });
  },

  // ── Danger zone ──────────────────────────────────────────────────────────

  clearAllHistory: async () => {
    for (const s of get().sessions) {
      await EncryptedLS.remove(msgsKey(s.id));
    }
    await EncryptedLS.set(SESSIONS_KEY, []);
    const id = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fresh = {
      id,
      title: 'New chat',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      lastMessage: '',
    };
    await EncryptedLS.set(SESSIONS_KEY, [fresh]);
    await EncryptedLS.set(msgsKey(id), []);
    set({ sessions: [fresh], activeSessionId: id, messages: [] });
  },

  // ── Theme ─────────────────────────────────────────────────────────────────

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    EncryptedLS.set(THEME_KEY, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    set({ theme: next });
  },

  setTheme: (theme) => {
    EncryptedLS.set(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  // ── History panel ─────────────────────────────────────────────────────────

  toggleHistory: () => {
    const next = !get().historyOpen;
    EncryptedLS.set(HISTORY_KEY, next);
    set({ historyOpen: next });
  },

  setLocalBackendActive: (active) => {
    EncryptedLS.set(LOCAL_BA_KEY, active);
    set({ localBackendActive: active });
  },

  setDemoMode: (active) => {
    EncryptedLS.set(DEMO_MODE_KEY, active);
    set({ isDemoMode: active });
  },

  // ── Memories ─────────────────────────────────────────────────────────────

  setMemories: (memories) => set({ memories }),

  fetchMemories: async (userId = 'default', sessionId?: string) => {
    set({ isLoadingMemories: true });
    try {
      const { memoriesApi } = await import('../api/client');
      const resp = await memoriesApi.list(userId, sessionId);
      if (Array.isArray(resp.data)) {
        const currentSession = get().activeSessionId;
        if (currentSession === (sessionId ?? null) || sessionId === undefined) {
          set({ memories: resp.data });
        }
      }
    } catch {
    } finally {
      set({ isLoadingMemories: false });
    }
  },

  addMemory: (memory) =>
    set((state) => {
      if (memory.is_session_only && memory.session_id !== state.activeSessionId) {
        return state; 
      }
      return {
        memories: [memory, ...state.memories.filter((m) => m.id !== memory.id)],
      };
    }),

  updateMemory: (memory) =>
    set((state) => ({
      memories: state.memories.map((m) => (m.id === memory.id ? memory : m)),
    })),

  removeMemory: (id) =>
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    })),

  resolveConflict: async (memoryIdA, memoryIdB) => {
    const { memoriesApi } = await import('../api/client');
    const resp = await memoriesApi.merge(memoryIdA, memoryIdB);
    if (resp.data) {
      get().updateMemory(resp.data);
      get().removeMemory(memoryIdB);
    }
  },
}));