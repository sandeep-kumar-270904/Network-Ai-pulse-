import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Database,
  Activity,
  CalendarClock,
  History,
  Trash2,
  Plus,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchAnalyticsSummary,
  fetchDiagnosticHistory,
  fetchDynamicTopology,
  fetchInventoryNodes,
  fetchNetworkEnv,
  fetchSystemInfo,
} from '../services/api';
import { TimeRangeOption } from '../components/layout/TopBar';
import { StatusChip } from '../components/ui/StatusChip';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useDemoMode } from '../contexts/DemoModeContext';
import { formatPercent, formatRelativeTime, formatTimestampUtc } from '../utils/formatters';

type ReportType = 'exec_summary' | 'latency_audit' | 'inventory_topology';
type ReportRange = '15m' | '1h' | '6h' | '24h' | '7d' | 'all';
type ReportFormat = 'json' | 'csv';
type ScheduleCadence = 'hourly' | 'daily_08utc' | 'weekly_mon';

interface GeneratedReportEntry {
  id: string;
  filename: string;
  reportType: ReportType;
  range: ReportRange;
  format: ReportFormat;
  targetsLabel: string;
  sizeBytes: number;
  createdAt: string;
  content: string;
}

interface ReportScheduleEntry {
  id: string;
  title: string;
  reportType: ReportType;
  format: ReportFormat;
  cadence: ScheduleCadence;
  enabled: boolean;
  createdAt: string;
}

interface ReportsProps {
  timeRange?: TimeRangeOption;
}

const REPORT_HISTORY_KEY = 'netpulse_report_history_v1';
const REPORT_SCHEDULES_KEY = 'netpulse_report_schedules_v1';

const RANGE_OPTIONS = [
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'all', label: 'All recorded history' },
];

const REPORT_TYPE_META: Record<ReportType, { title: string; subtitle: string; slug: string }> = {
  exec_summary: {
    title: 'Operational Executive Summary',
    subtitle: 'Availability pass rate, P50/P95/P99 latency percentiles, gateway metadata, and host specs.',
    slug: 'executive_summary',
  },
  latency_audit: {
    title: 'Telemetry & Latency Dataset',
    subtitle: 'Filtered probe run rows including timestamps, RTT bounds, jitter, and packet loss.',
    slug: 'latency_telemetry',
  },
  inventory_topology: {
    title: 'Infrastructure & Topology Snapshot',
    subtitle: 'Monitored nodes, live topology edges, OS adapters, and default route config.',
    slug: 'infrastructure_topology',
  },
};

const CADENCE_LABELS: Record<ScheduleCadence, string> = {
  hourly: 'Every hour (:00 UTC)',
  daily_08utc: 'Daily at 08:00 UTC',
  weekly_mon: 'Weekly (Mon 08:00 UTC)',
};

const RANGE_MS: Record<Exclude<ReportRange, 'all'>, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const formatByteSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const parseUtcMs = (iso?: string): number | null => {
  if (!iso) return null;
  const raw = iso.trim();
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
  const t = new Date(hasTz ? raw.replace(' ', 'T') : `${raw.replace(' ', 'T')}Z`).getTime();
  return Number.isNaN(t) ? null : t;
};

const toCsvString = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return '';
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const keys = Object.keys(rows[0]);
  const header = keys.map(escape).join(',');
  const lines = rows.map((row) => keys.map((k) => escape(row[k])).join(','));
  return [header, ...lines].join('\r\n');
};

