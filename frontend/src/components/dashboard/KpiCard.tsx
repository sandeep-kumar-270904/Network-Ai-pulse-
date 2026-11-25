import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface KpiDelta {
  direction: 'up' | 'down' | 'flat';
  value: string;
  sentiment?: 'good' | 'bad' | 'neutral';
}

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  tooltip?: string;
  icon?: LucideIcon;
  status?: 'nominal' | 'warning' | 'critical' | 'neutral';
  delta?: KpiDelta;
  trend?: KpiDelta;
  sparkline?: number[];
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subtext,
  tooltip,
  icon: Icon,
  status = 'neutral',
  delta,
  trend,
  sparkline,
  onClick,
}) => {
  const effectiveDelta = delta || trend;

  const toneStyle = {
    nominal: {
      accentBar: 'bg-[var(--ok)]',
      iconBox: 'bg-[var(--ok-soft)] text-[var(--ok)]',
      sparkColor: 'var(--ok)',
    },
    warning: {
      accentBar: 'bg-[var(--warn)]',
      iconBox: 'bg-[var(--warn-soft)] text-[var(--warn)]',
      sparkColor: 'var(--warn)',
    },
    critical: {
      accentBar: 'bg-[var(--danger)]',
      iconBox: 'bg-[var(--danger-soft)] text-[var(--danger)]',
      sparkColor: 'var(--danger)',
    },
    neutral: {
      accentBar: 'bg-[var(--border-strong)]',
      iconBox: 'bg-[var(--surface-2)] text-[var(--text-secondary)]',
      sparkColor: 'var(--accent)',
    },
  }[status];

  const deltaToneClass = (() => {
    if (!effectiveDelta) return '';
    if (effectiveDelta.sentiment === 'good') return 'text-[var(--ok)]';
    if (effectiveDelta.sentiment === 'bad') return 'text-[var(--danger)]';
    if (effectiveDelta.sentiment === 'neutral') return 'text-[var(--text-secondary)]';
    return effectiveDelta.direction === 'up'
      ? 'text-[var(--ok)]'
      : effectiveDelta.direction === 'down'
      ? 'text-[var(--danger)]'
      : 'text-[var(--text-secondary)]';
  })();

  const renderSparkline = () => {
    if (!sparkline || sparkline.length < 2) return null;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const span = max - min || 1;
    const width = 84;
    const height = 24;
    const points = sparkline
      .map((val, idx) => {
        const x = (idx / (sparkline.length - 1)) * width;
        const y = height - ((val - min) / span) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="shrink-0 overflow-visible"
      >
        <polyline
          fill="none"
          stroke={toneStyle.sparkColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const cardBody = (
    <>
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-[var(--radius-card)] ${toneStyle.accentBar}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] leading-5 font-medium text-[var(--text-secondary)]">
            {label}
          </span>
          {tooltip && (
            <Tooltip content={tooltip} side="top">
              <span
                tabIndex={0}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${label} info`}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] text-[12px] font-mono cursor-help shrink-0"
              >
                ?
              </span>
            </Tooltip>
          )}
        </div>
        {Icon && (
          <div className={`w-8 h-8 rounded-[var(--radius-control)] flex items-center justify-center shrink-0 ${toneStyle.iconBox}`}>
            <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[28px] leading-9 font-semibold tracking-[-0.02em] font-mono tabular-nums text-[var(--text)] transition-colors duration-[var(--dur-state)]">
            {value}
          </span>
          {unit && (
            <span className="text-[12px] leading-4 font-mono text-[var(--text-muted)]">
              {unit}
            </span>
          )}
        </div>
        {renderSparkline()}
      </div>

      <div className="flex items-center justify-between gap-2 text-[12px] leading-4 text-[var(--text-muted)]">
        <span className="truncate">{subtext || 'Active measurement'}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {effectiveDelta && (
            <span className={`font-mono font-medium ${deltaToneClass}`}>
              {effectiveDelta.direction === 'up'
                ? '+'
                : effectiveDelta.direction === 'down'
                ? '-'
                : ''}
              {effectiveDelta.value}
            </span>
          )}
          {onClick && (
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" aria-hidden="true" />
          )}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group text-left w-full np-card p-4 flex flex-col justify-between gap-3 relative cursor-pointer hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)]/40 transition-colors"
      >
        {cardBody}
      </button>
    );
  }

  return (
    <div className="np-card p-4 flex flex-col justify-between gap-3 relative">
      {cardBody}
    </div>
  );
};
