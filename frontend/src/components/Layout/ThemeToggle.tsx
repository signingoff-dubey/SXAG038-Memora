import { Moon, Sun } from 'lucide-react';
import { useMemoryStore } from '../../store/memoryStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useMemoryStore();

  return (
    <button
      onClick={toggleTheme}
      className="nm-btn p-2.5 rounded-xl transition-all"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark'
        ? <Sun size={15} style={{ color: 'var(--warning)' }} />
        : <Moon size={15} style={{ color: 'var(--accent)' }} />
      }
    </button>
  );
}
