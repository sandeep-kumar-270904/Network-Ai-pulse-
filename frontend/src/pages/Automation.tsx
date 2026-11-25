import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Play,
  X,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchAutomationJobs,
  fetchDiagnosticHistory,
  createAutomationJob,
  toggleAutomationJob,
  runAutomationJobNow,
  deleteAutomationJob,
} from '../services/api';
import { StatusChip } from '../components/ui/StatusChip';
import { Dialog } from '../components/ui/Dialog';
import { TextInput } from '../components/ui/TextInput';
import { Select } from '../components/ui/Select';
import { CopyButton } from '../components/ui/CopyButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import {
  formatLatencyMs,
  formatPercent,
  formatRelativeTime,
  formatTimestampUtc,
} from '../utils/formatters';

const PROBE_TYPE_OPTIONS = [
  { value: 'icmp_ping', label: 'ICMP ping' },
  { value: 'tcp_probe', label: 'TCP port 443' },
];

const QUICK_SCHEDULE_TEMPLATES = [
  { name: 'Gateway Reachability', target: '192.168.1.1', testType: 'icmp_ping', intervalSec: 30 },
  { name: 'Cloudflare DNS Heartbeat', target: '1.1.1.1', testType: 'icmp_ping', intervalSec: 60 },
  { name: 'External HTTPS Socket', target: 'google.com', testType: 'tcp_probe', intervalSec: 120 },
];

const parseUtcMillis = (iso?: string | null): number | null => {
  if (!iso) return null;
  const raw = String(iso).trim();
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
  const normalized = hasTz ? raw.replace(' ', 'T') : `${raw.replace(' ', 'T')}Z`;
  const t = new Date(normalized).getTime();
  return Number.isNaN(t) ? null : t;
};

const formatIntervalLabel = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  if (sec % 3600 === 0) return `${sec / 3600}h`;
  if (sec % 60 === 0) return `${sec / 60}m`;
  return `${sec}s`;
};

const normalizeTestType = (val?: string): string => {
  const s = (val || '').toLowerCase();
  if (s.includes('tcp')) return 'tcp_probe';
  return 'icmp_ping';
};

