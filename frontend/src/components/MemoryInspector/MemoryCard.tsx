import { Pin, ArrowDown, Trash2 } from 'lucide-react';
import { DecayBar } from './DecayBar';
import { ConflictBadge } from './ConflictBadge';
import { ImportanceChip } from './ImportanceChip';
import type { MemoryData } from '../../api/client';

interface MemoryCardProps {
  memory: MemoryData;
  onPin: (id: string, pinned: boolean) => void;
  onFlag: (id: string, flagged: boolean) => void;
  onDelete: (id: string) => void;
}

export function MemoryCard({ memory, onPin, onFlag, onDelete }: MemoryCardProps) {
  const timeAgo = memory.created_at
    ? getTimeAgo(new Date(memory.created_at))
    : '';

  return (
    <div
      className="rounded-xl p-3 mb-2 transition-all border"
      style={{
        background: 'var(--bg-card)',
        borderColor: memory.contradiction_with?.length
          ? 'var(--danger)'
          : memory.is_pinned
            ? 'var(--success)'
            : 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ImportanceChip score={memory.importance} />
          {memory.is_pinned && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}
            >
              pinned
            </span>
          )}
          <ConflictBadge conflictIds={memory.contradiction_with || []} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPin(memory.id, !memory.is_pinned)}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            title={memory.is_pinned ? 'Unpin' : 'Pin as important'}
          >
            <Pin
              size={14}
              style={{ color: memory.is_pinned ? 'var(--success)' : 'var(--text-muted)' }}
              fill={memory.is_pinned ? 'var(--success)' : 'none'}
            />
          </button>
          <button
            onClick={() => onFlag(memory.id, !memory.is_flagged_unimportant)}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            title={memory.is_flagged_unimportant ? 'Unflag' : 'Mark unimportant'}
          >
            <ArrowDown
              size={14}
              style={{
                color: memory.is_flagged_unimportant ? 'var(--warning)' : 'var(--text-muted)',
              }}
            />
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            title="Delete memory"
          >
            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
          </button>
        </div>
      </div>

      <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        {memory.content}
      </p>

      <DecayBar score={memory.decay_score} isPinned={memory.is_pinned} />

      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          accessed {memory.access_count}x
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {timeAgo}
        </span>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
