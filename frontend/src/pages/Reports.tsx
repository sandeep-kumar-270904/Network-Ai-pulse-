import React from 'react';
import { FileText, Download, Printer, CheckCircle, Shield, Info } from 'lucide-react';

export const Reports: React.FC = () => {
  const reportTemplates = [
    {
      title: 'NOC Executive Summary',
      description: 'High-level network availability, incident summary, and monthly SLA compliance metrics.',
      format: 'PDF / HTML',
      pages: '2 Pages',
    },
    {
      title: 'Network Performance & Latency Audit',
      description: 'Comprehensive breakdown of round-trip times, jitter distribution, and hop-by-hop traceroute paths.',
      format: 'PDF / CSV',
      pages: '8 Pages',
    },
    {
      title: 'Infrastructure Inventory & Topology Export',
      description: 'Detailed configuration sheets for monitored gateways, switches, probe endpoints, and host interfaces.',
      format: 'JSON / PDF',
      pages: '4 Pages',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#22D3EE]" /> Technical Report Generator
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Automated export of executive summaries, engineering audits, and SLA verification sheets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTemplates.map((tpl, i) => (
          <div
            key={i}
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
              disabled
              className="w-full py-2 px-3 rounded-lg bg-[#13243A] text-[#647C96] border border-[#203750] flex items-center justify-center gap-2 cursor-not-allowed text-xs font-mono opacity-70"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate (Day 7 Milestone)</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
