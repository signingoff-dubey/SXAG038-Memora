import { useEffect, useRef, useCallback } from 'react';
import { memoriesApi } from '../api/client';
import { useMemoryStore } from '../store/memoryStore';

export function useMemories() {
  const memories = useMemoryStore((state) => state.memories);
  const setMemories = useMemoryStore((state) => state.setMemories);
  const updateMemory = useMemoryStore((state) => state.updateMemory);
  const removeMemory = useMemoryStore((state) => state.removeMemory);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMemories = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const { data } = await memoriesApi.list();
      setMemories(data);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch memories:', err);
      }
    }
  }, [setMemories]);

  useEffect(() => {
    fetchMemories();
    return () => abortRef.current?.abort();
  }, [fetchMemories]);

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
