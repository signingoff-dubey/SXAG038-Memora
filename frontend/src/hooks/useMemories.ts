import { useCallback } from 'react';
import { memoriesApi } from '../api/client';
import { useMemoryStore } from '../store/memoryStore';

export function useMemories() {
  const memories = useMemoryStore((state) => state.memories);
  const updateMemory = useMemoryStore((state) => state.updateMemory);
  const removeMemory = useMemoryStore((state) => state.removeMemory);

  // Memory fetching is handled centrally in App.tsx (session-scoped).
  // This hook only exposes action callbacks so components stay thin.

  const pinMemory = useCallback(async (id: string, pinned: boolean) => {
    const { data } = await memoriesApi.update(id, { is_pinned: pinned });
    updateMemory(data);
  }, [updateMemory]);

  const flagMemory = useCallback(async (id: string, flagged: boolean) => {
    const { data } = await memoriesApi.update(id, { is_flagged_unimportant: flagged });
    updateMemory(data);
  }, [updateMemory]);

  const deleteMemory = useCallback(async (id: string) => {
    await memoriesApi.delete(id);
    removeMemory(id);
  }, [removeMemory]);

  const updateImportance = useCallback(async (id: string, importance: number) => {
    try {
      const { data } = await memoriesApi.update(id, { importance });
      updateMemory(data);
    } catch {
      throw new Error('Failed to save');
    }
  }, [updateMemory]);

  const toggleSessionOnly = useCallback(async (id: string, isSessionOnly: boolean) => {
    const { data } = await memoriesApi.update(id, { is_session_only: isSessionOnly });
    updateMemory(data);
  }, [updateMemory]);

  return { memories, pinMemory, flagMemory, deleteMemory, updateImportance, toggleSessionOnly };
}
