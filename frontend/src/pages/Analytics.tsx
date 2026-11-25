import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { RefreshCw, Play, AlertTriangle, Activity, ShieldCheck, Timer, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchAnalyticsSummary, executePingDiagnostic } from '../services/api';
import { TimeRangeOption } from '../components/layout/TopBar';
import { KpiCard } from '../components/dashboard/KpiCard';
import { DataTable, DataColumn } from '../components/ui/DataTable';
import { StatusChip, StatusTone } from '../components/ui/StatusChip';
import { ThemeMode } from '../components/ui/ThemeToggle';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { AccessibleChartFrame } from '../components/charts/AccessibleChartFrame';
import { useDemoMode } from '../contexts/DemoModeContext';
import {
  formatChartTimeUtc,
  formatJitterMs,
  formatLatencyMs,
  formatPercent,
  formatTimestampUtc,
} from '../utils/formatters';

interface AnalyticsProps {
  timeRange?: TimeRangeOption;
  theme?: ThemeMode;
}

interface TargetRow {
  target: string;
  runs: number;
  passed_runs: number;
  failed_runs: number;
  pass_rate_pct: number;
  avg_rtt_ms: number | null;
  avg_jitter_ms: number | null;
  avg_loss_pct: number | null;
  recent_rtts?: number[];
  latest_status: 'passed' | 'failed';
  failing: boolean;
}

