import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, Clock, Sliders } from 'lucide-react';

interface MetricSeries {
  timestamps: string[];
  values: number[];
}

interface PerformanceChartProps {
  seriesData?: {
    latency?: MetricSeries;
    jitter?: MetricSeries;
    loss?: MetricSeries;
    throughput?: MetricSeries;
  };
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ seriesData }) => {
  const [selectedMetric, setSelectedMetric] = useState<'latency' | 'jitter' | 'loss' | 'throughput'>('latency');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

  const metricMeta = {
    latency: { label: 'Round-Trip Latency', unit: 'ms', color: '#22D3EE' },
    jitter: { label: 'Packet Jitter', unit: 'ms', color: '#287EFF' },
    loss: { label: 'Packet Loss', unit: '%', color: '#FF475F' },
    throughput: { label: 'Bandwidth Throughput', unit: 'Mbps', color: '#00D69A' },
  }[selectedMetric];

  const currentSeries = seriesData?.[selectedMetric];
  const hasData = currentSeries && currentSeries.values.length > 0;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#091525',
      borderColor: '#203750',
      textStyle: { color: '#EAF3FF', fontFamily: 'JetBrains Mono', fontSize: 12 },
      formatter: (params: any[]) => {
        const item = params[0];
        return `<div class="p-1"><div class="text-[10px] text-[#91A7C0]">${item.name}</div><div class="text-sm font-bold text-[#22D3EE]">${item.value} ${metricMeta.unit}</div></div>`;
      },
    },
    grid: {
      top: '15%',
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hasData ? currentSeries.timestamps : ['00:00', '00:15', '00:30', '00:45', '01:00'],
      axisLine: { lineStyle: { color: '#203750' } },
      axisLabel: { color: '#647C96', fontFamily: 'JetBrains Mono', fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: metricMeta.unit,
      nameTextStyle: { color: '#647C96', fontFamily: 'JetBrains Mono', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: '#647C96', fontFamily: 'JetBrains Mono', fontSize: 10 },
      splitLine: { lineStyle: { color: '#13243A', type: 'dashed' } },
    },
    series: [
      {
        name: metricMeta.label,
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: metricMeta.color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${metricMeta.color}40` },
              { offset: 1, color: `${metricMeta.color}00` },
            ],
          },
        },
        data: hasData ? currentSeries.values : [],
      },
    ],
  };

  return (
    <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
      {/* Header with Metric & Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#203750]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#22D3EE]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Telemetry Time-Series
          </h3>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#111E30] p-1 rounded-lg border border-[#203750]">
          {(['latency', 'jitter', 'loss', 'throughput'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMetric(m)}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase rounded-md transition-colors ${
                selectedMetric === m
                  ? 'bg-[#13243A] text-[#22D3EE] font-semibold border border-[#22D3EE]/30'
                  : 'text-[#91A7C0] hover:text-[#EAF3FF]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-[#111E30] p-1 rounded-lg border border-[#203750]">
          {(['1h', '6h', '24h', '7d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded transition-colors ${
                timeRange === r
                  ? 'bg-[#203750] text-[#EAF3FF]'
                  : 'text-[#647C96] hover:text-[#91A7C0]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas or Honest Empty State */}
      <div className="relative w-full h-72">
        {hasData ? (
          <ReactECharts
            option={option}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-[#203750] rounded-lg bg-[#091525]/50 text-center p-6 space-y-2">
            <Sliders className="w-8 h-8 text-[#647C96]/60" />
            <div className="text-xs font-mono text-[#91A7C0]">
              Telemetry Stream: Awaiting Day 2 Benchmark Ingestion
            </div>
            <p className="text-[11px] text-[#647C96] max-w-sm">
              Live automated ICMP/UDP stream metrics will populate continuously once testing targets are configured in Network Diagnostics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
