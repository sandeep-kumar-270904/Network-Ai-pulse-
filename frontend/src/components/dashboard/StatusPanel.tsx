import React from 'react';
import { Server, Database, Activity, CheckCircle2, AlertTriangle, XCircle, HardDrive, Cpu } from 'lucide-react';
import { HealthResponse } from '../../types';
import { formatPercent } from '../../utils/formatters';

interface StatusPanelProps {
  health: HealthResponse | null;
  system: any | null;
  networkEnv: any | null;
  backendOnline: boolean;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  health,
  system,
  networkEnv,
  backendOnline,
}) => {
  const sysInfo = system?.system || health?.system;
  const memoryPercent = sysInfo?.memory_used_percent ?? null;
  const interfaceCount = networkEnv?.interfaces?.length ?? null;
  const probeStatus = health?.probe_health?.status;
  const dbText = health?.database_info
    ? `${health.database_info.engine} (${health.database_info.path})`
    : 'SQLite (data/netpulse.db)';

  const badgeTone = !backendOnline || probeStatus === 'critical'
    ? 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/30'
    : probeStatus === 'degraded'
    ? 'bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn)]/30'
    : 'bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok)]/30';

  const badgeLabel = !backendOnline
    ? 'Offline'
    : probeStatus === 'critical'
    ? 'Critical'
    : probeStatus === 'degraded'
    ? 'Degraded'
    : 'Healthy';

  return (
    <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
          <h3 className="text-[14px] font-semibold text-[var(--text)] truncate">
            Platform subsystems
          </h3>
        </div>
        <span
          className={`text-[12px] font-medium px-2.5 py-0.5 rounded-[var(--radius-pill)] border shrink-0 ${badgeTone}`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Subsystems Key-Value Rows */}
      <div className="space-y-2.5 text-[12px]">
        <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Server className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" aria-hidden="true" />
            <span className="text-[var(--text-secondary)]">REST API</span>
          </div>
          <span
            className={`font-mono font-medium flex items-center gap-1 shrink-0 ${
              backendOnline ? 'text-[var(--ok)]' : 'text-[var(--danger)]'
            }`}
          >
            {backendOnline ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Online</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Offline</span>
              </>
            )}
          </span>
        </div>

        <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Database className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
            <span className="text-[var(--text-secondary)]">Persistence</span>
          </div>
          <span
            className="font-mono text-[var(--text)] truncate text-right"
            title={dbText}
          >
            {dbText}
          </span>
        </div>

        <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
            <span className="text-[var(--text-secondary)]">CPU cores</span>
          </div>
          <span className="font-mono text-[var(--text)] np-mono-val">
            {sysInfo?.cpu_count_logical ? `${sysInfo.cpu_count_logical} logical` : 'No data'}
          </span>
        </div>

        <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-[var(--warn)]" aria-hidden="true" />
            <span className="text-[var(--text-secondary)]">Host memory</span>
          </div>
          <span className="font-mono text-[var(--text)] np-mono-val flex items-center gap-1">
            {memoryPercent !== null && memoryPercent > 85 && (
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--warn)]" aria-hidden="true" />
            )}
            <span>{memoryPercent !== null ? `${formatPercent(memoryPercent)} used` : 'No data'}</span>
          </span>
        </div>
      </div>

      {/* Host / Interface Context */}
      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2 text-[12px] font-mono text-[var(--text-muted)]">
        <span className="truncate">Host: {sysInfo?.hostname || 'No data'}</span>
        <span className="shrink-0">
          Adapters: {interfaceCount !== null ? interfaceCount : 'No data'}
        </span>
      </div>
    </div>
  );
};
