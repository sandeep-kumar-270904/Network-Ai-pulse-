import React from 'react';
import { BarChart3, TrendingUp, Clock, Sliders, Activity } from 'lucide-react';

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#22D3EE]" /> Performance Analytics & Percentiles
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Statistical summaries, SLA compliance trends, latency jitter percentiles, and capacity forecasting.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-[#111E30] text-[#22D3EE] border border-[#203750]">
            P99 / P95 / P50 ENGINE
          </span>
        </div>
      </div>

      {/* SLA & Percentiles Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
          <div className="text-xs font-mono uppercase text-[#91A7C0]">P50 Median Latency</div>
          <div className="text-2xl font-bold font-mono text-[#00D69A] mt-1">0.8 ms</div>
          <div className="text-[11px] text-[#647C96] mt-0.5">Core Gateway baseline</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
          <div className="text-xs font-mono uppercase text-[#91A7C0]">P95 Tail Latency</div>
          <div className="text-2xl font-bold font-mono text-[#22D3EE] mt-1">1.4 ms</div>
          <div className="text-[11px] text-[#647C96] mt-0.5">Target threshold &lt; 5.0ms</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
          <div className="text-xs font-mono uppercase text-[#91A7C0]">P99 Worst Case</div>
          <div className="text-2xl font-bold font-mono text-[#F5B82E] mt-1">2.1 ms</div>
          <div className="text-[11px] text-[#647C96] mt-0.5">Zero packet drops</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
          <div className="text-xs font-mono uppercase text-[#91A7C0]">Overall Uptime SLA</div>
          <div className="text-2xl font-bold font-mono text-[#287EFF] mt-1">99.98%</div>
          <div className="text-[11px] text-[#647C96] mt-0.5">Target: 99.90%</div>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-[#0D192B] border border-[#203750] text-center space-y-2">
        <div className="text-xs font-mono text-[#EAF3FF] font-semibold">
          Trend Accumulation in Progress
        </div>
        <p className="text-[11px] text-[#647C96] max-w-md mx-auto">
          Longitudinal performance distributions and heatmaps will continuously aggregate from real diagnostic sessions stored in the local SQLite engine.
        </p>
      </div>
    </div>
  );
};
