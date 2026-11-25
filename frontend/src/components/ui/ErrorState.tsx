import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  why?: string;
  howToFix?: string;
  hint?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load telemetry',
  message,
  why = 'The NetPulse gateway could not complete this request or returned an error.',
  howToFix = 'Confirm the gateway service is running and reachable, check your Gateway URL in Settings, then click Retry.',
  hint,
  onRetry,
  retrying = false,
}) => {
  return (
    <div
      role="alert"
      className="p-5 rounded-[var(--radius-card)] bg-[var(--danger-soft)] border border-[var(--danger)]/35 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1.5">
          <h3 className="text-[14px] leading-5 font-semibold text-[var(--text)]">{title}</h3>
          <p className="text-[13px] leading-5 text-[var(--text)]">
            <strong className="font-semibold">What happened:</strong> {message}
          </p>
          <p className="text-[12px] leading-4 text-[var(--text-secondary)]">
            <strong className="font-semibold text-[var(--text)]">Why:</strong> {why}
          </p>
          <p className="text-[12px] leading-4 text-[var(--text-secondary)]">
            <strong className="font-semibold text-[var(--text)]">How to fix:</strong> {hint || howToFix}
          </p>
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
