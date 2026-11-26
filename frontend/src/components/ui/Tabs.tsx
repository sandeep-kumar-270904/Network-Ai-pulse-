import React, { useRef } from 'react';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface TabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  variant?: 'underline' | 'segmented';
}

export function Tabs<T extends string = string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  variant = 'underline',
}: TabsProps<T>) {
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const enabled = tabs
      .map((t, i) => ({ t, i }))
      .filter((item) => !item.t.disabled);
    const pos = enabled.findIndex((item) => item.i === idx);
    if (pos === -1) return;

    let nextPos = pos;
    if (e.key === 'ArrowRight') nextPos = (pos + 1) % enabled.length;
    else if (e.key === 'ArrowLeft') nextPos = (pos - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') nextPos = 0;
    else if (e.key === 'End') nextPos = enabled.length - 1;
    else return;

    e.preventDefault();
    const target = enabled[nextPos];
    onChange(target.t.id);
    btnRefs.current[target.i]?.focus();
  };

  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="inline-flex flex-wrap items-center p-1 rounded-[var(--radius-control)] bg-[var(--surface-2)] gap-1"
      >
        {tabs.map((tab, idx) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                btnRefs.current[idx] = el;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={tab.disabled}
              tabIndex={selected ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onClick={() => onChange(tab.id)}
              className={`h-10 min-w-[40px] px-3 rounded-[var(--radius-control)] text-[13px] leading-5 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                selected
                  ? 'bg-[var(--surface-1)] text-[var(--text)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[12px] font-mono text-[var(--text-muted)]">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-1 border-b border-[var(--border)]"
    >
      {tabs.map((tab, idx) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              btnRefs.current[idx] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={tab.disabled}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onClick={() => onChange(tab.id)}
            className={`h-10 px-4 text-[14px] leading-5 font-medium border-b-2 -mb-px whitespace-nowrap inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              selected
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[12px] font-mono text-[var(--text-muted)]">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
