import React, { useState } from 'react';
import { Activity, ShieldAlert, Play, Terminal, HelpCircle, CheckCircle, Info } from 'lucide-react';
import { DiagnosticTargetForm } from '../types';

export const Diagnostics: React.FC = () => {
  const [form, setForm] = useState<DiagnosticTargetForm>({
    target: '192.168.1.1',
    protocol: 'ICMP',
    packetSize: 64,
    count: 4,
    intervalMs: 1000,
    timeoutSeconds: 5,
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTargetChange = (val: string) => {
    setForm({ ...form, target: val });
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hostPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!val) {
      setValidationError('Target destination is required.');
    } else if (!ipPattern.test(val) && !hostPattern.test(val) && val !== 'localhost') {
      setValidationError('Enter a valid IPv4 address (e.g. 192.168.1.1) or hostname (e.g. gateway.local)');
    } else {
      setValidationError(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Day 2 Milestone Banner */}
      <div className="p-4 rounded-xl bg-[#111E30] border border-[#287EFF]/40 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#287EFF]/10 text-[#287EFF] flex-shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Day 2 Milestone: Network Diagnostics Engine
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#203750] text-[#22D3EE] uppercase">
              In Development
            </span>
          </div>
          <p className="text-xs text-[#91A7C0] mt-1">
            Raw ICMP packet generators, high-resolution socket traceroute, and active UDP jitter measurement tools are staged here. Per Day 1 safety rules, packet dispatch engines are disabled until the Day 2 execution milestone.
          </p>
        </div>
      </div>

      {/* Diagnostic Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#22D3EE]" /> Diagnostic Profile Configuration
            </h3>
            <span className="text-[10px] font-mono text-[#647C96]">PROBE-CFG-V1</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Target Address */}
            <div>
              <label className="block text-[#91A7C0] mb-1 font-mono">Target Hostname or IP</label>
              <input
                type="text"
                value={form.target}
                onChange={(e) => handleTargetChange(e.target.value)}
                placeholder="192.168.1.1 or gateway.local"
                className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
              />
              {validationError && (
                <p className="text-[11px] text-[#FF475F] mt-1 font-mono">{validationError}</p>
              )}
            </div>

            {/* Protocol */}
            <div className="grid grid-cols-3 gap-2">
              {(['ICMP', 'TCP', 'UDP'] as const).map((proto) => (
                <button
                  key={proto}
                  type="button"
                  onClick={() => setForm({ ...form, protocol: proto })}
                  className={`py-2 px-3 rounded-lg border font-mono text-xs transition-colors ${
                    form.protocol === proto
                      ? 'bg-[#13243A] text-[#22D3EE] border-[#22D3EE]/50 font-bold'
                      : 'bg-[#111E30] text-[#91A7C0] border-[#203750] hover:text-[#EAF3FF]'
                  }`}
                >
                  {proto}
                </button>
              ))}
            </div>

            {/* Diagnostic Parameters */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Packet Size (Bytes)</label>
                <input
                  type="number"
                  value={form.packetSize}
                  onChange={(e) => setForm({ ...form, packetSize: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Probe Count</label>
                <input
                  type="number"
                  value={form.count}
                  onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Interval (ms)</label>
                <input
                  type="number"
                  value={form.intervalMs}
                  onChange={(e) => setForm({ ...form, intervalMs: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Timeout (s)</label>
                <input
                  type="number"
                  value={form.timeoutSeconds}
                  onChange={(e) => setForm({ ...form, timeoutSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>
            </div>

            {/* Disabled Action Button with Honest State */}
            <div className="pt-4">
              <button
                disabled
                className="w-full py-2.5 px-4 rounded-lg bg-[#13243A] text-[#647C96] border border-[#203750] flex items-center justify-center gap-2 cursor-not-allowed text-xs font-mono"
              >
                <Play className="w-4 h-4 opacity-40" />
                <span>Execute Diagnostic Probe (Day 2 Milestone)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry Console / Output Staging */}
        <div className="p-5 rounded-xl bg-[#080E19] border border-[#203750] flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
              <span className="flex items-center gap-2 text-[#91A7C0]">
                <Terminal className="w-4 h-4 text-[#287EFF]" /> Diagnostic Terminal
              </span>
              <span className="text-[10px] text-[#647C96]">AWAITING DISPATCH</span>
            </div>
            <div className="py-4 space-y-2 text-[#647C96] text-[11px]">
              <p className="text-[#91A7C0]">$ netpulse-cli diag --target {form.target} --proto {form.protocol} --size {form.packetSize}</p>
              <p>[INFO] Target configuration validated.</p>
              <p>[INFO] Socket raw transmitter: Staged for Day 2 activation.</p>
              <p className="text-[#22D3EE]">[STANDBY] Ready for active measurement dispatch once scheduled.</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0D192B] border border-[#203750] text-[11px] text-[#91A7C0]">
            Target Address: <span className="text-[#EAF3FF]">{form.target}</span> | Protocol: <span className="text-[#22D3EE]">{form.protocol}</span> | Packet: {form.packetSize}B
          </div>
        </div>
      </div>
    </div>
  );
};
