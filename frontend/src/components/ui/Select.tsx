import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
  ariaLabel?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  value,
  onChange,
  options,
  children,
  invalid = false,
  disabled = false,
  describedBy,
  ariaLabel,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const parsedOptions: SelectOption[] = React.useMemo(() => {
    if (options && options.length > 0) return options;
    const list: SelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<{ value?: string; children?: React.ReactNode }>(child) && child.type === 'option') {
        const val = String(child.props.value ?? child.props.children ?? '');
        const label = String(child.props.children ?? val);
        list.push({ value: val, label });
      }
    });
    return list;
  }, [options, children]);

  const currentOption = parsedOptions.find((o) => o.value === value) || parsedOptions[0];

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] text-[14px] leading-5 text-[var(--text)] border flex items-center justify-between gap-2 transition-all duration-[var(--dur-micro)] ease-[var(--ease-out)] ${
          invalid
            ? 'border-[var(--danger)] focus-visible:ring-[3px] focus-visible:ring-[var(--danger)]/25'
            : 'border-[var(--border)] hover:border-[var(--border-strong)] focus-visible:border-[var(--accent)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate text-left">{currentOption?.label ?? value}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-[var(--dur-micro)] ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 top-full mt-1 z-40 np-popover p-1 max-h-60 overflow-y-auto space-y-1"
        >
          {parsedOptions.map((opt) => {
            const selected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: opt.value } });
                    setOpen(false);
                  }}
                  className={`w-full min-h-[36px] px-3 py-2 rounded-[var(--radius-control)] text-[13px] leading-5 flex items-center justify-between gap-2 text-left transition-colors ${
                    selected
                      ? 'bg-[var(--accent-soft)] text-[var(--text)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected && <Check className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
