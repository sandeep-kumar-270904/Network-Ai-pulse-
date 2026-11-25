import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { BarChart3, RefreshCw, Play } from 'lucide-react';
import { fetchAnalyticsSummary, executePingDiagnostic } from '../services/api';

export const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    const { analytics: data } = await fetchAnalyticsSummary(100);
    setAnalytics(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleRunBaseline = async () => {
    setSeeding(true);
    await executePingDiagnostic('192.168.1.1', 3);
    await executePingDiagnostic('1.1.1.1', 3);
    setSeeding(false);
    await loadAnalytics();
  };

  const hasChart = analytics?.series?.timestamps?.length > 0;

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#091525',
      borderColor: '#203750',
      textStyle: { color: '#EAF3FF', fontFamily: 'JetBrains Mono', fontSize: 11 },
    },
    legend: {
      data: ['Avg RTT (ms)', 'Jitter (ms)'],
      textStyle: { color: '#91A7C0', fontFamily: 'JetBrains Mono', fontSize: 11 },
    },
    grid: { top: '18%', left: '4%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: analytics?.series?.timestamps || [],
      axisLine: { lineStyle: { color: '#203750' } },
      axisLabel: { color: '#647C96', fontFamily: 'JetBrains Mono', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'ms',
      nameTextStyle: { color: '#647C96', fontFamily: 'JetBrains Mono', fontSize: 10 },
      axisLabel: { color: '#647C96', fontFamily: 'JetBrains Mono', fontSize: 10 },
      splitLine: { lineStyle: { color: '#13243A', type: 'dashed' } },
    },
    series: [
      {
        name: 'Avg RTT (ms)',
        type: 'line',
        smooth: true,
        data: analytics?.series?.latency || [],
        lineStyle: { color: '#22D3EE', width: 2 },
        itemStyle: { color: '#22D3EE' },
      },
      {
        name: 'Jitter (ms)',
        type: 'bar',
        data: analytics?.series?.jitter || [],
        itemStyle: { color: '#287EFF80', borderRadius: [3, 3, 0, 0] },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[13px] font-mono text-[var(--text-secondary)]">
          {analytics?.total_tests ?? 0} recorded samples
        </span>
        <button
          onClick={loadAnalytics}
          className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center gap-2 text-[13px]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Percentile KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
          <div className="text-xs font-mono uppercase text-[#91A7C0]">P50 Median Latency</div>
          <div className="text-2xl font-bold font-mono text-[#00D69A] mt-1">
            {analytics?.p50_ms !== null && analytics?.p50_ms !== undefined ? `${analytics.p50_ms} ms` : '—'}
          </div>
          <div className="text-[11px] text-[#647C96] mt-0.5">50th percentile RTT across probes</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
          <div className="text-xs font-mono uppercase text-[#91A7C0]">P95 Tail Latency</div>
          <div className="text-2xl font-bold font-mono text-[#22D3EE] mt-1">
            {analytics?.p95_ms !== null && analytics?.p95_ms !== undefined ? `${analytics.p95_ms} ms` : '—'}
          </div>
          <div className="text-[11px] text-[#647C96] mt-0.5">95% of tests complete faster</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
          <div className="text-xs font-mono uppercase text-[#91A7C0]">P99 Worst Case</div>
          <div className="text-2xl font-bold font-mono text-[#F5B82E] mt-1">
            {analytics?.p99_ms !== null && analytics?.p99_ms !== undefined ? `${analytics.p99_ms} ms` : '—'}
          </div>
          <div className="text-[11px] text-[#647C96] mt-0.5">Avg Jitter: {analytics?.avg_jitter_ms ?? 0} ms</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
          <div className="text-xs font-mono uppercase text-[#91A7C0]">Measured Pass Rate</div>
          <div className="text-2xl font-bold font-mono text-[#287EFF] mt-1">
            {analytics?.success_rate_pct ?? 100}%
          </div>
          <div className="text-[11px] text-[#647C96] mt-0.5">Avg Loss: {analytics?.avg_loss_pct ?? 0}%</div>
        </div>
      </div>

      {/* Longitudinal Trend Chart */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-3">
        <div className="flex items-center justify-between border-b border-[#203750] pb-2">
          <span className="text-xs font-mono font-bold uppercase text-[#EAF3FF]">
            RTT Latency & Jitter Distribution Over Time
          </span>
          <span className="text-[10px] font-mono text-[#22D3EE]">APACHE ECHARTS</span>
        </div>

        {hasChart ? (
          <div className="h-72 w-full">
            <ReactECharts option={chartOption} style={{ width: '100%', height: '100%' }} />
          </div>
        ) : (
          <div className="p-8 text-center space-y-3 font-mono border border-dashed border-[#203750] rounded-lg">
            <div className="text-xs text-[#91A7C0]">No diagnostic tests recorded in SQLite yet.</div>
            <button
              onClick={handleRunBaseline}
              disabled={seeding}
              className="px-4 py-2 rounded-lg bg-[#287EFF] text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              {seeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Run Quick Gateway + DNS Baseline</span>
            </button>
          </div>
        )}
      </div>

      {/* Per-Target Breakdown Table */}
      {analytics?.per_target?.length > 0 && (
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Target-Level Telemetry Breakdown
          </h3>
          <div className="overflow-x-auto rounded-lg border border-[#203750]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111E30] text-[#91A7C0] uppercase text-[10px] tracking-wider border-b border-[#203750]">
                <tr>
                  <th className="py-2.5 px-4">Target Endpoint</th>
                  <th className="py-2.5 px-4">Total Runs</th>
                  <th className="py-2.5 px-4">Average RTT</th>
                  <th className="py-2.5 px-4">Average Jitter</th>
                  <th className="py-2.5 px-4">Average Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#203750]/50">
                {analytics.per_target.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#13243A]/40">
                    <td className="py-2.5 px-4 text-[#22D3EE] font-semibold">{row.target}</td>
                    <td className="py-2.5 px-4 text-[#EAF3FF]">{row.runs}</td>
                    <td className="py-2.5 px-4 text-[#00D69A]">{row.avg_rtt_ms ?? 'N/A'} ms</td>
                    <td className="py-2.5 px-4 text-[#91A7C0]">{row.avg_jitter_ms} ms</td>
                    <td className="py-2.5 px-4 text-[#91A7C0]">{row.avg_loss_pct}%</td>
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
