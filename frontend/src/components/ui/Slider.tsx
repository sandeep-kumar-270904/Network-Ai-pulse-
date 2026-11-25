import React, { useRef, useState, useLayoutEffect, useCallback, useId } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface SliderTick {
  value: number;
  label?: string;
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  ticks?: SliderTick[];
  minLabel?: string;
  maxLabel?: string;
  unit?: string;
  ariaLabel: string;
  disabled?: boolean;
}

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  ticks = [],
  minLabel,
  maxLabel,
  unit = 's',
  ariaLabel,
  disabled = false,
}) => {
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const tickRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const inputId = useId();

  const pct = ((value - min) / (max - min)) * 100;

  useLayoutEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.width = `${pct}%`;
    }
    if (thumbRef.current) {
      thumbRef.current.style.left = `${pct}%`;
    }
    ticks.forEach((t) => {
      const el = tickRefs.current[t.value];
      if (el) {
        const tickPct = ((t.value - min) / (max - min)) * 100;
        el.style.left = `${tickPct}%`;
      }
    });
  }, [pct, min, max, ticks]);

  const valueFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      return clamp(stepped, min, max);
    },
    [min, max, step, value]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(valueFromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled) return;
    onChange(valueFromClientX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next = value;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = clamp(value + step, min, max);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clamp(value - step, min, max);
        break;
      case 'PageUp':
        next = clamp(value + 5, min, max);
        break;
      case 'PageDown':
        next = clamp(value - 5, min, max);
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(next);
  };

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 pt-2 pb-6 relative select-none">
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative h-8 flex items-center cursor-pointer touch-none"
          >
            <div className="w-full h-2 rounded-[var(--radius-pill)] bg-[var(--border-control)] relative overflow-hidden">
              <div
                ref={fillRef}
                className="h-full bg-[var(--accent)] rounded-[var(--radius-pill)] transition-[width] duration-[var(--dur-micro)] ease-[var(--ease-out)]"
              />
            </div>

            <div
              ref={thumbRef}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={ariaLabel}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-valuetext={`${value} ${unit === 's' ? 'seconds' : unit}`}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[var(--surface-1)] border-2 border-[var(--accent)] transition-shadow duration-[var(--dur-micro)] ${
                dragging || focused
                  ? 'ring-4 ring-[var(--accent-ring)] scale-110'
                  : 'hover:ring-4 hover:ring-[var(--accent-soft)]'
              }`}
            >
              {(dragging || focused) && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] shadow-[var(--shadow-popover)] text-[12px] font-mono font-medium text-[var(--text)] whitespace-nowrap"
                >
                  {value} {unit}
                </span>
              )}
            </div>
          </div>

          {ticks.length > 0 && (
            <div className="relative h-6 mt-1" aria-hidden="true">
              {ticks.map((tick, idx) => {
                const isActive = value === tick.value;
                const isFirst = idx === 0;
                const isLast = idx === ticks.length - 1;
                const alignClass = isFirst
                  ? 'translate-x-0 items-start'
                  : isLast
                  ? '-translate-x-full items-end'
                  : '-translate-x-1/2 items-center';
                return (
                  <div
                    key={tick.value}
                    ref={(el) => {
                      tickRefs.current[tick.value] = el;
                    }}
                    className={`absolute top-0 flex flex-col ${alignClass}`}
                  >
                    <span
                      className={`w-px h-2 mb-1 ${
                        isActive ? 'bg-[var(--accent)]' : 'bg-[var(--border-control)]'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => onChange(tick.value)}
                      className={`text-[12px] font-mono leading-4 whitespace-nowrap transition-colors ${
                        isActive
                          ? 'text-[var(--accent)] font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {tick.label && tick.label !== `${tick.value}${unit}` ? (
                        <>
                          <span className="hidden sm:inline">{tick.label}</span>
                          <span className="sm:hidden">{tick.value}{unit}</span>
                        </>
                      ) : (
                        `${tick.value}${unit}`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center h-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => onChange(clamp(value - step, min, max))}
            disabled={disabled || value <= min}
            aria-label={`Decrease ${ariaLabel}`}
            className="w-10 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-40 rounded-l-[var(--radius-control)] transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <label htmlFor={inputId} className="sr-only">
            {ariaLabel} numeric input
          </label>
          <input
            id={inputId}
            type="number"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            value={value}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) {
                onChange(clamp(parsed, min, max));
              }
            }}
            className="w-12 h-full bg-transparent text-center np-mono-val text-[var(--text)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => onChange(clamp(value + step, min, max))}
            disabled={disabled || value >= max}
            aria-label={`Increase ${ariaLabel}`}
            className="w-10 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-40 rounded-r-[var(--radius-control)] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-[12px] leading-4 text-[var(--text-muted)] pr-0 sm:pr-[148px]">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
};
