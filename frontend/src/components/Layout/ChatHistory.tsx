import { useMemo } from 'react';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { useMemoryStore } from '../../store/memoryStore';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ChatHistory() {
  const { sessions, activeSessionId, loadSession, deleteSession, createSession } = useMemoryStore();
  const sorted = useMemo(() => [...sessions].sort((a, b) => b.lastUpdated - a.lastUpdated), [sessions]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* New chat */}
      <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => createSession()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: 'var(--accent)',
            boxShadow: '-3px -3px 8px var(--nm-shadow-light), 3px 3px 8px var(--nm-shadow-dark)',
          }}
        >
          <Plus size={14} />
          New chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center py-10 gap-2 opacity-30 select-none">
            <MessageSquare size={26} style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No chats yet</p>
          </div>
        )}

        {sorted.map((s) => {
          const active = s.id === activeSessionId;
          return (
            <div
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`group flex items-start justify-between gap-1 px-3 py-2.5 rounded-xl cursor-pointer mb-1.5 transition-all duration-150 ${active ? 'nm-card' : ''}`}
              style={
                active
                  ? { boxShadow: '-4px -4px 10px var(--nm-shadow-light), 4px 4px 10px var(--nm-shadow-dark), 0 0 0 1.5px var(--accent)44' }
                  : { opacity: 0.85 }
              }
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-[12px] font-semibold truncate"
                  style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  {s.title}
                </p>
                {s.lastMessage && (
                  <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {s.lastMessage}
                  </p>
                )}
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {timeAgo(s.lastUpdated)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity nm-btn"
                title="Delete chat"
              >
                <Trash2 size={11} style={{ color: 'var(--danger)' }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
