import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Circle } from 'lucide-react';

export type StatusTone = 'ok' | 'warn' | 'danger' | 'accent' | 'neutral';

interface StatusChipProps {
  tone?: StatusTone;
  size?: 'xs' | 'sm' | 'md';
  label: string;
  showIcon?: boolean;
  pulseWhenDegraded?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  ok: 'bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok)]/30',
  warn: 'bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn)]/30',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/35',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/35',
  neutral: 'bg-[var(--bg-elev-2)] text-[var(--text-secondary)] border-[var(--border-strong)]',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  ok: 'bg-[var(--ok)]',
  warn: 'bg-[var(--warn)]',
  danger: 'bg-[var(--danger)]',
  accent: 'bg-[var(--accent)]',
  neutral: 'bg-[var(--text-muted)]',
};

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'h-[18px] px-1.5 text-[10px] leading-none rounded-full gap-1',
  sm: 'h-6 px-2.5 text-[12px] leading-none rounded-full gap-1.5',
  md: 'h-8 px-3 text-[13px] leading-none rounded-[var(--radius-control)] gap-2',
};

export const StatusChip: React.FC<StatusChipProps> = ({
  tone = 'neutral',
  size = 'md',
  label,
  showIcon = true,
  pulseWhenDegraded = false,
  className = '',
}) => {
  const isDegraded = tone === 'warn' || tone === 'danger';

  const renderShape = () => {
    if (!showIcon) return null;
    if (tone === 'ok') return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    if (tone === 'warn') return <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    if (tone === 'danger') return <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    return (
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLASSES[tone]} ${
          pulseWhenDegraded && isDegraded ? 'np-pulse-degraded' : ''
        }`}
        aria-hidden="true"
      />
    );
  };

  return (
    <span
      className={`inline-flex items-center font-medium border whitespace-nowrap select-none transition-colors duration-[var(--dur-state)] ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {size === 'xs' ? (
        <Circle className="w-1.5 h-1.5 fill-current shrink-0" aria-hidden="true" />
      ) : (
        renderShape()
      )}
      <span>{label}</span>
    </span>
  );
};
