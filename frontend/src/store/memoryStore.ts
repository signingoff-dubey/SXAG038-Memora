import { create } from 'zustand';
import type { MemoryData } from '../api/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  memoriesUsed?: string[];
}

interface MemoryStore {
  memories: MemoryData[];
  chatMessages: ChatMessage[];
  sessionId: string | null;
  theme: 'light' | 'dark';

  setMemories: (memories: MemoryData[]) => void;
  addMemory: (memory: MemoryData) => void;
  updateMemory: (memory: MemoryData) => void;
  removeMemory: (id: string) => void;

  addChatMessage: (message: ChatMessage) => void;
  setSessionId: (id: string) => void;

  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useMemoryStore = create<MemoryStore>((set) => ({
  memories: [],
  chatMessages: [],
  sessionId: null,
  theme: (localStorage.getItem('memora-theme') as 'light' | 'dark') || 'dark',

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

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  setSessionId: (id) => set({ sessionId: id }),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('memora-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return { theme: next };
    }),

  setTheme: (theme) => {
    localStorage.setItem('memora-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    return set({ theme });
  },
}));
