import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, Sliders, AlertTriangle, ArrowUpRight } from 'lucide-react';
import {
  formatChartTimeUtc,
  formatJitterMs,
  formatLatencyMs,
  formatPercent,
  formatThroughputMbps,
  formatTimestampUtc,
} from '../../utils/formatters';
import { ThemeMode } from '../ui/ThemeToggle';

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
  theme?: ThemeMode;
  onDrillDown?: () => void;
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
  theme = 'dark',
  onDrillDown,
  seriesData,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'latency' | 'jitter' | 'loss' | 'throughput'>('latency');

  const isLight = theme === 'light';
  const palette = isLight
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
        latency: '#155e75',
        jitter: '#1d4ed8',
        loss: '#b91c1c',
        throughput: '#065f46',
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
        latency: '#22d3ee',
        jitter: '#60a5fa',
        loss: '#f87171',
        throughput: '#34d399',
      };

  const metricMeta = {
    latency: { label: 'Round-trip latency', unit: 'ms', color: palette.latency },
    jitter: { label: 'Packet jitter', unit: 'ms', color: palette.jitter },
    loss: { label: 'Packet loss', unit: '%', color: palette.loss },
    throughput: { label: 'Throughput', unit: 'Mbps', color: palette.throughput },
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
            itemStyle: { color: palette.outageBand },
          },
          { xAxis: endIdx },
        ];
      })
    : [];

  const outageMarkLines: any[] = showOutageMarkers
    ? outages.map((o) => ({
        xAxis: o.index,
        lineStyle: { color: palette.outageColor, type: 'dashed', width: 1.5 },
        label: { show: false },
      }))
    : [];

  const labelMinGap = Math.max(7, Math.ceil(xLabels.length / 4));
  let lastLabeledIdx = -100;
  const outageMarkPoints: any[] = showOutageMarkers
    ? outages.map((o) => {
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
      })
    : [];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      textStyle: { color: palette.tooltipText, fontFamily: 'JetBrains Mono', fontSize: 12 },
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
          `<div style="color:${palette.tooltipSub};margin-bottom:4px;">Target: ${targetName}</div>`,
          isOutage && selectedMetric !== 'loss'
            ? `<div style="color:${palette.outageColor};font-weight:600;">Status: Probe failed (Outage · gap)</div>`
            : `<div style="color:${metricMeta.color};font-weight:600;">${metricMeta.label}: ${formatMetricValue(rawVal)}</div>`,
        ].join('');
      },
    },
    grid: {
      top: '18%',
      left: '3%',
      right: '8%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
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
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: metricMeta.unit,
      nameTextStyle: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      axisLine: { show: false },
      axisLabel: { color: palette.axisLabel, fontFamily: 'JetBrains Mono', fontSize: 12 },
      splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } },
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
        markArea: outageMarkAreas.length
          ? { silent: true, label: { show: false }, data: outageMarkAreas }
          : undefined,
        markLine: outageMarkLines.length ? { symbol: ['none', 'none'], silent: true, data: outageMarkLines } : undefined,
        markPoint: outageMarkPoints.length ? { data: outageMarkPoints } : undefined,
        data: hasData ? currentSeries!.values : [],
      },
    ],
  };

  return (
    <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
          <h3 className="text-[14px] font-semibold text-[var(--text)]">
            Telemetry time-series ({windowLabel})
          </h3>
          {outages.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/30 text-[12px] font-mono">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{outages.length} outage{outages.length === 1 ? '' : 's'}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          {onDrillDown && (
            <button
              type="button"
              onClick={onDrillDown}
              className="h-9 px-3 rounded-[var(--radius-control)] text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] inline-flex items-center gap-1 transition-colors"
            >
              <span>Deep dive</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
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
