import { useEffect } from 'react';
import { memoriesApi } from '../api/client';
import { useMemoryStore } from '../store/memoryStore';

export function useMemories() {
  const { memories, setMemories, updateMemory, removeMemory } = useMemoryStore();

  useEffect(() => {
    memoriesApi.list().then(({ data }) => setMemories(data)).catch(() => {});
  }, [setMemories]);

  const pinMemory = async (id: string, pinned: boolean) => {
    const { data } = await memoriesApi.update(id, { is_pinned: pinned });
    updateMemory(data);
  };

  const flagMemory = async (id: string, flagged: boolean) => {
    const { data } = await memoriesApi.update(id, { is_flagged_unimportant: flagged });
    updateMemory(data);
  };

  const deleteMemory = async (id: string) => {
    await memoriesApi.delete(id);
    removeMemory(id);
  };

  return { memories, pinMemory, flagMemory, deleteMemory };
}