const triggerDirectDownload = (filename: string, content: string, format: ReportFormat) => {
  const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const Reports: React.FC<ReportsProps> = ({ timeRange = '1h' }) => {
  const { addToast } = useToast();
  const { maskHost, maskText } = useDemoMode();

  // Builder State
  const [reportType, setReportType] = useState<ReportType>('exec_summary');
  const [rangeFilter, setRangeFilter] = useState<ReportRange>(
    (['15m', '1h', '6h', '24h', '7d'] as string[]).includes(timeRange)
      ? (timeRange as ReportRange)
      : '1h'
  );
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [format, setFormat] = useState<ReportFormat>('json');

  // Snapshot Data State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{
    analytics: any;
    records: any[];
    nodes: any[];
    topo: { nodes: any[]; edges: any[]; gateway: any };
    netEnv: any;
    system: any;
    refreshedAt: string;
  }>({
    analytics: null,
    records: [],
    nodes: [],
    topo: { nodes: [], edges: [], gateway: null },
    netEnv: null,
    system: null,
    refreshedAt: new Date().toISOString(),
  });

  // Generated History & Schedules (persisted locally)
  const [history, setHistory] = useState<GeneratedReportEntry[]>(() => {
    try {
      const raw = window.localStorage.getItem(REPORT_HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  const [schedules, setSchedules] = useState<ReportScheduleEntry[]>(() => {
    try {
      const raw = window.localStorage.getItem(REPORT_SCHEDULES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore storage errors
    }
    return [
      {
        id: 'sched-default-1',
        title: 'Daily Executive Digest',
        reportType: 'exec_summary',
        format: 'json',
        cadence: 'daily_08utc',
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [schedType, setSchedType] = useState<ReportType>('latency_audit');
  const [schedCadence, setSchedCadence] = useState<ScheduleCadence>('daily_08utc');
  const [schedFormat, setSchedFormat] = useState<ReportFormat>('csv');
  const [deleteSchedTarget, setDeleteSchedTarget] = useState<ReportScheduleEntry | null>(null);

  const loadLiveSnapshot = useCallback(async () => {
    setLoading(true);
    const analyticsWindow = rangeFilter === 'all' ? '7d' : rangeFilter;
    const [anaRes, histRes, netEnvRes, sysRes, invRes, topoRes] = await Promise.all([
      fetchAnalyticsSummary(analyticsWindow, 500),
      fetchDiagnosticHistory(1000),
      fetchNetworkEnv(),
      fetchSystemInfo(),
      fetchInventoryNodes(),
      fetchDynamicTopology(),
    ]);

    setLoadError(anaRes.error || histRes.error || invRes.error || null);
    setSnapshot({
      analytics: anaRes.analytics,
      records: histRes.records || [],
      nodes: invRes.nodes || [],
      topo: {
        nodes: topoRes.nodes || [],
        edges: topoRes.edges || [],
        gateway: topoRes.gateway || null,
      },
      netEnv: netEnvRes.data || {},
      system: sysRes.data?.system || {},
      refreshedAt: new Date().toISOString(),
    });
    setLoading(false);
  }, [rangeFilter]);

  useEffect(() => {
    loadLiveSnapshot();
  }, [loadLiveSnapshot]);

  // Persist history & schedules
  useEffect(() => {
    try {
      window.localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(history.slice(0, 15)));
    } catch {
      // Ignore quota errors
    }
  }, [history]);

  useEffect(() => {
    try {
      window.localStorage.setItem(REPORT_SCHEDULES_KEY, JSON.stringify(schedules));
    } catch {
      // Ignore quota errors
    }
  }, [schedules]);

  // Available target filter choices
  const availableTargets = useMemo(() => {
    const set = new Set<string>();
    snapshot.nodes.forEach((n: any) => {
      if (n.target) set.add(String(n.target));
    });
    snapshot.records.forEach((r: any) => {
      if (r.target) set.add(String(r.target));
    });
    return Array.from(set).sort();
  }, [snapshot.nodes, snapshot.records]);

  const toggleTarget = (tgt: string) => {
    setSelectedTargets((prev) =>
      prev.includes(tgt) ? prev.filter((item) => item !== tgt) : [...prev, tgt]
    );
  };

  // Filtered diagnostic records matching builder parameters
  const filteredRecords = useMemo(() => {
    const cutoff =
      rangeFilter === 'all' ? null : Date.now() - RANGE_MS[rangeFilter];
    return snapshot.records.filter((r: any) => {
      if (selectedTargets.length > 0 && !selectedTargets.includes(String(r.target))) {
        return false;
      }
      if (cutoff !== null) {
        const ms = parseUtcMs(r.timestamp);
        if (ms !== null && ms < cutoff) return false;
      }
      return true;
    });
  }, [snapshot.records, rangeFilter, selectedTargets]);

  // Compile live preview + exact byte count
  const compiled = useMemo(() => {
    const targetsScope =
      selectedTargets.length > 0 ? selectedTargets : ['All monitored targets'];

    if (reportType === 'latency_audit') {
      const rows = filteredRecords.map((r: any) => ({
        id: r.id,
        timestamp_utc: formatTimestampUtc(r.timestamp),
        test_type: r.test_type,
        target: r.target,
        resolved_ip: r.resolved_ip || r.target,
        status: r.status,
        packets_sent: r.packets_sent,
        packets_received: r.packets_received,
        packet_loss_pct: r.packet_loss_pct,
        min_rtt_ms: r.status === 'passed' ? r.min_rtt_ms : null,
        avg_rtt_ms: r.status === 'passed' ? r.avg_rtt_ms : null,
        max_rtt_ms: r.status === 'passed' ? r.max_rtt_ms : null,
        jitter_ms: r.status === 'passed' && r.avg_rtt_ms !== null ? r.jitter_ms : null,
      }));
      const content =
        format === 'csv'
          ? toCsvString(rows) || 'id,timestamp_utc,test_type,target,status\r\n'
          : JSON.stringify(
              {
                report_title: REPORT_TYPE_META.latency_audit.title,
                generated_at_utc: formatTimestampUtc(new Date()),
                date_range: rangeFilter,
                targets_scope: targetsScope,
                row_count: rows.length,
                records: rows,
              },
              null,
              2
            );
      return {
        rowCount: rows.length,
        content,
        sizeBytes: new Blob([content]).size,
      };
    }

    if (reportType === 'inventory_topology') {
      const filteredNodes =
        selectedTargets.length > 0
          ? snapshot.nodes.filter((n: any) => selectedTargets.includes(String(n.target)))
          : snapshot.nodes;

      if (format === 'csv') {
        const rows = filteredNodes.map((n: any) => ({
          id: n.id,
          name: n.name,
          target: n.target,
          role: n.role || 'endpoint',
          status: n.status || 'unknown',
          avg_latency_ms: n.latency_ms ?? null,
          last_seen_utc: formatTimestampUtc(n.last_seen),
        }));
        const content = toCsvString(rows) || 'id,name,target,role,status\r\n';
        return { rowCount: rows.length, content, sizeBytes: new Blob([content]).size };
      }

      const content = JSON.stringify(
        {
          report_title: REPORT_TYPE_META.inventory_topology.title,
          generated_at_utc: formatTimestampUtc(new Date()),
          targets_scope: targetsScope,
          monitored_nodes: filteredNodes,
          topology: snapshot.topo,
          default_gateway: snapshot.netEnv?.default_gateway || null,
          host_interfaces_count: (snapshot.netEnv?.interfaces || []).length,
        },
        null,
        2
      );
      return {
        rowCount: filteredNodes.length,
        content,
        sizeBytes: new Blob([content]).size,
      };
    }

    // exec_summary
    const passCount = filteredRecords.filter((r: any) => r.status === 'passed').length;
    const measuredPassRate =
      filteredRecords.length > 0
        ? Number(((passCount / filteredRecords.length) * 100).toFixed(1))
        : snapshot.analytics?.pass_rate_pct ?? null;

    const summaryObj = {
      report_title: REPORT_TYPE_META.exec_summary.title,
      generated_at_utc: formatTimestampUtc(new Date()),
      date_range: rangeFilter,
      targets_scope: targetsScope,
      filtered_runs_count: filteredRecords.length,
      measured_pass_rate_pct: measuredPassRate,
      p50_rtt_ms: snapshot.analytics?.p50_ms ?? null,
      p95_rtt_ms: snapshot.analytics?.p95_ms ?? null,
      p99_rtt_ms: snapshot.analytics?.p99_ms ?? null,
      monitored_nodes_count: snapshot.nodes.length,
      default_gateway: snapshot.netEnv?.default_gateway || null,
      host_os: snapshot.system?.os || null,
      recent_runs: filteredRecords.slice(0, 10),
    };

    const content =
      format === 'csv'
        ? toCsvString([
            {
              generated_at_utc: summaryObj.generated_at_utc,
              date_range: summaryObj.date_range,
              targets_scope: targetsScope.join(' | '),
              filtered_runs_count: summaryObj.filtered_runs_count,
              measured_pass_rate_pct: summaryObj.measured_pass_rate_pct,
              p50_rtt_ms: summaryObj.p50_rtt_ms,
              p95_rtt_ms: summaryObj.p95_rtt_ms,
              p99_rtt_ms: summaryObj.p99_rtt_ms,
              monitored_nodes_count: summaryObj.monitored_nodes_count,
            },
          ])
        : JSON.stringify(summaryObj, null, 2);

    return {
      rowCount: filteredRecords.length,
      content,
      sizeBytes: new Blob([content]).size,
    };
  }, [reportType, rangeFilter, selectedTargets, format, filteredRecords, snapshot]);

  const previewLines = useMemo(() => {
    const maskedContent = maskText(compiled.content);
    const lines = maskedContent.split(/\r?\n/);
    if (lines.length <= 42) return maskedContent;
    return `${lines.slice(0, 42).join('\n')}\n… (+${lines.length - 42} more lines)`;
  }, [compiled.content, maskText]);

  const handleGenerateAndDownload = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `netpulse_${REPORT_TYPE_META[reportType].slug}_${rangeFilter}_${stamp}.${format}`;
    triggerDirectDownload(filename, compiled.content, format);

    const entry: GeneratedReportEntry = {
      id: `rep-${Date.now()}`,
      filename,
      reportType,
      range: rangeFilter,
      format,
      targetsLabel:
        selectedTargets.length === 0 ? 'All targets' : `${selectedTargets.length} selected`,
      sizeBytes: compiled.sizeBytes,
      createdAt: new Date().toISOString(),
      content: compiled.content.slice(0, 250000),
    };
    setHistory((prev) => [entry, ...prev].slice(0, 15));

    addToast({
      tone: 'ok',
      title: 'Report generated and downloaded',
      description: `Saved ${filename} (${formatByteSize(compiled.sizeBytes)}).`,
    });
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const newSched: ReportScheduleEntry = {
      id: `sched-${Date.now()}`,
      title: REPORT_TYPE_META[schedType].title,
      reportType: schedType,
      format: schedFormat,
      cadence: schedCadence,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    setSchedules((prev) => [newSched, ...prev]);
    addToast({
      tone: 'ok',
      title: 'Report schedule created',
      description: `${newSched.title} (${newSched.format.toUpperCase()}) · ${CADENCE_LABELS[newSched.cadence]}`,
    });
  };

  const toggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const confirmDeleteSchedule = () => {
    if (!deleteSchedTarget) return;
    setSchedules((prev) => prev.filter((s) => s.id !== deleteSchedTarget.id));
    addToast({ tone: 'info', title: `Removed "${deleteSchedTarget.title}" schedule` });
    setDeleteSchedTarget(null);
  };

  return (
    <div className="space-y-6">
      {loadError && (
        <ErrorState
          title="Unable to refresh report dataset"
          message={loadError}
          onRetry={loadLiveSnapshot}
          retrying={loading}
        />
      )}

      {/* Live Dataset Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">
              Measured pass rate ({rangeFilter})
            </div>
            <div className="text-[24px] font-semibold font-mono text-[var(--text)] mt-1 np-mono-val">
              {formatPercent(snapshot.analytics?.pass_rate_pct ?? null)}
            </div>
          </div>
          <Activity className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
        </div>

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">
              Matching records in scope
            </div>
            <div className="text-[24px] font-semibold font-mono text-[var(--text)] mt-1 np-mono-val">
              {filteredRecords.length}
              <span className="text-[12px] font-normal text-[var(--text-muted)]">
                {' '}
                / {snapshot.records.length}
              </span>
            </div>
          </div>
          <Database className="w-5 h-5 text-[var(--ok)]" aria-hidden="true" />
        </div>

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">
              Estimated export size
            </div>
            <div className="text-[24px] font-semibold font-mono text-[var(--accent)] mt-1 np-mono-val">
              {formatByteSize(compiled.sizeBytes)}
            </div>
          </div>
          <button
            type="button"
            onClick={loadLiveSnapshot}
            aria-label="Refresh source dataset"
            className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Report Builder + Live Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Builder Form */}
        <div className="lg:col-span-5 p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
              <FileText className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span>Report builder</span>
            </span>
            <StatusChip size="sm" tone="info" label={format.toUpperCase()} />
          </div>

          {/* 1. Report Type */}
          <div className="space-y-2">
            <span className="block text-[13px] font-medium text-[var(--text)]">Report type</span>
            <div className="space-y-2">
              {(['exec_summary', 'latency_audit', 'inventory_topology'] as const).map((rt) => {
                const active = reportType === rt;
                return (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setReportType(rt)}
                    className={`w-full p-3 rounded-[var(--radius-control)] border text-left transition-colors ${
                      active
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)]/45'
                        : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-[var(--text)]">
                      {REPORT_TYPE_META[rt].title}
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                      {REPORT_TYPE_META[rt].subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Date Range & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rep-range" className="block text-[13px] font-medium text-[var(--text)] mb-1">
                Date range
              </label>
              <Select
                id="rep-range"
                value={rangeFilter}
                options={RANGE_OPTIONS}
                onChange={(e) => setRangeFilter(e.target.value as ReportRange)}
              />
            </div>

            <div>
              <span className="block text-[13px] font-medium text-[var(--text)] mb-1">
                Export format
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['json', 'csv'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`h-10 rounded-[var(--radius-control)] border font-mono text-[12px] uppercase transition-colors ${
                      format === fmt
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/45 font-semibold'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Target Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text)]">
                <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                <span>Targets filter</span>
              </span>
              {selectedTargets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTargets([])}
                  className="text-[12px] text-[var(--accent)] hover:underline"
                >
                  Reset to all
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTargets([])}
                className={`px-2.5 py-1 rounded-[var(--radius-pill)] border text-[12px] font-medium transition-colors ${
                  selectedTargets.length === 0
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/45 font-semibold'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              >
                All targets
              </button>
              {availableTargets.slice(0, 12).map((tgt) => {
                const selected = selectedTargets.includes(tgt);
                return (
                  <button
                    key={tgt}
                    type="button"
                    onClick={() => toggleTarget(tgt)}
                    className={`px-2.5 py-1 rounded-[var(--radius-pill)] border text-[12px] font-mono transition-colors ${
                      selected
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/45 font-semibold'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {maskHost(tgt)}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateAndDownload}
            disabled={loading}
            className="w-full h-11 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] flex items-center justify-center gap-2 text-[14px] font-semibold transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>
              Export {format.toUpperCase()} ({formatByteSize(compiled.sizeBytes)})
            </span>
          </button>
        </div>

        {/* Live Preview Pane */}
        <div className="lg:col-span-7 p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--text)]">
                Live preview · {REPORT_TYPE_META[reportType].title}
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Updated live from SQLite telemetry · {compiled.rowCount} matching rows · estimated{' '}
                <strong className="font-mono">{formatByteSize(compiled.sizeBytes)}</strong>
              </p>
            </div>
            <StatusChip size="sm" tone="ok" label="Live data" />
          </div>

          {loading && snapshot.records.length === 0 ? (
            <div className="space-y-2.5 p-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <pre className="p-4 rounded-[var(--radius-control)] bg-[var(--bg)] border border-[var(--border)] font-mono text-[12px] leading-5 text-[var(--text-secondary)] overflow-auto max-h-[420px]">
              {previewLines}
            </pre>
          )}
        </div>
      </div>

      {/* Bottom Split: History of Generated Reports + Report Scheduling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Generated Report History */}
        <div className="lg:col-span-7 p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
              <History className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span>Generated report history ({history.length})</span>
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-[12px] text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                Clear history
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon={History}
              title="No reports exported yet"
              description="Click Export above to generate a CSV or JSON report. Exported files and re-download links appear here."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3 text-[13px]"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-mono text-[12px] font-semibold text-[var(--text)] truncate" title={item.filename}>
                      {item.filename}
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)] flex flex-wrap items-center gap-2">
                      <span>{REPORT_TYPE_META[item.reportType].title}</span>
                      <span>·</span>
                      <span className="font-mono">{formatByteSize(item.sizeBytes)}</span>
                      <span>·</span>
                      <span title={formatTimestampUtc(item.createdAt)}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerDirectDownload(item.filename, item.content, item.format);
                      addToast({
                        tone: 'info',
                        title: 'Report re-downloaded',
                        description: item.filename,
                      });
                    }}
                    className="h-8 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Scheduling */}
        <div className="lg:col-span-5 p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
              <CalendarClock className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span>Scheduled deliveries</span>
            </span>
            <span className="text-[12px] font-mono text-[var(--text-muted)]">
              {schedules.filter((s) => s.enabled).length} active
            </span>
          </div>

          <form onSubmit={handleAddSchedule} className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="sched-type" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                  Template
                </label>
                <Select
                  id="sched-type"
                  value={schedType}
                  options={[
                    { value: 'exec_summary', label: 'Executive Summary' },
                    { value: 'latency_audit', label: 'Latency Telemetry' },
                    { value: 'inventory_topology', label: 'Topology Snapshot' },
                  ]}
                  onChange={(e) => setSchedType(e.target.value as ReportType)}
                />
              </div>
              <div>
                <label htmlFor="sched-cadence" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                  Cadence
                </label>
                <Select
                  id="sched-cadence"
                  value={schedCadence}
                  options={[
                    { value: 'hourly', label: 'Hourly' },
                    { value: 'daily_08utc', label: 'Daily 08:00 UTC' },
                    { value: 'weekly_mon', label: 'Weekly Monday' },
                  ]}
                  onChange={(e) => setSchedCadence(e.target.value as ScheduleCadence)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(['csv', 'json'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSchedFormat(fmt)}
                    className={`h-8 px-3 rounded-[var(--radius-control)] border text-[12px] font-mono uppercase ${
                      schedFormat === fmt
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 font-semibold'
                        : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="h-8 px-3 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[12px] font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add schedule</span>
              </button>
            </div>
          </form>

          <div className="divide-y divide-[var(--border)]">
            {schedules.map((sched) => (
              <div key={sched.id} className="py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--text)] flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        sched.enabled ? 'text-[var(--ok)]' : 'text-[var(--text-muted)]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{sched.title}</span>
                  </div>
                  <div className="text-[12px] font-mono text-[var(--text-secondary)]">
                    {CADENCE_LABELS[sched.cadence]} · {sched.format.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sched.enabled}
                    aria-label={`Toggle ${sched.title}`}
                    onClick={() => toggleSchedule(sched.id)}
                    className={`relative w-9 h-5 rounded-full border transition-colors ${
                      sched.enabled
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'bg-[var(--surface-2)] border-[var(--border-control)]'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 rounded-full transition-transform ${
                        sched.enabled
                          ? 'translate-x-4 bg-[var(--accent-ink)]'
                          : 'translate-x-0 bg-[var(--text-secondary)]'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteSchedTarget(sched)}
                    aria-label={`Delete schedule ${sched.title}`}
                    className="h-8 w-8 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] inline-flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(deleteSchedTarget)}
        onClose={() => setDeleteSchedTarget(null)}
        title={`Remove "${deleteSchedTarget?.title || ''}"?`}
        description="Scheduled local export cadence will be removed."
        confirmLabel="Remove schedule"
        tone="danger"
        onConfirm={confirmDeleteSchedule}
      />
    </div>
  );
};
