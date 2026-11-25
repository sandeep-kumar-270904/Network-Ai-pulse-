import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastTone = 'ok' | 'warn' | 'danger' | 'info';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

const ToastRow: React.FC<{ item: ToastItem; onDismiss: (id: string) => void }> = ({ item, onDismiss }) => {
  const timerRef = useRef<number | null>(null);
  const isError = item.tone === 'danger';

  const startTimer = useCallback(() => {
    if (isError) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onDismiss(item.id), 5000);
  }, [isError, item.id, onDismiss]);

  const pauseTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  React.useEffect(() => {
    startTimer();
    return () => pauseTimer();
  }, [startTimer]);

  const iconMap: Record<ToastTone, React.ReactNode> = {
    ok: <CheckCircle2 className="w-4 h-4 text-[var(--ok)] shrink-0 mt-1" aria-hidden="true" />,
    warn: <AlertTriangle className="w-4 h-4 text-[var(--warn)] shrink-0 mt-1" aria-hidden="true" />,
    danger: <XCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-1" aria-hidden="true" />,
    info: <Info className="w-4 h-4 text-[var(--info)] shrink-0 mt-1" aria-hidden="true" />,
  };

  const borderMap: Record<ToastTone, string> = {
    ok: 'border-[var(--ok)]/35',
    warn: 'border-[var(--warn)]/35',
    danger: 'border-[var(--danger)]/45',
    info: 'border-[var(--border-strong)]',
  };

  return (
    <div
      role={isError ? 'alert' : 'status'}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      onFocus={pauseTimer}
      onBlur={startTimer}
      className={`np-popover w-full sm:w-[360px] p-4 flex items-start gap-3 border ${borderMap[item.tone]} transition-all duration-[var(--dur-state)] ease-[var(--ease-out)]`}
    >
      {iconMap[item.tone]}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-5 font-medium text-[var(--text)]">{item.title}</p>
        {item.description && (
          <p className="text-[12px] leading-4 text-[var(--text-secondary)] mt-1">{item.description}</p>
        )}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            className="mt-2 h-8 px-2 -ml-2 inline-flex items-center text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] rounded-[var(--radius-control)]"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="w-10 h-10 -mr-2 -mt-2 flex items-center justify-center rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-20 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto w-full sm:w-auto">
            <ToastRow item={item} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
