import React, { useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Filter } from 'lucide-react';

interface EventItem {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'critical' | 'success';
  source: string;
  message: string;
}

export const Alerts: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');

  const events: EventItem[] = [
    {
      id: 'EVT-9004',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      level: 'success',
      source: 'FastAPI Backend Core',
      message: 'Uvicorn server listener active on http://127.0.0.1:8000 (status: healthy).',
    },
    {
      id: 'EVT-9003',
      timestamp: new Date(Date.now() - 120000).toISOString().replace('T', ' ').substring(0, 19),
      level: 'info',
      source: 'Network Environment Enumerator',
      message: 'Passive local network interface enumeration completed with zero external port scans.',
    },
    {
      id: 'EVT-9002',
      timestamp: new Date(Date.now() - 360000).toISOString().replace('T', ' ').substring(0, 19),
      level: 'info',
      source: 'Telemetry Core',
      message: 'Health status polling initialized at 5-second sampling cadence.',
    },
    {
      id: 'EVT-9001',
      timestamp: new Date(Date.now() - 720000).toISOString().replace('T', ' ').substring(0, 19),
      level: 'info',
      source: 'System Bootloader',
      message: 'NetPulse AI application runtime initialized in Lab Environment.',
    },
  ];

  const filteredEvents = events.filter((e) => filter === 'all' || e.level === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#22D3EE]" /> Operational Event & Alert Stream
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Audit logging of subsystem state changes, connectivity transitions, and gateway health.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1 bg-[#111E30] p-1 rounded-lg border border-[#203750] text-xs font-mono">
          {(['all', 'info', 'warning', 'critical', 'success'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2.5 py-1 uppercase rounded-md text-[11px] transition-colors ${
                filter === lvl
                  ? 'bg-[#13243A] text-[#22D3EE] font-semibold border border-[#22D3EE]/30'
                  : 'text-[#91A7C0] hover:text-[#EAF3FF]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div className="overflow-x-auto rounded-lg border border-[#203750]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#111E30] text-[#91A7C0] uppercase text-[10px] tracking-wider border-b border-[#203750]">
              <tr>
                <th className="py-2.5 px-4">Event ID</th>
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Subsystem Source</th>
                <th className="py-2.5 px-4">Log Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#203750]/50">
              {filteredEvents.map((evt) => {
                const badgeStyle = {
                  info: 'bg-[#287EFF]/10 text-[#287EFF] border-[#287EFF]/30',
                  warning: 'bg-[#F5B82E]/10 text-[#F5B82E] border-[#F5B82E]/30',
                  critical: 'bg-[#FF475F]/10 text-[#FF475F] border-[#FF475F]/30',
                  success: 'bg-[#00D69A]/10 text-[#00D69A] border-[#00D69A]/30',
                }[evt.level];

                return (
                  <tr key={evt.id} className="hover:bg-[#13243A]/40 transition-colors">
                    <td className="py-3 px-4 text-[#22D3EE] font-semibold">{evt.id}</td>
                    <td className="py-3 px-4 text-[#647C96]">{evt.timestamp}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${badgeStyle}`}>
                        {evt.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#EAF3FF] font-medium">{evt.source}</td>
                    <td className="py-3 px-4 text-[#91A7C0]">{evt.message}</td>
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
