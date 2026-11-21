import React from 'react';
import { Cpu, Server, HardDrive, Shield, Wifi, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface SystemInfoProps {
  system: any | null;
  networkEnv: any | null;
  backendOnline: boolean;
}

export const SystemInfoPage: React.FC<SystemInfoProps> = ({
  system,
  networkEnv,
  backendOnline,
}) => {
  const sys = system?.system || {};
  const app = system?.application || {};
  const interfaces = networkEnv?.interfaces || [];

  const memoryTotalGb = sys?.memory_total_bytes
    ? (sys.memory_total_bytes / (1024 * 1024 * 1024)).toFixed(2)
    : 'N/A';
  const memoryAvailGb = sys?.memory_available_bytes
    ? (sys.memory_available_bytes / (1024 * 1024 * 1024)).toFixed(2)
    : 'N/A';
  const memoryUsedPercent = sys?.memory_used_percent ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#22D3EE]" /> Host Platform & System Information
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Genuine host hardware specs, Python environment, memory diagnostics, and network adapters.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
              backendOnline
                ? 'bg-[#00D69A]/10 text-[#00D69A] border-[#00D69A]/30'
                : 'bg-[#FF475F]/10 text-[#FF475F] border-[#FF475F]/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-[#00D69A]' : 'bg-[#FF475F]'}`}
            />
            {backendOnline ? 'CORE ONLINE' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Host Specifications & Memory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardware & OS Specs */}
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-[#287EFF]" /> Compute & Operating System
            </h3>
            <span className="text-[10px] font-mono text-[#647C96]">SYS-METRICS</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#203750]/40">
              <span className="text-[#91A7C0]">Operating System</span>
              <span className="text-[#EAF3FF] font-semibold">{sys.os || 'Windows'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#203750]/40">
              <span className="text-[#91A7C0]">OS Release / Build</span>
              <span className="text-[#EAF3FF]">{sys.os_release || 'N/A'} ({sys.os_version?.substring(0, 16) || 'N/A'})</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#203750]/40">
              <span className="text-[#91A7C0]">CPU Architecture</span>
              <span className="text-[#22D3EE]">{sys.architecture || 'AMD64'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#203750]/40">
              <span className="text-[#91A7C0]">Logical CPU Cores</span>
              <span className="text-[#EAF3FF] font-semibold">{sys.cpu_count_logical || '—'} Cores</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#203750]/40">
              <span className="text-[#91A7C0]">Physical CPU Cores</span>
              <span className="text-[#EAF3FF]">{sys.cpu_count_physical || '—'} Cores</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#91A7C0]">Processor Identity</span>
              <span className="text-[#EAF3FF] truncate max-w-[240px]">{sys.processor || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Python Runtime & Memory Specs */}
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#F5B82E]" /> Memory & Python Environment
            </h3>
            <span className="text-[10px] font-mono text-[#647C96]">VMEM</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#91A7C0]">Host Memory Utilization</span>
                <span className="text-[#EAF3FF] font-bold">
                  {memoryUsedPercent !== null ? `${memoryUsedPercent}%` : 'N/A'}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#111E30] overflow-hidden border border-[#203750]">
                <div
                  className="h-full bg-gradient-to-r from-[#22D3EE] to-[#287EFF] rounded-full transition-all duration-500"
                  style={{ width: `${memoryUsedPercent || 0}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between py-1 border-b border-[#203750]/40">
              <span className="text-[#91A7C0]">Total Physical RAM</span>
              <span className="text-[#EAF3FF]">{memoryTotalGb} GB</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#203750]/40">
              <span className="text-[#91A7C0]">Available Free RAM</span>
              <span className="text-[#00D69A]">{memoryAvailGb} GB</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#203750]/40">
              <span className="text-[#91A7C0]">Python Runtime</span>
              <span className="text-[#22D3EE] truncate max-w-[240px]">
                {sys.python_version?.split(' ')[0] || 'Python 3.12+'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-[#91A7C0]">FastAPI OpenAPI Docs</span>
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="text-[#287EFF] hover:underline"
              >
                /docs
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Network Environment Adapters */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#203750]">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#22D3EE]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Local Network Environment Adapters ({interfaces.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111E30] text-[#00D69A] border border-[#203750] text-[10px] font-mono">
            <Shield className="w-3 h-3" />
            <span>Passive Local Enumeration — Zero External Scans</span>
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
                <th className="py-2.5 px-4">MAC Hardware ID</th>
                <th className="py-2.5 px-4">Link Speed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#203750]/50">
              {interfaces.map((iface: any, idx: number) => {
                const ipv4 = iface.ipv4_addresses?.[0]?.address || '—';
                const mask = iface.ipv4_addresses?.[0]?.netmask || '—';
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
