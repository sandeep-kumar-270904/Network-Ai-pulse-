import React from 'react';
import { Bot, Clock, Calendar, Info, Plus, Play, Pause } from 'lucide-react';

export const Automation: React.FC = () => {
  const schedules = [
    {
      id: 'sched-1',
      name: 'Continuous Gateway Pulse',
      target: '192.168.1.1',
      cron: '*/5 * * * *',
      frequency: 'Every 5 minutes',
      status: 'Planned',
      type: 'ICMP Keepalive',
    },
    {
      id: 'sched-2',
      name: 'Core Switch Path Sweep',
      target: '192.168.1.2',
      cron: '0 * * * *',
      frequency: 'Hourly',
      status: 'Planned',
      type: 'Traceroute Path Audit',
    },
    {
      id: 'sched-3',
      name: 'Off-Peak Bandwidth Assessment',
      target: '192.168.1.200',
      cron: '0 2 * * *',
      frequency: 'Daily at 02:00 UTC',
      status: 'Planned',
      type: 'TCP Bandwidth',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Day 5 Milestone Banner */}
      <div className="p-4 rounded-xl bg-[#111E30] border border-[#287EFF]/40 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#287EFF]/10 text-[#287EFF] flex-shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Day 5 Milestone: Test Automation & Cron Orchestration
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#203750] text-[#22D3EE] uppercase">
              In Development
            </span>
          </div>
          <p className="text-xs text-[#91A7C0] mt-1">
            Automated test scheduling, periodic network regression triggers, and multi-endpoint orchestration routines will be activated during the Day 5 automation milestone.
          </p>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#22D3EE]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Scheduled Network Automations
            </h3>
          </div>
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#13243A] text-[#647C96] border border-[#203750] text-xs font-mono cursor-not-allowed opacity-60"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Automation (Day 5)</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#203750]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#111E30] text-[#91A7C0] uppercase text-[10px] tracking-wider border-b border-[#203750]">
              <tr>
                <th className="py-2.5 px-4">Routine Label</th>
                <th className="py-2.5 px-4">Test Class</th>
                <th className="py-2.5 px-4">Target Node</th>
                <th className="py-2.5 px-4">Cron / Interval</th>
                <th className="py-2.5 px-4">Milestone Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#203750]/50">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-[#13243A]/40 transition-colors">
                  <td className="py-3 px-4 text-[#EAF3FF] font-medium">{s.name}</td>
                  <td className="py-3 px-4 text-[#91A7C0]">{s.type}</td>
                  <td className="py-3 px-4 text-[#22D3EE]">{s.target}</td>
                  <td className="py-3 px-4 text-[#647C96]">
                    <span>{s.frequency}</span>{' '}
                    <span className="text-[10px] text-[#91A7C0]">({s.cron})</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#111E30] text-[#647C96] border border-[#203750]">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
