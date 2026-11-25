import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { RefreshCw, Play, AlertTriangle } from 'lucide-react';
import { fetchAnalyticsSummary, executePingDiagnostic } from '../services/api';
import { TimeRangeOption } from '../components/layout/TopBar';
import {
  formatChartTimeUtc,
  formatJitterMs,
  formatLatencyMs,
  formatPercent,
  formatTimestampUtc,
} from '../utils/formatters';

interface AnalyticsProps {
  timeRange?: TimeRangeOption;
}

export const Analytics: React.FC<AnalyticsProps> = ({ timeRange = '1h' }) => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const { analytics: data } = await fetchAnalyticsSummary(timeRange, 500);
    setAnalytics(data);
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

  const timestamps: string[] = analytics?.series?.timestamps || [];
  const isoTimestamps: string[] = analytics?.series?.iso_timestamps || [];
  const latencySeries: Array<number | null> = analytics?.series?.latency || [];
  const jitterSeries: Array<number | null> = analytics?.series?.jitter || [];
  const statuses: string[] = analytics?.series?.statuses || [];
  const targets: string[] = analytics?.series?.targets || [];
  const outages: any[] = analytics?.outages || [];
  const hasChart = timestamps.length > 0;

  const xLabels = (isoTimestamps.length === timestamps.length ? isoTimestamps : timestamps).map((ts) =>
    formatChartTimeUtc(ts)
  );

  // Build ECharts outage bands (red background shading), vertical markers, and outage pins
  const outageMarkAreas: any[] = outages.map((o: any) => {
    const startIdx = Math.max(0, o.index - 0.5);
    const endIdx = Math.min(Math.max(0, timestamps.length - 1), o.index + 0.5);
    return [
      {
        name: 'Outage',
        xAxis: startIdx,
        itemStyle: { color: 'rgba(239, 68, 68, 0.16)' },
      },
      {
        xAxis: endIdx,
      },
    ];
  });

  const outageMarkLines: any[] = outages.map((o: any) => ({
    xAxis: o.index,
    lineStyle: { color: '#EF4444', type: 'dashed', width: 1.5 },
    label: { show: false },
  }));

  let lastLabeledIdx = -10;
  const outageMarkPoints: any[] = outages.map((o: any) => {
    const showLabel = o.index - lastLabeledIdx >= 5;
    if (showLabel) lastLabeledIdx = o.index;
    return {
      name: 'Probe failed',
      coord: [o.index, 0],
      value: 'Outage',
      itemStyle: { color: '#EF4444' },
      symbol: 'triangle',
      symbolSize: 10,
      label: {
        show: showLabel,
        formatter: 'Outage',
        position: 'top',
        color: '#FCA5A5',
        fontSize: 10,
        fontFamily: 'JetBrains Mono',
      },
    };
  });

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: '#334155',
      textStyle: { color: '#F1F5F9', fontFamily: 'JetBrains Mono', fontSize: 11 },
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
          `<div style="color:#94A3B8;margin-bottom:4px;">Target: ${targetName}</div>`,
          isOutage
            ? `<div style="color:#F87171;font-weight:600;">Status: Probe failed (Outage · gap in RTT)</div>`
            : `<div style="color:#22D3EE;">Avg RTT: ${formatLatencyMs(rttVal)}</div><div style="color:#60A5FA;">Jitter: ${formatJitterMs(jitVal)}</div>`,
        ].join('');
      },
    },
    legend: {
      data: ['Avg RTT (ms)', 'Jitter (ms)'],
      textStyle: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 11 },
    },
    grid: { top: '20%', left: '4%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'ms',
      nameTextStyle: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1E293B', type: 'dashed' } },
    },
    series: [
      {
        name: 'Avg RTT (ms)',
        type: 'line',
        smooth: false,
        connectNulls: false,
        showSymbol: true,
        symbolSize: 6,
        data: latencySeries,
        lineStyle: { color: '#22D3EE', width: 2 },
        itemStyle: { color: '#22D3EE' },
        markArea: outageMarkAreas.length ? { silent: true, data: outageMarkAreas } : undefined,
        markLine: outageMarkLines.length ? { symbol: ['none', 'none'], silent: true, data: outageMarkLines } : undefined,
        markPoint: outageMarkPoints.length ? { data: outageMarkPoints } : undefined,
      },
      {
        name: 'Jitter (ms)',
        type: 'bar',
        data: jitterSeries,
        itemStyle: { color: 'rgba(59, 130, 246, 0.45)', borderRadius: [3, 3, 0, 0] },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-mono text-[var(--text-secondary)]">
            {analytics?.total_tests ?? 0} samples · {analytics?.window_label || `Last ${timeRange}`}
          </span>
          {(analytics?.outage_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/30 text-[12px] font-mono">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{analytics.outage_count} failed {analytics.outage_count === 1 ? 'probe' : 'probes'} plotted as outages</span>
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

      {/* Percentile KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <div className="text-[12px] font-medium text-[var(--text-secondary)]">P50 median latency</div>
          <div className="text-[24px] font-semibold font-mono text-[var(--ok)] mt-1 np-mono-val">
            {formatLatencyMs(analytics?.p50_ms)}
          </div>
          <div className="text-[12px] text-[var(--text-muted)] mt-1">50th percentile RTT across passing probes</div>
        </div>

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <div className="text-[12px] font-medium text-[var(--text-secondary)]">P95 tail latency</div>
          <div className="text-[24px] font-semibold font-mono text-[var(--accent)] mt-1 np-mono-val">
            {formatLatencyMs(analytics?.p95_ms)}
          </div>
          <div className="text-[12px] text-[var(--text-muted)] mt-1">95% of passing probes complete faster</div>
        </div>

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <div className="text-[12px] font-medium text-[var(--text-secondary)]">P99 worst case</div>
          <div className="text-[24px] font-semibold font-mono text-[var(--warn)] mt-1 np-mono-val">
            {formatLatencyMs(analytics?.p99_ms)}
          </div>
          <div className="text-[12px] text-[var(--text-muted)] mt-1 font-mono">
            Avg jitter: {formatJitterMs(analytics?.avg_jitter_ms)}
          </div>
        </div>

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <div className="text-[12px] font-medium text-[var(--text-secondary)]">
            Probe pass rate ({analytics?.window_label || `Last ${timeRange}`})
          </div>
          <div
            className={`text-[24px] font-semibold font-mono mt-1 np-mono-val ${
              analytics?.pass_rate_pct === null || analytics?.pass_rate_pct === undefined
                ? 'text-[var(--text-muted)]'
                : analytics.pass_rate_pct >= 95
                ? 'text-[var(--ok)]'
                : analytics.pass_rate_pct >= 70
                ? 'text-[var(--warn)]'
                : 'text-[var(--danger)]'
            }`}
          >
            {formatPercent(analytics?.pass_rate_pct)}
          </div>
          <div className="text-[12px] text-[var(--text-muted)] mt-1 font-mono">
            Avg loss: {formatPercent(analytics?.avg_loss_pct)}
          </div>
        </div>
      </div>

      {/* Longitudinal Trend Chart */}
      <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <span className="text-[14px] font-semibold text-[var(--text)]">
            RTT latency & jitter trend ({analytics?.window_label || `Last ${timeRange}`})
          </span>
          <span className="text-[12px] font-mono text-[var(--text-muted)]">
            Failed probes render as line gaps + red outage bands
          </span>
        </div>

        {hasChart ? (
          <div className="h-72 w-full">
            <ReactECharts option={chartOption} notMerge={true} style={{ width: '100%', height: '100%' }} />
          </div>
        ) : (
          <div className="p-8 text-center space-y-3 border border-dashed border-[var(--border)] rounded-[var(--radius-card)]">
            <div className="text-[13px] text-[var(--text-secondary)]">
              No diagnostic tests recorded for {analytics?.window_label || `Last ${timeRange}`}.
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

      {/* Per-Target Breakdown Table */}
      {analytics?.per_target?.length > 0 && (
        <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <h3 className="text-[14px] font-semibold text-[var(--text)]">
            Target-level telemetry breakdown ({analytics?.window_label || `Last ${timeRange}`})
          </h3>
          <div className="overflow-x-auto rounded-[var(--radius-control)] border border-[var(--border)]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[var(--surface-2)] text-[var(--text-secondary)] text-[12px] font-medium border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 px-4">Target endpoint</th>
                  <th className="py-2.5 px-4 text-right">Runs</th>
                  <th className="py-2.5 px-4 text-right">Pass rate</th>
                  <th className="py-2.5 px-4 text-right">Average RTT</th>
                  <th className="py-2.5 px-4 text-right">Average jitter</th>
                  <th className="py-2.5 px-4 text-right">Average loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono text-[12px] np-mono-val">
                {analytics.per_target.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[var(--surface-2)]/60">
                    <td className="py-2.5 px-4 text-[var(--accent)] font-semibold">{row.target}</td>
                    <td className="py-2.5 px-4 text-right text-[var(--text)]">{row.runs}</td>
                    <td className="py-2.5 px-4 text-right text-[var(--text)]">
                      {formatPercent(row.pass_rate_pct)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[var(--ok)]">
                      {formatLatencyMs(row.avg_rtt_ms)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[var(--text-secondary)]">
                      {formatJitterMs(row.avg_jitter_ms)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[var(--text-secondary)]">
                      {formatPercent(row.avg_loss_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
