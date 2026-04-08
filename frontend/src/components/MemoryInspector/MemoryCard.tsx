import { Pin, ArrowDown, Trash2 } from 'lucide-react';
import { DecayBar } from './DecayBar';
import { ConflictBadge } from './ConflictBadge';
import { ImportanceChip } from './ImportanceChip';
import { useMemoryStore } from '../../store/memoryStore';
import type { MemoryData } from '../../api/client';

interface MemoryCardProps {
  memory: MemoryData;
  onPin: (id: string, pinned: boolean) => void;
  onFlag: (id: string, flagged: boolean) => void;
  onDelete: (id: string) => void;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function MemoryCard({ memory, onPin, onFlag, onDelete }: MemoryCardProps) {
  const allMemories = useMemoryStore((s) => s.memories);

  // Resolve conflicting memory contents from the store
  const conflictContents = (memory.contradiction_with || [])
    .map((cid) => allMemories.find((m) => m.id === cid)?.content)
    .filter(Boolean) as string[];

  const hasConflict = conflictContents.length > 0 || (memory.contradiction_with?.length ?? 0) > 0;
  const conflictCount = memory.contradiction_with?.length ?? 0;

  const cardClass = hasConflict
    ? 'nm-card-conflict'
    : memory.is_pinned
      ? 'nm-card-pinned'
      : 'nm-card';

  return (
    <div
      className={`rounded-2xl p-3.5 mb-3 transition-all duration-200 ${cardClass}`}
    >
      {/* ── Row 1: badges + actions ── */}
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {memory.is_pinned ? (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--success) 18%, transparent)',
                color: 'var(--success)',
                border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
              }}
            >
              📌 pinned
            </span>
          ) : (
            <ImportanceChip score={memory.importance} />
          )}
          {hasConflict && <ConflictBadge count={conflictCount} />}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onPin(memory.id, !memory.is_pinned)}
            className="nm-btn p-1.5 rounded-lg"
            title={memory.is_pinned ? 'Unpin' : 'Pin as important'}
          >
            <Pin
              size={12}
              style={{ color: memory.is_pinned ? 'var(--success)' : 'var(--text-muted)' }}
              fill={memory.is_pinned ? 'var(--success)' : 'none'}
            />
          </button>
          <button
            onClick={() => onFlag(memory.id, !memory.is_flagged_unimportant)}
            className="nm-btn p-1.5 rounded-lg"
            title={memory.is_flagged_unimportant ? 'Unflag' : 'Mark unimportant'}
          >
            <ArrowDown
              size={12}
              style={{ color: memory.is_flagged_unimportant ? 'var(--warning)' : 'var(--text-muted)' }}
            />
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            className="nm-btn p-1.5 rounded-lg"
            title="Delete memory"
          >
            <Trash2 size={12} style={{ color: 'var(--danger)' }} />
          </button>
        </div>
      </div>

      {/* ── Row 2: memory content ── */}
      <p
        className="text-sm leading-relaxed mb-2 font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        "{memory.content}"
      </p>

      {/* ── Conflict detail ── */}
      {conflictContents.map((txt, i) => (
        <p
          key={i}
          className="text-[11px] mb-2 leading-snug"
          style={{ color: 'var(--danger)' }}
        >
          conflicts with → "{txt}"
        </p>
      ))}
      {/* Fallback if conflict IDs exist but content not yet loaded */}
      {conflictCount > 0 && conflictContents.length === 0 && (
        <p className="text-[11px] mb-2" style={{ color: 'var(--danger)' }}>
          conflicts with {conflictCount} other {conflictCount === 1 ? 'memory' : 'memories'}
        </p>
      )}

      {/* ── Decay bar ── */}
      <DecayBar score={memory.decay_score} isPinned={memory.is_pinned} />

      {/* ── Footer ── */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          accessed {memory.access_count}×
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {timeAgo(memory.created_at)}
        </span>
      </div>
    </div>
  );
}
