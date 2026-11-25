import React, { useState, useEffect } from 'react';
import { BrainCircuit, Play, RefreshCw, AlertTriangle, CheckCircle2, Cpu } from 'lucide-react';
import { runAiAnomalyScan, executePingDiagnostic } from '../services/api';

export const AIAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);

  const handleScan = async () => {
    setLoading(true);
    const { analysis: res } = await runAiAnomalyScan();
    setAnalysis(res);
    setLoading(false);
  };

  const handleQuickBaselineAndScan = async () => {
    setSeeding(true);
    await executePingDiagnostic('192.168.1.1', 3);
    await executePingDiagnostic('1.1.1.1', 3);
    await executePingDiagnostic('8.8.8.8', 3);
    setSeeding(false);
    await handleScan();
  };

  useEffect(() => {
    handleScan();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleScan}
          disabled={loading || seeding}
          className="h-10 flex items-center gap-2 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{loading ? 'Scoring dataset…' : 'Run anomaly scan'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
          <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
            <div className="text-[10px] text-[#91A7C0] uppercase">Active Algorithm</div>
            <div className="text-sm font-bold text-[#22D3EE] mt-1 truncate">{analysis.model}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
            <div className="text-[10px] text-[#91A7C0] uppercase">Samples Analyzed</div>
            <div className="text-2xl font-bold text-[#EAF3FF] mt-1">{analysis.samples_analyzed}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
            <div className="text-[10px] text-[#91A7C0] uppercase">Anomalies Flagged</div>
            <div className={`text-2xl font-bold mt-1 ${analysis.anomalies_found > 0 ? 'text-[#F5B82E]' : 'text-[#00D69A]'}`}>
              {analysis.anomalies_found}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
            <div className="text-[10px] text-[#91A7C0] uppercase">Baseline Mean RTT</div>
            <div className="text-2xl font-bold text-[#00D69A] mt-1">
              {analysis.baseline_mean_rtt_ms !== undefined ? `${analysis.baseline_mean_rtt_ms}ms` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Insufficient samples prompt */}
      {analysis?.status === 'need_more_samples' && (
        <div className="p-6 rounded-xl bg-[#0D192B] border border-dashed border-[#287EFF]/40 text-center space-y-3 font-mono">
          <Cpu className="w-8 h-8 text-[#22D3EE] mx-auto" />
          <div className="text-xs text-[#EAF3FF]">{analysis.message}</div>
          <button
            onClick={handleQuickBaselineAndScan}
            disabled={seeding}
            className="px-4 py-2 rounded-lg bg-[#287EFF] text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            {seeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{seeding ? 'Running 3 Real Baseline Pings...' : 'Run 3 Real Baseline Pings & Score Now'}</span>
          </button>
        </div>
      )}

      {/* Anomaly Results Table */}
      {analysis?.results?.length > 0 && (
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Scored Telemetry Samples ({analysis.results.length})
          </h4>
          <div className="overflow-x-auto rounded-lg border border-[#203750]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111E30] text-[#91A7C0] uppercase text-[10px] tracking-wider border-b border-[#203750]">
                <tr>
                  <th className="py-2.5 px-4">Target</th>
                  <th className="py-2.5 px-4">Avg RTT</th>
                  <th className="py-2.5 px-4">Jitter</th>
                  <th className="py-2.5 px-4">Loss</th>
                  <th className="py-2.5 px-4">ML Score</th>
                  <th className="py-2.5 px-4">Classification</th>
                  <th className="py-2.5 px-4">Diagnostic Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#203750]/50">
                {analysis.results.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[#13243A]/40">
                    <td className="py-2.5 px-4 text-[#22D3EE]">{item.target}</td>
                    <td className="py-2.5 px-4 text-[#EAF3FF]">{item.avg_rtt_ms} ms</td>
                    <td className="py-2.5 px-4 text-[#91A7C0]">{item.jitter_ms} ms</td>
                    <td className="py-2.5 px-4 text-[#91A7C0]">{item.packet_loss_pct}%</td>
                    <td className="py-2.5 px-4 text-[#647C96]">{item.anomaly_score}</td>
                    <td className="py-2.5 px-4">
                      {item.classification === 'anomaly' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FF475F]/15 text-[#FF475F] border border-[#FF475F]/30 text-[10px] uppercase">
                          <AlertTriangle className="w-3 h-3" /> ANOMALY
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#00D69A]/15 text-[#00D69A] border border-[#00D69A]/30 text-[10px] uppercase">
                          <CheckCircle2 className="w-3 h-3" /> NORMAL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#91A7C0] text-[11px]">{item.reason}</td>
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
