import React from 'react';
import { Server, Database, Activity, CheckCircle2, AlertTriangle, XCircle, HardDrive, Cpu } from 'lucide-react';
import { HealthResponse } from '../../types';

interface StatusPanelProps {
  health: HealthResponse | null;
  system: any | null;
  networkEnv: any | null;
  backendOnline: boolean;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  health,
  system,
  networkEnv,
  backendOnline,
}) => {
  const sysInfo = system?.system || health?.system;
  const memoryPercent = sysInfo?.memory_used_percent ?? null;
  const interfaceCount = networkEnv?.interfaces?.length ?? 0;

  return (
    <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#22D3EE]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Platform Subsystems
          </h3>
        </div>
        <span
          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
            backendOnline
              ? 'bg-[#00D69A]/10 text-[#00D69A] border border-[#00D69A]/30'
              : 'bg-[#FF475F]/10 text-[#FF475F] border border-[#FF475F]/30'
          }`}
        >
          {backendOnline ? 'Nominal' : 'Gateway Offline'}
        </span>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-[#111E30] border border-[#203750] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#287EFF]" />
            <span className="text-[#91A7C0]">REST Core</span>
          </div>
          <span className="font-mono text-[11px] text-[#00D69A] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> OK
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#111E30] border border-[#203750] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#91A7C0]" />
            <span className="text-[#91A7C0]">Persistence</span>
          </div>
          <span className="font-mono text-[11px] text-[#91A7C0]">
            In-Memory
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#111E30] border border-[#203750] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="text-[#91A7C0]">CPU Cores</span>
          </div>
          <span className="font-mono text-[11px] text-[#EAF3FF]">
            {sysInfo?.cpu_count_logical ? `${sysInfo.cpu_count_logical} Logical` : '—'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#111E30] border border-[#203750] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-[#F5B82E]" />
            <span className="text-[#91A7C0]">Host Memory</span>
          </div>
          <span className="font-mono text-[11px] text-[#EAF3FF]">
            {memoryPercent !== null ? `${memoryPercent}% Used` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Node / Interface context */}
      <div className="pt-2 border-t border-[#203750]/60 flex items-center justify-between text-[11px] font-mono text-[#647C96]">
        <span>Host: {sysInfo?.hostname || 'localhost'}</span>
        <span>Passive Adapters: {interfaceCount}</span>
      </div>
    </div>
  );
};
