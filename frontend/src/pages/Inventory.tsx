import React from 'react';
import { Server, Cpu, HardDrive, Wifi, Shield } from 'lucide-react';
import { InventoryTable } from '../components/inventory/InventoryTable';

interface InventoryProps {
  networkEnv: any | null;
}

export const Inventory: React.FC<InventoryProps> = ({ networkEnv }) => {
  const interfaces = networkEnv?.interfaces || [];

  return (
    <div className="space-y-6">
      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase text-[#91A7C0]">Host Adapters Detected</div>
            <div className="text-2xl font-bold font-mono text-[#22D3EE] mt-1">{interfaces.length}</div>
            <div className="text-[11px] text-[#647C96] mt-0.5">Passive OS enumeration</div>
          </div>
          <div className="p-2 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE]">
            <Wifi className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase text-[#91A7C0]">Primary Interface IP</div>
            <div className="text-xl font-bold font-mono text-[#00D69A] mt-1">
              {networkEnv?.primary_ip || '127.0.0.1'}
            </div>
            <div className="text-[11px] text-[#647C96] mt-0.5">Localhost endpoint binding</div>
          </div>
          <div className="p-2 rounded-lg bg-[#00D69A]/10 text-[#00D69A]">
            <Server className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D192B] border border-[#203750] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase text-[#91A7C0]">Host Machine Name</div>
            <div className="text-lg font-bold font-mono text-[#EAF3FF] mt-1 truncate max-w-[160px]">
              {networkEnv?.hostname || 'localhost'}
            </div>
            <div className="text-[11px] text-[#647C96] mt-0.5">System hostname</div>
          </div>
          <div className="p-2 rounded-lg bg-[#287EFF]/10 text-[#287EFF]">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Endpoints Inventory Table */}
      <InventoryTable />
    </div>
  );
};
