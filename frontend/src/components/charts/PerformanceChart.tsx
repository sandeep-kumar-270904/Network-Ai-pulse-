import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, Sliders, AlertTriangle } from 'lucide-react';
import {
  formatChartTimeUtc,
  formatJitterMs,
  formatLatencyMs,
  formatPercent,
  formatThroughputMbps,
  formatTimestampUtc,
} from '../../utils/formatters';

interface MetricSeries {
  timestamps: string[];
  isoTimestamps?: string[];
  statuses?: string[];
  targets?: string[];
  values: Array<number | null>;
}

interface OutagePoint {
  index: number;
  timestamp: string;
  iso_timestamp?: string;
  target: string;
  loss_pct: number;
  label: string;
}

interface PerformanceChartProps {
  windowLabel?: string;
  outages?: OutagePoint[];
  seriesData?: {
    latency?: MetricSeries;
    jitter?: MetricSeries;
    loss?: MetricSeries;
    throughput?: MetricSeries;
  };
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  windowLabel = 'Last 1h',
  outages = [],
  seriesData,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'latency' | 'jitter' | 'loss' | 'throughput'>('latency');

  const metricMeta = {
    latency: { label: 'Round-trip latency', unit: 'ms', color: '#22D3EE' },
    jitter: { label: 'Packet jitter', unit: 'ms', color: '#3B82F6' },
    loss: { label: 'Packet loss', unit: '%', color: '#EF4444' },
    throughput: { label: 'Throughput', unit: 'Mbps', color: '#10B981' },
  }[selectedMetric];

  const currentSeries = seriesData?.[selectedMetric];
  const hasData = Boolean(currentSeries && currentSeries.values.length > 0);
  const rawTimestamps = currentSeries?.isoTimestamps?.length
    ? currentSeries.isoTimestamps
    : currentSeries?.timestamps || [];
  const xLabels = rawTimestamps.map((ts) => formatChartTimeUtc(ts));

  const formatMetricValue = (val: number | null | undefined): string => {
    if (selectedMetric === 'latency') return formatLatencyMs(val);
    if (selectedMetric === 'jitter') return formatJitterMs(val);
    if (selectedMetric === 'loss') return formatPercent(val);
    return formatThroughputMbps(val);
  };

  const showOutageMarkers = (selectedMetric === 'latency' || selectedMetric === 'jitter') && outages.length > 0;

  const outageMarkAreas: any[] = showOutageMarkers
    ? outages.map((o) => {
        const startIdx = Math.max(0, o.index - 0.5);
        const endIdx = Math.min(Math.max(0, xLabels.length - 1), o.index + 0.5);
        return [
          {
            name: 'Outage',
            xAxis: startIdx,
            itemStyle: { color: 'rgba(239, 68, 68, 0.16)' },
          },
          { xAxis: endIdx },
        ];
      })
    : [];

  const outageMarkLines: any[] = showOutageMarkers
    ? outages.map((o) => ({
        xAxis: o.index,
        lineStyle: { color: '#EF4444', type: 'dashed', width: 1.5 },
        label: { show: false },
      }))
    : [];

  let lastLabeledIdx = -10;
  const outageMarkPoints: any[] = showOutageMarkers
    ? outages.map((o) => {
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
      })
    : [];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: '#334155',
      textStyle: { color: '#F1F5F9', fontFamily: 'JetBrains Mono', fontSize: 12 },
      formatter: (params: any[]) => {
        if (!params || !params.length) return '';
        const item = params[0];
        const idx = item.dataIndex;
        const fullUtc = formatTimestampUtc(rawTimestamps[idx] || item.name);
        const targetName = currentSeries?.targets?.[idx] || 'Recorded target';
        const isOutage = currentSeries?.statuses?.[idx] && currentSeries.statuses[idx] !== 'passed';
        const rawVal = currentSeries?.values?.[idx];

        return [
          `<div style="font-weight:600;margin-bottom:4px;">${fullUtc}</div>`,
          `<div style="color:#94A3B8;margin-bottom:4px;">Target: ${targetName}</div>`,
          isOutage && selectedMetric !== 'loss'
            ? `<div style="color:#F87171;font-weight:600;">Status: Probe failed (Outage · gap)</div>`
            : `<div style="color:${metricMeta.color};font-weight:600;">${metricMeta.label}: ${formatMetricValue(rawVal)}</div>`,
        ].join('');
      },
    },
    grid: {
      top: '18%',
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: xLabels,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: metricMeta.unit,
      nameTextStyle: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1E293B', type: 'dashed' } },
    },
    series: [
      {
        name: metricMeta.label,
        type: 'line',
        smooth: false,
        connectNulls: false,
        showSymbol: true,
        symbolSize: 5,
        lineStyle: { width: 2, color: metricMeta.color },
        itemStyle: { color: metricMeta.color },
        markArea: outageMarkAreas.length ? { silent: true, data: outageMarkAreas } : undefined,
        markLine: outageMarkLines.length ? { symbol: ['none', 'none'], silent: true, data: outageMarkLines } : undefined,
        markPoint: outageMarkPoints.length ? { data: outageMarkPoints } : undefined,
        data: hasData ? currentSeries!.values : [],
      },
    ],
  };

  return (
    <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
          <h3 className="text-[14px] font-semibold text-[var(--text)]">
            Telemetry time-series ({windowLabel})
          </h3>
          {outages.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/30 text-[11px] font-mono">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              <span>{outages.length} outage{outages.length === 1 ? '' : 's'}</span>
            </span>
          )}
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-[var(--radius-control)] border border-[var(--border)]">
          {(['latency', 'jitter', 'loss', 'throughput'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMetric(m)}
              className={`px-2.5 py-1 text-[12px] font-mono capitalize rounded-[var(--radius-control)] transition-colors ${
                selectedMetric === m
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold border border-[var(--accent)]/30'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas or Honest Empty State */}
      <div className="relative w-full h-72">
        {hasData ? (
          <ReactECharts
            option={option}
            notMerge={true}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-[var(--radius-card)] bg-[var(--surface-2)]/50 text-center p-6 space-y-2">
            <Sliders className="w-8 h-8 text-[var(--text-muted)]" />
            <div className="text-[13px] font-medium text-[var(--text)]">
              No telemetry samples in {windowLabel}
            </div>
            <p className="text-[12px] text-[var(--text-muted)] max-w-sm">
              Run an ICMP, TCP, or Synthetic test to populate recorded time-series metrics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
