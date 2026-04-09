import { X, ShieldAlert, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import type { MemoryData } from '../../api/client';
import { useMemoryStore } from '../../store/memoryStore';

interface ConflictModalProps {
  memory: MemoryData;
  onClose: () => void;
}

export function ConflictModal({ memory, onClose }: ConflictModalProps) {
  const allMemories = useMemoryStore((s) => s.memories);
  const resolveConflict = useMemoryStore((s) => s.resolveConflict);
  const removeMemory = useMemoryStore((s) => s.removeMemory);

  const conflicts = (memory.contradiction_with || [])
    .map(id => allMemories.find(m => m.id === id))
    .filter(Boolean) as MemoryData[];

  const handleResolve = async (otherId: string, mode: 'keep_a' | 'keep_b' | 'merge') => {
    if (mode === 'keep_a') {
      // Keep primary, delete other
      await memoriesApiDelete(otherId);
      removeMemory(otherId);
    } else if (mode === 'keep_b') {
      // Keep other, delete primary
      await memoriesApiDelete(memory.id);
      removeMemory(memory.id);
      onClose();
    } else {
      // Merge
      await resolveConflict(memory.id, otherId);
    }
  };

  // Helper because we need the raw API sometimes
  const memoriesApiDelete = async (id: string) => {
    const { memoriesApi } = await import('../../api/client');
    await memoriesApi.delete(id);
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Conflict Resolution</h2>
              <p className="text-xs opacity-60">Decide how to handle contradictory memories</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8">
          {conflicts.map((other) => (
            <div key={other.id} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Memory A */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold uppercase opacity-40 mb-2 block">Memory A (Existing)</span>
                  <p className="text-sm font-medium italic">"{memory.content}"</p>
                </div>
                {/* Memory B */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold uppercase opacity-40 mb-2 block">Memory B (Contradictory)</span>
                  <p className="text-sm font-medium italic text-red-400">"{other.content}"</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => handleResolve(other.id, 'keep_a')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10 border border-white/10"
                >
                  Keep A <Trash2 size={12} className="text-red-500" />
                </button>
                <button
                  onClick={() => handleResolve(other.id, 'merge')}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all"
                >
                  <Sparkles size={14} /> Smart Merge
                </button>
                <button
                  onClick={() => handleResolve(other.id, 'keep_b')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10 border border-white/10"
                >
                  <ArrowRight size={12} /> Keep B
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 text-center">
          <p className="text-[10px] opacity-40">Merging uses AI to combine both facts into a single consistent statement.</p>
        </div>
      </div>
    </div>
  );
}
