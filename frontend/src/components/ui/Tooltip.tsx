import React, { useState, useRef, useEffect, useId } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'right' | 'left';
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delayMs = 400,
}) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const show = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setOpen(true), delayMs);
  };

  const hide = () => {
    clearTimer();
    setOpen(false);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    if (open) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
    return undefined;
  }, [open]);

  useEffect(() => () => clearTimer(), []);

  const posClasses: Record<NonNullable<TooltipProps['side']>, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  const child = React.cloneElement(children, {
    'aria-describedby': open ? tooltipId : children.props['aria-describedby'],
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      children.props.onBlur?.(e);
    },
  });

  return (
    <span className="relative inline-flex items-center">
      {child}
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none fixed sm:absolute z-50 w-max max-w-[240px] px-3 py-2 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[12px] leading-4 font-normal text-[var(--text)] shadow-[var(--shadow-popover)] transition-opacity duration-[var(--dur-micro)] ${posClasses[side]}`}
        >
          {content}
        </span>
      )}
    </span>
  );
};
