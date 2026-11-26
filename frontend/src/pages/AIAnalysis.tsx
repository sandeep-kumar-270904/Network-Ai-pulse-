import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ShieldOff,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  runAiAnomalyScan,
  executePingDiagnostic,
  toggleAnomalyFalsePositive,
} from '../services/api';
import {
  ListViewToolbar,
  FilterChipOption,
  LocalTimeFilter,
  filterByTimeWindow,
} from '../components/ui/ListViewToolbar';
import { PaginationBar } from '../components/ui/PaginationBar';
import { SideDrawer } from '../components/ui/SideDrawer';
import { StatusChip, StatusTone } from '../components/ui/StatusChip';
import { CopyButton } from '../components/ui/CopyButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { AccessibleChartFrame } from '../components/charts/AccessibleChartFrame';
import { ThemeMode } from '../components/ui/ThemeToggle';
import { useSavedViews, SavedView } from '../hooks/useSavedViews';
import { useToast } from '../components/ui/Toast';
import { useDemoMode } from '../contexts/DemoModeContext';
import { getChartPalette } from '../utils/chartTheme';
import { exportToCsv, exportToJson } from '../utils/export';
import {
  formatChartTimeUtc,
  formatJitterMs,
  formatLatencyMs,
  formatPercent,
  formatRelativeTime,
  formatTimestampUtc,
} from '../utils/formatters';

interface AnomalyRecord {
  id: string;
  timestamp: string;
  target: string;
  test_type: string;
  avg_rtt_ms: number;
  jitter_ms: number;
  packet_loss_pct: number;
  anomaly_score: number;
  confidence_pct: number;
  threshold: string;
  classification: 'anomaly' | 'false_positive' | 'normal';
  false_positive: boolean;
  reason: string;
}

