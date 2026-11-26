import React, { useId } from 'react';
import { Lock } from 'lucide-react';

interface SwitchRowProps {
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  title: string;
  description?: string;
  learnMoreLabel?: string;
  onLearnMore?: () => void;
  disabled?: boolean;
  auditNote?: string;
  compact?: boolean;
  inline?: boolean;
}

export const Switch: React.FC<SwitchRowProps> = ({
  checked,
  onChange,
  title,
  description,
  learnMoreLabel = 'Learn more',
  onLearnMore,
  disabled = false,
  auditNote,
  compact = false,
  inline = false,
}) => {
  const inputId = useId();
  const descId = useId();

  if (inline) {
    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-center gap-2 min-h-[40px] px-1 rounded-[var(--radius-control)] select-none ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative w-10 h-5 rounded-full border transition-colors duration-[var(--dur-state)] ease-[var(--ease-out)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--accent)] peer-focus-visible:outline-offset-2 ${
            checked
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'bg-[var(--surface-2)] border-[var(--border-control)]'
          }`}
        >
          <span
            className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 rounded-full transition-transform duration-[var(--dur-state)] ease-[var(--ease-out)] ${
              checked
                ? 'translate-x-5 bg-[var(--accent-ink)]'
                : 'translate-x-0 bg-[var(--text-secondary)]'
            }`}
          />
        </span>
        <span className="text-[12px] font-medium text-[var(--text-secondary)]">
          {checked ? 'On' : 'Off'}
        </span>
      </label>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className={`group flex items-center justify-between gap-4 rounded-[var(--radius-card)] bg-[var(--surface-2)] transition-colors duration-[var(--dur-micro)] ease-[var(--ease-out)] ${
        compact ? 'min-h-[48px] px-4 py-2' : 'min-h-[72px] p-4'
      } ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:bg-[var(--surface-3)]'
      }`}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] leading-5 font-medium text-[var(--text)]">
            {title}
          </span>
          {disabled && (
            <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
          )}
        </div>
        {description && (
          <p id={descId} className="np-helper">
            {description}
            {onLearnMore && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLearnMore();
                  }}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2 font-medium rounded px-1"
                >
                  {learnMoreLabel}
                </button>
              </>
            )}
          </p>
        )}
        {auditNote && (
          <p className="text-[12px] leading-4 text-[var(--warn)] font-mono pt-1">
            {auditNote}
          </p>
        )}
      </div>

      <span className="relative inline-flex items-center justify-center shrink-0 min-w-[44px] min-h-[40px]">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-describedby={description ? descId : undefined}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative w-11 h-6 rounded-[var(--radius-pill)] border transition-colors duration-[var(--dur-state)] ease-[var(--ease-out)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--accent)] peer-focus-visible:outline-offset-2 ${
            checked
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'bg-[var(--surface-1)] border-[var(--border-control)]'
          }`}
        >
          <span
            className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full transition-transform duration-[var(--dur-state)] ease-[var(--ease-out)] ${
              checked
                ? 'translate-x-5 bg-[var(--accent-ink)]'
                : 'translate-x-0 bg-[var(--text-secondary)]'
            }`}
          />
        </span>
      </span>
    </label>
  );
};
