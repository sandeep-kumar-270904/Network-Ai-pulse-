import React from 'react';
import { Network, Server, Router, Radio, Shield, Info } from 'lucide-react';
import { TopologyGraph } from '../components/topology/TopologyGraph';

export const Topology: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <Network className="w-4 h-4 text-[#22D3EE]" /> Interactive Network Topology
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Real-time visual mapping of edge gateways, aggregation switches, core servers, and test probes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-[#111E30] text-[#00D69A] border border-[#203750]">
            6 NODES
          </span>
          <span className="px-2 py-1 rounded bg-[#111E30] text-[#22D3EE] border border-[#203750]">
            5 EDGES
          </span>
        </div>
      </div>

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
