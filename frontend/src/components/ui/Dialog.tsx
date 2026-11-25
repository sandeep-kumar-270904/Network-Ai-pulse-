import React, { useEffect, useRef, useId } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'accent';
  onConfirm: () => void;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  children,
}) => {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    // Focus cancel by default for safety-critical confirmations
    window.requestAnimationFrame(() => {
      cancelBtnRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070b14]/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-[480px] rounded-[var(--radius-dialog)] bg-[var(--bg-elev-1)] border border-[var(--border-strong)] shadow-[var(--shadow-popover)] p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {tone === 'danger' && (
              <div className="w-9 h-9 rounded-[var(--radius-control)] bg-[var(--danger-soft)] border border-[var(--danger)]/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[var(--danger)]" aria-hidden="true" />
              </div>
            )}
            <div className="space-y-1">
              <h2 id={titleId} className="np-section-title">
                {title}
              </h2>
              <p id={descId} className="np-helper text-[var(--text-secondary)]">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--bg-elev-2)] border border-[var(--border-strong)] text-[14px] font-medium text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 px-4 rounded-[var(--radius-control)] text-[14px] font-semibold transition-colors ${
              tone === 'danger'
                ? 'bg-[var(--danger)] text-[var(--accent-ink)] hover:opacity-90'
                : 'bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
