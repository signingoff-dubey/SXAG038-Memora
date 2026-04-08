import { useState } from 'react';
import { Brain } from 'lucide-react';
import { MemoryCard } from './MemoryCard';
import { useMemories } from '../../hooks/useMemories';

type SortMode = 'recent' | 'importance' | 'decay';

export function MemoryInspector() {
  const { memories, pinMemory, flagMemory, deleteMemory } = useMemories();
  const [sort, setSort] = useState<SortMode>('recent');

  const sorted = [...memories].sort((a, b) => {
    if (sort === 'importance') return b.importance - a.importance;
    if (sort === 'decay') return a.decay_score - b.decay_score;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const pinned = sorted.filter((m) => m.is_pinned);
  const conflicts = sorted.filter((m) => m.contradiction_with?.length && !m.is_pinned);
  const normal = sorted.filter((m) => !m.is_pinned && !m.contradiction_with?.length);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Brain size={18} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-sm">Memory Inspector</span>
          <span
            className="text-[11px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {memories.length}
          </span>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="text-xs px-2 py-1 rounded-lg outline-none cursor-pointer"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <option value="recent">Recent</option>
          <option value="importance">Importance</option>
          <option value="decay">Lowest decay</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {memories.length === 0 && (
          <div className="text-center py-12 opacity-40">
            <Brain size={32} className="mx-auto mb-2" />
            <p className="text-sm">No memories yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Start chatting to build memory
            </p>
          </div>
        )}

        {pinned.length > 0 && (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--success)' }}>
              Pinned
            </div>
            {pinned.map((m) => (
              <MemoryCard key={m.id} memory={m} onPin={pinMemory} onFlag={flagMemory} onDelete={deleteMemory} />
            ))}
          </>
        )}

        {conflicts.length > 0 && (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-3" style={{ color: 'var(--danger)' }}>
              Conflicts
            </div>
            {conflicts.map((m) => (
              <MemoryCard key={m.id} memory={m} onPin={pinMemory} onFlag={flagMemory} onDelete={deleteMemory} />
            ))}
          </>
        )}

        {normal.length > 0 && (
          <>
            {(pinned.length > 0 || conflicts.length > 0) && (
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-3" style={{ color: 'var(--text-muted)' }}>
                All Memories
              </div>
            )}
            {normal.map((m) => (
              <MemoryCard key={m.id} memory={m} onPin={pinMemory} onFlag={flagMemory} onDelete={deleteMemory} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
