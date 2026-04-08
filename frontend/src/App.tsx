import { useEffect, useState } from 'react';
import { ChatWindow } from './components/Chat/ChatWindow';
import { MemoryInspector } from './components/MemoryInspector/MemoryInspector';
import { ThemeToggle } from './components/Layout/ThemeToggle';
import { ChatHistory } from './components/Layout/ChatHistory';
import { SettingsModal } from './components/Layout/SettingsModal';
import { useWebSocket } from './hooks/useWebSocket';
import { useMemoryStore } from './store/memoryStore';
import { modelsApi } from './api/client';
import { Brain, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

function App() {
  const theme             = useMemoryStore((s) => s.theme);
  const historyOpen       = useMemoryStore((s) => s.historyOpen);
  const toggleHistory     = useMemoryStore((s) => s.toggleHistory);
  const activeSessionId   = useMemoryStore((s) => s.activeSessionId);
  const sessions          = useMemoryStore((s) => s.sessions);
  const createSession     = useMemoryStore((s) => s.createSession);
  const loadSession       = useMemoryStore((s) => s.loadSession);
  const selectedModel     = useMemoryStore((s) => s.selectedModel);
  const customConfig      = useMemoryStore((s) => s.customConfig);
  const setSelectedModel  = useMemoryStore((s) => s.setSelectedModel);
  const setInstalledModels = useMemoryStore((s) => s.setInstalledModels);
  const userProfile       = useMemoryStore((s) => s.userProfile);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Apply theme class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // ── On mount: auto-init session + detect installed models ──────────────────
  useEffect(() => {
    // 1. Ensure there's always an active session
    if (!activeSessionId) {
      if (sessions.length > 0) {
        const sorted = [...sessions].sort((a, b) => b.lastUpdated - a.lastUpdated);
        loadSession(sorted[0].id);
      } else {
        createSession();
      }
    }
  }, [activeSessionId, sessions, loadSession, createSession]);

  useEffect(() => {
    // 2. Fetch installed Ollama models, auto-select if current isn't available
    modelsApi.list().then(({ data }) => {
      const names = data.models.map((m) => m.name);
      setInstalledModels(names);

      // If not using a custom API and the stored model isn't installed, pick the first one
      if (!customConfig && names.length > 0 && !names.includes(selectedModel)) {
        setSelectedModel(names[0]);
      }
    }).catch(() => {
      // Ollama might not be running — that's fine, keep the stored model
    });
  }, [customConfig, selectedModel, setInstalledModels, setSelectedModel]);

  useWebSocket();

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 2px 12px var(--nm-shadow-dark)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Collapse toggle */}
          <button
            onClick={toggleHistory}
            className="nm-btn p-2 rounded-xl transition-all"
            title={historyOpen ? 'Collapse history' : 'Expand history'}
          >
            {historyOpen
              ? <ChevronLeft size={15} style={{ color: 'var(--text-muted)' }} />
              : <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
            }
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="nm-btn p-1.5 rounded-xl">
              <Brain size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <span
              className="font-extrabold text-base tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Memora
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-wider"
              style={{ background: 'var(--accent)', color: '#fff', letterSpacing: '0.08em' }}
            >
              MVP
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* User profile indicator */}
          {userProfile && (
            <span
              className="hidden sm:flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              }}
            >
              <span>👤</span>
              <span className="max-w-[120px] truncate">{userProfile.split('\n')[0].slice(0, 30)}</span>
            </span>
          )}

          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="nm-btn p-2 rounded-xl transition-all"
            title="Settings"
            style={{ color: 'var(--text-muted)' }}
          >
            <Settings size={15} />
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Chat history */}
        <aside
          className="flex-shrink-0 flex flex-col overflow-hidden transition-all duration-250 ease-in-out"
          style={{
            width: historyOpen ? '220px' : '0px',
            opacity: historyOpen ? 1 : 0,
            borderRight: historyOpen ? '1px solid var(--border)' : 'none',
          }}
        >
          {historyOpen && <ChatHistory />}
        </aside>

        {/* Center: Chat */}
        <main
          className="flex-1 flex flex-col min-w-0"
          style={{ background: 'var(--bg-primary)' }}
        >
          <ChatWindow />
        </main>

        {/* Right: Memory Inspector — overflow-hidden keeps it inside the flex row */}
        <aside
          className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            background: 'var(--bg-primary)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          <MemoryInspector />
        </aside>
      </div>

      {/* ── Settings modal ── */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default App;
