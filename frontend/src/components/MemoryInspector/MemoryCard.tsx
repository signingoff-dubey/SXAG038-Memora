import { useState } from 'react';
import { Pin, ArrowDown, Trash2, Clock, RefreshCw, Brain } from 'lucide-react';
import { DecayBar } from './DecayBar';
import { ConflictBadge } from './ConflictBadge';
import { useMemoryStore } from '../../store/memoryStore';
import type { MemoryData } from '../../api/client';

interface MemoryCardProps {
  memory: MemoryData;
  onPin: (id: string, pinned: boolean) => void;
  onFlag: (id: string, flagged: boolean) => void;
  onDelete: (id: string) => void;
  onImportanceChange: (id: string, importance: number) => void;
  onToggleSessionOnly: (id: string, isSessionOnly: boolean) => void;
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

function importanceColor(score: number): string {
  if (score >= 8) return 'var(--danger)';
  if (score >= 6) return 'var(--warning)';
  if (score >= 4) return 'var(--accent)';
  return 'var(--text-muted)';
}

export function MemoryCard({
  memory,
  onPin,
  onFlag,
  onDelete,
  onImportanceChange,
  onToggleSessionOnly,
}: MemoryCardProps) {
  const allMemories = useMemoryStore((s) => s.memories);
  const [showImportanceSlider, setShowImportanceSlider] = useState(false);
  const [sliderValue, setSliderValue] = useState(Math.round(memory.importance));
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleSliderCommit = async () => {
    if (sliderValue !== Math.round(memory.importance)) {
      try {
        await onImportanceChange(memory.id, sliderValue);
      } catch {
        setSaveError('Failed to save');
        return;
      }
    }
    setShowImportanceSlider(false);
  };

  return (
    <div className={`rounded-2xl p-3.5 mb-3 transition-all duration-200 ${cardClass}`}>

      {/* ── Row 1: badges + actions ── */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Memory Type Tag */}
          {!memory.is_session_only ? (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
              title="This is a persistent memory shared across all sessions"
            >
              <Brain size={9} /> long-term
            </span>
          ) : (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--warning) 15%, transparent)',
                color: 'var(--warning)',
                border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
              }}
              title="This memory is session-specific and will not carry to future chats"
            >
              <Clock size={9} /> session-only
            </span>
          )}

          {/* Pinned badge */}
          {memory.is_pinned && (
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
          )}

          {/* Importance chip — clickable to open slider */}
          {!memory.is_pinned && (
            <button
              onClick={() => { setShowImportanceSlider((v) => !v); setSliderValue(Math.round(memory.importance)); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all nm-btn"
              title="Click to adjust importance"
              style={{ color: importanceColor(memory.importance) }}
            >
              {memory.importance.toFixed(1)} ★
            </button>
          )}

          {hasConflict && <ConflictBadge count={conflictCount} />}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleSessionOnly(memory.id, !memory.is_session_only)}
            className="nm-btn p-1.5 rounded-lg"
            title={memory.is_session_only ? 'Promote to cross-session' : 'Mark as session-only'}
          >
            <RefreshCw
              size={11}
              style={{ color: memory.is_session_only ? 'var(--warning)' : 'var(--text-muted)' }}
            />
          </button>
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

      {/* ── Importance slider (shown on chip click) ── */}
      {showImportanceSlider && (
        <div
          className="rounded-xl px-3 py-2 mb-2"
          style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Adjust importance
            </span>
            <span className="text-[11px] font-bold" style={{ color: importanceColor(sliderValue) }}>
              {sliderValue} / 10
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="w-full h-2 rounded-full cursor-pointer"
            style={{
              accentColor: 'var(--accent)',
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(sliderValue - 1) * 11.1}%, var(--bg-tertiary) ${(sliderValue - 1) * 11.1}%, var(--bg-tertiary) 100%)`,
            }}
          />
          <div className="flex justify-between text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
            <span>trivial</span>
            <span>core identity</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowImportanceSlider(false)}
              className="flex-1 py-1 rounded-lg text-[10px] nm-btn"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSliderCommit}
              className="flex-1 py-1 rounded-lg text-[10px] font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Save
            </button>
          </div>
          {saveError && (
            <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--danger)' }}>
              {saveError}
            </p>
          )}
        </div>
      )}

      {/* ── Memory content ── */}
      <p className="text-sm leading-relaxed mb-2 font-medium" style={{ color: 'var(--text-primary)' }}>
        "{memory.content}"
      </p>

      {/* ── Conflict detail ── */}
      {conflictContents.map((txt, i) => (
        <p key={i} className="text-[11px] mb-2 leading-snug" style={{ color: 'var(--danger)' }}>
          conflicts with → "{txt}"
        </p>
      ))}
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
