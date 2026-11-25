import React, { useState } from 'react';
import { Activity, Play, Terminal, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  executePingDiagnostic,
  executeTcpProbeDiagnostic,
  executeTracerouteDiagnostic,
  PingResultPayload,
} from '../services/api';

type ProbeMode = 'ICMP' | 'TCP' | 'TRACEROUTE';

export const Diagnostics: React.FC = () => {
  const [target, setTarget] = useState('8.8.8.8');
  const [protocol, setProtocol] = useState<ProbeMode>('ICMP');
  const [packetSize, setPacketSize] = useState(32);
  const [count, setCount] = useState(4);
  const [tcpPort, setTcpPort] = useState(443);
  const [maxHops, setMaxHops] = useState(12);
  const [timeoutSeconds, setTimeoutSeconds] = useState(2);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<PingResultPayload | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '$ netpulse-engine --status ready',
    '[INFO] Multi-protocol engine ready: ICMP Ping, Layer-4 TCP Handshake, Layer-3 Traceroute.',
    '[READY] Choose a protocol and target IP/domain to transmit real packets.',
  ]);

  const handleTargetChange = (val: string) => {
    setTarget(val);
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
    setTarget(preset);
    setValidationError(null);
  };

  const handleExecute = async () => {
    if (validationError || !target) return;

    setIsRunning(true);
    setLastResult(null);

    if (protocol === 'ICMP') {
      setTerminalLogs([
        `$ netpulse-cli icmp-ping --target ${target} --size ${packetSize}B --count ${count}`,
        `[DISPATCH] Transmitting ${count} ICMP Echo Request packets to ${target}...`,
      ]);

      const { data, error } = await executePingDiagnostic(target, count, packetSize, timeoutSeconds * 1000);
      setIsRunning(false);

      if (error || !data) {
        setTerminalLogs((prev) => [...prev, `[ERROR] Probe failed: ${error || 'Unknown error'}`]);
        return;
      }

      setLastResult(data);
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
      replyLogs.push(`--- ${data.target} ICMP Statistics ---`);
      replyLogs.push(
        `${data.packets_sent} packets transmitted, ${data.packets_received} received, ${data.packet_loss_pct}% packet loss, time ${data.duration_ms}ms`
      );
      if (data.avg_rtt_ms !== null) {
        replyLogs.push(`rtt min/avg/max/jitter = ${data.min_rtt_ms}/${data.avg_rtt_ms}/${data.max_rtt_ms}/${data.jitter_ms} ms`);
      }
      setTerminalLogs(replyLogs);
    } else if (protocol === 'TCP') {
      setTerminalLogs([
        `$ netpulse-cli tcp-handshake --target ${target} --port ${tcpPort} --count ${count}`,
        `[DISPATCH] Initiating ${count} Layer-4 TCP 3-way SYN/SYN-ACK probes to ${target}:${tcpPort}...`,
      ]);

      const { data, error } = await executeTcpProbeDiagnostic(target, tcpPort, count, timeoutSeconds * 1000);
      setIsRunning(false);

      if (error || !data) {
        setTerminalLogs((prev) => [...prev, `[ERROR] TCP probe failed: ${error || 'Unknown error'}`]);
        return;
      }

      setLastResult(data);
      const logs: string[] = [];
      logs.push(`[DNS] Resolved ${target} -> ${data.resolved_ip}`);
      data.replies.forEach((r) => {
        if (r.status === 'open') {
          logs.push(`Reply from ${r.ip}:${r.port} [TCP SYN-ACK]: status=OPEN handshake_time=${r.rtt_ms}ms`);
        } else {
          logs.push(`Seq ${r.seq} to ${r.ip}:${r.port}: ${r.status}`);
        }
      });
      logs.push(`--- ${target}:${tcpPort} TCP Probe Statistics ---`);
      logs.push(data.summary);
      setTerminalLogs(logs);
    } else {
      // TRACEROUTE
      setTerminalLogs([
        `$ tracert -d -h ${maxHops} -w 500 ${target}`,
        `[DISPATCH] Tracing router hops up to ${maxHops} TTL steps (may take 5-15s)...`,
      ]);

      const { data, error } = await executeTracerouteDiagnostic(target, maxHops);
      setIsRunning(false);

      if (error || !data) {
        setTerminalLogs((prev) => [...prev, `[ERROR] Traceroute failed: ${error || 'Unknown error'}`]);
        return;
      }

      setLastResult(data);
      const logs: string[] = [`[DNS] Tracing route to ${data.target} (${data.resolved_ip}) over ${maxHops} max hops:`];
      (data.hops || []).forEach((h: any) => {
        const rttText = h.rtts_ms?.length ? h.rtts_ms.map((v: number) => `${v}ms`).join(' / ') : '* * *';
        logs.push(`Hop ${String(h.hop).padStart(2, '0')}  |  ${String(h.ip).padEnd(16, ' ')}  |  ${rttText}`);
      });
      logs.push(`--- Traceroute Complete (${data.duration_ms}ms) ---`);
      logs.push(data.summary);
      setTerminalLogs(logs);
    }
  };

  return (
    <div className="space-y-6">
      {/* Diagnostic Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#22D3EE]" /> Probe Configuration
            </h3>
            <span className="text-[10px] font-mono text-[#00D69A]">{protocol} ENGINE</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Quick Presets */}
            <div>
              <label className="block text-[#91A7C0] mb-1.5 font-mono text-[11px]">
                Target Presets (Local Router & Public Infrastructure)
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
                      target === p.ip
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
                value={target}
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
              <label className="block text-[#91A7C0] mb-1 font-mono">Diagnostic Protocol</label>
              <div className="grid grid-cols-3 gap-2">
                {(['ICMP', 'TCP', 'TRACEROUTE'] as const).map((proto) => (
                  <button
                    key={proto}
                    type="button"
                    onClick={() => setProtocol(proto)}
                    className={`py-2 px-3 rounded-lg border font-mono text-xs transition-colors ${
                      protocol === proto
                        ? 'bg-[#13243A] text-[#22D3EE] border-[#22D3EE]/50 font-bold'
                        : 'bg-[#111E30] text-[#91A7C0] border-[#203750] hover:text-[#EAF3FF]'
                    }`}
                  >
                    {proto}
                  </button>
                ))}
              </div>
            </div>

            {/* Protocol-Specific Parameters */}
            {protocol === 'ICMP' && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[#91A7C0] mb-1 font-mono">Packet (Bytes)</label>
                  <input
                    type="number"
                    min="16"
                    max="1472"
                    value={packetSize}
                    onChange={(e) => setPacketSize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#91A7C0] mb-1 font-mono">Count</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#91A7C0] mb-1 font-mono">Timeout (s)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={timeoutSeconds}
                    onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {protocol === 'TCP' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[#91A7C0] mb-1 font-mono">Destination TCP Port</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={tcpPort}
                      onChange={(e) => setTcpPort(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                    />
                    {[443, 80, 53].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTcpPort(p)}
                        className={`px-2 py-1 rounded border text-[10px] font-mono ${
                          tcpPort === p
                            ? 'bg-[#13243A] text-[#22D3EE] border-[#22D3EE]/50'
                            : 'bg-[#111E30] text-[#91A7C0] border-[#203750]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[#91A7C0] mb-1 font-mono">Handshake Count</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {protocol === 'TRACEROUTE' && (
              <div className="pt-2">
                <label className="block text-[#91A7C0] mb-1 font-mono">Maximum Hop TTL Limit</label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={maxHops}
                  onChange={(e) => setMaxHops(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] font-mono focus:border-[#22D3EE] focus:outline-none"
                />
              </div>
            )}

            {/* Active Execution Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleExecute}
                disabled={isRunning || Boolean(validationError)}
                className="w-full h-10 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] flex items-center justify-center gap-2 text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#22D3EE]" />
                    <span>Running {protocol} Probe...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute {protocol} Probe</span>
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
                      : log.startsWith('Reply') || log.startsWith('Hop')
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
