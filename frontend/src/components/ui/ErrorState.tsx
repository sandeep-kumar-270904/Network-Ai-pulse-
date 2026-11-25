import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  hint?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  message,
  hint,
  onRetry,
  retrying = false,
}) => {
  return (
    <div
      role="alert"
      className="p-6 rounded-[var(--radius-card)] bg-[var(--danger-soft)] border border-[var(--danger)]/35 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h3 className="text-[14px] leading-5 font-semibold text-[var(--text)]">{title}</h3>
          <p className="text-[13px] leading-5 text-[var(--text-secondary)]">{message}</p>
          {hint && <p className="text-[12px] leading-4 text-[var(--text-muted)]">{hint}</p>}
        </div>
      </div>

      {onRetry && (
        <div className="shrink-0">
          <Button variant="secondary" loading={retrying} onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};
