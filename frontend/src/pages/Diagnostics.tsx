import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Terminal,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Square,
  Trash2,
  Clock,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  executePingDiagnostic,
  executeTcpProbeDiagnostic,
  executeTracerouteDiagnostic,
} from '../services/api';
import { StatusChip } from '../components/ui/StatusChip';
import { TextInput } from '../components/ui/TextInput';
import { CopyButton } from '../components/ui/CopyButton';
import { useToast } from '../components/ui/Toast';
import { formatLatencyMs, formatPercent } from '../utils/formatters';

type ProbeMode = 'ICMP' | 'TCP' | 'TRACEROUTE';

interface LogEntry {
  id: string;
  ts: string;
  level: 'cmd' | 'info' | 'ok' | 'warn' | 'error' | 'header';
  text: string;
}

interface StructuredSummary {
  status: 'passed' | 'failed' | 'cancelled' | 'error';
  target: string;
  resolvedIp: string;
  protocol: ProbeMode;
  minMs: number | null;
  avgMs: number | null;
  maxMs: number | null;
  lossPct: number | null;
  hopsCount: number | null;
  durationMs: number | null;
  summaryText: string;
}

const RECENT_TARGETS_KEY = 'netpulse_diag_recent_targets_v1';
const DEFAULT_PRESETS = [
  { label: 'Google DNS', host: '8.8.8.8' },
  { label: 'Cloudflare', host: '1.1.1.1' },
  { label: 'Gateway', host: '192.168.1.1' },
  { label: 'Loopback', host: '127.0.0.1' },
];

const nowUtcClock = () => new Date().toISOString().substring(11, 19);

const validateTargetHost = (raw: string): string | null => {
  const val = raw.trim();
  if (!val) return 'Target IP address or hostname is required.';
  if (val === 'localhost') return null;
  const ipPattern = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  const hostPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!ipPattern.test(val) && !hostPattern.test(val)) {
    return 'Enter a valid IPv4 address (e.g. 8.8.8.8), localhost, or hostname (e.g. google.com).';
  }
  return null;
};

