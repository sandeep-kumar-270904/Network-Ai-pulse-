import React, { useState, useEffect } from 'react';
import { Menu, RefreshCw, ChevronRight, Clock, AlertTriangle, EyeOff, Eye } from 'lucide-react';
import { StatusChip, StatusTone } from '../ui/StatusChip';
import { Tooltip } from '../ui/Tooltip';
import { ThemeToggle, ThemeMode } from '../ui/ThemeToggle';
import { Select } from '../ui/Select';
import { GlobalHealthLevel } from '../../types';

export type TimeRangeOption = '15m' | '1h' | '6h' | '24h' | '7d';

interface TopBarProps {
  breadcrumbSection: string;
  breadcrumbPage: string;
  gatewayUrl: string;
  gatewayLatencyMs?: number;
  backendOnline: boolean;
  globalHealth: GlobalHealthLevel;
  globalHealthReason?: string;
  lastSyncAt: Date | null;
  pollingSec: number;
  timeRange: TimeRangeOption;
  onTimeRangeChange: (range: TimeRangeOption) => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  onOpenMobileMenu: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
}

const TIME_RANGE_OPTIONS = [
  { value: '15m', label: 'Last 15m' },
  { value: '1h', label: 'Last 1h' },
  { value: '6h', label: 'Last 6h' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7d' },
];

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbSection,
  breadcrumbPage,
  gatewayUrl,
  gatewayLatencyMs,
  backendOnline,
  globalHealth,
  globalHealthReason = 'All recent probes passed.',
  lastSyncAt,
  pollingSec,
  timeRange,
  onTimeRangeChange,
  onSyncNow,
  isSyncing,
  onOpenMobileMenu,
  theme,
  onToggleTheme,
  demoMode = false,
  onToggleDemoMode,
}) => {
  const [mobilePopoverOpen, setMobilePopoverOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const ageSec = lastSyncAt ? Math.max(0, Math.round((nowMs - lastSyncAt.getTime()) / 1000)) : null;
  const staleThresholdSec = Math.max(15, pollingSec * 3);
  const isStale = !backendOnline || (ageSec !== null && ageSec > staleThresholdSec);

  const stampText =
    ageSec === null
      ? 'Not synced'
      : ageSec < 5
      ? 'Updated just now'
      : ageSec < 60
      ? `Updated ${ageSec}s ago`
      : `Updated ${Math.round(ageSec / 60)}m ago`;

  const gatewayTone: StatusTone =
    !backendOnline || globalHealth === 'critical'
      ? 'danger'
      : globalHealth === 'degraded' || (gatewayLatencyMs !== undefined && gatewayLatencyMs > 150)
      ? 'warn'
      : 'ok';

  const statusText = !backendOnline
    ? 'Offline'
    : globalHealth === 'critical'
    ? 'Critical'
    : globalHealth === 'degraded'
    ? 'Degraded'
    : gatewayLatencyMs !== undefined && gatewayLatencyMs > 150
    ? 'Slow'
    : 'Healthy';

  const gatewayLabel = !backendOnline
    ? 'Offline'
    : gatewayLatencyMs !== undefined
    ? `${statusText} · ${gatewayLatencyMs} ms`
    : statusText;

  return (
    <header className="h-16 sticky top-0 z-20 bg-[var(--surface-backdrop)] backdrop-blur-sm border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
      {/* Left: Hamburger (<1024px) + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden w-10 h-10 -ml-2 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] min-w-0">
          <span className="hidden sm:inline text-[var(--text-muted)] truncate">{breadcrumbSection}</span>
          <ChevronRight className="hidden sm:inline w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
          <span className="font-medium text-[var(--text)] truncate">{breadcrumbPage}</span>
        </nav>
      </div>

      {/* Right: Desktop Controls (>=1024px) */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <Tooltip content={`Gateway: ${gatewayUrl} — ${globalHealthReason}`} side="bottom">
          <div className="inline-flex">
            <StatusChip
              size="md"
              tone={gatewayTone}
              label={gatewayLabel}
              pulseWhenLiveOrDegraded={!backendOnline || globalHealth !== 'healthy'}
              className="np-mono-val"
            />
          </div>
        </Tooltip>

        <div className="w-[124px]">
          <Select
            id="global-time-range"
            ariaLabel="Global time range"
            value={timeRange}
            options={TIME_RANGE_OPTIONS}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRangeOption)}
            className="font-mono"
          />
        </div>

        <Tooltip
          content={isStale ? `Data may be stale (threshold ${staleThresholdSec}s)` : `Polling every ${pollingSec}s`}
          side="bottom"
        >
          <span
            className={`inline-flex items-center gap-2 h-10 px-3 rounded-[var(--radius-control)] text-[12px] font-mono border ${
              isStale
                ? 'bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn)]/35'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]'
            }`}
          >
            {isStale ? (
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Clock className="w-4 h-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
            )}
            <span>{isStale && ageSec !== null ? `Stale · ${ageSec}s` : stampText}</span>
          </span>
        </Tooltip>

        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          className="h-10 px-3 rounded-[var(--radius-control)] inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 text-[var(--accent)] ${isSyncing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Sync</span>
        </button>

        {onToggleDemoMode && (
          <Tooltip
            content={
              demoMode
                ? 'Demo mask active: hostnames, IPs, and MACs are masked for screenshots'
                : 'Mask hostnames, IPs, and MACs for screenshots (Demo mode)'
            }
            side="bottom"
          >
            <button
              type="button"
              onClick={onToggleDemoMode}
              aria-label={demoMode ? 'Disable demo privacy mask' : 'Enable demo privacy mask'}
              aria-pressed={demoMode}
              className={`h-10 px-2.5 rounded-[var(--radius-control)] inline-flex items-center gap-1.5 text-[12px] font-medium border transition-colors ${
                demoMode
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 font-semibold'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]'
              }`}
            >
              {demoMode ? (
                <EyeOff className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{demoMode ? 'Masked' : 'Demo'}</span>
            </button>
          </Tooltip>
        )}

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      {/* Right: Tablet & Mobile Controls (<1024px) */}
      <div className="flex lg:hidden items-center gap-2 relative shrink-0">
        <button
          type="button"
          onClick={() => setMobilePopoverOpen((p) => !p)}
          aria-expanded={mobilePopoverOpen}
          aria-label="Toggle gateway status and time range"
          className="h-10 inline-flex items-center"
        >
          <StatusChip
            size="sm"
            tone={isStale && backendOnline && gatewayTone === 'ok' ? 'warn' : gatewayTone}
            label={backendOnline ? (gatewayLatencyMs !== undefined ? `${statusText} · ${gatewayLatencyMs} ms` : statusText) : 'Offline'}
            pulseWhenLiveOrDegraded={!backendOnline || globalHealth !== 'healthy'}
          />
        </button>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          aria-label="Sync now"
          className="w-10 h-10 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
        >
          <RefreshCw className={`w-4 h-4 text-[var(--accent)] ${isSyncing ? 'animate-spin' : ''}`} />
        </button>

        {mobilePopoverOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 np-popover p-4 space-y-3 z-40">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-muted)]">Gateway</span>
              <span className="font-mono text-[var(--text)] truncate max-w-[140px]">{gatewayUrl}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-muted)]">Freshness</span>
              <span className={isStale ? 'text-[var(--warn)] font-mono' : 'text-[var(--text-secondary)] font-mono'}>
                {stampText}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[12px] text-[var(--text-muted)] block">Time range</span>
              <Select
                id="mobile-time-range"
                ariaLabel="Time range"
                value={timeRange}
                options={TIME_RANGE_OPTIONS}
                onChange={(e) => {
                  onTimeRangeChange(e.target.value as TimeRangeOption);
                  setMobilePopoverOpen(false);
                }}
              />
            </div>
            {onToggleDemoMode && (
              <button
                type="button"
                onClick={onToggleDemoMode}
                aria-pressed={demoMode}
                className={`w-full h-9 px-3 rounded-[var(--radius-control)] border text-[12px] font-medium flex items-center justify-between ${
                  demoMode
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                <span>Demo privacy mask</span>
                <span className="font-mono">{demoMode ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
