import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Server,
  Radio,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Network,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../components/dashboard/KpiCard';
import { StatusPanel } from '../components/dashboard/StatusPanel';
import { ResourceGauge } from '../components/charts/ResourceGauge';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { TopologyGraph } from '../components/topology/TopologyGraph';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { StatusChip, StatusTone } from '../components/ui/StatusChip';
import { EmptyState } from '../components/ui/EmptyState';
import { ThemeMode } from '../components/ui/ThemeToggle';
import { fetchAlerts, fetchAnalyticsSummary, fetchInventoryNodes } from '../services/api';
import { HealthResponse } from '../types';
import { TimeRangeOption } from '../components/layout/TopBar';
import {
  formatChartTimeUtc,
  formatLatencyMs,
  formatPercent,
  formatRelativeTime,
  formatTimestampUtc,
} from '../utils/formatters';

interface OverviewProps {
  backendOnline: boolean;
  gatewayLatencyMs?: number;
  health: HealthResponse | null;
  system: any | null;
  networkEnv: any | null;
  timeRange?: TimeRangeOption;
  theme?: ThemeMode;
}

interface ActiveIssueItem {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  timestamp?: string | null;
  route: string;
}

interface TargetSummaryRow {
  target: string;
  runs: number;
  pass_rate_pct: number;
  avg_rtt_ms: number | null;
  avg_loss_pct: number | null;
  latest_status: 'passed' | 'failed';
  failing: boolean;
}

