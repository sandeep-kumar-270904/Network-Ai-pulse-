import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}) => {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    prevFocusRef.current = document.activeElement as HTMLElement | null;
    window.requestAnimationFrame(() => closeBtnRef.current?.focus());

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      prevFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[var(--surface-backdrop)] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="w-full max-w-[440px] h-full bg-[var(--surface-1)] border-l border-[var(--border-strong)] shadow-[var(--shadow-popover)] flex flex-col transition-transform duration-[var(--dur-panel)] ease-[var(--ease-out)]"
      >
        <header className="px-6 py-4 border-b border-[var(--border)] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <h2 id={titleId} className="np-section-title">
              {title}
            </h2>
            {description && (
              <p id={descId} className="np-helper">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-10 h-10 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>

        {footer && (
          <footer className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-end gap-2 shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};
