import React from 'react';
import { Server, Wifi, Shield, CheckCircle2 } from 'lucide-react';
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

      {/* Detected Host Physical & Virtual Network Adapters */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#203750]">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#22D3EE]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Host Physical & Virtual Adapters ({interfaces.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111E30] text-[#00D69A] border border-[#203750] text-[10px] font-mono">
            <Shield className="w-3 h-3" />
            <span>Passive Discovery — Zero External Port Scans</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#203750]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#111E30] text-[#91A7C0] uppercase text-[10px] tracking-wider border-b border-[#203750]">
              <tr>
                <th className="py-2.5 px-4">Interface Adapter</th>
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-4">IPv4 Address</th>
                <th className="py-2.5 px-4">Netmask</th>
                <th className="py-2.5 px-4">MAC Address</th>
                <th className="py-2.5 px-4">Link Speed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#203750]/50">
              {interfaces.map((iface: any, idx: number) => {
                const ipv4 = iface.ipv4_addresses?.[0]?.address || iface.ipv4?.[0]?.address || '—';
                const mask = iface.ipv4_addresses?.[0]?.netmask || iface.ipv4?.[0]?.netmask || '—';
                return (
                  <tr key={idx} className="hover:bg-[#13243A]/40 transition-colors">
                    <td className="py-3 px-4 text-[#EAF3FF] font-medium">{iface.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                          iface.is_up
                            ? 'bg-[#00D69A]/10 text-[#00D69A] border-[#00D69A]/30'
                            : 'bg-[#647C96]/10 text-[#647C96] border-[#203750]'
                        }`}
                      >
                        {iface.is_up ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#22D3EE]">{ipv4}</td>
                    <td className="py-3 px-4 text-[#91A7C0]">{mask}</td>
                    <td className="py-3 px-4 text-[#647C96]">{iface.mac_address || 'N/A'}</td>
                    <td className="py-3 px-4 text-[#91A7C0]">
                      {iface.speed_mbps ? `${iface.speed_mbps} Mbps` : 'Auto'}
                    </td>
                  </tr>
                );
              })}
              {interfaces.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-[#647C96]">
                    Connecting to local network environment...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