export const Overview: React.FC<OverviewProps> = ({
  backendOnline,
  gatewayLatencyMs,
  health,
  system,
  networkEnv,
  timeRange = '1h',
  theme = 'dark',
}) => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [nodeCount, setNodeCount] = useState<number>(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [gatewayRttHistory, setGatewayRttHistory] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof gatewayLatencyMs === 'number' && Number.isFinite(gatewayLatencyMs)) {
      setGatewayRttHistory((prev) => [...prev.slice(-14), gatewayLatencyMs]);
    }
  }, [gatewayLatencyMs]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [anaRes, invRes, alertRes] = await Promise.all([
        fetchAnalyticsSummary(timeRange, 500),
        fetchInventoryNodes(),
        fetchAlerts(40),
      ]);
      if (!active) return;
      if (anaRes.analytics) setAnalytics(anaRes.analytics);
      if (invRes.nodes) setNodeCount(invRes.nodes.length);
      if (alertRes.events) setAlerts(alertRes.events);
    };
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [backendOnline, timeRange]);

  const sysInfo = system?.system || health?.system;
  const memoryUsedPercent: number | null = sysInfo?.memory_used_percent ?? null;
  const cpuCount: number | null = sysInfo?.cpu_count_logical ?? null;
  const defaultGw = networkEnv?.default_gateway || 'No data';
  const passRate: number | null = analytics?.pass_rate_pct ?? null;
  const windowLabel: string = analytics?.window_label || `Last ${timeRange}`;

  const validLatencySpark = useMemo(
    () =>
      (analytics?.series?.latency || [])
        .filter((v: unknown): v is number => typeof v === 'number' && Number.isFinite(v))
        .slice(-15),
    [analytics]
  );

  const passRateDelta = useMemo(() => {
    const st: string[] = analytics?.series?.statuses || [];
    if (st.length < 4) return undefined;
    const mid = Math.floor(st.length / 2);
    const first = st.slice(0, mid);
    const second = st.slice(mid);
    const p1 = (first.filter((s) => s === 'passed').length / first.length) * 100;
    const p2 = (second.filter((s) => s === 'passed').length / second.length) * 100;
    const diff = Number((p2 - p1).toFixed(1));
    if (Math.abs(diff) < 0.1) return { direction: 'flat' as const, value: '0.0%', sentiment: 'neutral' as const };
    return {
      direction: diff > 0 ? ('up' as const) : ('down' as const),
      value: `${Math.abs(diff).toFixed(1)}%`,
      sentiment: diff > 0 ? ('good' as const) : ('bad' as const),
    };
  }, [analytics]);

  const gatewayDelta = useMemo(() => {
    if (gatewayRttHistory.length < 2) return undefined;
    const prev = gatewayRttHistory[gatewayRttHistory.length - 2];
    const curr = gatewayRttHistory[gatewayRttHistory.length - 1];
    const diff = Math.round(curr - prev);
    if (diff === 0) return { direction: 'flat' as const, value: '0 ms', sentiment: 'neutral' as const };
    return {
      direction: diff > 0 ? ('up' as const) : ('down' as const),
      value: `${Math.abs(diff)} ms`,
      sentiment: diff > 0 ? ('bad' as const) : ('good' as const),
    };
  }, [gatewayRttHistory]);

  const unackAlerts = useMemo(
    () => alerts.filter((a) => !a.acknowledged && (a.level === 'critical' || a.level === 'warning')),
    [alerts]
  );

  const failingTargetsCount: number = analytics?.failing_targets_count ?? 0;
  const totalTargetsCount: number = analytics?.total_targets_count ?? 0;
  const failingSince: string | null = analytics?.failing_since ?? null;

  // Problems sorted first: failing targets followed by active critical/warning alerts
  const activeIssues: ActiveIssueItem[] = useMemo(() => {
    const items: ActiveIssueItem[] = [];
    const perTarget: TargetSummaryRow[] = analytics?.per_target || [];
    perTarget
      .filter((pt) => pt.failing || pt.latest_status === 'failed')
      .forEach((pt) => {
        items.push({
          id: `target-${pt.target}`,
          severity: pt.latest_status === 'failed' || pt.pass_rate_pct < 70 ? 'critical' : 'warning',
          title: `${pt.target} probe failures`,
          detail: `${formatPercent(pt.pass_rate_pct)} pass rate · ${formatPercent(pt.avg_loss_pct)} avg loss`,
          route: '/analytics',
        });
      });

    unackAlerts.slice(0, 6).forEach((al) => {
      items.push({
        id: `alert-${al.id}`,
        severity: al.level === 'critical' ? 'critical' : 'warning',
        title: al.source || 'Operational alert',
        detail: al.message,
        timestamp: al.timestamp,
        route: '/alerts',
      });
    });

    items.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
    return items.slice(0, 5);
  }, [analytics, unackAlerts]);

  const seriesData = analytics?.series?.timestamps?.length
    ? {
        latency: {
          timestamps: analytics.series.timestamps,
          isoTimestamps: analytics.series.iso_timestamps,
          statuses: analytics.series.statuses,
          targets: analytics.series.targets,
          values: analytics.series.latency,
        },
        jitter: {
          timestamps: analytics.series.timestamps,
          isoTimestamps: analytics.series.iso_timestamps,
          statuses: analytics.series.statuses,
          targets: analytics.series.targets,
          values: analytics.series.jitter,
        },
        loss: {
          timestamps: analytics.series.timestamps,
          isoTimestamps: analytics.series.iso_timestamps,
          statuses: analytics.series.statuses,
          targets: analytics.series.targets,
          values: analytics.series.loss,
        },
      }
    : undefined;

  const targetColumns: DataColumn<TargetSummaryRow>[] = [
    {
      key: 'target',
      header: 'Monitored target',
      sortable: true,
      sortValue: (r) => r.target,
      render: (r) => (
        <button
          type="button"
          onClick={() => navigate('/diagnostics')}
          className="font-mono font-semibold text-[var(--accent)] hover:underline text-left"
        >
          {r.target}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (r) => (r.latest_status === 'failed' ? 0 : r.failing ? 1 : 2),
      render: (r) => {
        const tone: StatusTone =
          r.latest_status === 'failed' || r.pass_rate_pct < 70
            ? 'danger'
            : r.failing || r.pass_rate_pct < 95
            ? 'warn'
            : 'ok';
        const label =
          r.latest_status === 'failed' ? 'Failing' : r.failing ? 'Degraded' : 'Healthy';
        return <StatusChip size="sm" tone={tone} label={label} />;
      },
    },
    {
      key: 'pass_rate_pct',
      header: 'Pass rate',
      numeric: true,
      sortable: true,
      sortValue: (r) => r.pass_rate_pct,
      render: (r) => (
        <span
          className={`font-semibold ${
            r.pass_rate_pct >= 95
              ? 'text-[var(--ok)]'
              : r.pass_rate_pct >= 70
              ? 'text-[var(--warn)]'
              : 'text-[var(--danger)]'
          }`}
        >
          {formatPercent(r.pass_rate_pct)}
        </span>
      ),
    },
    {
      key: 'avg_rtt_ms',
      header: 'Avg RTT',
      numeric: true,
      sortable: true,
      sortValue: (r) => r.avg_rtt_ms ?? -1,
      render: (r) => (
        <span className={r.avg_rtt_ms === null ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}>
          {formatLatencyMs(r.avg_rtt_ms)}
        </span>
      ),
    },
    {
      key: 'avg_loss_pct',
      header: 'Loss',
      numeric: true,
      sortable: true,
      sortValue: (r) => r.avg_loss_pct ?? -1,
      render: (r) => (
        <span className={r.avg_loss_pct && r.avg_loss_pct > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}>
          {formatPercent(r.avg_loss_pct)}
        </span>
      ),
    },
  ];

  const hasProblems = !backendOnline || failingTargetsCount > 0 || unackAlerts.length > 0;
  const plainStatusLine = !backendOnline
    ? 'API gateway unreachable. Diagnostics and live probes are offline.'
    : failingTargetsCount > 0
    ? `${failingTargetsCount} of ${totalTargetsCount} targets failing${
        failingSince ? ` since ${formatChartTimeUtc(failingSince)}` : ''
      }. ${unackAlerts.length} active ${unackAlerts.length === 1 ? 'alert' : 'alerts'}.`
    : unackAlerts.length > 0
    ? `All ${totalTargetsCount || nodeCount} monitored targets passing. ${unackAlerts.length} active ${
        unackAlerts.length === 1 ? 'alert' : 'alerts'
      }.`
    : `All ${totalTargetsCount || nodeCount} monitored targets healthy. 0 active alerts.`;

  return (
    <div className="space-y-6">
      {/* Plain-language operational status summary with drill-down links */}
      <div
        className={`p-4 rounded-[var(--radius-card)] border flex flex-wrap items-center justify-between gap-3 ${
          !backendOnline || failingTargetsCount > 0
            ? 'bg-[var(--danger-soft)] border-[var(--danger)]/35'
            : unackAlerts.length > 0
            ? 'bg-[var(--warn-soft)] border-[var(--warn)]/35'
            : 'bg-[var(--ok-soft)] border-[var(--ok)]/30'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {hasProblems ? (
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${
                !backendOnline || failingTargetsCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--warn)]'
              }`}
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[var(--ok)] shrink-0" aria-hidden="true" />
          )}
          <span className="text-[14px] font-medium text-[var(--text)]">{plainStatusLine}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/analytics')}
            className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
          >
            <span>Target health</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
          >
            <span>Alerts ({unackAlerts.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards with delta, trend sparkline & drill-down */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Backend API latency"
          value={
            backendOnline
              ? gatewayLatencyMs !== undefined
                ? formatLatencyMs(gatewayLatencyMs, false)
                : 'No data'
              : 'Offline'
          }
          unit={backendOnline && gatewayLatencyMs !== undefined ? 'ms' : ''}
          subtext={backendOnline ? `Gateway: ${defaultGw}` : 'Service unreachable'}
          icon={Radio}
          status={
            !backendOnline
              ? 'critical'
              : gatewayLatencyMs !== undefined && gatewayLatencyMs > 150
              ? 'warning'
              : 'nominal'
          }
          delta={gatewayDelta}
          sparkline={gatewayRttHistory}
          onClick={() => navigate('/diagnostics')}
        />

        <KpiCard
          label="Monitored nodes"
          value={
            nodeCount > 0
              ? `${nodeCount}`
              : networkEnv?.arp_neighbors?.length
              ? `${networkEnv.arp_neighbors.length + 1}`
              : 'No data'
          }
          unit={nodeCount > 0 || networkEnv?.arp_neighbors?.length ? 'nodes' : ''}
          subtext="Host, gateway, and ARP peers"
          icon={Server}
          status="neutral"
          onClick={() => navigate('/inventory')}
        />

        <KpiCard
          label={`Probe pass rate (${windowLabel})`}
          value={passRate !== null ? formatPercent(passRate, false) : 'No data'}
          unit={passRate !== null ? '%' : ''}
          subtext={
            analytics?.total_tests > 0
              ? `${analytics.total_tests} probes · ${analytics.outage_count ?? 0} failed`
              : `No probes in ${windowLabel}`
          }
          icon={Activity}
          status={
            passRate === null
              ? 'neutral'
              : passRate >= 95
              ? 'nominal'
              : passRate >= 70
              ? 'warning'
              : 'critical'
          }
          delta={passRateDelta}
          sparkline={validLatencySpark}
          onClick={() => navigate('/analytics')}
        />

        <KpiCard
          label="Host RAM utilization"
          value={memoryUsedPercent !== null ? `${Number(memoryUsedPercent).toFixed(1)}` : 'No data'}
          unit={memoryUsedPercent !== null ? '%' : ''}
          subtext={cpuCount !== null ? `${cpuCount} logical CPU cores` : 'CPU info unavailable'}
          icon={Shield}
          status={memoryUsedPercent !== null && memoryUsedPercent > 85 ? 'warning' : 'nominal'}
          onClick={() => navigate('/system')}
        />
      </div>

      {/* Operations Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart
            windowLabel={windowLabel}
            outages={analytics?.outages || []}
            theme={theme}
            onDrillDown={() => navigate('/analytics')}
            seriesData={seriesData}
          />

          {/* Compact Network Topology Preview with drill-down */}
          <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--text)]">
                    Network topology preview
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Live gateway, host, LAN peers, and monitored endpoints
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/topology')}
                className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
              >
                <span>Open topology</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <TopologyGraph compact theme={theme} timeRange={timeRange} />
          </div>
        </div>

        {/* Right Rail: Active Issues (Problems First) + Compact Memory Meter + Subsystems */}
        <div className="space-y-6">
          <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
              <h3 className="text-[14px] font-semibold text-[var(--text)]">Active issues</h3>
              <button
                type="button"
                onClick={() => navigate('/alerts')}
                className="text-[12px] font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>All alerts</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {activeIssues.length > 0 ? (
              <div className="space-y-2">
                {activeIssues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => navigate(issue.route)}
                    className="w-full text-left p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatusChip
                        size="sm"
                        tone={issue.severity === 'critical' ? 'danger' : 'warn'}
                        label={issue.severity === 'critical' ? 'Critical' : 'Warning'}
                      />
                      {issue.timestamp && (
                        <span
                          className="text-[12px] font-mono text-[var(--text-muted)]"
                          title={formatTimestampUtc(issue.timestamp)}
                        >
                          {formatRelativeTime(issue.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-[var(--text)] truncate">
                      {issue.title}
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)] line-clamp-2">
                      {issue.detail}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No active issues"
                description="All recent probes and host checks are healthy."
                icon={CheckCircle2}
              />
            )}
          </div>

          {/* Compact Memory Meter drilling to System Info */}
          <button
            type="button"
            onClick={() => navigate('/system')}
            className="w-full text-left p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--accent)]/60 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <span className="text-[14px] font-semibold text-[var(--text)]">
                Host memory capacity
              </span>
              <span className="text-[12px] font-medium text-[var(--accent)] inline-flex items-center gap-1">
                <span>System</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </div>
            <ResourceGauge
              title="RAM used"
              value={memoryUsedPercent}
              unit="%"
              subtitle={cpuCount !== null ? `${cpuCount} logical cores` : 'Host telemetry'}
            />
          </button>

          <button
            type="button"
            onClick={() => navigate('/system')}
            className="w-full text-left block hover:opacity-95 transition-opacity"
          >
            <StatusPanel
              health={health}
              system={system}
              networkEnv={networkEnv}
              backendOnline={backendOnline}
            />
          </button>
        </div>
      </div>

      {/* Problems-First Monitored Targets Table */}
      {analytics?.per_target?.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--text)]">
                Monitored target health ({windowLabel})
              </h3>
              <p className="text-[12px] text-[var(--text-muted)]">
                Failing and degraded targets sorted first · click a target to probe
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
            >
              <span>Full inventory</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <DataTable
            columns={targetColumns}
            data={analytics.per_target as TargetSummaryRow[]}
            rowKey={(r) => r.target}
            density="compact"
            caption="Problems-first monitored targets summary"
          />
        </div>
      )}
    </div>
  );
};
