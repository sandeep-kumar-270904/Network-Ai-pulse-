import React, { useState } from 'react';
import { History, Database, Search, FileText, Calendar } from 'lucide-react';
import { TestExecutionRecord } from '../types';

export const TestHistory: React.FC = () => {
  const [records] = useState<TestExecutionRecord[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <History className="w-4 h-4 text-[#22D3EE]" /> Diagnostic Run History
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Audit trial of executed network diagnostics, throughput runs, and automated cron sweeps.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-[#111E30] text-[#91A7C0] border border-[#203750]">
            SQLITE PERSISTENCE
          </span>
        </div>
      </div>

      {/* History Records Table or Honest Empty State */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750]">
        {records.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[#203750]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111E30] text-[#91A7C0] uppercase text-[10px] tracking-wider border-b border-[#203750]">
                <tr>
                  <th className="py-2.5 px-4">Run ID</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Target</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#203750]/50">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4 text-[#22D3EE]">{r.id}</td>
                    <td className="py-3 px-4 text-[#647C96]">{r.timestamp}</td>
                    <td className="py-3 px-4 text-[#EAF3FF]">{r.testType}</td>
                    <td className="py-3 px-4 text-[#91A7C0]">{r.target}</td>
                    <td className="py-3 px-4">{r.status}</td>
                    <td className="py-3 px-4 text-[#91A7C0]">{r.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 rounded-xl bg-[#111E30] text-[#647C96]">
              <Database className="w-8 h-8" />
            </div>
            <div className="text-xs font-mono text-[#EAF3FF] font-semibold">
              No Diagnostic Records in Datastore
            </div>
            <p className="text-[11px] text-[#647C96] max-w-sm">
              All test executions triggered during Day 2 (ICMP/Traceroute) and Day 3 (Throughput) will automatically persist with full metric logs here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
