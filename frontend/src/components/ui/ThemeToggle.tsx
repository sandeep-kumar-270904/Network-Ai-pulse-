import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Tooltip } from './Tooltip';

export type ThemeMode = 'dark' | 'light';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  return (
    <Tooltip content={isDark ? 'Switch to light theme' : 'Switch to dark theme'} side="bottom">
      <button
        type="button"
        onClick={onToggle}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-pressed={!isDark}
        className="h-10 w-10 rounded-[var(--radius-control)] inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] active:scale-[0.98] transition-all duration-[var(--dur-micro)] ease-[var(--ease-out)]"
      >
        {isDark ? (
          <Sun className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </Tooltip>
  );
};
