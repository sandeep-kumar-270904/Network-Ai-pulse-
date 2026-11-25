import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, RefreshCw, PanelLeft, X } from 'lucide-react';
import { NAV_SECTIONS } from '../layout/Sidebar';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSyncNow: () => void;
  onToggleSidebar: () => void;
}

interface PaletteEntry {
  id: string;
  group: string;
  label: string;
  hint?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onSyncNow,
  onToggleSidebar,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const entries: PaletteEntry[] = React.useMemo(() => {
    const navEntries: PaletteEntry[] = NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => ({
        id: item.path,
        group: section.title,
        label: item.label,
        hint: item.path,
        action: () => {
          navigate(item.path);
          onClose();
        },
      }))
    );

    const actionEntries: PaletteEntry[] = [
      {
        id: 'act-sync',
        group: 'Actions',
        label: 'Sync gateway telemetry now',
        hint: 'Refresh',
        action: () => {
          onSyncNow();
          onClose();
        },
      },
      {
        id: 'act-sidebar',
        group: 'Actions',
        label: 'Toggle navigation sidebar',
        hint: '[',
        action: () => {
          onToggleSidebar();
          onClose();
        },
      },
    ];

    return [...navEntries, ...actionEntries];
  }, [navigate, onClose, onSyncNow, onToggleSidebar]);

  const filtered = entries.filter(
    (e) =>
      e.label.toLowerCase().includes(query.toLowerCase()) ||
      e.group.toLowerCase().includes(query.toLowerCase()) ||
      (e.hint && e.hint.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      filtered[activeIndex].action();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-[#070b14]/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick command palette"
        onKeyDown={handleKeyDown}
        className="w-full max-w-[540px] np-popover rounded-[var(--radius-dialog)] overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--border)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages or run an action…"
            aria-label="Search pages or actions"
            className="flex-1 bg-transparent text-[14px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--text-muted)]">
              No matching routes or actions for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between px-3 h-10 rounded-[var(--radius-control)] text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.id === 'act-sync' ? (
                      <RefreshCw className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    ) : item.id === 'act-sidebar' ? (
                      <PanelLeft className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-[14px] font-medium truncate">{item.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0 ml-3">
                    {item.hint || item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-elev-2)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>Navigate with ↑↓ and Enter</span>
          <span className="font-mono">Esc to close</span>
        </div>
      </div>
    </div>
  );
};
