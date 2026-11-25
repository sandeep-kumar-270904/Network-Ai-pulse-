import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface CardProps {
  id?: string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'aside';
}

export const Card: React.FC<CardProps> = ({
  id,
  title,
  description,
  icon: Icon,
  headerRight,
  children,
  className = '',
  as: Tag = 'section',
}) => {
  const headingId = id && title ? `${id}-heading` : undefined;

  return (
    <Tag
      id={id}
      aria-labelledby={headingId}
      className={`np-card p-6 space-y-4 scroll-mt-24 ${className}`}
    >
      {(title || headerRight) && (
        <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <Icon
                className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-1"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
            <div className="space-y-1 min-w-0">
              {title && (
                <h2 id={headingId} className="np-section-title">
                  {title}
                </h2>
              )}
              {description && <p className="np-helper">{description}</p>}
            </div>
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
};
