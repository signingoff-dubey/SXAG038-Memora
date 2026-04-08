import { useEffect } from 'react';
import { ChatWindow } from './components/Chat/ChatWindow';
import { MemoryInspector } from './components/MemoryInspector/MemoryInspector';
import { ThemeToggle } from './components/Layout/ThemeToggle';
import { useWebSocket } from './hooks/useWebSocket';
import { useMemoryStore } from './store/memoryStore';
import { Brain } from 'lucide-react';

function App() {
  const theme = useMemoryStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useWebSocket();

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-2.5">
          <Brain size={22} style={{ color: 'var(--accent)' }} />
          <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Memora
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            MVP
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <main className="flex-1 flex flex-col min-w-0">
          <ChatWindow />
        </main>

        {/* Memory Inspector sidebar */}
        <aside
          className="w-80 border-l flex-shrink-0 flex flex-col"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
        >
          <MemoryInspector />
        </aside>
      </div>
    </div>
  );
}

export default App;