export const Diagnostics: React.FC = () => {
  const { addToast } = useToast();

  // Step 1: Target + Recent targets
  const [target, setTarget] = useState('8.8.8.8');
  const [recentTargets, setRecentTargets] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_TARGETS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return ['8.8.8.8', '1.1.1.1', '127.0.0.1'];
  });

  // Step 2: Test Protocol
  const [protocol, setProtocol] = useState<ProbeMode>('ICMP');

  // Step 3: Options (Advanced collapsed by default)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [packetSize, setPacketSize] = useState(32);
  const [count, setCount] = useState(4);
  const [tcpPort, setTcpPort] = useState(443);
  const [maxHops, setMaxHops] = useState(12);
  const [timeoutSeconds, setTimeoutSeconds] = useState(2);

  // Validation & Run State
  const [targetError, setTargetError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      ts: nowUtcClock(),
      level: 'cmd',
      text: '$ netpulse-engine --status ready',
    },
    {
      id: 'init-2',
      ts: nowUtcClock(),
      level: 'info',
      text: '[READY] Multi-protocol engine loaded (ICMP Ping, TCP Handshake, Layer-3 Traceroute).',
    },
  ]);

  const abortRef = useRef<AbortController | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const appendLog = (level: LogEntry['level'], text: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: nowUtcClock(),
        level,
        text,
      },
    ]);
  };

  const rememberTarget = (cleanHost: string) => {
    setRecentTargets((prev) => {
      const next = [cleanHost, ...prev.filter((t) => t !== cleanHost)].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_TARGETS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const handleTargetChange = (val: string) => {
    setTarget(val);
    setTargetError(validateTargetHost(val));
  };

  const portError =
    protocol === 'TCP' && (!Number.isFinite(tcpPort) || tcpPort < 1 || tcpPort > 65535)
      ? 'TCP port must be between 1 and 65535.'
      : null;
  const countError =
    protocol !== 'TRACEROUTE' && (!Number.isFinite(count) || count < 1 || count > 15)
      ? 'Probe count must be between 1 and 15.'
      : null;
  const packetError =
    protocol === 'ICMP' && (!Number.isFinite(packetSize) || packetSize < 16 || packetSize > 1472)
      ? 'Packet payload must be 16–1472 bytes.'
      : null;
  const hopsError =
    protocol === 'TRACEROUTE' && (!Number.isFinite(maxHops) || maxHops < 3 || maxHops > 30)
      ? 'Max hops must be between 3 and 30.'
      : null;

  const hasValidationError = Boolean(targetError || portError || countError || packetError || hopsError);

  const handleCancel = () => {
    if (!isRunning) return;
    abortRef.current?.abort();
    abortRef.current = null;
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    setIsRunning(false);
    appendLog('warn', `[ABORTED] ${protocol} probe against ${target.trim()} cancelled by operator.`);
    setSummary({
      status: 'cancelled',
      target: target.trim(),
      resolvedIp: '—',
      protocol,
      minMs: null,
      avgMs: null,
      maxMs: null,
      lossPct: null,
      hopsCount: null,
      durationMs: elapsedMs,
      summaryText: 'Probe aborted before completion.',
    });
    addToast({ tone: 'info', title: 'Diagnostic cancelled' });
  };

  const handleClearConsole = () => {
    setLogs([]);
    setSummary(null);
  };

  const handleExecute = async () => {
    const cleanTarget = target.trim();
    const err = validateTargetHost(cleanTarget);
    setTargetError(err);
    if (err || hasValidationError || isRunning) return;

    rememberTarget(cleanTarget);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setSummary(null);
    setElapsedMs(0);

    const startedAt = performance.now();
    if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startedAt));
    }, 100);

    const cmdText =
      protocol === 'ICMP'
        ? `$ netpulse-cli icmp-ping --target ${cleanTarget} --size ${packetSize}B --count ${count} --timeout ${timeoutSeconds}s`
        : protocol === 'TCP'
        ? `$ netpulse-cli tcp-probe --target ${cleanTarget} --port ${tcpPort} --count ${count} --timeout ${timeoutSeconds}s`
        : `$ netpulse-cli traceroute --target ${cleanTarget} --max-hops ${maxHops}`;

    setLogs([
      { id: `cmd-${Date.now()}`, ts: nowUtcClock(), level: 'cmd', text: cmdText },
      {
        id: `dispatch-${Date.now()}`,
        ts: nowUtcClock(),
        level: 'info',
        text: `[DISPATCH] Running ${protocol} probe against ${cleanTarget}...`,
      },
    ]);

    try {
      if (protocol === 'ICMP') {
        const res = await executePingDiagnostic(
          cleanTarget,
          count,
          packetSize,
          timeoutSeconds * 1000,
          controller.signal
        );
        if (res.cancelled) return;
        if (res.error || !res.data) {
          appendLog('error', `[ERROR] ${res.error || 'ICMP execution failed.'}`);
          setSummary({
            status: 'error',
            target: cleanTarget,
            resolvedIp: '—',
            protocol,
            minMs: null,
            avgMs: null,
            maxMs: null,
            lossPct: null,
            hopsCount: null,
            durationMs: Math.round(performance.now() - startedAt),
            summaryText: res.error || 'Probe failed to execute.',
          });
          return;
        }
        const data = res.data;
        if (data.resolved_ip && data.resolved_ip !== data.target) {
          appendLog('info', `[DNS] Resolved ${data.target} -> ${data.resolved_ip}`);
        }
        data.replies.forEach((r) => {
          if (r.status === 'ok') {
            appendLog('ok', `Reply from ${r.ip}: seq=${r.seq} bytes=${r.bytes} time=${r.rtt_ms}ms TTL=${r.ttl}`);
          } else {
            appendLog('error', `Request timed out for seq ${r.seq}`);
          }
        });
        appendLog('header', `--- ${data.target} ICMP Statistics ---`);
        appendLog(
          data.packet_loss_pct === 0 ? 'info' : 'warn',
          `${data.packets_sent} transmitted, ${data.packets_received} received, ${data.packet_loss_pct}% packet loss, duration ${data.duration_ms}ms`
        );
        setSummary({
          status: data.status,
          target: data.target,
          resolvedIp: data.resolved_ip || data.target,
          protocol,
          minMs: data.min_rtt_ms,
          avgMs: data.avg_rtt_ms,
          maxMs: data.max_rtt_ms,
          lossPct: data.packet_loss_pct,
          hopsCount: 1,
          durationMs: data.duration_ms,
          summaryText: data.summary,
        });
      } else if (protocol === 'TCP') {
        const res = await executeTcpProbeDiagnostic(
          cleanTarget,
          tcpPort,
          count,
          timeoutSeconds * 1000,
          controller.signal
        );
        if (res.cancelled) return;
        if (res.error || !res.data) {
          appendLog('error', `[ERROR] ${res.error || 'TCP handshake probe failed.'}`);
          setSummary({
            status: 'error',
            target: cleanTarget,
            resolvedIp: '—',
            protocol,
            minMs: null,
            avgMs: null,
            maxMs: null,
            lossPct: null,
            hopsCount: null,
            durationMs: Math.round(performance.now() - startedAt),
            summaryText: res.error || 'TCP handshake failed.',
          });
          return;
        }
        const data = res.data;
        appendLog('info', `[DNS] Resolved ${cleanTarget} -> ${data.resolved_ip}`);
        data.replies.forEach((r) => {
          if (r.status === 'open') {
            appendLog('ok', `Reply from ${r.ip}:${r.port} [TCP SYN-ACK]: seq=${r.seq} handshake=${r.rtt_ms}ms`);
          } else {
            appendLog('error', `Seq ${r.seq} to ${r.ip}:${r.port}: ${r.status}`);
          }
        });
        appendLog('header', `--- ${cleanTarget}:${tcpPort} TCP Statistics ---`);
        appendLog('info', data.summary);
        setSummary({
          status: data.status,
          target: cleanTarget,
          resolvedIp: data.resolved_ip || cleanTarget,
          protocol,
          minMs: data.min_rtt_ms,
          avgMs: data.avg_rtt_ms,
          maxMs: data.max_rtt_ms,
          lossPct: data.packet_loss_pct,
          hopsCount: 1,
          durationMs: data.duration_ms,
          summaryText: data.summary,
        });
      } else {
        const res = await executeTracerouteDiagnostic(cleanTarget, maxHops, controller.signal);
        if (res.cancelled) return;
        if (res.error || !res.data) {
          appendLog('error', `[ERROR] ${res.error || 'Traceroute failed.'}`);
          setSummary({
            status: 'error',
            target: cleanTarget,
            resolvedIp: '—',
            protocol,
            minMs: null,
            avgMs: null,
            maxMs: null,
            lossPct: null,
            hopsCount: null,
            durationMs: Math.round(performance.now() - startedAt),
            summaryText: res.error || 'Traceroute failed.',
          });
          return;
        }
        const data = res.data;
        appendLog('info', `[DNS] Route target ${data.target} (${data.resolved_ip}), max ${maxHops} hops`);
        const hopList: any[] = data.hops || [];
        const allRtts: number[] = [];
        let timedOutHops = 0;
        hopList.forEach((h) => {
          const rtts: number[] = Array.isArray(h.rtts_ms) ? h.rtts_ms.filter((v: any) => typeof v === 'number') : [];
          allRtts.push(...rtts);
          if (rtts.length === 0) timedOutHops += 1;
          const rttStr = rtts.length > 0 ? rtts.map((v) => `${v}ms`).join(' / ') : '* * *';
          appendLog(
            rtts.length > 0 ? 'ok' : 'warn',
            `Hop ${String(h.hop).padStart(2, '0')}  ${String(h.ip || '*').padEnd(16, ' ')}  ${rttStr}`
          );
        });
        appendLog('header', `--- Traceroute Complete (${data.duration_ms}ms) ---`);
        appendLog('info', data.summary);
        const minRtt = allRtts.length > 0 ? Number(Math.min(...allRtts).toFixed(2)) : null;
        const maxRtt = allRtts.length > 0 ? Number(Math.max(...allRtts).toFixed(2)) : null;
        const avgRtt =
          allRtts.length > 0
            ? Number((allRtts.reduce((acc, v) => acc + v, 0) / allRtts.length).toFixed(2))
            : null;
        const hopLoss = hopList.length > 0 ? Number(((timedOutHops / hopList.length) * 100).toFixed(1)) : 0;

        setSummary({
          status: data.status === 'passed' ? 'passed' : 'failed',
          target: data.target,
          resolvedIp: data.resolved_ip || data.target,
          protocol,
          minMs: minRtt,
          avgMs: avgRtt,
          maxMs: maxRtt,
          lossPct: hopLoss,
          hopsCount: hopList.length,
          durationMs: data.duration_ms,
          summaryText: data.summary,
        });
      }
    } finally {
      if (elapsedTimerRef.current) {
        window.clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      setIsRunning(false);
    }
  };

  const activeStep = isRunning ? 4 : hasValidationError ? 1 : advancedOpen ? 3 : 2;
  const copyTranscript = logs.map((l) => `[${l.ts}] ${l.text}`).join('\n');

  return (
    <div className="space-y-6">
      {/* Guided Step Flow Header */}
      <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          {[
            { num: 1, title: 'Target', desc: targetError ? 'Needs attention' : target.trim() || 'Set host' },
            { num: 2, title: 'Test protocol', desc: protocol === 'ICMP' ? 'ICMP Ping' : protocol === 'TCP' ? `TCP :${tcpPort}` : 'Traceroute' },
            { num: 3, title: 'Options', desc: advancedOpen ? 'Custom parameters' : 'Standard defaults' },
            { num: 4, title: 'Run', desc: isRunning ? `Running ${(elapsedMs / 1000).toFixed(1)}s` : summary ? 'Completed' : 'Ready to dispatch' },
          ].map((step) => {
            const reached = activeStep >= step.num;
            return (
              <li
                key={step.num}
                className={`flex items-center gap-3 p-2.5 rounded-[var(--radius-control)] border ${
                  step.num === 4 && isRunning
                    ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40'
                    : reached
                    ? 'bg-[var(--surface-2)] border-[var(--border)]'
                    : 'bg-[var(--bg)] border-[var(--border)]/60 opacity-75'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[12px] font-semibold shrink-0 ${
                    step.num === 4 && isRunning
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : reached
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
                  }`}
                >
                  {step.num}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text)] truncate">{step.title}</div>
                  <div className="text-[var(--text-secondary)] font-mono truncate">{step.desc}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Step-by-Step Probe Configuration */}
        <div className="lg:col-span-5 p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-5">
          {/* Step 1: Target */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[var(--text)]">1. Target destination</h3>
              {targetError ? (
                <StatusChip size="sm" tone="danger" label="Invalid target" />
              ) : (
                <StatusChip size="sm" tone="ok" label="Valid host" />
              )}
            </div>

            <TextInput
              id="diag-target"
              value={target}
              disabled={isRunning}
              onChange={(e) => handleTargetChange(e.target.value)}
              placeholder="e.g. 8.8.8.8, 192.168.1.1, or google.com"
              mono
              invalid={Boolean(targetError)}
            />
            {targetError && (
              <p className="flex items-center gap-1.5 text-[12px] text-[var(--danger)]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{targetError}</span>
              </p>
            )}

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="block text-[12px] text-[var(--text-secondary)]">Quick presets</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEFAULT_PRESETS.map((p) => (
                  <button
                    key={p.host}
                    type="button"
                    disabled={isRunning}
                    onClick={() => handleTargetChange(p.host)}
                    className={`h-9 px-2 rounded-[var(--radius-control)] border text-[12px] font-medium truncate transition-colors ${
                      target.trim() === p.host
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 font-semibold'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Targets */}
            {recentTargets.length > 0 && (
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>Recent targets</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recentTargets.map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={isRunning}
                      onClick={() => handleTargetChange(item)}
                      className={`px-2.5 py-1 rounded-[var(--radius-pill)] border text-[12px] font-mono transition-colors ${
                        target.trim() === item
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40'
                          : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <hr className="border-[var(--border)]" />

          {/* Step 2: Test Protocol */}
          <section className="space-y-2.5">
            <h3 className="text-[14px] font-semibold text-[var(--text)]">2. Diagnostic test</h3>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'ICMP', title: 'ICMP Ping', sub: 'Echo RTT & loss' },
                  { id: 'TCP', title: 'TCP Probe', sub: 'Port handshake' },
                  { id: 'TRACEROUTE', title: 'Traceroute', sub: 'Layer-3 hops' },
                ] as const
              ).map((proto) => (
                <button
                  key={proto.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setProtocol(proto.id)}
                  className={`p-2.5 rounded-[var(--radius-control)] border text-left transition-colors ${
                    protocol === proto.id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/45'
                      : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
                  }`}
                >
                  <div className="text-[12px] font-semibold">{proto.title}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">{proto.sub}</div>
                </button>
              ))}
            </div>
          </section>

          <hr className="border-[var(--border)]" />

          {/* Step 3: Options (Advanced Collapsed by Default) */}
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              aria-expanded={advancedOpen}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
                <SlidersHorizontal className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                <span>3. Probe options</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
                <span>
                  {protocol === 'ICMP'
                    ? `${count} pkts · ${packetSize}B`
                    : protocol === 'TCP'
                    ? `Port ${tcpPort} · ${count} tries`
                    : `Max ${maxHops} hops`}
                </span>
                {advancedOpen ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </span>
            </button>

            {advancedOpen && (
              <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
                {protocol === 'ICMP' && (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label htmlFor="icmp-size" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                        Bytes
                      </label>
                      <TextInput
                        id="icmp-size"
                        type="number"
                        min={16}
                        max={1472}
                        mono
                        invalid={Boolean(packetError)}
                        value={packetSize}
                        onChange={(e) => setPacketSize(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label htmlFor="icmp-count" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                        Count
                      </label>
                      <TextInput
                        id="icmp-count"
                        type="number"
                        min={1}
                        max={15}
                        mono
                        invalid={Boolean(countError)}
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label htmlFor="icmp-timeout" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                        Timeout (s)
                      </label>
                      <TextInput
                        id="icmp-timeout"
                        type="number"
                        min={1}
                        max={5}
                        mono
                        value={timeoutSeconds}
                        onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                {protocol === 'TCP' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label htmlFor="tcp-port" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                          TCP port
                        </label>
                        <TextInput
                          id="tcp-port"
                          type="number"
                          min={1}
                          max={65535}
                          mono
                          invalid={Boolean(portError)}
                          value={tcpPort}
                          onChange={(e) => setTcpPort(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label htmlFor="tcp-count" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                          Count
                        </label>
                        <TextInput
                          id="tcp-count"
                          type="number"
                          min={1}
                          max={15}
                          mono
                          invalid={Boolean(countError)}
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[443, 80, 53, 22].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTcpPort(p)}
                          className={`px-2.5 py-1 rounded-[var(--radius-pill)] border text-[12px] font-mono ${
                            tcpPort === p
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 font-semibold'
                              : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border)]'
                          }`}
                        >
                          :{p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {protocol === 'TRACEROUTE' && (
                  <div>
                    <label htmlFor="trace-hops" className="block text-[12px] text-[var(--text-secondary)] mb-1">
                      Maximum hop TTL limit (3–30)
                    </label>
                    <TextInput
                      id="trace-hops"
                      type="number"
                      min={3}
                      max={30}
                      mono
                      invalid={Boolean(hopsError)}
                      value={maxHops}
                      onChange={(e) => setMaxHops(Number(e.target.value))}
                    />
                  </div>
                )}

                {(portError || countError || packetError || hopsError) && (
                  <p className="text-[12px] text-[var(--danger)]">
                    {portError || countError || packetError || hopsError}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Step 4: Run / Cancel */}
          <section className="pt-1 space-y-3">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleExecute}
                disabled={hasValidationError}
                className="w-full h-11 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] flex items-center justify-center gap-2 text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                <span>Run {protocol} probe</span>
              </button>
            ) : (
              <div className="space-y-2.5">
                <div className="p-3 rounded-[var(--radius-control)] bg-[var(--accent-soft)] border border-[var(--accent)]/35 space-y-2">
                  <div className="flex items-center justify-between text-[12px] font-medium text-[var(--accent)]">
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Transmitting {protocol} probes…</span>
                    </span>
                    <span className="font-mono np-mono-val">{(elapsedMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-[var(--accent)] animate-pulse" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full h-10 px-4 rounded-[var(--radius-control)] bg-[var(--danger-soft)] hover:bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/40 flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Cancel probe</span>
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Right: Structured Result Summary ABOVE Timestamped Terminal Console */}
        <div className="lg:col-span-7 space-y-4">
          {/* Structured Result Summary Card */}
          <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                <h3 className="text-[14px] font-semibold text-[var(--text)]">Structured result summary</h3>
              </div>
              <StatusChip
                size="sm"
                tone={
                  isRunning
                    ? 'warn'
                    : summary?.status === 'passed'
                    ? 'ok'
                    : summary?.status === 'failed' || summary?.status === 'error'
                    ? 'danger'
                    : 'neutral'
                }
                label={
                  isRunning
                    ? 'Running'
                    : summary
                    ? summary.status === 'passed'
                      ? 'Passed'
                      : summary.status === 'cancelled'
                      ? 'Cancelled'
                      : summary.status === 'error'
                      ? 'Error'
                      : 'Failed'
                    : 'Ready'
                }
                pulseWhenLiveOrDegraded={isRunning}
              />
            </div>

            {summary ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 np-mono-val">
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                    <span className="text-[12px] text-[var(--text-secondary)] block">Min RTT</span>
                    <span className="text-[16px] font-semibold text-[var(--text)]">
                      {formatLatencyMs(summary.minMs)}
                    </span>
                  </div>
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                    <span className="text-[12px] text-[var(--text-secondary)] block">Avg RTT</span>
                    <span className="text-[16px] font-semibold text-[var(--ok)]">
                      {formatLatencyMs(summary.avgMs)}
                    </span>
                  </div>
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                    <span className="text-[12px] text-[var(--text-secondary)] block">Max RTT</span>
                    <span className="text-[16px] font-semibold text-[var(--warn)]">
                      {formatLatencyMs(summary.maxMs)}
                    </span>
                  </div>
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                    <span className="text-[12px] text-[var(--text-secondary)] block">Loss</span>
                    <span
                      className={`text-[16px] font-semibold ${
                        summary.lossPct === 0 ? 'text-[var(--ok)]' : 'text-[var(--danger)]'
                      }`}
                    >
                      {summary.lossPct !== null ? formatPercent(summary.lossPct) : '—'}
                    </span>
                  </div>
                  <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                    <span className="text-[12px] text-[var(--text-secondary)] block">Hops</span>
                    <span className="text-[16px] font-semibold text-[var(--accent)]">
                      {summary.hopsCount !== null ? `${summary.hopsCount}` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] px-3 py-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                    <span>{summary.summaryText}</span>
                  </span>
                  <span className="font-mono text-[var(--text-muted)]">
                    Resolved: {summary.resolvedIp} · {formatLatencyMs(summary.durationMs)}
                  </span>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-[var(--radius-control)] border border-dashed border-[var(--border)] text-[13px] text-[var(--text-secondary)]">
                {isRunning
                  ? `Waiting for ${protocol} replies from ${target.trim()}… (${(elapsedMs / 1000).toFixed(1)}s elapsed)`
                  : 'Run a probe to see structured Min/Avg/Max RTT, packet loss, and hop count above the raw console.'}
              </div>
            )}
          </div>

          {/* Timestamped, Color-Coded Terminal Console */}
          <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
              <span className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
                <Terminal className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                <span>Timestamped console output</span>
              </span>

              <div className="flex items-center gap-2">
                <CopyButton value={copyTranscript} label="Copy console output" compact />
                <button
                  type="button"
                  onClick={handleClearConsole}
                  disabled={logs.length === 0 && !summary}
                  className="h-8 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1.5 disabled:opacity-45"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-[var(--radius-control)] bg-[var(--bg)] border border-[var(--border)] font-mono text-[12px] leading-6 overflow-y-auto max-h-80 min-h-[200px] space-y-1">
              {logs.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-[var(--text-muted)] text-[12px]">
                  Console cleared. Click Run probe to start capturing output.
                </div>
              ) : (
                logs.map((entry) => {
                  const colorCls =
                    entry.level === 'cmd'
                      ? 'text-[var(--accent)] font-semibold'
                      : entry.level === 'ok'
                      ? 'text-[var(--ok)]'
                      : entry.level === 'warn'
                      ? 'text-[var(--warn)]'
                      : entry.level === 'error'
                      ? 'text-[var(--danger)]'
                      : entry.level === 'header'
                      ? 'text-[var(--text)] font-semibold pt-1.5'
                      : 'text-[var(--text-secondary)]';
                  return (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <span className="text-[var(--text-muted)] shrink-0 select-none">
                        [{entry.ts}]
                      </span>
                      <span className={`break-all ${colorCls}`}>{entry.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
