import React from 'react';

interface SettingsCardProps {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  statusSlot?: React.ReactNode;
  children: React.ReactNode;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  id,
  icon: Icon,
  title,
  description,
  statusSlot,
  children,
}) => {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className="np-card p-6 space-y-5 scroll-mt-24"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-1" aria-hidden="true" />
          <div className="space-y-0.5 min-w-0">
            <h2 id={id ? `${id}-heading` : undefined} className="np-section-title">
              {title}
            </h2>
            {description && <p className="np-helper">{description}</p>}
          </div>
        </div>
        {statusSlot && <div className="shrink-0">{statusSlot}</div>}
      </header>

      <div className="space-y-5">{children}</div>
    </section>
  );
};
