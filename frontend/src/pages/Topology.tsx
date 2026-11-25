import React from 'react';
import { Network, Server, Router, Radio, Shield, Info } from 'lucide-react';
import { TopologyGraph } from '../components/topology/TopologyGraph';

export const Topology: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
        <TopologyGraph />
      </div>

      {/* Topology Legend & Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-3 rounded-lg bg-[#111E30] border border-[#203750] flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#22D3EE]" />
          <div>
            <div className="text-[#EAF3FF] font-semibold">Core Gateway</div>
            <div className="text-[10px] text-[#647C96]">L3 Edge Router</div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#111E30] border border-[#203750] flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#287EFF]" />
          <div>
            <div className="text-[#EAF3FF] font-semibold">Distribution Switch</div>
            <div className="text-[10px] text-[#647C96]">L2 Switching Fabric</div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#111E30] border border-[#203750] flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#00D69A]" />
          <div>
            <div className="text-[#EAF3FF] font-semibold">FastAPI Backend</div>
            <div className="text-[10px] text-[#647C96]">127.0.0.1:8000 Core</div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#111E30] border border-[#203750] flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#F5B82E]" />
          <div>
            <div className="text-[#EAF3FF] font-semibold">Probe Endpoint</div>
            <div className="text-[10px] text-[#647C96]">Telemetry Sensor</div>
          </div>
        </div>
      </div>
    </div>
  );
};
