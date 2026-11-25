import React from 'react';
import { formatPercent } from '../../utils/formatters';

interface ResourceGaugeProps {
  title: string;
  value: number | null;
  min?: number;
  max?: number;
  unit?: string;
  subtitle?: string;
  color?: string;
}

/**
 * Compact horizontal resource utilization meter replacing legacy tall radial gauges.
 */
export const ResourceGauge: React.FC<ResourceGaugeProps> = ({
  title,
  value,
  min = 0,
  max = 100,
  unit = '%',
  subtitle,
}) => {
  const valid = typeof value === 'number' && Number.isFinite(value);
  const clamped = valid ? Math.max(min, Math.min(max, value)) : 0;
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  const barTone =
    !valid
      ? 'bg-[var(--border-strong)]'
      : pct >= 90
      ? 'bg-[var(--danger)]'
      : pct >= 75
      ? 'bg-[var(--warn)]'
      : 'bg-[var(--ok)]';

  const textTone =
    !valid
      ? 'text-[var(--text-muted)]'
      : pct >= 90
      ? 'text-[var(--danger)]'
      : pct >= 75
      ? 'text-[var(--warn)]'
      : 'text-[var(--text)]';

  const displayVal = !valid
    ? 'No data'
    : unit === '%'
    ? formatPercent(clamped)
    : `${clamped.toFixed(1)} ${unit}`;

  return (
    <div className="space-y-2.5 pt-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--text-secondary)]">{title}</span>
        <span className={`text-[16px] font-semibold font-mono np-mono-val ${textTone}`}>
          {displayVal}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={valid ? Number(clamped.toFixed(1)) : 0}
        className="w-full h-2.5 rounded-[var(--radius-pill)] bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden"
      >
        <div
          className={`h-full rounded-[var(--radius-pill)] transition-[width] duration-[var(--dur-state)] ease-[var(--ease-out)] ${barTone}`}
          style={{ width: `${valid ? pct : 0}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[12px] font-mono text-[var(--text-muted)]">
        <span>{subtitle || 'System memory capacity'}</span>
        <span>
          {min}–{max}
          {unit}
        </span>
      </div>
    </div>
  );
};
