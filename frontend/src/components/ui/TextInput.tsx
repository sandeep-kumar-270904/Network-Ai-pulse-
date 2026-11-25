import React from 'react';

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  id: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  invalid?: boolean;
  mono?: boolean;
  describedBy?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  id,
  leftIcon,
  rightAction,
  invalid = false,
  mono = false,
  describedBy,
  disabled,
  className = '',
  ...rest
}) => {
  return (
    <div
      className={`flex items-center h-11 rounded-[var(--radius-control)] bg-[var(--bg-elev-2)] border transition-all duration-[var(--dur-micro)] ease-[var(--ease-out)] ${
        invalid
          ? 'border-[var(--danger)] focus-within:ring-[3px] focus-within:ring-[var(--danger)]/25'
          : 'border-[var(--border)] hover:border-[var(--border-strong)] focus-within:border-[var(--accent)] focus-within:ring-[3px] focus-within:ring-[var(--accent-ring)]'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      {leftIcon && (
        <span className="pl-3 pr-2 text-[var(--text-muted)] flex items-center shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      )}

      <input
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`flex-1 min-w-0 h-full bg-transparent text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none ${
          leftIcon ? 'pl-0' : 'pl-3'
        } ${rightAction ? 'pr-2' : 'pr-3'} ${mono ? 'np-mono-val text-[14px]' : 'text-[14px]'}`}
        {...rest}
      />

      {rightAction && <div className="pr-1.5 shrink-0 flex items-center">{rightAction}</div>}
    </div>
  );
};
