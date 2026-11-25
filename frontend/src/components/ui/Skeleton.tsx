import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => (
  <div className={`np-skeleton ${className}`} aria-hidden="true" />
);

export const SettingsSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
    <div className="np-card p-6 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>

    <div className="np-card p-6 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-64" />
    </div>

    <div className="np-card p-6 space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      <Skeleton className="h-[72px] w-full rounded-[var(--radius-card)]" />
      <Skeleton className="h-[72px] w-full rounded-[var(--radius-card)]" />
    </div>
  </div>
);