interface AnomalyGroupRow {
  groupKey: string;
  lead: AnomalyRecord;
  items: AnomalyRecord[];
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

interface AnomalySavedState {
  search: string;
  classFilter: string;
  showNormal: boolean;
  timeFilter: LocalTimeFilter;
  grouped: boolean;
}

interface AIAnalysisProps {
  theme?: ThemeMode;
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ theme = 'dark' }) => {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('anomalies');
  const [showNormal, setShowNormal] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<LocalTimeFilter>('all');
  const [grouped, setGrouped] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeGroup, setActiveGroup] = useState<AnomalyGroupRow | null>(null);
  const [modelInfoOpen, setModelInfoOpen] = useState(false);

  const { views, saveView, deleteView } = useSavedViews<AnomalySavedState>('anomaly');
  const { addToast } = useToast();
  const { maskHost, maskText } = useDemoMode();

  const handleScan = useCallback(async () => {
    setLoading(true);
    const { analysis: res, error } = await runAiAnomalyScan(1000);
    setLoadError(error || null);
    if (res) setAnalysis(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    handleScan();
  }, [handleScan]);

  const handleQuickBaselineAndScan = async () => {
    setSeeding(true);
    await executePingDiagnostic('192.168.1.1', 3);
    await executePingDiagnostic('1.1.1.1', 3);
    await executePingDiagnostic('8.8.8.8', 3);
    setSeeding(false);
    await handleScan();
  };

  const handleToggleFalsePositive = async (item: AnomalyRecord) => {
    setUpdatingId(item.id);
    const nextState = !item.false_positive;
    const { analysis: updated } = await toggleAnomalyFalsePositive(
      item.id,
      nextState,
      nextState ? 'Marked as false positive via Anomaly Detection view' : ''
    );
    if (updated) {
      setAnalysis(updated);
      if (activeGroup && activeGroup.lead.id === item.id) {
        const refreshedLead = (updated.results || []).find((r: AnomalyRecord) => r.id === item.id);
        if (refreshedLead) setActiveGroup({ ...activeGroup, lead: refreshedLead });
      }
    } else {
      await handleScan();
    }
    setUpdatingId(null);
    addToast({
      tone: 'ok',
      title: nextState ? 'Marked as false positive' : 'Restored active anomaly status',
    });
  };

  const allResults: AnomalyRecord[] = useMemo(
    () => (analysis?.results as AnomalyRecord[]) || [],
    [analysis]
  );

  // Executive plain-language summary ("what changed")
  const executiveSummary = useMemo(() => {
    if (!allResults.length) return null;
    const anomalies = allResults.filter((r) => r.classification === 'anomaly');
    const highConf = anomalies.filter((r) => r.confidence_pct >= 80 || r.packet_loss_pct > 0);
    const fp = allResults.filter((r) => r.classification === 'false_positive');

    const mid = Math.floor(allResults.length / 2);
    const recentSlice = allResults.slice(0, Math.max(1, mid));
    const olderSlice = allResults.slice(Math.max(1, mid));
    const recentMean = recentSlice.reduce((s, r) => s + r.avg_rtt_ms, 0) / recentSlice.length;
    const olderMean = olderSlice.length
      ? olderSlice.reduce((s, r) => s + r.avg_rtt_ms, 0) / olderSlice.length
      : recentMean;
    const deltaMs = Number((recentMean - olderMean).toFixed(1));

    const severityLabel =
      highConf.length > 0 ? 'High severity' : anomalies.length > 0 ? 'Moderate severity' : 'Healthy';
    const deltaPhrase =
      Math.abs(deltaMs) < 0.2
        ? 'Mean RTT unchanged vs prior baseline'
        : `Mean RTT ${deltaMs > 0 ? 'increased' : 'decreased'} by ${Math.abs(deltaMs).toFixed(1)} ms vs earlier half`;

    return {
      severityLabel,
      highCount: highConf.length,
      moderateCount: Math.max(0, anomalies.length - highConf.length),
      fpCount: fp.length,
      deltaMs,
      summaryLine:
        anomalies.length > 0
          ? `${anomalies.length} active ${anomalies.length === 1 ? 'anomaly' : 'anomalies'} (${highConf.length} high-severity, ${Math.max(0, anomalies.length - highConf.length)} elevated RTT/jitter). ${deltaPhrase}.`
          : `No active anomalies across ${allResults.length} scored runs. ${deltaPhrase}.`,
    };
  }, [allResults]);

  const timeAndSearchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allResults.filter((r) => {
      if (!filterByTimeWindow(r.timestamp, timeFilter)) return false;
      if (!q) return true;
      return (
        r.target.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.classification.toLowerCase().includes(q)
      );
    });
  }, [allResults, search, timeFilter]);

  const counts = useMemo(() => {
    let anomalies = 0;
    let highSeverity = 0;
    let falsePositive = 0;
    let normal = 0;
    timeAndSearchFiltered.forEach((r) => {
      if (r.classification === 'anomaly') {
        anomalies += 1;
        if (r.confidence_pct >= 80 || r.packet_loss_pct > 0) highSeverity += 1;
      } else if (r.classification === 'false_positive') {
        falsePositive += 1;
      } else {
        normal += 1;
      }
    });
    return {
      anomalies,
      highSeverity,
      falsePositive,
      normal,
      all: timeAndSearchFiltered.length,
    };
  }, [timeAndSearchFiltered]);

  const filteredRecords = useMemo(() => {
    return timeAndSearchFiltered.filter((r) => {
      if (classFilter === 'high') {
        return r.classification === 'anomaly' && (r.confidence_pct >= 80 || r.packet_loss_pct > 0);
      }
      if (classFilter === 'false_positive') return r.classification === 'false_positive';
      if (classFilter === 'all') return true;
      // 'anomalies' default view: show anomalies + false positives unless Show Normal toggle enabled
      if (showNormal) return true;
      return r.classification !== 'normal';
    });
  }, [timeAndSearchFiltered, classFilter, showNormal]);

  const rowsToDisplay: AnomalyGroupRow[] = useMemo(() => {
    if (!grouped) {
      return filteredRecords.map((r) => ({
        groupKey: r.id,
        lead: r,
        items: [r],
        count: 1,
        firstTimestamp: r.timestamp,
        lastTimestamp: r.timestamp,
      }));
    }
    const map = new Map<string, AnomalyGroupRow>();
    filteredRecords.forEach((r) => {
      const normalizedReason = r.reason.replace(/\d+(\.\d+)?\s*(ms|%)/g, '<n>$2');
      const key = `${r.target}|${r.classification}|${normalizedReason}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          groupKey: key,
          lead: r,
          items: [r],
          count: 1,
          firstTimestamp: r.timestamp,
          lastTimestamp: r.timestamp,
        });
      } else {
        existing.items.push(r);
        existing.count += 1;
        if (r.timestamp < existing.firstTimestamp) existing.firstTimestamp = r.timestamp;
        if (r.timestamp > existing.lastTimestamp) {
          existing.lastTimestamp = r.timestamp;
          existing.lead = r;
        }
      }
    });
    return Array.from(map.values());
  }, [filteredRecords, grouped]);

  useEffect(() => {
    setPage(1);
  }, [search, classFilter, showNormal, timeFilter, grouped]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rowsToDisplay.slice(start, start + pageSize);
  }, [rowsToDisplay, page, pageSize]);

  // Context chart (chronological, up to latest 150 scored points)
  const chartPoints = useMemo(() => [...timeAndSearchFiltered].slice(0, 150).reverse(), [timeAndSearchFiltered]);
  const palette = useMemo(() => {
    const p = getChartPalette(theme);
    return {
      ...p,
      normalDot: p.accent,
      anomalyDot: p.danger,
      fpDot: p.axisLabel,
      thresholdLine: p.warn,
    };
  }, [theme]);

  const upperThresholdNum = useMemo(() => {
    if (!analysis?.baseline_mean_rtt_ms || !analysis?.baseline_std_rtt_ms) return null;
    return Number((analysis.baseline_mean_rtt_ms + 1.5 * analysis.baseline_std_rtt_ms).toFixed(1));
  }, [analysis]);

  const contextChartOption = useMemo(() => {
    const labels = chartPoints.map((p) => formatChartTimeUtc(p.timestamp));
    return {
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
          const pt = chartPoints[idx];
          if (!pt) return '';
          return [
            `<div style="font-weight:600;margin-bottom:4px;">${formatTimestampUtc(pt.timestamp)}</div>`,
            `<div>Target: ${maskHost(pt.target)}</div>`,
            `<div>RTT: ${formatLatencyMs(pt.avg_rtt_ms)} · Jitter: ${formatJitterMs(pt.jitter_ms)}</div>`,
            `<div>Classification: <strong>${pt.classification.toUpperCase()}</strong> (${pt.confidence_pct}%)</div>`,
            `<div style="opacity:0.85;margin-top:2px;">${maskText(pt.reason)}</div>`,
          ].join('');
        },
      },
      legend: {
        data: ['Normal baseline', 'Active anomaly', 'False positive'],
        top: 0,
        textStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      },
      grid: { top: 40, left: 48, right: 28, bottom: 28, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: palette.axisLine } },
        axisLabel: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        name: 'ms',
        nameTextStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
        axisLabel: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
        splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } },
      },
      series: [
        {
          name: 'Normal baseline',
          type: 'line',
          symbolSize: 5,
          lineStyle: { color: palette.normalDot, width: 1.5, opacity: 0.55 },
          itemStyle: { color: palette.normalDot },
          data: chartPoints.map((p) => (p.classification === 'normal' ? p.avg_rtt_ms : p.avg_rtt_ms)),
          markLine: upperThresholdNum
            ? {
                symbol: ['none', 'none'],
                silent: true,
                lineStyle: { color: palette.thresholdLine, type: 'dashed', width: 1.5 },
                label: { formatter: `Upper RTT threshold (${upperThresholdNum} ms)`, color: palette.thresholdLine, fontSize: 12 },
                data: [{ yAxis: upperThresholdNum }],
              }
            : undefined,
        },
        {
          name: 'Active anomaly',
          type: 'scatter',
          symbol: 'diamond',
          symbolSize: 12,
          itemStyle: { color: palette.anomalyDot },
          data: chartPoints.map((p) => (p.classification === 'anomaly' ? p.avg_rtt_ms : null)),
        },
        {
          name: 'False positive',
          type: 'scatter',
          symbol: 'circle',
          symbolSize: 9,
          itemStyle: { color: palette.fpDot },
          data: chartPoints.map((p) => (p.classification === 'false_positive' ? p.avg_rtt_ms : null)),
        },
      ],
    };
  }, [chartPoints, palette, upperThresholdNum]);

  const chips: FilterChipOption[] = [
    {
      value: 'anomalies',
      label: showNormal ? 'All (anomalies + normal)' : 'Anomalies & suppressed',
      count: showNormal ? counts.all : counts.anomalies + counts.falsePositive,
      tone: 'warn',
    },
    { value: 'high', label: 'High severity', count: counts.highSeverity, tone: 'danger' },
    { value: 'false_positive', label: 'False positives', count: counts.falsePositive, tone: 'neutral' },
    { value: 'all', label: 'All scored samples', count: counts.all, tone: 'info' },
  ];

  const handleApplySavedView = (view: SavedView<AnomalySavedState>) => {
    setSearch(view.state.search);
    setClassFilter(view.state.classFilter);
    setShowNormal(view.state.showNormal);
    setTimeFilter(view.state.timeFilter);
    setGrouped(view.state.grouped);
  };

  return (
    <div className="space-y-4">
      {/* Executive Summary Banner */}
      {executiveSummary && (
        <div
          className={`p-4 rounded-[var(--radius-card)] border flex flex-wrap items-center justify-between gap-3 ${
            (analysis?.anomalies_found ?? 0) > 0
              ? 'bg-[var(--warn-soft)] border-[var(--warn)]/35'
              : 'bg-[var(--ok-soft)] border-[var(--ok)]/30'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            {(analysis?.anomalies_found ?? 0) > 0 ? (
              <AlertTriangle className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[var(--ok)] shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div>
              <div className="text-[14px] font-semibold text-[var(--text)]">
                {executiveSummary.severityLabel}: {executiveSummary.summaryLine}
              </div>
              {analysis?.threshold && (
                <div className="text-[12px] font-mono text-[var(--text-secondary)] mt-0.5">
                  Thresholds: {analysis.threshold}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleScan}
            disabled={loading || seeding}
            className="h-10 flex items-center gap-2 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold shrink-0"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{loading ? 'Scoring dataset…' : 'Run anomaly scan'}</span>
          </button>
        </div>
      )}

      {/* KPI Summary Row */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Active anomalies</div>
            <div
              className={`text-[24px] font-semibold font-mono mt-1 np-mono-val ${
                (analysis.anomalies_found ?? 0) > 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'
              }`}
            >
              {analysis.anomalies_found ?? 0}
            </div>
            <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
              {executiveSummary ? `${executiveSummary.highCount} high · ${executiveSummary.fpCount} suppressed` : '—'}
            </div>
          </div>

          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Baseline mean RTT</div>
            <div className="text-[24px] font-semibold font-mono text-[var(--ok)] mt-1 np-mono-val">
              {formatLatencyMs(analysis.baseline_mean_rtt_ms)}
            </div>
            <div className="text-[12px] text-[var(--text-muted)] mt-0.5 font-mono">
              {executiveSummary && Math.abs(executiveSummary.deltaMs) >= 0.1
                ? `${executiveSummary.deltaMs > 0 ? '+' : ''}${executiveSummary.deltaMs} ms shift`
                : 'Stable baseline'}
            </div>
          </div>

          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Samples scored</div>
            <div className="text-[24px] font-semibold font-mono text-[var(--text)] mt-1 np-mono-val">
              {analysis.samples_analyzed ?? 'No data'}
            </div>
            <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Normal samples: {counts.normal}
            </div>
          </div>

          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Active algorithm</div>
            <div className="text-[14px] font-semibold font-mono text-[var(--accent)] mt-1 leading-snug break-words">
              {analysis.model}
            </div>
            <button
              type="button"
              onClick={() => setModelInfoOpen((o) => !o)}
              className="mt-1.5 text-[12px] font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{modelInfoOpen ? 'Hide model details' : 'About this model'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Collapsible About This Model Panel */}
      {modelInfoOpen && (
        <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border-strong)] space-y-2 text-[13px] text-[var(--text-secondary)]">
          <div className="text-[14px] font-semibold text-[var(--text)]">
            About the Anomaly Detection Model
          </div>
          <p>
            NetPulse AI trains Scikit-learn <span className="font-mono text-[var(--text)]">IsolationForest</span>{' '}
            (<span className="font-mono">contamination=0.15</span>) on four telemetry dimensions per diagnostic run:{' '}
            <span className="font-mono">avg_rtt_ms</span>, <span className="font-mono">jitter_ms</span>,{' '}
            <span className="font-mono">packet_loss_pct</span>, and <span className="font-mono">max_rtt_ms</span>{' '}
            (falling back to Z-score baseline when fewer than 5 runs exist).
          </p>
          <p>
            To keep labels and explanations strictly aligned, any run violating hard operational thresholds{' '}
            (<span className="font-mono">loss &gt; 0%</span>, <span className="font-mono">jitter &gt; 10.0 ms</span>, or{' '}
            <span className="font-mono">avg_rtt &gt; mean + 1.5σ</span>) or flagged as a multivariate IsolationForest
            outlier is classified as an active anomaly until marked false positive in SQLite.
          </p>
        </div>
      )}

      {/* Insufficient samples prompt */}
      {analysis?.status === 'need_more_samples' && (
        <div className="p-6 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-dashed border-[var(--border-strong)] text-center space-y-3">
          <Cpu className="w-8 h-8 text-[var(--accent)] mx-auto" />
          <div className="text-[13px] text-[var(--text-secondary)]">{analysis.message}</div>
          <button
            type="button"
            onClick={handleQuickBaselineAndScan}
            disabled={seeding}
            className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-ink)] text-[13px] font-semibold inline-flex items-center gap-2"
          >
            {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{seeding ? 'Running baseline pings…' : 'Run 3 baseline pings & score'}</span>
          </button>
        </div>
      )}

      {/* Anomalies in Context Chart */}
      {chartPoints.length > 0 && (
        <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--text)]">
                Anomalies in RTT baseline context ({chartPoints.length} samples)
              </h3>
              <p className="text-[12px] text-[var(--text-muted)]">
                Diamonds mark active anomalies against the baseline RTT envelope and threshold
              </p>
            </div>
          </div>
          <AccessibleChartFrame
            title="Anomalies in RTT baseline context"
            summary={`${chartPoints.length} samples plotted with baseline RTT and diamond anomaly markers.`}
            columns={[
              { key: 'time', label: 'Timestamp (UTC)' },
              { key: 'target', label: 'Target' },
              { key: 'classification', label: 'Classification' },
              { key: 'rtt', label: 'Avg RTT', align: 'right' },
              { key: 'loss', label: 'Packet loss', align: 'right' },
            ]}
            rows={chartPoints.map((pt: AnomalyRecord) => ({
              time: formatTimestampUtc(pt.timestamp),
              target: maskHost(pt.target),
              classification: pt.classification.replace('_', ' '),
              rtt: formatLatencyMs(pt.avg_rtt_ms),
              loss: formatPercent(pt.packet_loss_pct),
            }))}
          >
            <div className="h-[260px] w-full">
              <ReactECharts option={contextChartOption} notMerge={true} style={{ width: '100%', height: '100%' }} />
            </div>
          </AccessibleChartFrame>
        </div>
      )}

      {/* Shared List Toolbar (Anomalies by default + Toggle for Normal Samples) */}
      <ListViewToolbar<AnomalySavedState>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search anomalies by target, reason, or run ID…"
        chips={chips}
        activeChip={classFilter}
        onChipChange={setClassFilter}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        grouped={grouped}
        onGroupedChange={setGrouped}
        groupLabel="Group repeated"
        savedViews={views}
        onApplySavedView={handleApplySavedView}
        onSaveCurrentView={(name) => {
          saveView(name, { search, classFilter, showNormal, timeFilter, grouped });
          addToast({ tone: 'ok', title: `Saved view "${name}"` });
        }}
        onDeleteSavedView={deleteView}
        onExportCsv={() =>
          exportToCsv(
            'netpulse-anomalies-filtered.csv',
            filteredRecords.map((r) => ({
              id: r.id,
              timestamp_utc: formatTimestampUtc(r.timestamp),
              target: r.target,
              classification: r.classification,
              confidence_pct: r.confidence_pct,
              avg_rtt_ms: r.avg_rtt_ms,
              jitter_ms: r.jitter_ms,
              packet_loss_pct: r.packet_loss_pct,
              reason: r.reason,
            }))
          )
        }
        onExportJson={() => exportToJson('netpulse-anomalies-filtered.json', filteredRecords)}
        onRefresh={handleScan}
        loading={loading}
        extraControls={
          <button
            type="button"
            aria-pressed={showNormal}
            onClick={() => {
              setShowNormal((prev) => !prev);
              setClassFilter('anomalies');
            }}
            className={`h-10 px-3 rounded-[var(--radius-control)] border text-[13px] font-medium inline-flex items-center gap-2 transition-colors ${
              showNormal
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            {showNormal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showNormal ? 'Hide normal' : `Show normal (${counts.normal})`}</span>
          </button>
        }
      />

      {/* Paginated Sticky-Header Anomaly Table */}
      {paginatedRows.length > 0 ? (
        <div className="overflow-auto max-h-[560px] rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-[var(--text-secondary)] text-[12px] font-semibold border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-3">Recorded (UTC)</th>
                <th className="py-3 px-3">Target</th>
                <th className="py-3 px-3 text-right">Avg RTT</th>
                <th className="py-3 px-3 text-right">Jitter</th>
                <th className="py-3 px-3 text-right">Loss</th>
                <th className="py-3 px-3 text-right">Conf.</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3">Flag reason</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-mono text-[12px] np-mono-val">
              {paginatedRows.map((row) => {
                const item = row.lead;
                const expanded = Boolean(expandedGroups[row.groupKey]);
                const badgeTone: StatusTone =
                  item.classification === 'anomaly'
                    ? 'danger'
                    : item.classification === 'false_positive'
                    ? 'neutral'
                    : 'ok';
                const badgeLabel =
                  item.classification === 'anomaly'
                    ? 'Anomaly'
                    : item.classification === 'false_positive'
                    ? 'False positive'
                    : 'Normal';

                return (
                  <React.Fragment key={row.groupKey}>
                    <tr
                      onClick={() => setActiveGroup(row)}
                      className="cursor-pointer hover:bg-[var(--surface-3)]/70 transition-colors"
                    >
                      <td
                        className="py-3 px-3 text-[var(--text-secondary)] whitespace-nowrap"
                        title={formatRelativeTime(row.lastTimestamp)}
                      >
                        {row.count > 1 ? (
                          <div>
                            <div>Last: {formatTimestampUtc(row.lastTimestamp)}</div>
                            <div className="text-[var(--text-muted)]">
                              First: {formatTimestampUtc(row.firstTimestamp)}
                            </div>
                          </div>
                        ) : (
                          <span>{formatTimestampUtc(item.timestamp)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[var(--accent)] font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{maskHost(item.target)}</span>
                          {row.count > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedGroups((prev) => ({
                                  ...prev,
                                  [row.groupKey]: !prev[row.groupKey],
                                }));
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[var(--accent)]"
                            >
                              {expanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              <span>×{row.count}</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--text)] whitespace-nowrap">
                        {formatLatencyMs(item.avg_rtt_ms)}
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                        {formatJitterMs(item.jitter_ms)}
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                        {formatPercent(item.packet_loss_pct)}
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--text)] whitespace-nowrap">
                        {item.confidence_pct !== undefined && item.confidence_pct !== null
                          ? `${item.confidence_pct}%`
                          : 'No data'}
                      </td>
                      <td className="py-3 px-3 font-sans whitespace-nowrap">
                        <StatusChip size="sm" tone={badgeTone} label={badgeLabel} />
                      </td>
                      <td className="py-3 px-3 text-[var(--text)] font-sans text-[13px] max-w-[260px]">
                        {item.reason}
                      </td>
                      <td
                        className="py-3 px-3 text-right whitespace-nowrap font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.classification === 'anomaly' || item.classification === 'false_positive' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleFalsePositive(item)}
                            disabled={updatingId === item.id}
                            className="h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[12px] text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {item.false_positive ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 text-[var(--accent)]" />
                                <span>Restore</span>
                              </>
                            ) : (
                              <>
                                <ShieldOff className="w-3.5 h-3.5 text-[var(--warn)]" />
                                <span>False positive</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[12px] text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>

                    {expanded &&
                      row.items.map((child) => (
                        <tr
                          key={child.id}
                          onClick={() =>
                            setActiveGroup({
                              groupKey: child.id,
                              lead: child,
                              items: [child],
                              count: 1,
                              firstTimestamp: child.timestamp,
                              lastTimestamp: child.timestamp,
                            })
                          }
                          className="bg-[var(--surface-2)]/50 hover:bg-[var(--surface-3)]/70 cursor-pointer"
                        >
                          <td className="py-2 px-3 pl-6 text-[var(--text-muted)] whitespace-nowrap">
                            {formatTimestampUtc(child.timestamp)}
                          </td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">{child.id}</td>
                          <td className="py-2 px-3 text-right text-[var(--text)]">
                            {formatLatencyMs(child.avg_rtt_ms)}
                          </td>
                          <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                            {formatJitterMs(child.jitter_ms)}
                          </td>
                          <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                            {formatPercent(child.packet_loss_pct)}
                          </td>
                          <td className="py-2 px-3 text-right text-[var(--text)]">
                            {child.confidence_pct}%
                          </td>
                          <td className="py-2 px-3 font-sans text-[12px] text-[var(--text-muted)] capitalize">
                            {child.classification.replace('_', ' ')}
                          </td>
                          <td className="py-2 px-3 font-sans text-[12px] text-[var(--text-secondary)]">
                            {child.reason}
                          </td>
                          <td className="py-2 px-3 text-right font-sans text-[12px] text-[var(--accent)]">
                            Inspect
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : loadError && !analysis ? (
        <ErrorState
          title="Unable to run anomaly analysis"
          message={loadError}
          why="The NetPulse gateway could not complete IsolationForest scoring."
          howToFix="Confirm the gateway is running and check Settings -> Gateway URL, then click Retry."
          onRetry={handleScan}
          retrying={loading}
        />
      ) : loading && !analysis ? (
        <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="p-8 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <EmptyState
            title="No anomalies in the current view"
            description="Toggle 'Show normal' to inspect baseline runs or broaden your filters."
            icon={CheckCircle2}
          />
        </div>
      )}

      <PaginationBar
        totalItems={rowsToDisplay.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel={grouped ? 'anomaly groups' : 'samples'}
      />

      {/* Detail SideDrawer */}
      <SideDrawer
        open={Boolean(activeGroup)}
        onClose={() => setActiveGroup(null)}
        title={activeGroup?.lead.target ? maskHost(activeGroup.lead.target) : 'Anomaly detail'}
        description={
          activeGroup && activeGroup.count > 1
            ? `${activeGroup.count} occurrences · Last ${formatTimestampUtc(activeGroup.lastTimestamp)}`
            : activeGroup
            ? formatTimestampUtc(activeGroup.lead.timestamp)
            : undefined
        }
        footer={
          activeGroup &&
          (activeGroup.lead.classification === 'anomaly' ||
            activeGroup.lead.classification === 'false_positive') && (
            <button
              type="button"
              onClick={() => handleToggleFalsePositive(activeGroup.lead)}
              disabled={updatingId === activeGroup.lead.id}
              className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-ink)] text-[12px] font-semibold"
            >
              {activeGroup.lead.false_positive ? 'Restore as anomaly' : 'Mark as false positive'}
            </button>
          )
        }
      >
        {activeGroup && (
          <div className="space-y-4 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <StatusChip
                size="sm"
                tone={
                  activeGroup.lead.classification === 'anomaly'
                    ? 'danger'
                    : activeGroup.lead.classification === 'false_positive'
                    ? 'neutral'
                    : 'ok'
                }
                label={activeGroup.lead.classification.replace('_', ' ')}
              />
              <div className="inline-flex items-center gap-1">
                <span className="font-mono text-[12px] text-[var(--text-muted)]">
                  {activeGroup.lead.id}
                </span>
                <CopyButton value={activeGroup.lead.id} label="Copy run ID" compact />
              </div>
            </div>

            <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
              <div className="text-[12px] text-[var(--text-muted)]">Flag reason & decision</div>
              <div className="text-[var(--text)] font-medium">{maskText(activeGroup.lead.reason)}</div>
              <div className="text-[12px] font-mono text-[var(--text-secondary)]">
                Confidence: {activeGroup.lead.confidence_pct}% · Score: {activeGroup.lead.anomaly_score}
              </div>
              <div className="text-[12px] font-mono text-[var(--text-muted)]">
                Threshold: {activeGroup.lead.threshold}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-[var(--text-secondary)]">
                Grouped occurrences ({activeGroup.items.length})
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {activeGroup.items.map((occ) => (
                  <div
                    key={occ.id}
                    className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-2 text-[12px] font-mono"
                  >
                    <span className="text-[var(--text)]">{formatTimestampUtc(occ.timestamp)}</span>
                    <span className="text-[var(--text-secondary)]">
                      {formatLatencyMs(occ.avg_rtt_ms)} · {formatJitterMs(occ.jitter_ms)} jit
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
};
