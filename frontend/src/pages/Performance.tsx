import React, { useState } from 'react';
import { Zap, Play, CheckCircle2, RefreshCw, Sliders } from 'lucide-react';
import { executePerformanceBenchmark } from '../services/api';

export const Performance: React.FC = () => {
  const [testType, setTestType] = useState<'throughput_tcp' | 'jitter_udp' | 'mtu_sweep'>('throughput_tcp');
  const [target, setTarget] = useState('127.0.0.1');
  const [duration, setDuration] = useState(3);
  const [streams, setStreams] = useState(4);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    const { data, error: errMsg } = await executePerformanceBenchmark(testType, target, duration, streams);
    setIsRunning(false);
    if (errMsg) {
      setError(errMsg);
    } else {
      setResult(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F5B82E]" /> Performance Benchmark Setup
            </h3>
            <span className="text-[10px] font-mono text-[#00D69A]">ACTIVE ENGINE</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#91A7C0] mb-1 font-mono">Benchmark Category</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'throughput_tcp', label: 'TCP Streams', defaultTarget: '127.0.0.1' },
                  { id: 'jitter_udp', label: 'Jitter Burst (12x)', defaultTarget: '1.1.1.1' },
                  { id: 'mtu_sweep', label: 'Path MTU Sweep', defaultTarget: '8.8.8.8' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTestType(item.id as any);
                      if (item.id === 'throughput_tcp') setTarget('127.0.0.1');
                      else if (target === '127.0.0.1') setTarget(item.defaultTarget);
                    }}
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

            <div>
              <label className="block text-[#91A7C0] mb-1 font-mono">Target Host</label>
              <div className="flex gap-2 mb-1.5">
                {['127.0.0.1', '192.168.1.1', '1.1.1.1', '8.8.8.8'].map((ip) => (
                  <button
                    key={ip}
                    type="button"
                    onClick={() => setTarget(ip)}
                    className={`px-2 py-1 rounded border font-mono text-[10px] ${
                      target === ip
                        ? 'bg-[#13243A] text-[#22D3EE] border-[#22D3EE]/50'
                        : 'bg-[#111E30] text-[#91A7C0] border-[#203750]'
                    }`}
                  >
                    {ip}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="127.0.0.1 or 1.1.1.1"
                className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
              />
            </div>

            {testType === 'throughput_tcp' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#91A7C0] mb-1 font-mono">Duration (1-8s)</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#91A7C0] mb-1 font-mono">Parallel Streams (1-8)</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={streams}
                    onChange={(e) => setStreams(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className="w-full py-2.5 px-4 rounded-lg bg-[#287EFF] hover:bg-[#168BFF] text-white flex items-center justify-center gap-2 font-mono text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#22D3EE]" />
                    <span>Executing Benchmark...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Live Benchmark</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Real Benchmark Output */}
        <div className="p-5 rounded-xl bg-[#080E19] border border-[#203750] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <span className="text-[#91A7C0] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#287EFF]" /> Benchmark Telemetry Results
            </span>
            <span className="text-[10px] text-[#22D3EE]">
              {isRunning ? 'RUNNING' : result ? 'COMPLETED' : 'READY'}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FF475F]/10 border border-[#FF475F]/30 text-[#FF475F] text-[11px]">
              {error}
            </div>
          )}

          {!result && !error && (
            <div className="p-6 text-center text-[#647C96] text-[11px] border border-dashed border-[#203750] rounded-lg">
              Select a benchmark category above and click <strong>Run Live Benchmark</strong> to measure real socket throughput, jitter stability, or Path MTU.
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#111E30] border border-[#00D69A]/30 text-[#00D69A] text-[11px]">
                {result.details}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                {result.throughput_mbps !== undefined && result.throughput_mbps !== null && (
                  <div className="p-3 rounded-lg bg-[#0D192B] border border-[#203750]">
                    <span className="text-[10px] text-[#647C96] block">TCP THROUGHPUT</span>
                    <span className="text-lg font-bold text-[#00D69A]">{result.throughput_mbps} Mbps</span>
                  </div>
                )}

                {result.connections_per_sec !== undefined && (
                  <div className="p-3 rounded-lg bg-[#0D192B] border border-[#203750]">
                    <span className="text-[10px] text-[#647C96] block">HANDSHAKE RATE</span>
                    <span className="text-lg font-bold text-[#22D3EE]">{result.connections_per_sec} conn/s</span>
                  </div>
                )}

                {result.discovered_mtu !== undefined && (
                  <div className="p-3 rounded-lg bg-[#0D192B] border border-[#203750]">
                    <span className="text-[10px] text-[#647C96] block">PATH MTU</span>
                    <span className="text-lg font-bold text-[#22D3EE]">{result.discovered_mtu ?? 'N/A'} B</span>
                  </div>
                )}

                {result.avg_rtt_ms !== undefined && result.avg_rtt_ms !== null && (
                  <div className="p-3 rounded-lg bg-[#0D192B] border border-[#203750]">
                    <span className="text-[10px] text-[#647C96] block">AVG LATENCY</span>
                    <span className="text-lg font-bold text-[#EAF3FF]">{result.avg_rtt_ms} ms</span>
                  </div>
                )}

                {result.p95_rtt_ms !== undefined && result.p95_rtt_ms !== null && (
                  <div className="p-3 rounded-lg bg-[#0D192B] border border-[#203750]">
                    <span className="text-[10px] text-[#647C96] block">P95 TAIL</span>
                    <span className="text-lg font-bold text-[#F5B82E]">{result.p95_rtt_ms} ms</span>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-[#0D192B] border border-[#203750]">
                  <span className="text-[10px] text-[#647C96] block">JITTER</span>
                  <span className="text-lg font-bold text-[#22D3EE]">{result.jitter_ms ?? 0} ms</span>
                </div>

                <div className="p-3 rounded-lg bg-[#0D192B] border border-[#203750]">
                  <span className="text-[10px] text-[#647C96] block">DURATION</span>
                  <span className="text-lg font-bold text-[#91A7C0]">{result.duration_sec}s</span>
                </div>
              </div>

              {result.steps && (
                <div className="space-y-1 text-[11px]">
                  <div className="text-[#91A7C0] font-semibold">DF-Bit MTU Probe Log:</div>
                  {result.steps.map((s: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-1.5 rounded bg-[#0D192B]">
                      <span>Payload {s.payload_bytes}B (MTU {s.mtu_bytes}B)</span>
                      <span className={s.passed ? 'text-[#00D69A]' : 'text-[#FF475F]'}>
                        {s.passed ? 'UNFRAGMENTED OK' : 'FRAGMENTED / DROP'}
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
