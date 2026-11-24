import React from 'react';
import { BrainCircuit, Info, Cpu, Database, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AIAnalysis: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Machine Learning Engine Architecture Banner */}
      <div className="p-4 rounded-xl bg-[#111E30] border border-[#287EFF]/40 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#287EFF]/10 text-[#287EFF] flex-shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Unsupervised Telemetry Anomaly Detection Engine
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#203750] text-[#22D3EE] uppercase font-semibold">
              Scikit-Learn Pipeline
            </span>
          </div>
          <p className="text-xs text-[#91A7C0] mt-1">
            Machine learning anomaly scoring using Scikit-learn (Isolation Forest & Local Outlier Factor) trained directly on time-series latency, jitter distributions, and packet drop variance. Zero synthetic predictions—grounded purely in verified telemetry.
          </p>
        </div>
      </div>

      {/* Model Architecture Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#22D3EE]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              1. Feature Extraction
            </h4>
          </div>
          <p className="text-xs text-[#91A7C0]">
            Transforms raw time-series latency, jitter distributions, packet retransmission rates, and bufferbloat metrics into multi-dimensional tensor arrays.
          </p>
          <div className="p-2.5 rounded bg-[#111E30] border border-[#203750] text-[11px] font-mono text-[#647C96]">
            Target Dimensions: 12 Metrics
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#287EFF]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              2. Isolation Forest
            </h4>
          </div>
          <p className="text-xs text-[#91A7C0]">
            Unsupervised tree-based anomaly partitioning detects subtle route degradation, queuing spikes, and asymmetrical path anomalies before complete outages occur.
          </p>
          <div className="p-2.5 rounded bg-[#111E30] border border-[#203750] text-[11px] font-mono text-[#647C96]">
            Contamination Factor: 0.05
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00D69A]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              3. Root Cause Classification
            </h4>
          </div>
          <p className="text-xs text-[#91A7C0]">
            Maps flagged outlier clusters to operational classes: Bufferbloat, Physical Interface Flapping, DNS Resolver Latency, or Upstream Congestion.
          </p>
          <div className="p-2.5 rounded bg-[#111E30] border border-[#203750] text-[11px] font-mono text-[#647C96]">
            Confidence Scoring: 0 - 100%
          </div>
        </div>
      </div>
    </div>
  );
};
