import { Moon, Sun } from 'lucide-react';
import { useMemoryStore } from '../../store/memoryStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useMemoryStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors hover:opacity-70"
      style={{ background: 'var(--bg-secondary)' }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={16} style={{ color: 'var(--warning)' }} />
      ) : (
        <Moon size={16} style={{ color: 'var(--accent)' }} />
      )}
    </button>
  );
}
