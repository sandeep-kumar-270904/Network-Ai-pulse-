import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface FieldProps {
  id: string;
  label: string;
  helper?: string;
  error?: string | null;
  warning?: string | null;
  success?: string | null;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  id,
  label,
  helper,
  error,
  warning,
  success,
  rightSlot,
  children,
}) => {
  const helperId = `${id}-helper`;
  const feedbackId = `${id}-feedback`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="np-field-label">
          {label}
        </label>
        {rightSlot}
      </div>

      {children}

      {helper && !error && (
        <p id={helperId} className="np-helper">
          {helper}
        </p>
      )}

      {error && (
        <p id={feedbackId} role="alert" className="flex items-start gap-1.5 text-[13px] leading-5 text-[var(--danger)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {!error && warning && (
        <p id={feedbackId} className="flex items-start gap-1.5 text-[13px] leading-5 text-[var(--warn)]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{warning}</span>
        </p>
      )}

      {!error && success && (
        <p id={feedbackId} aria-live="polite" className="flex items-start gap-1.5 text-[13px] leading-5 text-[var(--ok)]">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{success}</span>
        </p>
      )}
    </div>
  );
};
