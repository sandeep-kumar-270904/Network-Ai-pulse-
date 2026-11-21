import React, { useState } from 'react';
import { Zap, Play, Info, Sliders, Activity, Clock } from 'lucide-react';

export const Performance: React.FC = () => {
  const [testType, setTestType] = useState<'throughput_tcp' | 'jitter_udp' | 'mtu_sweep'>('throughput_tcp');
  const [target, setTarget] = useState('192.168.1.1');
  const [duration, setDuration] = useState(10);
  const [streams, setStreams] = useState(4);

  return (
    <div className="space-y-6">
      {/* Day 3 Milestone Banner */}
      <div className="p-4 rounded-xl bg-[#111E30] border border-[#287EFF]/40 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#287EFF]/10 text-[#287EFF] flex-shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Day 3 Milestone: High-Throughput Performance Engine
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#203750] text-[#22D3EE] uppercase">
              In Development
            </span>
          </div>
          <p className="text-xs text-[#91A7C0] mt-1">
            Multi-stream TCP throughput testing, UDP jitter benchmarks, and path MTU discovery are staged for Day 3 implementation. Execution engines remain paused until verification tests are deployed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F5B82E]" /> Performance Benchmark Setup
            </h3>
            <span className="text-[10px] font-mono text-[#647C96]">BENCH-V3</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Benchmark Type */}
            <div>
              <label className="block text-[#91A7C0] mb-1 font-mono">Benchmark Category</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'throughput_tcp', label: 'TCP Throughput' },
                  { id: 'jitter_udp', label: 'UDP Jitter' },
                  { id: 'mtu_sweep', label: 'MTU Sweep' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTestType(item.id as any)}
                    className={`py-2 px-2.5 rounded-lg border font-mono text-center text-xs transition-colors ${
                      testType === item.id
                        ? 'bg-[#13243A] text-[#22D3EE] border-[#22D3EE]/50 font-bold'
                        : 'bg-[#111E30] text-[#91A7C0] border-[#203750] hover:text-[#EAF3FF]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Node */}
            <div>
              <label className="block text-[#91A7C0] mb-1 font-mono">Target Host</label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
              />
            </div>

            {/* Duration and Streams */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Duration (Seconds)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Parallel Streams</label>
                <input
                  type="number"
                  value={streams}
                  onChange={(e) => setStreams(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>
            </div>

            {/* Execution Trigger (Disabled) */}
            <div className="pt-4">
              <button
                disabled
                className="w-full py-2.5 px-4 rounded-lg bg-[#13243A] text-[#647C96] border border-[#203750] flex items-center justify-center gap-2 cursor-not-allowed text-xs font-mono"
              >
                <Play className="w-4 h-4 opacity-40" />
                <span>Start Benchmark Run (Day 3 Milestone)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Benchmark Profile Specs */}
        <div className="p-5 rounded-xl bg-[#080E19] border border-[#203750] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <span className="text-[#91A7C0] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#287EFF]" /> Benchmark Parameters
            </span>
            <span className="text-[10px] text-[#647C96]">SYNCHRONOUS SPEC</span>
          </div>

          <div className="space-y-2 text-[11px] text-[#91A7C0]">
            <div className="flex justify-between p-2 rounded bg-[#0D192B]">
              <span className="text-[#647C96]">Active Mode:</span>
              <span className="text-[#22D3EE] uppercase font-bold">{testType}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#0D192B]">
              <span className="text-[#647C96]">Target Host:</span>
              <span className="text-[#EAF3FF]">{target}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#0D192B]">
              <span className="text-[#647C96]">Stream Concurrency:</span>
              <span className="text-[#EAF3FF]">{streams} simultaneous TCP threads</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#0D192B]">
              <span className="text-[#647C96]">Execution Time:</span>
              <span className="text-[#EAF3FF]">{duration} seconds</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#111E30] border border-[#203750] text-[#647C96] text-[11px]">
            Notice: No synthetic results are generated. Metrics will strictly originate from socket packet round-trip benchmarks upon Day 3 activation.
          </div>
        </div>
      </div>
    </div>
  );
};
