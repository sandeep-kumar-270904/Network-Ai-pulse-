import React, { useState, useEffect } from 'react';
import { History, Database, RefreshCw } from 'lucide-react';
import { fetchDiagnosticHistory } from '../services/api';
import {
  formatJitterMs,
  formatLatencyMs,
  formatPercent,
  formatRelativeTime,
  formatTimestampUtc,
} from '../utils/formatters';

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
      <div className="flex items-center justify-between gap-4">
        <span className="text-[13px] font-mono text-[var(--text-secondary)]">
          {records.length} stored {records.length === 1 ? 'run' : 'runs'}
        </span>
        <button
          onClick={loadHistory}
          disabled={isLoading}
          className="h-10 flex items-center gap-2 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] text-[13px] font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-[var(--accent)] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
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
                  <th className="py-2.5 px-4 text-right">Avg RTT</th>
                  <th className="py-2.5 px-4 text-right">Loss</th>
                  <th className="py-2.5 px-4 text-right">Jitter</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#203750]/50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#13243A]/40 transition-colors">
                    <td className="py-3 px-4 text-[#22D3EE] font-semibold">{r.id}</td>
                    <td
                      className="py-3 px-4 text-[#91A7C0] whitespace-nowrap"
                      title={formatRelativeTime(r.timestamp)}
                    >
                      {formatTimestampUtc(r.timestamp)}
                    </td>
                    <td className="py-3 px-4 text-[#EAF3FF] font-medium">{r.target}</td>
                    <td className="py-3 px-4 text-[#91A7C0]">{r.resolved_ip || r.target}</td>
                    <td className="py-3 px-4 text-right text-[#00D69A]">
                      {r.status === 'passed' ? formatLatencyMs(r.avg_rtt_ms) : 'No data'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={r.packet_loss_pct === 0 ? 'text-[#00D69A]' : 'text-[#FF475F]'}>
                        {formatPercent(r.packet_loss_pct)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#22D3EE]">
                      {r.status === 'passed' && r.avg_rtt_ms !== null
                        ? formatJitterMs(r.jitter_ms)
                        : 'No data'}
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
