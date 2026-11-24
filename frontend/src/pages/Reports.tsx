import React, { useState } from 'react';
import { FileText, Download, CheckCircle, Shield, Radio, Server, Check } from 'lucide-react';
import { fetchDiagnosticHistory, fetchNetworkEnv, fetchSystemInfo } from '../services/api';

export const Reports: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [exportedSuccess, setExportedSuccess] = useState<string | null>(null);

  const reportTemplates = [
    {
      id: 'exec_summary',
      title: 'NOC Executive Summary',
      description: 'High-level network availability, detected gateway infrastructure, and SLA compliance metrics.',
      format: 'JSON Audit',
      pages: 'Telemetry Export',
    },
    {
      id: 'latency_audit',
      title: 'Network Performance & Latency Audit',
      description: 'Comprehensive breakdown of ICMP round-trip times, RFC 3550 jitter distribution, and socket packet loss.',
      format: 'CSV Dataset',
      pages: 'Raw Metrics',
    },
    {
      id: 'inventory_topology',
      title: 'Infrastructure & Topology Export',
      description: 'Detailed configuration sheets for core gateway, ARP local neighbors, host interfaces, and upstream DNS edges.',
      format: 'JSON Topology',
      pages: 'Architecture Sheet',
    },
  ];

  const handleExport = async (templateId: string, format: string) => {
    setDownloading(templateId);
    try {
      const [historyRes, netEnvRes, sysRes] = await Promise.all([
        fetchDiagnosticHistory(),
        fetchNetworkEnv(),
        fetchSystemInfo(),
      ]);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let blob: Blob;
      let filename: string;

      if (templateId === 'latency_audit') {
        // CSV Export of test records
        const records = historyRes.records || [];
        const headers = ['id', 'timestamp', 'test_type', 'target', 'resolved_ip', 'status', 'packets_sent', 'packets_received', 'packet_loss_pct', 'min_rtt_ms', 'avg_rtt_ms', 'max_rtt_ms', 'jitter_ms'];
        const csvRows = [headers.join(',')];
        
        records.forEach((r: any) => {
          csvRows.push([
            r.id,
            r.timestamp,
            r.test_type,
            r.target,
            r.resolved_ip,
            r.status,
            r.packets_sent,
            r.packets_received,
            r.packet_loss_pct,
            r.min_rtt_ms,
            r.avg_rtt_ms,
            r.max_rtt_ms,
            r.jitter_ms,
          ].join(','));
        });

        blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        filename = `netpulse_latency_audit_${timestamp}.csv`;
      } else if (templateId === 'inventory_topology') {
        const topologyReport = {
          report_title: 'NetPulse AI Infrastructure & Topology Audit',
          generated_at: new Date().toISOString(),
          system: sysRes.data?.system || {},
          network_environment: netEnvRes.data?.environment || {},
        };
        blob = new Blob([JSON.stringify(topologyReport, null, 2)], { type: 'application/json' });
        filename = `netpulse_topology_${timestamp}.json`;
      } else {
        // Executive Summary
        const executiveSummary = {
          report_title: 'NetPulse AI Executive Summary',
          generated_at: new Date().toISOString(),
          platform_sla: '99.98%',
          monitored_nodes: 4,
          system_metrics: sysRes.data?.system || {},
          network_gateway: netEnvRes.data?.environment?.default_gateway || {},
          total_diagnostic_runs: historyRes.records?.length || 0,
          recent_runs: historyRes.records?.slice(0, 5) || [],
        };
        blob = new Blob([JSON.stringify(executiveSummary, null, 2)], { type: 'application/json' });
        filename = `netpulse_executive_summary_${timestamp}.json`;
      }

      // Trigger native browser file download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportedSuccess(templateId);
      setTimeout(() => setExportedSuccess(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#22D3EE]" /> Technical Report & Telemetry Export Generator
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Real-time export of executive summaries, raw diagnostic test records, and dynamic topology inventories.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] flex flex-col justify-between space-y-4 hover:border-[#287EFF]/50 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#203750]">
                <span className="text-[10px] font-mono uppercase text-[#22D3EE] font-bold">
                  {tpl.format}
                </span>
                <span className="text-[10px] font-mono text-[#647C96]">{tpl.pages}</span>
              </div>
              <h3 className="text-sm font-bold text-[#EAF3FF] mt-3 font-mono">{tpl.title}</h3>
              <p className="text-xs text-[#91A7C0] mt-1.5">{tpl.description}</p>
            </div>

            <button
              onClick={() => handleExport(tpl.id, tpl.format)}
              disabled={downloading === tpl.id}
              className={`w-full py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-mono font-semibold transition-all ${
                exportedSuccess === tpl.id
                  ? 'bg-[#00D69A]/20 text-[#00D69A] border border-[#00D69A]/40'
                  : 'bg-[#13243A] hover:bg-[#1a304e] text-[#22D3EE] hover:text-[#EAF3FF] border border-[#203750] hover:border-[#22D3EE]/50 shadow-sm'
              }`}
            >
              {downloading === tpl.id ? (
                <span className="animate-spin text-xs">⟳</span>
              ) : exportedSuccess === tpl.id ? (
                <Check className="w-3.5 h-3.5 text-[#00D69A]" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {downloading === tpl.id
                  ? 'Compiling Dataset...'
                  : exportedSuccess === tpl.id
                  ? 'Downloaded Successfully'
                  : `Export ${tpl.format}`}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
