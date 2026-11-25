import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Zap,
  Play,
  RefreshCw,
  Sliders,
  Square,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { executePerformanceBenchmark } from '../services/api';
import { StatusChip } from '../components/ui/StatusChip';
import { TextInput } from '../components/ui/TextInput';
import { ErrorState } from '../components/ui/ErrorState';
import { AccessibleChartFrame } from '../components/charts/AccessibleChartFrame';
import { useToast } from '../components/ui/Toast';
import { useDemoMode } from '../contexts/DemoModeContext';
import {
  formatJitterMs,
  formatLatencyMs,
  formatThroughputMbps,
  formatTimestampUtc,
} from '../utils/formatters';

type BenchmarkCategory = 'throughput_tcp' | 'jitter_udp' | 'mtu_sweep';

interface StoredRun {
  timestamp: string;
  target: string;
  testType: BenchmarkCategory;
  data: any;
}

interface PerformanceProps {
  theme?: 'dark' | 'light';
}

const PREV_RUNS_STORAGE_KEY = 'netpulse_perf_runs_v1';

const CATEGORY_META: Record<
  BenchmarkCategory,
  {
    label: string;
    defaultTarget: string;
    summary: string;
    example: {
      headlineMetric: string;
      headlineLabel: string;
      secondaryMetric: string;
      secondaryLabel: string;
      tertiaryMetric: string;
      tertiaryLabel: string;
      seriesLabels: string[];
      seriesValues: number[];
      seriesUnit: string;
    };
  }
> = {
  throughput_tcp: {
    label: 'TCP streams',
    defaultTarget: '127.0.0.1',
    summary: 'Multi-stream socket saturation test measuring sustained bandwidth & handshake latency.',
    example: {
      headlineMetric: '842.6 Mbps',
      headlineLabel: 'Example TCP throughput',
      secondaryMetric: '1.24 ms',
      secondaryLabel: 'Example avg RTT',
      tertiaryMetric: '0.18 ms',
      tertiaryLabel: 'Example jitter',
      seriesLabels: ['0.5s', '1.0s', '1.5s', '2.0s', '2.5s', '3.0s'],
      seriesValues: [790, 835, 848, 860, 844, 842],
      seriesUnit: 'Mbps',
    },
  },
  jitter_udp: {
    label: 'Jitter burst (12x)',
    defaultTarget: '1.1.1.1',
    summary: 'Rapid 12-probe packet burst quantifying delay variation (jitter) and tail latency (P95).',
    example: {
      headlineMetric: '0.42 ms',
      headlineLabel: 'Example jitter',
      secondaryMetric: '14.20 ms',
      secondaryLabel: 'Example avg RTT',
      tertiaryMetric: '16.90 ms',
      tertiaryLabel: 'Example P95 RTT',
      seriesLabels: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'],
      seriesValues: [13.8, 14.1, 14.9, 13.9, 14.4, 14.2],
      seriesUnit: 'ms',
    },
  },
  mtu_sweep: {
    label: 'Path MTU sweep',
    defaultTarget: '8.8.8.8',
    summary: 'Don’t-Fragment payload sweep discovering the largest unfragmented packet size along the route.',
    example: {
      headlineMetric: '1500 B',
      headlineLabel: 'Example Path MTU',
      secondaryMetric: '18.50 ms',
      secondaryLabel: 'Example avg RTT',
      tertiaryMetric: '0.35 ms',
      tertiaryLabel: 'Example jitter',
      seriesLabels: ['1280B', '1400B', '1472B', '1500B'],
      seriesValues: [1, 1, 1, 1],
      seriesUnit: 'pass',
    },
  },
};

const readCssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
};

