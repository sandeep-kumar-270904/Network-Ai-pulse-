import React, { useState } from 'react';
import { Activity, Play, Terminal, CheckCircle2, AlertCircle, RefreshCw, Globe, Server, Radio } from 'lucide-react';
import { DiagnosticTargetForm } from '../types';
import { executePingDiagnostic, PingResultPayload } from '../services/api';

export const Diagnostics: React.FC = () => {
  const [form, setForm] = useState<DiagnosticTargetForm>({
    target: '8.8.8.8',
    protocol: 'ICMP',
    packetSize: 32,
    count: 4,
    intervalMs: 1000,
    timeoutSeconds: 2,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<PingResultPayload | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '$ netpulse-engine --status ready',
    '[INFO] Real socket ICMP transmitter initialized.',
    '[READY] Select a target IP/domain or choose a quick preset below to transmit real packets.',
  ]);

  const handleTargetChange = (val: string) => {
    setForm({ ...form, target: val });
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hostPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!val) {
      setValidationError('Target destination is required.');
    } else if (!ipPattern.test(val) && !hostPattern.test(val) && val !== 'localhost') {
      setValidationError('Enter a valid IPv4 address (e.g. 8.8.8.8) or hostname (e.g. google.com)');
    } else {
      setValidationError(null);
    }
  };

  const handleQuickPreset = (preset: string) => {
    setForm((prev) => ({ ...prev, target: preset }));
    setValidationError(null);
  };

  const handleExecute = async () => {
    if (validationError || !form.target) return;

    setIsRunning(true);
    const newLogs = [
      `$ netpulse-cli probe --target ${form.target} --proto ICMP --size ${form.packetSize}B --count ${form.count}`,
      `[DISPATCH] Transmitting ${form.count} ICMP Echo Request packets to ${form.target}...`,
    ];
    setTerminalLogs(newLogs);

    const { data, error } = await executePingDiagnostic(
      form.target,
      form.count,
      form.packetSize,
      form.timeoutSeconds * 1000
    );

    setIsRunning(false);

    if (error || !data) {
      setTerminalLogs((prev) => [
        ...prev,
        `[ERROR] Probe dispatch failed: ${error || 'Unknown error'}`,
        `[STATUS] Target unreachable or socket error occurred.`,
      ]);
      setLastResult(null);
      return;
    }

    setLastResult(data);

    // Format terminal output from real replies
    const replyLogs: string[] = [];
    if (data.resolved_ip && data.resolved_ip !== data.target) {
      replyLogs.push(`[DNS] Resolved ${data.target} -> ${data.resolved_ip}`);
    }

    data.replies.forEach((r) => {
      if (r.status === 'ok') {
        replyLogs.push(`Reply from ${r.ip}: bytes=${r.bytes} time=${r.rtt_ms}ms TTL=${r.ttl}`);
      } else {
        replyLogs.push(`Request timed out for seq ${r.seq}`);
      }
    });

    replyLogs.push(`--- ${data.target} Ping Statistics ---`);
    replyLogs.push(
      `${data.packets_sent} packets transmitted, ${data.packets_received} received, ${data.packet_loss_pct}% packet loss, time ${data.duration_ms}ms`
    );
    if (data.avg_rtt_ms !== null) {
      replyLogs.push(
        `rtt min/avg/max/mdev = ${data.min_rtt_ms}/${data.avg_rtt_ms}/${data.max_rtt_ms}/${data.jitter_ms} ms`
      );
    }

    setTerminalLogs(replyLogs);
  };

  return (
    <div className="space-y-6">
      {/* Live Operational Banner */}
      <div className="p-4 rounded-xl bg-[#111E30] border border-[#00D69A]/40 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#00D69A]/10 text-[#00D69A] flex-shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Live Network Diagnostic Engine — Active Socket Transmitter
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00D69A]/20 text-[#00D69A] uppercase font-semibold">
              REAL PACKETS ACTIVE
            </span>
          </div>
          <p className="text-xs text-[#91A7C0] mt-1">
            Transmits real ICMP Echo packets across your active network interface card. Measures true kernel round-trip times (RTT), hop TTL counters, packet loss rates, and RFC 3550 jitter.
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
            <span className="text-[10px] font-mono text-[#00D69A]">LIVE-ENGINE</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Quick Presets */}
            <div>
              <label className="block text-[#91A7C0] mb-1.5 font-mono text-[11px]">
                Target Presets (Local Gateway & Public DNS)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { label: 'Gateway', ip: '192.168.1.1' },
                  { label: 'Google DNS', ip: '8.8.8.8' },
                  { label: 'Cloudflare', ip: '1.1.1.1' },
                  { label: 'Loopback', ip: '127.0.0.1' },
                ].map((p) => (
                  <button
                    key={p.ip}
                    type="button"
                    onClick={() => handleQuickPreset(p.ip)}
                    className={`px-2 py-1.5 rounded-lg border font-mono text-[11px] truncate transition-colors ${
                      form.target === p.ip
                        ? 'bg-[#13243A] text-[#22D3EE] border-[#22D3EE]/50 font-bold'
                        : 'bg-[#111E30] text-[#91A7C0] border-[#203750] hover:text-[#EAF3FF]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Address */}
            <div>
              <label className="block text-[#91A7C0] mb-1 font-mono">
                Target IP Address or Domain Name
              </label>
              <input
                type="text"
                value={form.target}
                onChange={(e) => handleTargetChange(e.target.value)}
                placeholder="e.g. 8.8.8.8, 192.168.1.1, or google.com"
                className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
              />
              {validationError && (
                <p className="text-[11px] text-[#FF475F] mt-1 font-mono">{validationError}</p>
              )}
            </div>

            {/* Protocol */}
            <div>
              <label className="block text-[#91A7C0] mb-1 font-mono">Transport Protocol</label>
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
            </div>

            {/* Diagnostic Parameters */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Packet Size (Bytes)</label>
                <input
                  type="number"
                  min="16"
                  max="1472"
                  value={form.packetSize}
                  onChange={(e) => setForm({ ...form, packetSize: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Probe Count</label>
                <input
                  type="number"
                  min="1"
                  max="10"
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
                  min="1"
                  max="5"
                  value={form.timeoutSeconds}
                  onChange={(e) => setForm({ ...form, timeoutSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>
            </div>

            {/* Active Execution Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleExecute}
                disabled={isRunning || Boolean(validationError)}
                className="w-full py-2.5 px-4 rounded-lg bg-[#287EFF] hover:bg-[#168BFF] text-white flex items-center justify-center gap-2 font-mono text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#22D3EE]" />
                    <span>Transmitting ICMP Packets...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute Real Diagnostic Probe</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Telemetry Terminal */}
        <div className="p-5 rounded-xl bg-[#080E19] border border-[#203750] flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
              <span className="flex items-center gap-2 text-[#91A7C0]">
                <Terminal className="w-4 h-4 text-[#287EFF]" /> Live Diagnostic Terminal
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isRunning
                    ? 'bg-[#F5B82E]/10 text-[#F5B82E] border-[#F5B82E]/30 animate-pulse'
                    : lastResult?.status === 'passed'
                    ? 'bg-[#00D69A]/10 text-[#00D69A] border-[#00D69A]/30'
                    : 'bg-[#203750] text-[#647C96] border-[#203750]'
                }`}
              >
                {isRunning ? 'TRANSMITTING' : lastResult ? lastResult.status.toUpperCase() : 'STANDBY'}
              </span>
            </div>

            <div className="py-4 space-y-1.5 text-[#91A7C0] text-[11px] overflow-y-auto max-h-72">
              {terminalLogs.map((log, index) => (
                <p
                  key={index}
                  className={
                    log.startsWith('$')
                      ? 'text-[#22D3EE] font-bold'
                      : log.startsWith('Reply')
                      ? 'text-[#00D69A]'
                      : log.startsWith('[ERROR]')
                      ? 'text-[#FF475F]'
                      : log.startsWith('---')
                      ? 'text-[#EAF3FF] font-semibold pt-2'
                      : 'text-[#91A7C0]'
                  }
                >
                  {log}
                </p>
              ))}
            </div>
          </div>

          {/* Metric Summary Card if Result Available */}
          {lastResult && (
            <div className="mt-4 p-3 rounded-lg bg-[#0D192B] border border-[#203750] grid grid-cols-4 gap-2 text-center text-[10px]">
              <div>
                <span className="text-[#647C96] block">Avg RTT</span>
                <span className="text-sm font-bold text-[#00D69A]">{lastResult.avg_rtt_ms ?? 'N/A'}ms</span>
              </div>
              <div>
                <span className="text-[#647C96] block">Loss</span>
                <span
                  className={`text-sm font-bold ${
                    lastResult.packet_loss_pct === 0 ? 'text-[#00D69A]' : 'text-[#FF475F]'
                  }`}
                >
                  {lastResult.packet_loss_pct}%
                </span>
              </div>
              <div>
                <span className="text-[#647C96] block">Jitter</span>
                <span className="text-sm font-bold text-[#22D3EE]">{lastResult.jitter_ms}ms</span>
              </div>
              <div>
                <span className="text-[#647C96] block">Duration</span>
                <span className="text-sm font-bold text-[#EAF3FF]">{lastResult.duration_ms}ms</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
