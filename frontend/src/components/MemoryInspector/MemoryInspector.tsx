import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain, Check, ChevronDown, Clock, Flame, TrendingDown,
  Search, Download, Upload, X, Clock3,
} from 'lucide-react';
import { MemoryCard } from './MemoryCard';
import { useMemories } from '../../hooks/useMemories';
import { useMemoryStore } from '../../store/memoryStore';
import type { MemoryData } from '../../api/client';

type SortMode = 'recent' | 'importance' | 'decay';
type FilterMode = 'all' | 'cross-session' | 'session-only';

const SORT_OPTIONS: { value: SortMode; label: string; icon: React.ReactNode }[] = [
  { value: 'recent',     label: 'Recent',       icon: <Clock size={12} /> },
  { value: 'importance', label: 'Importance',   icon: <Flame size={12} /> },
  { value: 'decay',      label: 'Lowest decay', icon: <TrendingDown size={12} /> },
];

function SortDropdown({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl nm-inset text-[11px] font-medium transition-all"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="flex items-center gap-1.5">
          <span style={{ color: 'var(--accent)' }}>{current.icon}</span>
          {current.label}
        </span>
        <ChevronDown
          size={12}
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        />
      </button>
      {open && (
        <div
          className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl overflow-hidden"
          style={{ background: 'var(--nm-card)', boxShadow: '-8px -8px 18px var(--nm-shadow-light), 8px 8px 18px var(--nm-shadow-dark)' }}
        >
          {SORT_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all"
                style={{
                  background: active ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--accent) 6%, transparent)'; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="flex items-center gap-2 text-[12px] font-medium">
                  <span style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{opt.icon}</span>
                  {opt.label}
                </span>
                {active && <Check size={12} style={{ color: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderSection(
  label: string,
  labelColor: string,
  items: MemoryData[],
  handlers: {
    onPin: (id: string, v: boolean) => void;
    onFlag: (id: string, v: boolean) => void;
    onDelete: (id: string) => void;
    onImportanceChange: (id: string, v: number) => void;
    onToggleSessionOnly: (id: string, v: boolean) => void;
  },
  showDivider: boolean,
) {
  if (items.length === 0) return null;
  return (
    <section className="mb-1">
      {showDivider && <div className="my-3" style={{ borderTop: '1px solid var(--border)' }} />}
      <div className="text-[9px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: labelColor }}>
        {label}
      </div>
      {items.map((m) => (
        <MemoryCard
          key={m.id}
          memory={m}
          onPin={handlers.onPin}
          onFlag={handlers.onFlag}
          onDelete={handlers.onDelete}
          onImportanceChange={handlers.onImportanceChange}
          onToggleSessionOnly={handlers.onToggleSessionOnly}
        />
      ))}
    </section>
  );
}

export function MemoryInspector() {
  const { memories, pinMemory, flagMemory, deleteMemory, updateImportance, toggleSessionOnly } = useMemories();
  const { addMemory } = useMemoryStore();

  const [sort, setSort]         = useState<SortMode>('recent');
  const [filter, setFilter]     = useState<FilterMode>('all');
  const [search, setSearch]     = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // ── Apply filter + search ─────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const filtered = memories.filter((m) => {
      if (filter === 'cross-session' && m.is_session_only) return false;
      if (filter === 'session-only' && !m.is_session_only) return false;
      if (search.trim()) {
        return m.content.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'importance') return b.importance - a.importance;
      if (sort === 'decay') return a.decay_score - b.decay_score;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [memories, filter, search, sort]);

  // ── Cluster into groups ───────────────────────────────────────────────────
  const pinned        = sorted.filter((m) => m.is_pinned);
  const conflicts     = sorted.filter((m) => (m.contradiction_with?.length ?? 0) > 0 && !m.is_pinned);
  const sessionOnly   = sorted.filter((m) => m.is_session_only && !m.is_pinned && !(m.contradiction_with?.length ?? 0));
  const crossSession  = sorted.filter((m) => !m.is_session_only && !m.is_pinned && !(m.contradiction_with?.length ?? 0));

  const handlers = { onPin: pinMemory, onFlag: flagMemory, onDelete: deleteMemory, onImportanceChange: updateImportance, onToggleSessionOnly: toggleSessionOnly };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(memories, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memora-memories-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const isValidMemory = (obj: unknown): obj is MemoryData => {
    if (!obj || typeof obj !== 'object') return false;
    const m = obj as Record<string, unknown>;
    return (
      typeof m.id === 'string' &&
      typeof m.content === 'string' &&
      typeof m.importance === 'number' &&
      m.importance >= 0 &&
      m.importance <= 10
    );
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      let importedCount = 0;
      for (const m of items) {
        try {
          if (isValidMemory(m)) {
            addMemory(m);
            importedCount++;
          }
        } catch { /* skip invalid items */ }
      }
      if (importedCount === 0) {
        alert('No valid memories found in file');
      }
    } catch {
      alert('Invalid JSON file');
    }
    if (importRef.current) importRef.current.value = '';
  };

  const hasAny = sorted.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Header ── */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>

        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain size={17} style={{ color: 'var(--accent)' }} />
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Memory Inspector
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="nm-btn px-2.5 py-1 rounded-xl text-xs font-bold tabular-nums min-w-[28px] text-center"
              style={{ color: memories.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {memories.length}
            </span>
            {/* Search toggle */}
            <button
              onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearch(''); }}
              className="nm-btn p-1.5 rounded-lg"
              title="Search memories"
              style={{ color: showSearch ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              <Search size={12} />
            </button>
            {/* Export */}
            <button onClick={handleExport} className="nm-btn p-1.5 rounded-lg" title="Export memories as JSON" style={{ color: 'var(--text-muted)' }}>
              <Download size={12} />
            </button>
            {/* Import */}
            <button onClick={() => importRef.current?.click()} className="nm-btn p-1.5 rounded-lg" title="Import memories from JSON" style={{ color: 'var(--text-muted)' }}>
              <Upload size={12} />
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="relative mb-2">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories…"
              className="w-full pl-7 pr-8 py-2 rounded-xl text-xs nm-input"
              style={{ color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
        )}

        {/* Sort + filter row */}
        <div className="flex items-center gap-2">
          <SortDropdown value={sort} onChange={setSort} />

          {/* Session filter pill */}
          <button
            onClick={() => setFilter((f) => f === 'all' ? 'cross-session' : f === 'cross-session' ? 'session-only' : 'all')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-semibold flex-shrink-0 transition-all nm-btn"
            style={{
              color: filter === 'session-only' ? 'var(--warning)' : filter === 'cross-session' ? 'var(--success)' : 'var(--text-muted)',
            }}
            title="Toggle session filter"
          >
            <Clock3 size={10} />
            {filter === 'all' ? 'all' : filter === 'cross-session' ? 'cross' : 'session'}
          </button>

          {conflicts.length > 0 && (
            <span
              className="text-[10px] px-2 py-1.5 rounded-xl font-semibold flex-shrink-0"
              style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}
            >
              ⚠ {conflicts.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Memory list ── */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {!hasAny && (
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none" style={{ opacity: 0.35 }}>
            <div className="nm-card p-5 rounded-2xl">
              <Brain size={36} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'No matches' : 'No memories yet'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {search ? 'Try a different search' : 'Start chatting to build memory'}
            </p>
          </div>
        )}

        {renderSection('📌 Pinned', 'var(--success)', pinned, handlers, false)}
        {renderSection('⚠ Conflicts', 'var(--danger)', conflicts, handlers, pinned.length > 0)}
        {renderSection('🧠 Long-term memories', 'var(--accent)', crossSession, handlers, pinned.length > 0 || conflicts.length > 0)}
        {renderSection('⏱ Session-only context', 'var(--warning)', sessionOnly, handlers, crossSession.length > 0 || pinned.length > 0 || conflicts.length > 0)}
      </div>
    </div>
  );
}