export const Automation: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [name, setName] = useState('');
  const [target, setTarget] = useState('192.168.1.1');
  const [testType, setTestType] = useState('icmp_ping');
  const [intervalSec, setIntervalSec] = useState(60);

  const { addToast } = useToast();

  const loadJobsAndHistory = useCallback(async () => {
    setLoading(true);
    const [jobsRes, histRes] = await Promise.all([
      fetchAutomationJobs(),
      fetchDiagnosticHistory(500),
    ]);
    setJobs(jobsRes.jobs);
    setHistoryRecords(histRes.records);
    setLoadError(jobsRes.error || histRes.error || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadJobsAndHistory();
    const poll = window.setInterval(loadJobsAndHistory, 8000);
    const clock = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [loadJobsAndHistory]);

  const handleToggle = async (id: string, current: boolean) => {
    const ok = await toggleAutomationJob(id, !current);
    if (ok) {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, enabled: !current } : j)));
      addToast({
        tone: 'info',
        title: !current ? 'Schedule enabled' : 'Schedule turned off',
      });
    }
  };

  const handleRunNow = async (job: any) => {
    setRunningId(job.id);
    const { data, error } = await runAutomationJobNow(job.id);
    setRunningId(null);
    if (data) {
      addToast({ tone: 'ok', title: `${job.name} completed`, description: data.summary });
      loadJobsAndHistory();
    } else if (error) {
      addToast({ tone: 'danger', title: `${job.name} failed`, description: error });
    }
  };

  const nameError = name.trim().length > 0 && name.trim().length < 2 ? 'Enter at least 2 characters.' : null;
  const targetError = !target.trim() ? 'Target IP or domain is required.' : null;
  const intervalError =
    !Number.isFinite(intervalSec) || intervalSec < 15 || intervalSec > 86400
      ? 'Interval must be between 15 and 86400 seconds.'
      : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || targetError || intervalError || nameError) return;
    const { job, error } = await createAutomationJob(name.trim(), target.trim(), testType, intervalSec);
    if (job) {
      setJobs((prev) => [...prev, job]);
      setName('');
      setIsModalOpen(false);
      addToast({ tone: 'ok', title: `Created schedule "${job.name}"` });
    } else {
      addToast({ tone: 'danger', title: 'Unable to create schedule', description: error || undefined });
    }
  };

  const handleQuickCreateFromTemplate = (tpl: (typeof QUICK_SCHEDULE_TEMPLATES)[number]) => {
    setName(tpl.name);
    setTarget(tpl.target);
    setTestType(tpl.testType);
    setIntervalSec(tpl.intervalSec);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetName = deleteTarget.name;
    const deletedId = deleteTarget.id;
    const ok = await deleteAutomationJob(deletedId);
    setDeleteTarget(null);
    if (ok) {
      setJobs((prev) => prev.filter((j) => j.id !== deletedId));
      addToast({ tone: 'info', title: `Deleted schedule "${targetName}"` });
    }
  };

  // Correlate each schedule with historical telemetry runs by target + protocol
  const jobTelemetry = useMemo(() => {
    return jobs.map((job) => {
      const matching = historyRecords
        .filter(
          (r) =>
            String(r.target || '').toLowerCase() === String(job.target || '').toLowerCase() &&
            normalizeTestType(r.test_type) === normalizeTestType(job.test_type)
        )
        .slice(0, 12)
        .reverse(); // oldest -> newest left to right

      const passedCount = matching.filter((r) => r.status === 'passed').length;
      const successRate = matching.length > 0 ? (passedCount / matching.length) * 100 : null;

      let nextRunLabel = 'Paused';
      let nextRunUtc = '';
      if (job.enabled) {
        const lastMs = parseUtcMillis(job.last_run);
        if (!lastMs) {
          nextRunLabel = 'Queued next tick';
        } else {
          const nextMs = lastMs + Number(job.interval_seconds || 60) * 1000;
          const diffSec = Math.round((nextMs - nowMs) / 1000);
          nextRunUtc = formatTimestampUtc(nextMs);
          if (diffSec <= 0) {
            nextRunLabel = 'Due now';
          } else if (diffSec < 60) {
            nextRunLabel = `in ${diffSec}s`;
          } else {
            const mins = Math.floor(diffSec / 60);
            const rem = diffSec % 60;
            nextRunLabel = `in ${mins}m ${rem}s`;
          }
        }
      }

      return {
        job,
        matching,
        successRate,
        nextRunLabel,
        nextRunUtc,
      };
    });
  }, [jobs, historyRecords, nowMs]);

  const activeCount = jobs.filter((j) => j.enabled).length;
  const pausedCount = jobs.length - activeCount;
  const checksPerHour = jobs
    .filter((j) => j.enabled && Number(j.interval_seconds) > 0)
    .reduce((acc, j) => acc + Math.round(3600 / Number(j.interval_seconds)), 0);

  const fleetSuccessRates = jobTelemetry
    .map((item) => item.successRate)
    .filter((v): v is number => v !== null);
  const avgSuccessRate =
    fleetSuccessRates.length > 0
      ? fleetSuccessRates.reduce((acc, v) => acc + v, 0) / fleetSuccessRates.length
      : null;

  const modalRunsPerDay = intervalSec > 0 ? Math.round(86400 / intervalSec) : 0;

  return (
    <div className="space-y-6">
      {/* Top Action & Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
          <Bot className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
          <span>
            {jobs.length} {jobs.length === 1 ? 'schedule' : 'schedules'} · {activeCount} active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadJobsAndHistory}
            aria-label="Refresh schedules"
            className="h-10 w-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-10 flex items-center gap-2 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>New schedule</span>
          </button>
        </div>
      </div>

      {/* Fleet Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <div className="text-[12px] text-[var(--text-secondary)]">Active monitors</div>
          <div className="text-[22px] font-semibold font-mono text-[var(--ok)] mt-1 np-mono-val">
            {activeCount}
            <span className="text-[13px] font-normal text-[var(--text-muted)]"> / {jobs.length}</span>
          </div>
        </div>
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <div className="text-[12px] text-[var(--text-secondary)]">Paused schedules</div>
          <div className="text-[22px] font-semibold font-mono text-[var(--text)] mt-1 np-mono-val">
            {pausedCount}
          </div>
        </div>
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <div className="text-[12px] text-[var(--text-secondary)]">Combined probe rate</div>
          <div className="text-[22px] font-semibold font-mono text-[var(--accent)] mt-1 np-mono-val">
            {checksPerHour} <span className="text-[12px] font-normal text-[var(--text-muted)]">runs/hr</span>
          </div>
        </div>
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <div className="text-[12px] text-[var(--text-secondary)]">Recent fleet success</div>
          <div className="text-[22px] font-semibold font-mono text-[var(--text)] mt-1 np-mono-val">
            {avgSuccessRate !== null ? formatPercent(avgSuccessRate) : 'No runs'}
          </div>
        </div>
      </div>

      {/* Main Schedules Table, Loading, Error, or Empty State */}
      {loadError && jobs.length === 0 ? (
        <ErrorState
          title="Unable to load automation schedules"
          message={loadError}
          onRetry={loadJobsAndHistory}
          retrying={loading}
        />
      ) : loading && jobs.length === 0 ? (
        <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-8 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <EmptyState
            icon={Bot}
            title="No recurring schedules configured"
            description="Create a continuous health check to track target latency, TCP handshake uptime, and anomaly trends over time."
            actionLabel="Create first schedule"
            onAction={() => setIsModalOpen(true)}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="bg-[var(--surface-2)] text-[var(--text-secondary)] text-[12px] font-semibold border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-3">Schedule</th>
                <th className="py-3 px-3">Target</th>
                <th className="py-3 px-3">Next run</th>
                <th className="py-3 px-3">Last result</th>
                <th className="py-3 px-3 text-right">Pass %</th>
                <th className="py-3 px-3">Recent (12)</th>
                <th className="py-3 px-3">Active</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {jobTelemetry.map(({ job, matching, successRate, nextRunLabel, nextRunUtc }) => {
                const statusLower = String(job.last_status || 'pending').toLowerCase();
                const lastTone =
                  statusLower === 'passed'
                    ? 'ok'
                    : statusLower === 'failed'
                    ? 'danger'
                    : 'neutral';
                const isOn = Boolean(job.enabled);

                return (
                  <tr key={job.id} className="hover:bg-[var(--surface-3)]/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[var(--text)]">{job.name}</div>
                      <div className="text-[12px] font-mono text-[var(--text-muted)]">
                        {job.test_type === 'tcp_probe' ? 'TCP :443' : 'ICMP ping'} · every{' '}
                        {formatIntervalLabel(job.interval_seconds)} · {job.run_count} runs
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[12px] text-[var(--accent)] whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <span>{job.target}</span>
                        <CopyButton value={job.target} label={`Copy ${job.target}`} compact />
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[12px] np-mono-val whitespace-nowrap" title={nextRunUtc || undefined}>
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isOn ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                        <span>{nextRunLabel}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <StatusChip
                          size="sm"
                          tone={lastTone}
                          label={
                            statusLower === 'passed'
                              ? 'Passed'
                              : statusLower === 'failed'
                              ? 'Failed'
                              : 'Pending'
                          }
                        />
                        {job.last_run && (
                          <div
                            className="text-[12px] font-mono text-[var(--text-muted)]"
                            title={formatTimestampUtc(job.last_run)}
                          >
                            {formatRelativeTime(job.last_run)}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[13px] font-semibold np-mono-val whitespace-nowrap">
                      {successRate !== null ? (
                        <span
                          className={
                            successRate >= 95
                              ? 'text-[var(--ok)]'
                              : successRate >= 75
                              ? 'text-[var(--warn)]'
                              : 'text-[var(--danger)]'
                          }
                        >
                          {formatPercent(successRate)}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] font-normal">—</span>
                      )}
                    </td>

                    {/* Mini History Strip */}
                    <td className="py-3 px-3">
                      <div
                        className="flex items-center gap-0.5"
                        aria-label={`Recent ${matching.length} probe results for ${job.name}`}
                      >
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const offset = idx - (12 - matching.length);
                          const rec = offset >= 0 ? matching[offset] : null;
                          if (!rec) {
                            return (
                              <span
                                key={idx}
                                className="w-1.5 h-5 rounded-[2px] bg-[var(--surface-3)]/70"
                                title="No historical run"
                              />
                            );
                          }
                          const ok = rec.status === 'passed';
                          return (
                            <span
                              key={rec.id || idx}
                              className={`w-1.5 h-5 rounded-[2px] ${
                                ok ? 'bg-[var(--ok)]' : 'bg-[var(--danger)]'
                              }`}
                              title={`${formatTimestampUtc(rec.timestamp)} · ${rec.status.toUpperCase()} · ${formatLatencyMs(
                                rec.avg_rtt_ms
                              )}`}
                            />
                          );
                        })}
                      </div>
                    </td>

                    {/* Single On/Off Switch */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        aria-label={`Enable ${job.name}`}
                        onClick={() => handleToggle(job.id, isOn)}
                        className="inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded-full p-0.5"
                      >
                        <span
                          className={`relative w-9 h-5 rounded-full border transition-colors ${
                            isOn
                              ? 'bg-[var(--accent)] border-[var(--accent)]'
                              : 'bg-[var(--surface-2)] border-[var(--border-control)]'
                          }`}
                        >
                          <span
                            className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 rounded-full transition-transform ${
                              isOn
                                ? 'translate-x-4 bg-[var(--accent-ink)]'
                                : 'translate-x-0 bg-[var(--text-secondary)]'
                            }`}
                          />
                        </span>
                        <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                          {isOn ? 'On' : 'Off'}
                        </span>
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRunNow(job)}
                          disabled={runningId === job.id}
                          className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {runningId === job.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span>Run now</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(job)}
                          aria-label={`Delete ${job.name}`}
                          className="h-9 w-9 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Schedule Recipes Card (prevents empty blank space when few schedules exist) */}
      <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
            <span>Recommended probe templates</span>
          </span>
          <span className="text-[12px] text-[var(--text-muted)]">
            One click pre-fills schedule creation with preview
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {QUICK_SCHEDULE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              type="button"
              onClick={() => handleQuickCreateFromTemplate(tpl)}
              className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-left transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text)] truncate">{tpl.name}</div>
                <div className="text-[12px] font-mono text-[var(--text-secondary)] truncate">
                  {tpl.target} · {tpl.testType === 'tcp_probe' ? 'TCP :443' : 'ICMP'} · {tpl.intervalSec}s
                </div>
              </div>
              <Plus className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* Create Schedule Modal WITH LIVE PREVIEW */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-backdrop)] backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Create scheduled probe"
              className="w-full max-w-lg p-6 rounded-[var(--radius-dialog)] bg-[var(--surface-1)] border border-[var(--border-strong)] shadow-[var(--shadow-popover)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">Create scheduled probe</h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close modal"
                  className="w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="auto-name" className="block text-[13px] font-medium text-[var(--text)] mb-1">
                    Schedule name
                  </label>
                  <TextInput
                    id="auto-name"
                    required
                    placeholder="e.g. Cloudflare health check"
                    value={name}
                    invalid={Boolean(nameError)}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {nameError && <p className="text-[12px] text-[var(--danger)] mt-1">{nameError}</p>}
                </div>

                <div>
                  <label htmlFor="auto-target" className="block text-[13px] font-medium text-[var(--text)] mb-1">
                    Target IP or hostname
                  </label>
                  <TextInput
                    id="auto-target"
                    required
                    mono
                    value={target}
                    invalid={Boolean(targetError)}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                  {targetError && <p className="text-[12px] text-[var(--danger)] mt-1">{targetError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auto-type" className="block text-[13px] font-medium text-[var(--text)] mb-1">
                      Probe type
                    </label>
                    <Select
                      id="auto-type"
                      value={testType}
                      options={PROBE_TYPE_OPTIONS}
                      onChange={(e) => setTestType(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="auto-interval" className="block text-[13px] font-medium text-[var(--text)] mb-1">
                      Interval (15–86400s)
                    </label>
                    <TextInput
                      id="auto-interval"
                      type="number"
                      min={15}
                      max={86400}
                      mono
                      invalid={Boolean(intervalError)}
                      value={intervalSec}
                      onChange={(e) => setIntervalSec(Number(e.target.value))}
                    />
                  </div>
                </div>
                {intervalError && <p className="text-[12px] text-[var(--danger)]">{intervalError}</p>}

                {/* Live Schedule Preview */}
                <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5">
                  <div className="flex items-center justify-between text-[12px] font-semibold text-[var(--text)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                      <span>Schedule preview</span>
                    </span>
                    <span className="font-mono text-[var(--accent)]">
                      ~{modalRunsPerDay.toLocaleString()} runs/day
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    {targetError || intervalError ? (
                      <span className="inline-flex items-center gap-1 text-[var(--warn)]">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Fix highlighted fields to preview cadence.</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" aria-hidden="true" />
                        <span>
                          Runs <strong>{testType === 'tcp_probe' ? 'TCP :443' : 'ICMP ping'}</strong> against{' '}
                          <code className="font-mono">{target.trim()}</code> every{' '}
                          <strong>{formatIntervalLabel(intervalSec)}</strong>, starting immediately once enabled.
                        </span>
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] font-medium text-[var(--text)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || Boolean(nameError || targetError || intervalError)}
                    className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold disabled:opacity-50"
                  >
                    Create & enable
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name || ''}"?`}
        description="This stops and removes the scheduled background probe job from SQLite."
        confirmLabel="Delete schedule"
        tone="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
