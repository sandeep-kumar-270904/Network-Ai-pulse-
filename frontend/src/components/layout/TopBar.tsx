import React, { useState } from 'react';
import { Menu, RefreshCw, ChevronRight } from 'lucide-react';
import { StatusChip, StatusTone } from '../ui/StatusChip';
import { Tooltip } from '../ui/Tooltip';

interface TopBarProps {
  breadcrumbSection: string;
  breadcrumbPage: string;
  gatewayUrl: string;
  gatewayLatencyMs?: number;
  backendOnline: boolean;
  lastSyncAt: Date | null;
  onSyncNow: () => void;
  isSyncing: boolean;
  onOpenMobileMenu: () => void;
}

const formatRelativeSync = (dt: Date | null): string => {
  if (!dt) return 'Never synced';
  const diffSec = Math.max(0, Math.round((Date.now() - dt.getTime()) / 1000));
  if (diffSec < 5) return 'Last sync just now';
  if (diffSec < 60) return `Last sync ${diffSec}s ago`;
  const mins = Math.round(diffSec / 60);
  return `Last sync ${mins}m ago`;
};

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbSection,
  breadcrumbPage,
  gatewayUrl,
  gatewayLatencyMs,
  backendOnline,
  lastSyncAt,
  onSyncNow,
  isSyncing,
  onOpenMobileMenu,
}) => {
  const [mobilePopoverOpen, setMobilePopoverOpen] = useState(false);

  const gatewayTone: StatusTone = !backendOnline
    ? 'danger'
    : gatewayLatencyMs !== undefined && gatewayLatencyMs > 150
    ? 'warn'
    : 'ok';

  const gatewayLabel = !backendOnline
    ? 'Unreachable'
    : gatewayLatencyMs !== undefined
    ? `${gatewayLatencyMs} ms`
    : 'Connected';

  return (
    <header className="h-16 sticky top-0 z-20 bg-[#070b14]/85 backdrop-blur-[8px] border-b border-[var(--border)] px-4 sm:px-6 flex items-center justify-between gap-3">
      {/* Left: Hamburger (mobile) + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="md:hidden w-11 h-11 -ml-2 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] min-w-0">
          <span className="text-[var(--text-muted)] truncate">{breadcrumbSection}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
          <span className="font-medium text-[var(--text)] truncate">{breadcrumbPage}</span>
        </nav>
      </div>

      {/* Right: Desktop Status Cluster (32px height, 8px radius) */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <StatusChip size="md" tone="neutral" label="Lab" />

        <Tooltip content={`Gateway: ${gatewayUrl}`} side="bottom">
          <div className="inline-flex">
            <StatusChip
              size="md"
              tone={gatewayTone}
              label={gatewayLabel}
              pulseWhenDegraded
              className="np-mono-val"
            />
          </div>
        </Tooltip>

        <Tooltip content={formatRelativeSync(lastSyncAt)} side="bottom">
          <button
            type="button"
            onClick={onSyncNow}
            disabled={isSyncing}
            className="h-8 px-3 rounded-[var(--radius-control)] inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border)] disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[var(--accent)] ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Sync now</span>
          </button>
        </Tooltip>
      </div>

      {/* Right: Mobile Condensed Status Popover + Sync Button */}
      <div className="flex md:hidden items-center gap-1.5 relative shrink-0">
        <button
          type="button"
          onClick={() => setMobilePopoverOpen((p) => !p)}
          aria-expanded={mobilePopoverOpen}
          aria-label="Toggle gateway status details"
          className="min-h-[44px] flex items-center"
        >
          <StatusChip
            size="md"
            tone={gatewayTone}
            label={backendOnline ? `Lab · ${gatewayLabel}` : 'Offline'}
            pulseWhenDegraded
          />
        </button>

        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          aria-label="Sync now"
          className="w-11 h-11 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
        >
          <RefreshCw className={`w-4 h-4 text-[var(--accent)] ${isSyncing ? 'animate-spin' : ''}`} />
        </button>

        {mobilePopoverOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 np-popover p-4 space-y-2 z-40">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-muted)]">Environment</span>
              <span className="font-medium text-[var(--text)]">Lab</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-muted)]">Gateway</span>
              <span className="font-mono text-[var(--text)] truncate max-w-[140px]">{gatewayUrl}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-muted)]">Sync</span>
              <span className="text-[var(--text-secondary)]">{formatRelativeSync(lastSyncAt)}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