const InlineSparkline: React.FC<{ values?: number[]; tone: 'ok' | 'warn' | 'danger' }> = ({
  values,
  tone,
}) => {
  if (!values || values.length < 2) {
    return <span className="text-[12px] font-mono text-[var(--text-muted)]">No trend</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 72;
  const h = 22;
  const points = values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke =
    tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : 'var(--ok)';

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="inline-block">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const Analytics: React.FC<AnalyticsProps> = ({ timeRange = '1h', theme = 'dark' }) => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [chartView, setChartView] = useState<'aggregate' | 'compare'>('aggregate');
  const navigate = useNavigate();
  const { maskHost } = useDemoMode();

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const { analytics: data, error } = await fetchAnalyticsSummary(timeRange, 500);
    if (error && !data) {
      setLoadError(error);
    } else {
      setLoadError(null);
      if (data) setAnalytics(data);
    }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRunBaseline = async () => {
    setSeeding(true);
    await executePingDiagnostic('192.168.1.1', 3);
    await executePingDiagnostic('1.1.1.1', 3);
    setSeeding(false);
    await loadAnalytics();
  };

  const isLight = theme === 'light';
  const palette = useMemo(
    () =>
      isLight
        ? {
            axisLabel: '#526077',
            axisLine: '#c1cce0',
            splitLine: '#dce3ee',
            tooltipBg: '#ffffff',
            tooltipBorder: '#c1cce0',
            tooltipText: '#0f172a',
            tooltipSub: '#526077',
            outageBand: 'rgba(185, 28, 28, 0.12)',
            outageColor: '#b91c1c',
            outageLabel: '#991b1b',
            zoomBg: '#edf1f7',
            zoomFill: 'rgba(21, 94, 117, 0.15)',
            zoomBorder: '#c1cce0',
            seriesColors: ['#155e75', '#1d4ed8', '#065f46', '#92400e', '#7c3aed'],
          }
        : {
            axisLabel: '#8d9bb5',
            axisLine: '#303d59',
            splitLine: '#20293d',
            tooltipBg: '#10151f',
            tooltipBorder: '#303d59',
            tooltipText: '#edf2fb',
            tooltipSub: '#8d9bb5',
            outageBand: 'rgba(248, 113, 113, 0.16)',
            outageColor: '#f87171',
            outageLabel: '#fca5a5',
            zoomBg: '#171e2c',
            zoomFill: 'rgba(34, 211, 238, 0.16)',
            zoomBorder: '#303d59',
            seriesColors: ['#22d3ee', '#60a5fa', '#34d399', '#fbbf24', '#c084fc'],
          },
    [isLight]
  );

  const timestamps: string[] = analytics?.series?.timestamps || [];
  const isoTimestamps: string[] = analytics?.series?.iso_timestamps || [];
  const latencySeries: Array<number | null> = analytics?.series?.latency || [];
  const jitterSeries: Array<number | null> = analytics?.series?.jitter || [];
  const statuses: string[] = analytics?.series?.statuses || [];
  const targets: string[] = analytics?.series?.targets || [];
  const outages: any[] = analytics?.outages || [];
  const hasChart = timestamps.length > 0;

  const validLatencyPoints = useMemo(
    () => latencySeries.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
    [latencySeries]
  );

  const validJitterPoints = useMemo(
    () => jitterSeries.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
    [jitterSeries]
  );

  const passHistorySpark = useMemo(
    () => statuses.slice(-15).map((s) => (s === 'passed' ? 100 : 0)),
    [statuses]
  );

  // Split-window delta calculations
  const latencyDelta = useMemo(() => {
    if (validLatencyPoints.length < 4) return undefined;
    const mid = Math.floor(validLatencyPoints.length / 2);
    const first = validLatencyPoints.slice(0, mid);
    const second = validLatencyPoints.slice(mid);
    const avg1 = first.reduce((a, b) => a + b, 0) / first.length;
    const avg2 = second.reduce((a, b) => a + b, 0) / second.length;
    const diff = Number((avg2 - avg1).toFixed(1));
    if (Math.abs(diff) < 0.1) return { direction: 'flat' as const, value: '0.0 ms', sentiment: 'neutral' as const };
    return {
      direction: diff > 0 ? ('up' as const) : ('down' as const),
      value: `${Math.abs(diff).toFixed(1)} ms`,
      sentiment: diff > 0 ? ('bad' as const) : ('good' as const),
    };
  }, [validLatencyPoints]);

  const passRateDelta = useMemo(() => {
    if (statuses.length < 4) return undefined;
    const mid = Math.floor(statuses.length / 2);
    const first = statuses.slice(0, mid);
    const second = statuses.slice(mid);
    const p1 = (first.filter((s) => s === 'passed').length / first.length) * 100;
    const p2 = (second.filter((s) => s === 'passed').length / second.length) * 100;
    const diff = Number((p2 - p1).toFixed(1));
    if (Math.abs(diff) < 0.1) return { direction: 'flat' as const, value: '0.0%', sentiment: 'neutral' as const };
    return {
      direction: diff > 0 ? ('up' as const) : ('down' as const),
      value: `${Math.abs(diff).toFixed(1)}%`,
      sentiment: diff > 0 ? ('good' as const) : ('bad' as const),
    };
  }, [statuses]);

  const xLabels = (isoTimestamps.length === timestamps.length ? isoTimestamps : timestamps).map((ts) =>
    formatChartTimeUtc(ts)
  );

  const outageMarkAreas: any[] = outages.map((o: any) => {
    const startIdx = Math.max(0, o.index - 0.5);
    const endIdx = Math.min(Math.max(0, timestamps.length - 1), o.index + 0.5);
    return [
      {
        name: 'Outage',
        xAxis: startIdx,
        itemStyle: { color: palette.outageBand },
      },
      { xAxis: endIdx },
    ];
  });

  const outageMarkLines: any[] = outages.map((o: any) => ({
    xAxis: o.index,
    lineStyle: { color: palette.outageColor, type: 'dashed', width: 1.5 },
    label: { show: false },
  }));

  const labelMinGap = Math.max(7, Math.ceil(timestamps.length / 4));
  let lastLabeledIdx = -100;
  const outageMarkPoints: any[] = outages.map((o: any) => {
    const showLabel = o.index - lastLabeledIdx >= labelMinGap;
    if (showLabel) lastLabeledIdx = o.index;
    return {
      name: 'Probe failed',
      coord: [o.index, 0],
      value: 'Outage',
      itemStyle: { color: palette.outageColor },
      symbol: 'triangle',
      symbolSize: 10,
      label: {
        show: showLabel,
        formatter: 'Outage',
        position: 'top',
        color: palette.outageLabel,
        fontSize: 11,
        fontFamily: 'JetBrains Mono',
      },
    };
  });

  // Build comparison series grouped by target
  const distinctTargets = useMemo(() => {
    const seen: string[] = [];
    targets.forEach((t) => {
      if (t && !seen.includes(t)) seen.push(t);
    });
    return seen.slice(0, 5);
  }, [targets]);

  const aggregateChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      textStyle: { color: palette.tooltipText, fontFamily: 'JetBrains Mono', fontSize: 12 },
      formatter: (params: any[]) => {
        if (!params || !params.length) return '';
        const idx = params[0].dataIndex;
        const fullUtc = formatTimestampUtc(isoTimestamps[idx] || timestamps[idx]);
        const targetName = targets[idx] || 'Unknown target';
        const isOutage = statuses[idx] !== 'passed';
        const rttVal = latencySeries[idx];
        const jitVal = jitterSeries[idx];
        return [
          `<div style="font-weight:600;margin-bottom:4px;">${fullUtc}</div>`,
          `<div style="color:${palette.tooltipSub};margin-bottom:4px;">Target: ${targetName}</div>`,
          isOutage
            ? `<div style="color:${palette.outageColor};font-weight:600;">Status: Probe failed (Outage · gap in RTT)</div>`
            : `<div style="color:${palette.seriesColors[0]};">Avg RTT: ${formatLatencyMs(rttVal)}</div><div style="color:${palette.seriesColors[1]};">Jitter: ${formatJitterMs(jitVal)}</div>`,
        ].join('');
      },
    },
    legend: {
      data: ['Avg RTT (ms)', 'Jitter (ms)'],
      top: 0,
      textStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
    },
    grid: { top: 44, left: 48, right: 32, bottom: 72, containLabel: true },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLine: { lineStyle: { color: palette.axisLine } },
      axisLabel: {
        color: palette.axisLabel,
        fontFamily: 'JetBrains Mono',
        fontSize: 12,
        hideOverlap: true,
        alignMinLabel: 'left',
        alignMaxLabel: 'right',
      },
    },
    yAxis: {
      type: 'value',
      name: 'ms',
      nameTextStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      axisLabel: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 22,
        bottom: 10,
        backgroundColor: palette.zoomBg,
        fillerColor: palette.zoomFill,
        borderColor: palette.zoomBorder,
        textStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      },
    ],
    series: [
      {
        name: 'Avg RTT (ms)',
        type: 'line',
        smooth: false,
        connectNulls: false,
        showSymbol: true,
        symbolSize: 6,
        data: latencySeries,
        lineStyle: { color: palette.seriesColors[0], width: 2 },
        itemStyle: { color: palette.seriesColors[0] },
        markArea: outageMarkAreas.length
          ? { silent: true, label: { show: false }, data: outageMarkAreas }
          : undefined,
        markLine: outageMarkLines.length ? { symbol: ['none', 'none'], silent: true, data: outageMarkLines } : undefined,
        markPoint: outageMarkPoints.length ? { data: outageMarkPoints } : undefined,
      },
      {
        name: 'Jitter (ms)',
        type: 'bar',
        data: jitterSeries,
        itemStyle: { color: `${palette.seriesColors[1]}70`, borderRadius: [3, 3, 0, 0] },
      },
    ],
  };

  const compareChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      textStyle: { color: palette.tooltipText, fontFamily: 'JetBrains Mono', fontSize: 12 },
      formatter: (params: any[]) => {
        if (!params || !params.length) return '';
        const idx = params[0].dataIndex;
        const fullUtc = formatTimestampUtc(isoTimestamps[idx] || timestamps[idx]);
        const activeSeries = params.filter((p) => p.value !== null && p.value !== undefined);
        return [
          `<div style="font-weight:600;margin-bottom:4px;">${fullUtc}</div>`,
          activeSeries.length
            ? activeSeries
                .map(
                  (p) =>
                    `<div style="color:${p.color};">${p.seriesName}: ${formatLatencyMs(p.value)}</div>`
                )
                .join('')
            : `<div style="color:${palette.outageColor};">Probe failed / no RTT</div>`,
        ].join('');
      },
    },
    legend: {
      data: distinctTargets,
      top: 0,
      textStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
    },
    grid: { top: 44, left: 48, right: 24, bottom: 72, containLabel: true },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLine: { lineStyle: { color: palette.axisLine } },
      axisLabel: {
        color: palette.axisLabel,
        fontFamily: 'JetBrains Mono',
        fontSize: 12,
        hideOverlap: true,
        alignMinLabel: 'left',
        alignMaxLabel: 'right',
      },
    },
    yAxis: {
      type: 'value',
      name: 'Avg RTT (ms)',
      nameTextStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      axisLabel: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 22,
        bottom: 10,
        backgroundColor: palette.zoomBg,
        fillerColor: palette.zoomFill,
        borderColor: palette.zoomBorder,
        textStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      },
    ],
    series: distinctTargets.map((targetName, idx) => {
      const color = palette.seriesColors[idx % palette.seriesColors.length];
      return {
        name: targetName,
        type: 'line',
        connectNulls: true,
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        data: targets.map((t, pointIdx) => (t === targetName ? latencySeries[pointIdx] : null)),
      };
    }),
  };

  const targetColumns: DataColumn<TargetRow>[] = [
    {
      key: 'target',
      header: 'Target endpoint',
      sortable: true,
      sortValue: (r) => r.target,
      render: (r) => (
        <button
          type="button"
          onClick={() => navigate('/diagnostics')}
          className="font-mono font-semibold text-[var(--accent)] hover:underline text-left"
        >
          {maskHost(r.target)}
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
      key: 'trend',
      header: 'RTT trend',
      render: (r) => (
        <InlineSparkline
          values={r.recent_rtts}
          tone={r.latest_status === 'failed' ? 'danger' : r.failing ? 'warn' : 'ok'}
        />
      ),
    },
    {
      key: 'runs',
      header: 'Runs',
      numeric: true,
      sortable: true,
      sortValue: (r) => r.runs,
      render: (r) => <span className="text-[var(--text)]">{r.runs}</span>,
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
        <span
          className={
            r.avg_rtt_ms === null
              ? 'text-[var(--text-muted)]'
              : r.avg_rtt_ms > 150
              ? 'text-[var(--danger)]'
              : r.avg_rtt_ms > 60
              ? 'text-[var(--warn)]'
              : 'text-[var(--ok)]'
          }
        >
          {formatLatencyMs(r.avg_rtt_ms)}
        </span>
      ),
    },
    {
      key: 'avg_jitter_ms',
      header: 'Avg jitter',
      numeric: true,
      sortable: true,
      sortValue: (r) => r.avg_jitter_ms ?? -1,
      render: (r) => (
        <span
          className={
            r.avg_jitter_ms === null
              ? 'text-[var(--text-muted)]'
              : r.avg_jitter_ms > 10
              ? 'text-[var(--warn)]'
              : 'text-[var(--text-secondary)]'
          }
        >
          {formatJitterMs(r.avg_jitter_ms)}
        </span>
      ),
    },
    {
      key: 'avg_loss_pct',
      header: 'Avg loss',
      numeric: true,
      sortable: true,
      sortValue: (r) => r.avg_loss_pct ?? -1,
      render: (r) => (
        <span
          className={
            r.avg_loss_pct !== null && r.avg_loss_pct > 0
              ? 'text-[var(--danger)] font-semibold'
              : 'text-[var(--text-secondary)]'
          }
        >
          {formatPercent(r.avg_loss_pct)}
        </span>
      ),
    },
  ];

  const windowLabel = analytics?.window_label || `Last ${timeRange}`;

  return (
    <div className="space-y-6">
      {loadError && !analytics && (
        <ErrorState
          title="Unable to load performance analytics"
          message={loadError}
          why="The NetPulse gateway did not return latency percentile or time-series analytics."
          howToFix="Verify the gateway is online and reachable in Settings, then click Retry."
          onRetry={loadAnalytics}
          retrying={loading}
        />
      )}

      {loading && !analytics && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading performance analytics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
            <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
          </div>
          <Skeleton className="h-80 w-full rounded-[var(--radius-card)]" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-mono text-[var(--text-secondary)]">
            {analytics?.total_tests ?? 0} samples · {windowLabel}
          </span>
          {(analytics?.outage_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/30 text-[12px] font-mono">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {analytics.outage_count} failed {analytics.outage_count === 1 ? 'probe' : 'probes'} plotted as outages
              </span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={loadAnalytics}
          className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center gap-2 text-[13px]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Percentile KPI Row with plain-language tooltips, deltas & sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="P50 median latency"
          tooltip="Half of passing probes finished faster than this round-trip time."
          value={analytics?.p50_ms !== null && analytics?.p50_ms !== undefined ? formatLatencyMs(analytics.p50_ms, false) : 'No data'}
          unit={analytics?.p50_ms !== null && analytics?.p50_ms !== undefined ? 'ms' : ''}
          subtext="Typical probe response time"
          icon={Timer}
          status={analytics?.p50_ms > 150 ? 'critical' : analytics?.p50_ms > 60 ? 'warning' : 'nominal'}
          delta={latencyDelta}
          sparkline={validLatencyPoints.slice(-15)}
        />

        <KpiCard
          label="P95 tail latency"
          tooltip="95% of passing probes completed faster than this; tracks occasional slowdowns."
          value={analytics?.p95_ms !== null && analytics?.p95_ms !== undefined ? formatLatencyMs(analytics.p95_ms, false) : 'No data'}
          unit={analytics?.p95_ms !== null && analytics?.p95_ms !== undefined ? 'ms' : ''}
          subtext="High-percentile latency ceiling"
          icon={Gauge}
          status={analytics?.p95_ms > 180 ? 'critical' : analytics?.p95_ms > 100 ? 'warning' : 'nominal'}
          sparkline={validLatencyPoints.slice(-15)}
        />

        <KpiCard
          label="P99 worst case"
          tooltip="Slowest 1% of passing probes; surfaces rare latency spikes."
          value={analytics?.p99_ms !== null && analytics?.p99_ms !== undefined ? formatLatencyMs(analytics.p99_ms, false) : 'No data'}
          unit={analytics?.p99_ms !== null && analytics?.p99_ms !== undefined ? 'ms' : ''}
          subtext={`Avg jitter: ${formatJitterMs(analytics?.avg_jitter_ms)}`}
          icon={Activity}
          status={analytics?.p99_ms > 200 ? 'warning' : 'neutral'}
          sparkline={validJitterPoints.slice(-15)}
        />

        <KpiCard
          label={`Probe pass rate (${windowLabel})`}
          tooltip="Share of probes in this time window that succeeded without 100% packet loss."
          value={analytics?.pass_rate_pct !== null && analytics?.pass_rate_pct !== undefined ? formatPercent(analytics.pass_rate_pct, false) : 'No data'}
          unit={analytics?.pass_rate_pct !== null && analytics?.pass_rate_pct !== undefined ? '%' : ''}
          subtext={`Avg loss: ${formatPercent(analytics?.avg_loss_pct)}`}
          icon={ShieldCheck}
          status={
            analytics?.pass_rate_pct === null || analytics?.pass_rate_pct === undefined
              ? 'neutral'
              : analytics.pass_rate_pct >= 95
              ? 'nominal'
              : analytics.pass_rate_pct >= 70
              ? 'warning'
              : 'critical'
          }
          delta={passRateDelta}
          sparkline={passHistorySpark}
        />
      </div>

      {/* Interactive Chart with Zoom/Brush, Crosshair & Target Comparison */}
      <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text)]">
              {chartView === 'aggregate'
                ? `RTT latency & jitter trend (${windowLabel})`
                : `Target RTT comparison (${windowLabel})`}
            </h3>
            <p className="text-[12px] text-[var(--text-muted)]">
              Drag the bottom slider or scroll inside the chart to zoom · hover for crosshair values
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-[var(--radius-control)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setChartView('aggregate')}
              className={`h-8 px-3 rounded-[var(--radius-control)] text-[12px] font-medium transition-colors ${
                chartView === 'aggregate'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              Aggregate trend
            </button>
            <button
              type="button"
              onClick={() => setChartView('compare')}
              className={`h-8 px-3 rounded-[var(--radius-control)] text-[12px] font-medium transition-colors ${
                chartView === 'compare'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              Compare targets
            </button>
          </div>
        </div>

        {hasChart ? (
          <AccessibleChartFrame
            title={`Performance analytics (${chartView === 'aggregate' ? 'Aggregate latency & jitter' : 'Compare targets'}, ${windowLabel})`}
            summary={`${analytics?.total_tests ?? 0} total samples in ${windowLabel}. P50 ${formatLatencyMs(analytics?.p50_ms)}, P95 ${formatLatencyMs(analytics?.p95_ms)}, P99 ${formatLatencyMs(analytics?.p99_ms)}.`}
            columns={[
              { key: 'time', label: 'Timestamp (UTC)' },
              { key: 'target', label: 'Target' },
              { key: 'status', label: 'Status' },
              { key: 'latency', label: 'Avg RTT', align: 'right' },
              { key: 'jitter', label: 'Jitter', align: 'right' },
            ]}
            rows={(analytics?.series?.iso_timestamps || analytics?.series?.timestamps || []).map(
              (ts: string, idx: number) => ({
                time: formatTimestampUtc(ts),
                target: maskHost(analytics?.series?.targets?.[idx] || 'Recorded target'),
                status: analytics?.series?.statuses?.[idx] === 'failed' ? 'Failed' : 'Passed',
                latency: formatLatencyMs(analytics?.series?.latency?.[idx]),
                jitter: formatJitterMs(analytics?.series?.jitter?.[idx]),
              })
            )}
          >
            <div className="h-[360px] w-full">
              <ReactECharts
                option={chartView === 'aggregate' ? aggregateChartOption : compareChartOption}
                notMerge={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </AccessibleChartFrame>
        ) : (
          <div className="p-8 text-center space-y-3 border border-dashed border-[var(--border)] rounded-[var(--radius-card)]">
            <div className="text-[13px] text-[var(--text-secondary)]">
              No diagnostic tests recorded for {windowLabel}.
            </div>
            <button
              type="button"
              onClick={handleRunBaseline}
              disabled={seeding}
              className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold inline-flex items-center gap-2"
            >
              {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Run gateway + DNS baseline</span>
            </button>
          </div>
        )}
      </div>

      {/* Sortable Target Breakdown Table with Inline Sparklines & Threshold Colors */}
      {analytics?.per_target?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-[var(--text)]">
              Target-level telemetry breakdown ({windowLabel})
            </h3>
            <span className="text-[12px] text-[var(--text-muted)]">
              Sorted problems first · click any column header to sort
            </span>
          </div>

          <DataTable
            columns={targetColumns}
            data={analytics.per_target as TargetRow[]}
            rowKey={(row) => row.target}
            showDensityToggle
            caption={`Target telemetry metrics for ${windowLabel}`}
          />
        </div>
      )}
    </div>
  );
};
