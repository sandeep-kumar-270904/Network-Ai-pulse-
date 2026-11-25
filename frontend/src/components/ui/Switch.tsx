import React, { useId } from 'react';
import { Lock } from 'lucide-react';

interface SwitchRowProps {
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  title: string;
  description: string;
  learnMoreHref?: string;
  learnMoreLabel?: string;
  onLearnMore?: () => void;
  disabled?: boolean;
  auditNote?: string;
}

export const Switch: React.FC<SwitchRowProps> = ({
  checked,
  onChange,
  title,
  description,
  learnMoreHref,
  learnMoreLabel = 'Learn more',
  onLearnMore,
  disabled = false,
  auditNote,
}) => {
  const inputId = useId();
  const descId = useId();

  return (
    <label
      htmlFor={inputId}
      className={`group flex items-center justify-between gap-4 min-h-[72px] p-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg-elev-2)] transition-colors duration-[var(--dur-micro)] ease-[var(--ease-out)] ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]'
      }`}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] leading-5 font-semibold text-[var(--text)]">
            {title}
          </span>
          {disabled && (
            <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
          )}
        </div>
        <p id={descId} className="np-helper text-[var(--text-muted)]">
          {description}
          {(learnMoreHref || onLearnMore) && (
            <>
              {' '}
              {onLearnMore ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLearnMore();
                  }}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2 font-medium rounded px-0.5"
                >
                  {learnMoreLabel}
                </button>
              ) : (
                <a
                  href={learnMoreHref}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2 font-medium rounded px-0.5"
                >
                  {learnMoreLabel}
                </a>
              )}
            </>
          )}
        </p>
        {auditNote && (
          <p className="text-[12px] leading-4 text-[var(--warn)] font-mono pt-0.5">
            {auditNote}
          </p>
        )}
      </div>

      {/* Switch Control (44x24px) */}
      <span className="relative inline-flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px]">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-describedby={descId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative w-[44px] h-[24px] rounded-[var(--radius-pill)] border transition-colors duration-[var(--dur-state)] ease-[var(--ease-out)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--accent)] peer-focus-visible:outline-offset-2 ${
            checked
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'bg-[var(--bg-elev-1)] border-[var(--border-control)]'
          }`}
        >
          <span
            className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full transition-transform duration-[var(--dur-state)] ease-[var(--ease-out)] ${
              checked
                ? 'translate-x-[20px] bg-[var(--accent-ink)]'
                : 'translate-x-0 bg-[var(--text-secondary)]'
            }`}
          />
        </span>
      </span>
    </label>
  );
};
