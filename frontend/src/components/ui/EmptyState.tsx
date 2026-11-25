import React from 'react';
import { type LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  loading = false,
}) => {
  return (
    <div className="p-8 rounded-[var(--radius-card)] bg-[var(--surface-2)] text-center flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-[var(--radius-card)] bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-muted)]">
        <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-[44ch]">
        <h3 className="text-[14px] leading-5 font-semibold text-[var(--text)]">{title}</h3>
        <p className="np-helper mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-1">
          <Button variant="primary" loading={loading} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
