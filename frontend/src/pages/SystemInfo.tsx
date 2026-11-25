import React from 'react';
import { Link } from 'react-router-dom';
import { Server, HardDrive, Cpu, ArrowRight, Globe } from 'lucide-react';
import { StatusChip } from '../components/ui/StatusChip';
import { CopyButton } from '../components/ui/CopyButton';
import { getStoredGatewayUrl } from '../services/api';
import { formatPercent } from '../utils/formatters';

interface SystemInfoProps {
  system: any | null;
  networkEnv: any | null;
  backendOnline: boolean;
}

interface KeyValueRowProps {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  truncate?: boolean;
  href?: string;
}

const KeyValueRow: React.FC<KeyValueRowProps> = ({
  label,
  value,
  mono = true,
  copyable = false,
  truncate = false,
  href,
}) => (
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--border)] last:border-b-0">
    <dt className="text-[13px] text-[var(--text-secondary)] shrink-0">{label}</dt>
    <dd className="flex items-center justify-end gap-2 min-w-0">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title={value}
          className={`text-[13px] text-[var(--accent)] hover:underline ${
            mono ? 'font-mono np-mono-val' : ''
          } ${truncate ? 'truncate max-w-[260px] sm:max-w-[320px]' : 'break-all text-right'}`}
        >
          {value}
        </a>
      ) : (
        <span
          title={value}
          className={`text-[13px] text-[var(--text)] ${
            mono ? 'font-mono np-mono-val' : ''
          } ${truncate ? 'truncate max-w-[240px] sm:max-w-[320px]' : 'text-right'}`}
        >
          {value}
        </span>
      )}
      {copyable && value !== 'No data' && <CopyButton value={value} label={`Copy ${label}`} compact />}
    </dd>
  </div>
);

export const SystemInfoPage: React.FC<SystemInfoProps> = ({
  system,
  networkEnv,
  backendOnline,
}) => {
  const sys = system?.system || {};
  const interfaces = networkEnv?.interfaces || [];
  const gatewayUrl = getStoredGatewayUrl();

  const memoryTotalGb = sys?.memory_total_bytes
    ? `${(sys.memory_total_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    : 'No data';
  const memoryAvailGb = sys?.memory_available_bytes
    ? `${(sys.memory_available_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    : 'No data';
  const memoryUsedPercent: number | null = sys?.memory_used_percent ?? null;

  const osReleaseFull = sys.os_release
    ? sys.os_version
      ? `${sys.os_release} (${sys.os_version})`
      : String(sys.os_release)
    : 'No data';

  const pythonRuntimeFull = sys.python_version ? String(sys.python_version) : 'No data';
  const processorFull = sys.processor ? String(sys.processor) : 'No data';
  const defaultGateway = networkEnv?.default_gateway?.ip
    ? `${networkEnv.default_gateway.ip}${
        networkEnv.default_gateway.interface ? ` (${networkEnv.default_gateway.interface})` : ''
      }`
    : 'No data';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Group 1: Compute & Operating System */}
        <section className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <h3 className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
              <span>Compute & operating system</span>
            </h3>
            <StatusChip
              size="sm"
              tone={backendOnline ? 'ok' : 'danger'}
              label={backendOnline ? 'Host online' : 'Host offline'}
            />
          </div>

          <dl>
            <KeyValueRow label="Operating system" value={sys.os || 'No data'} copyable />
            <KeyValueRow label="OS release & build" value={osReleaseFull} truncate copyable />
            <KeyValueRow label="CPU architecture" value={sys.architecture || 'No data'} />
            <KeyValueRow
              label="Logical CPU cores"
              value={sys.cpu_count_logical ? `${sys.cpu_count_logical} cores` : 'No data'}
            />
            <KeyValueRow
              label="Physical CPU cores"
              value={sys.cpu_count_physical ? `${sys.cpu_count_physical} cores` : 'No data'}
            />
            <KeyValueRow label="Processor model" value={processorFull} truncate copyable />
          </dl>
        </section>

        {/* Group 2 & 3 Stack: Memory + Runtime & Gateway */}
        <div className="space-y-6">
          <section className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
                <span>Host memory</span>
              </h3>
              <span className="text-[12px] font-mono text-[var(--text-secondary)] np-mono-val">
                {formatPercent(memoryUsedPercent)} used
              </span>
            </div>

            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    memoryUsedPercent !== null && memoryUsedPercent >= 85
                      ? 'bg-[var(--danger)]'
                      : memoryUsedPercent !== null && memoryUsedPercent >= 70
                      ? 'bg-[var(--warn)]'
                      : 'bg-[var(--accent)]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, memoryUsedPercent ?? 0))}%` }}
                />
              </div>
              <div className="flex justify-between text-[12px] font-mono text-[var(--text-muted)]">
                <span>{memoryAvailGb} available</span>
                <span>{memoryTotalGb} total RAM</span>
              </div>
            </div>

            <dl>
              <KeyValueRow label="Total physical RAM" value={memoryTotalGb} />
              <KeyValueRow label="Available memory" value={memoryAvailGb} />
            </dl>
          </section>

          <section className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
                <span>Runtime & control plane</span>
              </h3>
              <span className="text-[12px] font-mono text-[var(--text-muted)]">FastAPI + SQLite</span>
            </div>

            <dl>
              <KeyValueRow label="Python runtime" value={pythonRuntimeFull} truncate copyable />
              <KeyValueRow label="API server URL" value={gatewayUrl} truncate copyable />
              <KeyValueRow label="Default route gateway" value={defaultGateway} truncate copyable />
              <KeyValueRow label="OpenAPI docs" value={`${gatewayUrl}/docs`} href={`${gatewayUrl}/docs`} truncate />
            </dl>
          </section>
        </div>
      </div>

      {/* Quiet Drill-Down Link to Inventory (no duplicated NIC table) */}
      <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[13px]">
          <Globe className="w-4 h-4 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
          <span className="text-[var(--text-secondary)]">
            Network interfaces and live adapter addresses ({interfaces.length} local adapters detected) are maintained in Inventory.
          </span>
        </div>
        <Link
          to="/inventory"
          className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1.5"
        >
          <span>Inspect adapters in Inventory</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};
