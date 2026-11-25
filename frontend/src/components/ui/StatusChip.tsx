import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Circle } from 'lucide-react';

export type StatusTone = 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'neutral';

interface StatusChipProps {
  tone?: StatusTone;
  size?: 'xs' | 'sm' | 'md';
  label: string;
  showIcon?: boolean;
  pulseWhenLiveOrDegraded?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  ok: 'bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok)]/30',
  warn: 'bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn)]/35',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/35',
  info: 'bg-[var(--info-soft)] text-[var(--info)] border-[var(--info)]/30',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/35',
  neutral: 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border-strong)]',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  ok: 'bg-[var(--ok)]',
  warn: 'bg-[var(--warn)]',
  danger: 'bg-[var(--danger)]',
  info: 'bg-[var(--info)]',
  accent: 'bg-[var(--accent)]',
  neutral: 'bg-[var(--text-muted)]',
};

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'h-6 px-2 text-[12px] leading-4 rounded-[var(--radius-pill)] gap-1 uppercase tracking-wide',
  sm: 'h-6 px-3 text-[12px] leading-4 rounded-[var(--radius-pill)] gap-1.5',
  md: 'h-8 px-3 text-[13px] leading-4 rounded-[var(--radius-control)] gap-2',
};

export const StatusChip: React.FC<StatusChipProps> = ({
  tone = 'neutral',
  size = 'md',
  label,
  showIcon = true,
  pulseWhenLiveOrDegraded = false,
  className = '',
}) => {
  const shouldPulse = pulseWhenLiveOrDegraded && (tone === 'warn' || tone === 'danger' || tone === 'ok');

  const renderShape = () => {
    if (!showIcon) return null;
    if (tone === 'ok' && size !== 'xs') {
      return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    }
    if (tone === 'warn') return <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    if (tone === 'danger') return <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    if (tone === 'info') return <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;

    return (
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLASSES[tone]} ${
          shouldPulse ? 'np-pulse-soft' : ''
        }`}
        aria-hidden="true"
      />
    );
  };

  return (
    <span
      className={`inline-flex items-center font-medium border whitespace-nowrap select-none transition-colors duration-[var(--dur-state)] ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {size === 'xs' && tone === 'neutral' ? (
        <Circle className="w-2 h-2 fill-current shrink-0" aria-hidden="true" />
      ) : (
        renderShape()
      )}
      <span>{label}</span>
    </span>
  );
};
