import React, { useState, useEffect } from 'react';
import { History, Database, Search, FileText, Calendar, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchDiagnosticHistory } from '../services/api';

export const TestHistory: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadHistory = async () => {
    setIsLoading(true);
    const { records: data } = await fetchDiagnosticHistory(50);
    setRecords(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <History className="w-4 h-4 text-[#22D3EE]" /> Diagnostic Run History
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Audit trail of executed network diagnostics persisted in local SQLite datastore.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={loadHistory}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#111E30] hover:bg-[#13243A] text-[#22D3EE] border border-[#203750] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync History</span>
          </button>
          <span className="px-2 py-1 rounded bg-[#111E30] text-[#00D69A] border border-[#203750]">
            SQLITE CONNECTED
          </span>
        </div>
      </div>

      {/* History Records Table or Empty State */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750]">
        {records.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[#203750]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111E30] text-[#91A7C0] uppercase text-[10px] tracking-wider border-b border-[#203750]">
                <tr>
                  <th className="py-2.5 px-4">Run ID</th>
                  <th className="py-2.5 px-4">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4">Target Host</th>
                  <th className="py-2.5 px-4">Resolved IP</th>
                  <th className="py-2.5 px-4">Avg RTT</th>
                  <th className="py-2.5 px-4">Loss %</th>
                  <th className="py-2.5 px-4">Jitter</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#203750]/50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#13243A]/40 transition-colors">
                    <td className="py-3 px-4 text-[#22D3EE] font-semibold">{r.id}</td>
                    <td className="py-3 px-4 text-[#647C96]">{r.timestamp?.substring(0, 19).replace('T', ' ')}</td>
                    <td className="py-3 px-4 text-[#EAF3FF] font-medium">{r.target}</td>
                    <td className="py-3 px-4 text-[#91A7C0]">{r.resolved_ip || r.target}</td>
                    <td className="py-3 px-4 text-[#00D69A]">
                      {r.avg_rtt_ms !== null ? `${r.avg_rtt_ms}ms` : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={r.packet_loss_pct === 0 ? 'text-[#00D69A]' : 'text-[#FF475F]'}>
                        {r.packet_loss_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#22D3EE]">
                      {r.jitter_ms !== null ? `${r.jitter_ms}ms` : '0.0ms'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                          r.status === 'passed'
                            ? 'bg-[#00D69A]/10 text-[#00D69A] border-[#00D69A]/30'
                            : 'bg-[#FF475F]/10 text-[#FF475F] border-[#FF475F]/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
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
              Execute a real ICMP probe on the Network Diagnostics page (e.g. against 8.8.8.8 or your gateway) to record real telemetry runs here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