const renderDeltaBadge = (
  current: number | null | undefined,
  previous: number | null | undefined,
  unit: string,
  higherIsBetter: boolean
) => {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    Number.isNaN(current) ||
    Number.isNaN(previous)
  ) {
    return null;
  }
  const diff = current - previous;
  const absDiff = Math.abs(diff);
  if (absDiff < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-mono text-[var(--text-muted)]">
        <Minus className="w-3 h-3" aria-hidden="true" />
        <span>0 {unit} vs prev</span>
      </span>
    );
  }
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const sign = diff > 0 ? '+' : '';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-mono ${
        improved ? 'text-[var(--ok)]' : 'text-[var(--warn)]'
      }`}
    >
      {diff > 0 ? (
        <TrendingUp className="w-3 h-3" aria-hidden="true" />
      ) : (
        <TrendingDown className="w-3 h-3" aria-hidden="true" />
      )}
      <span>
        {sign}
        {diff.toFixed(diff >= 10 || diff <= -10 ? 1 : 2)} {unit} vs prev
      </span>
    </span>
  );
};

export const Performance: React.FC<PerformanceProps> = ({ theme = 'dark' }) => {
  const { addToast } = useToast();
  const { maskHost, maskText } = useDemoMode();

  const [testType, setTestType] = useState<BenchmarkCategory>('throughput_tcp');
  const [target, setTarget] = useState('127.0.0.1');
  const [duration, setDuration] = useState(3);
  const [streams, setStreams] = useState(4);

  const [isRunning, setIsRunning] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveProgressPoints, setLiveProgressPoints] = useState<Array<{ label: string; value: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  const [historyByCategory, setHistoryByCategory] = useState<
    Record<BenchmarkCategory, { current: StoredRun | null; previous: StoredRun | null }>
  >(() => {
    const empty: Record<BenchmarkCategory, { current: StoredRun | null; previous: StoredRun | null }> = {
      throughput_tcp: { current: null, previous: null },
      jitter_udp: { current: null, previous: null },
      mtu_sweep: { current: null, previous: null },
    };
    try {
      const raw = window.localStorage.getItem(PREV_RUNS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...empty, ...parsed };
      }
    } catch {
      // Ignore storage error
    }
    return empty;
  });

  const abortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, []);

  const currentRun = historyByCategory[testType]?.current || null;
  const previousRun = historyByCategory[testType]?.previous || null;
  const result = currentRun?.data || null;
  const prevResult = previousRun?.data || null;

  const targetInvalid = !target.trim();
  const durationInvalid = testType === 'throughput_tcp' && (!Number.isFinite(duration) || duration < 1 || duration > 8);
  const streamsInvalid = testType === 'throughput_tcp' && (!Number.isFinite(streams) || streams < 1 || streams > 8);

  const handleCancel = () => {
    if (!isRunning) return;
    abortRef.current?.abort();
    abortRef.current = null;
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setIsRunning(false);
    setProgressPct(0);
    setError('Benchmark cancelled by operator.');
    addToast({ tone: 'info', title: 'Synthetic test cancelled' });
  };

  const handleRun = async () => {
    if (targetInvalid || durationInvalid || streamsInvalid || isRunning) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const expectedMs = (testType === 'throughput_tcp' ? duration : 2.5) * 1000;
    const started = performance.now();

    setIsRunning(true);
    setError(null);
    setProgressPct(6);
    setElapsedSec(0);
    setLiveProgressPoints([{ label: '0.0s', value: 6 }]);

    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - started;
      const pct = Math.min(95, Math.max(8, Math.round((elapsed / expectedMs) * 92)));
      setElapsedSec(Number((elapsed / 1000).toFixed(1)));
      setProgressPct(pct);
      setLiveProgressPoints((prev) =>
        [...prev, { label: `${(elapsed / 1000).toFixed(1)}s`, value: pct }].slice(-16)
      );
    }, 220);

    const { data, error: errMsg, cancelled } = await executePerformanceBenchmark(
      testType,
      target.trim(),
      duration,
      streams,
      controller.signal
    );

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setIsRunning(false);

    if (cancelled) return;
    if (errMsg || !data) {
      setProgressPct(0);
      setError(errMsg || 'Benchmark execution failed');
      addToast({ tone: 'danger', title: 'Benchmark failed', description: errMsg || undefined });
      return;
    }

    setProgressPct(100);
    const nextRun: StoredRun = {
      timestamp: new Date().toISOString(),
      target: target.trim(),
      testType,
      data,
    };

    setHistoryByCategory((prev) => {
      const catState = prev[testType] || { current: null, previous: null };
      const updated = {
        ...prev,
        [testType]: {
          previous: catState.current,
          current: nextRun,
        },
      };
      try {
        window.localStorage.setItem(PREV_RUNS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }
      return updated;
    });

    addToast({
      tone: 'ok',
      title: `${CATEGORY_META[testType].label} completed`,
      description: data.details || undefined,
    });
  };

  // ECharts option depending on state: Running progress chart vs Result vs Example preview
  const chartOption = useMemo(() => {
    const textMuted = readCssVar('--text-muted', '#8a98ad');
    const border = readCssVar('--border', 'rgba(148,163,184,0.2)');
    const accent = readCssVar('--accent', '#38bdf8');
    const ok = readCssVar('--ok', '#10b981');
    const warn = readCssVar('--warn', '#f59e0b');
    const danger = readCssVar('--danger', '#ef4444');

    if (isRunning) {
      return {
        animation: false,
        grid: { left: 40, right: 16, top: 20, bottom: 26 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: liveProgressPoints.map((p) => p.label),
          axisLabel: { color: textMuted, fontSize: 11 },
          axisLine: { lineStyle: { color: border } },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { color: textMuted, fontSize: 11, formatter: '{value}%' },
          splitLine: { lineStyle: { color: border, type: 'dashed' } },
        },
        series: [
          {
            name: 'Execution progress',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            data: liveProgressPoints.map((p) => p.value),
            lineStyle: { color: accent, width: 2.5 },
            itemStyle: { color: accent },
            areaStyle: { color: accent, opacity: 0.14 },
          },
        ],
      };
    }

    if (result) {
      if (testType === 'mtu_sweep' && Array.isArray(result.steps)) {
        return {
          grid: { left: 48, right: 16, top: 24, bottom: 28 },
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: result.steps.map((s: any) => `${s.mtu_bytes}B`),
            axisLabel: { color: textMuted, fontSize: 11 },
            axisLine: { lineStyle: { color: border } },
          },
          yAxis: {
            type: 'value',
            min: 0,
            max: 1,
            interval: 1,
            axisLabel: {
              color: textMuted,
              fontSize: 11,
              formatter: (v: number) => (v === 1 ? 'OK' : 'Drop'),
            },
            splitLine: { lineStyle: { color: border, type: 'dashed' } },
          },
          series: [
            {
              name: 'MTU probe',
              type: 'bar',
              barMaxWidth: 28,
              data: result.steps.map((s: any) => ({
                value: s.passed ? 1 : 0.15,
                itemStyle: { color: s.passed ? ok : danger, borderRadius: [4, 4, 0, 0] },
              })),
            },
          ],
        };
      }

      // Compare Current vs Previous metrics bar chart
      const metrics: Array<{ name: string; curr: number; prev: number | null }> = [];
      if (result.throughput_mbps !== undefined && result.throughput_mbps !== null) {
        metrics.push({
          name: 'Mbps',
          curr: Number(result.throughput_mbps),
          prev: prevResult?.throughput_mbps ?? null,
        });
      }
      if (result.avg_rtt_ms !== undefined && result.avg_rtt_ms !== null) {
        metrics.push({
          name: 'Avg RTT (ms)',
          curr: Number(result.avg_rtt_ms),
          prev: prevResult?.avg_rtt_ms ?? null,
        });
      }
      if (result.p95_rtt_ms !== undefined && result.p95_rtt_ms !== null) {
        metrics.push({
          name: 'P95 RTT (ms)',
          curr: Number(result.p95_rtt_ms),
          prev: prevResult?.p95_rtt_ms ?? null,
        });
      }
      if (result.jitter_ms !== undefined && result.jitter_ms !== null) {
        metrics.push({
          name: 'Jitter (ms)',
          curr: Number(result.jitter_ms),
          prev: prevResult?.jitter_ms ?? null,
        });
      }

      const series: any[] = [
        {
          name: 'Current run',
          type: 'bar',
          barMaxWidth: 28,
          data: metrics.map((m) => m.curr),
          itemStyle: { color: accent, borderRadius: [4, 4, 0, 0] },
        },
      ];
      if (prevResult) {
        series.push({
          name: 'Previous run',
          type: 'bar',
          barMaxWidth: 28,
          data: metrics.map((m) => m.prev ?? 0),
          itemStyle: { color: warn, opacity: 0.75, borderRadius: [4, 4, 0, 0] },
        });
      }

      return {
        grid: { left: 48, right: 16, top: 28, bottom: 28 },
        tooltip: { trigger: 'axis' },
        legend: prevResult ? { top: 0, textStyle: { color: textMuted, fontSize: 11 } } : undefined,
        xAxis: {
          type: 'category',
          data: metrics.map((m) => m.name),
          axisLabel: { color: textMuted, fontSize: 11 },
          axisLine: { lineStyle: { color: border } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textMuted, fontSize: 11 },
          splitLine: { lineStyle: { color: border, type: 'dashed' } },
        },
        series,
      };
    }

    // Example Preview Chart for Empty State
    const ex = CATEGORY_META[testType].example;
    return {
      grid: { left: 44, right: 14, top: 16, bottom: 24 },
      xAxis: {
        type: 'category',
        data: ex.seriesLabels,
        axisLabel: { color: textMuted, fontSize: 11 },
        axisLine: { lineStyle: { color: border } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textMuted, fontSize: 11 },
        splitLine: { lineStyle: { color: border, type: 'dashed' } },
      },
      series: [
        {
          name: 'Example preview',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: ex.seriesValues,
          lineStyle: { color: textMuted, width: 2, type: 'dashed' },
          areaStyle: { color: accent, opacity: 0.08 },
        },
      ],
    };
  }, [isRunning, liveProgressPoints, result, prevResult, testType, theme]);

  const catExample = CATEGORY_META[testType].example;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Benchmark Configuration */}
        <div className="lg:col-span-5 p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <h3 className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--warn)]" aria-hidden="true" />
              <span>Synthetic benchmark setup</span>
            </h3>
            <StatusChip size="sm" tone="ok" label="Socket engine" />
          </div>

          <div className="space-y-4 text-[13px]">
            <div>
              <span className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
                Benchmark category
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['throughput_tcp', 'jitter_udp', 'mtu_sweep'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    disabled={isRunning}
                    onClick={() => {
                      setTestType(cat);
                      setError(null);
                      setTarget(CATEGORY_META[cat].defaultTarget);
                    }}
                    className={`h-10 px-2 rounded-[var(--radius-control)] border text-center text-[12px] transition-colors ${
                      testType === cat
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 font-semibold'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {CATEGORY_META[cat].label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-[var(--text-muted)] mt-1.5">
                {CATEGORY_META[testType].summary}
              </p>
            </div>

            <div>
              <label htmlFor="perf-target" className="block text-[13px] font-medium text-[var(--text)] mb-1.5">
                Target host
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['127.0.0.1', '192.168.1.1', '1.1.1.1', '8.8.8.8'].map((ip) => (
                  <button
                    key={ip}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setTarget(ip)}
                    className={`h-8 px-2.5 rounded-[var(--radius-control)] border font-mono text-[12px] transition-colors ${
                      target === ip
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 font-semibold'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {maskHost(ip)}
                  </button>
                ))}
              </div>
              <TextInput
                id="perf-target"
                disabled={isRunning}
                value={target}
                invalid={targetInvalid}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="127.0.0.1 or 1.1.1.1"
                mono
              />
              {targetInvalid && (
                <p className="text-[12px] text-[var(--danger)] mt-1">Target host is required.</p>
              )}
            </div>

            {testType === 'throughput_tcp' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="perf-duration" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                    Duration (1–8s)
                  </label>
                  <TextInput
                    id="perf-duration"
                    type="number"
                    min={1}
                    max={8}
                    mono
                    disabled={isRunning}
                    invalid={durationInvalid}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label htmlFor="perf-streams" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                    Parallel streams (1–8)
                  </label>
                  <TextInput
                    id="perf-streams"
                    type="number"
                    min={1}
                    max={8}
                    mono
                    disabled={isRunning}
                    invalid={streamsInvalid}
                    value={streams}
                    onChange={(e) => setStreams(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={targetInvalid || durationInvalid || streamsInvalid}
                  className="w-full h-11 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] flex items-center justify-center gap-2 text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>{result ? 'Re-run & compare benchmark' : 'Run live benchmark'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full h-11 px-4 rounded-[var(--radius-control)] bg-[var(--danger-soft)] hover:bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/40 flex items-center justify-center gap-2 text-[14px] font-semibold transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Cancel benchmark ({elapsedSec.toFixed(1)}s)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Results, Empty Example State, Live Chart & Previous Comparison */}
        <div className="lg:col-span-7 p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
            <span className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span>Synthetic test telemetry</span>
            </span>
            <StatusChip
              size="sm"
              tone={isRunning ? 'warn' : error ? 'danger' : result ? 'ok' : 'neutral'}
              label={
                isRunning
                  ? `Running · ${progressPct}%`
                  : error
                  ? 'Error'
                  : result
                  ? 'Completed'
                  : 'Example preview'
              }
              pulseWhenLiveOrDegraded={isRunning}
            />
          </div>

          {error && (
            <ErrorState
              title="Synthetic benchmark failed"
              message={error}
              why="The socket benchmark could not reach the target host or the gateway timed out."
              howToFix="Verify target reachability in Diagnostics and confirm the gateway is running, then click Retry."
              onRetry={handleRun}
              retrying={isRunning}
            />
          )}

          {/* LIVE RUNNING PROGRESS + REAL-TIME CHART */}
          {isRunning && (
            <div className="space-y-4">
              <div className="p-4 rounded-[var(--radius-control)] bg-[var(--accent-soft)] border border-[var(--accent)]/35 space-y-2.5">
                <div className="flex items-center justify-between text-[13px] font-medium text-[var(--accent)]">
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>
                      Executing {CATEGORY_META[testType].label} against {maskHost(target)}…
                    </span>
                  </span>
                  <span className="font-mono np-mono-val">
                    {progressPct}% · {elapsedSec.toFixed(1)}s
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-200"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="rounded-[var(--radius-control)] bg-[var(--bg)] border border-[var(--border)] p-3">
                <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  Live execution progress curve
                </div>
                <ReactECharts option={chartOption} style={{ height: '190px', width: '100%' }} />
              </div>
            </div>
          )}

          {/* DESIGNED EMPTY STATE WITH EXAMPLE RESULT */}
          {!isRunning && !result && !error && (
            <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-2)]/70 border border-dashed border-[var(--border-strong)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                  <h4 className="text-[14px] font-semibold text-[var(--text)]">
                    Example benchmark result ({CATEGORY_META[testType].label})
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-1)] border border-[var(--border)] text-[12px] font-mono text-[var(--text-muted)]">
                  Illustrative sample
                </span>
              </div>

              <p className="text-[13px] text-[var(--text-secondary)]">
                No benchmark has been executed yet in this category. Below is a reference layout showing the metrics and comparison chart produced by a real run.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 opacity-85 np-mono-val">
                <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)]">
                  <span className="text-[12px] text-[var(--text-muted)] block">{catExample.headlineLabel}</span>
                  <span className="text-[18px] font-semibold font-mono text-[var(--text)]">
                    {catExample.headlineMetric}
                  </span>
                </div>
                <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)]">
                  <span className="text-[12px] text-[var(--text-muted)] block">{catExample.secondaryLabel}</span>
                  <span className="text-[18px] font-semibold font-mono text-[var(--text)]">
                    {catExample.secondaryMetric}
                  </span>
                </div>
                <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)]">
                  <span className="text-[12px] text-[var(--text-muted)] block">{catExample.tertiaryLabel}</span>
                  <span className="text-[18px] font-semibold font-mono text-[var(--text)]">
                    {catExample.tertiaryMetric}
                  </span>
                </div>
              </div>

              <div className="rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)] p-3">
                <ReactECharts option={chartOption} style={{ height: '160px', width: '100%' }} />
              </div>
            </div>
          )}

          {/* LIVE COMPLETED RESULT + COMPARISON WITH PREVIOUS RUN */}
          {!isRunning && result && (
            <div className="space-y-4">
              {result.details && (
                <div className="p-3 rounded-[var(--radius-control)] bg-[var(--ok-soft)] border border-[var(--ok)]/30 text-[var(--ok)] text-[12px] font-mono flex flex-wrap items-center justify-between gap-2">
                  <span>{maskText(result.details)}</span>
                  {currentRun && (
                    <span className="text-[var(--text-secondary)]">
                      {formatTimestampUtc(currentRun.timestamp)}
                    </span>
                  )}
                </div>
              )}

              {/* Comparison Banner */}
              <div className="px-3.5 py-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="font-medium text-[var(--text)]">
                  {previousRun
                    ? `Comparing against previous ${CATEGORY_META[testType].label} run (${formatTimestampUtc(previousRun.timestamp)})`
                    : 'Baseline run captured — re-run to compare deltas against this baseline.'}
                </span>
                {previousRun && (
                  <span className="font-mono text-[var(--text-muted)]">
                    Prev target: {maskHost(previousRun.target)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center np-mono-val">
                {result.throughput_mbps !== undefined && result.throughput_mbps !== null && (
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                    <span className="text-[12px] text-[var(--text-secondary)] block">TCP throughput</span>
                    <span className="text-[18px] font-semibold font-mono text-[var(--ok)] block">
                      {formatThroughputMbps(result.throughput_mbps)}
                    </span>
                    {renderDeltaBadge(result.throughput_mbps, prevResult?.throughput_mbps, 'Mbps', true)}
                  </div>
                )}

                {result.connections_per_sec !== undefined && (
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                    <span className="text-[12px] text-[var(--text-secondary)] block">Handshake rate</span>
                    <span className="text-[18px] font-semibold font-mono text-[var(--accent)] block">
                      {result.connections_per_sec} conn/s
                    </span>
                    {renderDeltaBadge(result.connections_per_sec, prevResult?.connections_per_sec, 'conn/s', true)}
                  </div>
                )}

                {result.discovered_mtu !== undefined && (
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                    <span className="text-[12px] text-[var(--text-secondary)] block">Path MTU</span>
                    <span className="text-[18px] font-semibold font-mono text-[var(--accent)] block">
                      {result.discovered_mtu ?? 'No data'} B
                    </span>
                    {renderDeltaBadge(result.discovered_mtu, prevResult?.discovered_mtu, 'B', true)}
                  </div>
                )}

                {result.avg_rtt_ms !== undefined && (
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                    <span className="text-[12px] text-[var(--text-secondary)] block">Avg latency</span>
                    <span className="text-[18px] font-semibold font-mono text-[var(--text)] block">
                      {formatLatencyMs(result.avg_rtt_ms)}
                    </span>
                    {renderDeltaBadge(result.avg_rtt_ms, prevResult?.avg_rtt_ms, 'ms', false)}
                  </div>
                )}

                {result.p95_rtt_ms !== undefined && (
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                    <span className="text-[12px] text-[var(--text-secondary)] block">P95 latency</span>
                    <span className="text-[18px] font-semibold font-mono text-[var(--warn)] block">
                      {formatLatencyMs(result.p95_rtt_ms)}
                    </span>
                    {renderDeltaBadge(result.p95_rtt_ms, prevResult?.p95_rtt_ms, 'ms', false)}
                  </div>
                )}

                <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                  <span className="text-[12px] text-[var(--text-secondary)] block">Jitter</span>
                  <span className="text-[18px] font-semibold font-mono text-[var(--accent)] block">
                    {formatJitterMs(result.jitter_ms)}
                  </span>
                  {renderDeltaBadge(result.jitter_ms, prevResult?.jitter_ms, 'ms', false)}
                </div>

                <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                  <span className="text-[12px] text-[var(--text-secondary)] block">Duration</span>
                  <span className="text-[18px] font-semibold font-mono text-[var(--text)] block">
                    {result.duration_sec !== undefined && result.duration_sec !== null
                      ? `${Number(result.duration_sec).toFixed(1)} s`
                      : 'No data'}
                  </span>
                </div>
              </div>

              <div className="rounded-[var(--radius-control)] bg-[var(--bg)] border border-[var(--border)] p-3">
                <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  {prevResult ? 'Current vs previous run metrics' : 'Measured benchmark profile'}
                </div>
                <AccessibleChartFrame
                  title={`Synthetic benchmark profile (${CATEGORY_META[testType].label})`}
                  summary={maskText(result.details || `${CATEGORY_META[testType].label} metrics for ${maskHost(target)}.`)}
                  columns={[
                    { key: 'metric', label: 'Metric' },
                    { key: 'current', label: 'Current run', align: 'right' },
                    { key: 'previous', label: 'Previous run', align: 'right' },
                  ]}
                  rows={[
                    ...(result.throughput_mbps !== undefined
                      ? [
                          {
                            metric: 'TCP throughput',
                            current: formatThroughputMbps(result.throughput_mbps),
                            previous: prevResult?.throughput_mbps
                              ? formatThroughputMbps(prevResult.throughput_mbps)
                              : 'No data',
                          },
                        ]
                      : []),
                    ...(result.avg_rtt_ms !== undefined
                      ? [
                          {
                            metric: 'Avg latency',
                            current: formatLatencyMs(result.avg_rtt_ms),
                            previous: prevResult?.avg_rtt_ms
                              ? formatLatencyMs(prevResult.avg_rtt_ms)
                              : 'No data',
                          },
                        ]
                      : []),
                    {
                      metric: 'Jitter',
                      current: formatJitterMs(result.jitter_ms),
                      previous: prevResult?.jitter_ms ? formatJitterMs(prevResult.jitter_ms) : 'No data',
                    },
                  ]}
                >
                  <ReactECharts option={chartOption} style={{ height: '210px', width: '100%' }} />
                </AccessibleChartFrame>
              </div>

              {result.steps && (
                <div className="space-y-1.5 text-[12px] font-mono">
                  <div className="text-[var(--text-secondary)] font-sans font-semibold">DF-bit MTU probe log</div>
                  {result.steps.map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between p-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]"
                    >
                      <span className="text-[var(--text)]">
                        Payload {s.payload_bytes}B (MTU {s.mtu_bytes}B)
                      </span>
                      <span className={s.passed ? 'text-[var(--ok)]' : 'text-[var(--danger)]'}>
                        {s.passed ? 'Unfragmented OK' : 'Fragmented / drop'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
