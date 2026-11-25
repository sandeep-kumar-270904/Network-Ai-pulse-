import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] border border-transparent font-semibold',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border-strong)] hover:bg-[var(--surface-3)] font-medium',
  ghost:
    'bg-transparent text-[var(--text-secondary)] border border-transparent hover:text-[var(--text)] hover:bg-[var(--surface-3)] font-medium',
  destructive:
    'bg-[var(--danger)] text-[var(--accent-ink)] hover:opacity-90 border border-transparent font-semibold',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-[14px] leading-5 gap-2',
  lg: 'h-12 px-6 text-[14px] leading-5 gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  children,
  className = '',
  type = 'button',
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-[var(--radius-control)] whitespace-nowrap select-none transition-all duration-[var(--dur-micro)] ease-[var(--ease-out)] active:scale-[0.98] ${
        loading
          ? 'opacity-90 cursor-wait'
          : 'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
      } ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
    </button>
  );
};
