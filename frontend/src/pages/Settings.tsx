import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Globe,
  Activity,
  Shield,
  Loader2,
  ExternalLink,
  Info,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { SettingsCard } from '../components/ui/SettingsCard';
import { Field } from '../components/ui/Field';
import { TextInput } from '../components/ui/TextInput';
import { Slider } from '../components/ui/Slider';
import { Switch } from '../components/ui/Switch';
import { StatusChip, StatusTone } from '../components/ui/StatusChip';
import { ActionBar } from '../components/ui/ActionBar';
import { Dialog } from '../components/ui/Dialog';
import { Tooltip } from '../components/ui/Tooltip';
import { useToast } from '../components/ui/Toast';
import { useDemoMode } from '../contexts/DemoModeContext';
import { DEFAULT_API_URL, testGatewayConnection } from '../services/api';
import { formatRelativeTime, formatTimestampUtc } from '../utils/formatters';

export interface PlatformConfig {
  gatewayUrl: string;
  pollingIntervalSec: number;
  passiveEnumeration: boolean;
  manualTargetSelection: boolean;
}

const DEFAULT_CONFIG: PlatformConfig = {
  gatewayUrl: DEFAULT_API_URL,
  pollingIntervalSec: 5,
  passiveEnumeration: true,
  manualTargetSelection: true,
};

const STORAGE_KEYS = {
  url: 'netpulse_gateway_url',
  polling: 'netpulse_polling_sec',
  passive: 'netpulse_passive_only',
  manual: 'netpulse_confirm_probes',
  draft: 'netpulse_settings_draft',
  savedAt: 'netpulse_settings_saved_at',
  version: 'netpulse_settings_rev',
};

const loadSavedConfig = (): PlatformConfig => {
  try {
    const url = window.localStorage.getItem(STORAGE_KEYS.url) || DEFAULT_CONFIG.gatewayUrl;
    const rawPoll = Number(window.localStorage.getItem(STORAGE_KEYS.polling));
    const pollingIntervalSec =
      rawPoll >= 2 && rawPoll <= 30 ? rawPoll : DEFAULT_CONFIG.pollingIntervalSec;
    const passiveEnumeration = window.localStorage.getItem(STORAGE_KEYS.passive) !== 'false';
    const manualTargetSelection = window.localStorage.getItem(STORAGE_KEYS.manual) !== 'false';
    return {
      gatewayUrl: url.trim().replace(/\/+$/, ''),
      pollingIntervalSec,
      passiveEnumeration,
      manualTargetSelection,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

const validateGatewayUrl = (
  raw: string
): { error: string | null; warning: string | null; normalized: string } => {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return {
      error: 'Gateway URL is required. Enter a valid HTTP or HTTPS address.',
      warning: null,
      normalized: trimmed,
    };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        error: 'URL must start with http:// or https://.',
        warning: null,
        normalized: trimmed,
      };
    }
    const isLocal =
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '::1';

    const warning =
      parsed.protocol === 'http:' && !isLocal
        ? 'Plain HTTP sends telemetry unencrypted. Use HTTPS for non-local hosts.'
        : null;

    return { error: null, warning, normalized: trimmed };
  } catch {
    return {
      error: 'Enter a valid URL such as http://127.0.0.1:8000.',
      warning: null,
      normalized: trimmed,
    };
  }
};

interface SettingsPageProps {
  backendOnline: boolean;
  gatewayLatencyMs?: number;
  sidebarCollapsed?: boolean;
  onConfigSaved?: (cfg: PlatformConfig) => void;
  onRetryGateway?: () => void;
}

type SectionKey = 'gateway' | 'telemetry' | 'safety';

const POLL_TICKS = [
  { value: 2, label: '2s' },
  { value: 5, label: 'Default' },
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  backendOnline,
  gatewayLatencyMs,
  sidebarCollapsed = false,
  onConfigSaved,
  onRetryGateway,
}) => {
  const { addToast } = useToast();
  const { demoMode, setDemoMode, maskText } = useDemoMode();

  const [savedConfig, setSavedConfig] = useState<PlatformConfig>(loadSavedConfig);
  const [form, setForm] = useState<PlatformConfig>(() => {
    try {
      const rawDraft = window.localStorage.getItem(STORAGE_KEYS.draft);
      if (rawDraft) return JSON.parse(rawDraft);
    } catch {
      // Fallback to saved config
    }
    return loadSavedConfig();
  });

  const [configVersion, setConfigVersion] = useState<number>(() => {
    try {
      return Number(window.localStorage.getItem(STORAGE_KEYS.version)) || 1;
    } catch {
      return 1;
    }
  });

  const [lastSavedIso, setLastSavedIso] = useState<string | null>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.savedAt);
      if (!raw || raw === 'Not saved yet') return null;
      return raw;
    } catch {
      return null;
    }
  });

  const [activeSection, setActiveSection] = useState<SectionKey>('gateway');
  const [connTestState, setConnTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connTestLatencyMs, setConnTestLatencyMs] = useState<number | null>(null);
  const [connTestVersion, setConnTestVersion] = useState<string | null>(null);
  const [connTestMessage, setConnTestMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const [pendingDisablePolicy, setPendingDisablePolicy] = useState<
    'passiveEnumeration' | 'manualTargetSelection' | null
  >(null);
  const [auditNotes, setAuditNotes] = useState<Record<string, string>>({});
  const [learnMorePolicy, setLearnMorePolicy] = useState<
    'passiveEnumeration' | 'manualTargetSelection' | null
  >(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    gateway: null,
    telemetry: null,
    safety: null,
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(form));
    } catch {
      // Ignore quota errors
    }
  }, [form]);

  const dirtyFields = useMemo(() => {
    let count = 0;
    if (form.gatewayUrl.trim().replace(/\/+$/, '') !== savedConfig.gatewayUrl) count += 1;
    if (form.pollingIntervalSec !== savedConfig.pollingIntervalSec) count += 1;
    if (form.passiveEnumeration !== savedConfig.passiveEnumeration) count += 1;
    if (form.manualTargetSelection !== savedConfig.manualTargetSelection) count += 1;
    return count;
  }, [form, savedConfig]);

  const isDirty = dirtyFields > 0;
  const urlValidation = useMemo(() => validateGatewayUrl(form.gatewayUrl), [form.gatewayUrl]);
  const hasValidationError = Boolean(urlValidation.error);
  const urlChangedFromSaved = urlValidation.normalized !== savedConfig.gatewayUrl;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleScroll = () => {
      const keys: SectionKey[] = ['gateway', 'telemetry', 'safety'];
      for (const k of keys) {
        const el = sectionRefs.current[k];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < 280) {
          setActiveSection(k);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (key: SectionKey) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTestConnection = useCallback(async () => {
    if (urlValidation.error) {
      setConnTestState('error');
      setConnTestLatencyMs(null);
      setConnTestVersion(null);
      setConnTestMessage(urlValidation.error);
      return;
    }

    const clean = urlValidation.normalized;
    setForm((prev) => ({ ...prev, gatewayUrl: clean }));
    setConnTestState('testing');
    setConnTestLatencyMs(null);
    setConnTestVersion(null);
    setConnTestMessage(null);

    const res = await testGatewayConnection(clean);
    if (res.ok) {
      setConnTestState('success');
      setConnTestLatencyMs(res.latencyMs);
      setConnTestVersion(res.version || null);
      setConnTestMessage(`Connected in ${res.latencyMs} ms (${res.version || 'API ready'}).`);
      addToast({
        tone: 'ok',
        title: 'Gateway reachable',
        description: `Responded in ${res.latencyMs} ms.`,
      });
    } else {
      setConnTestState('error');
      setConnTestLatencyMs(res.latencyMs);
      setConnTestVersion(null);
      setConnTestMessage(
        res.error || "Can't reach server. Verify the URL and ensure FastAPI is running."
      );
      addToast({
        tone: 'danger',
        title: 'Connection test failed',
        description: res.error || "Can't reach server.",
        action: { label: 'Retry', onClick: handleTestConnection },
      });
    }
  }, [urlValidation, addToast]);

  const handleSave = useCallback(async () => {
    if (hasValidationError || !isDirty) return;

    const normalizedConfig: PlatformConfig = {
      ...form,
      gatewayUrl: urlValidation.normalized,
    };

    setSaveState('saving');
    setSaveErrorMsg(null);
    await new Promise((r) => setTimeout(r, 220));

    try {
      const nextRev = configVersion + 1;
      const nowIso = new Date().toISOString();

      window.localStorage.setItem(STORAGE_KEYS.url, normalizedConfig.gatewayUrl);
      window.localStorage.setItem(STORAGE_KEYS.polling, String(normalizedConfig.pollingIntervalSec));
      window.localStorage.setItem(STORAGE_KEYS.passive, String(normalizedConfig.passiveEnumeration));
      window.localStorage.setItem(STORAGE_KEYS.manual, String(normalizedConfig.manualTargetSelection));
      window.localStorage.setItem(STORAGE_KEYS.savedAt, nowIso);
      window.localStorage.setItem(STORAGE_KEYS.version, String(nextRev));
      window.localStorage.removeItem(STORAGE_KEYS.draft);

      setSavedConfig(normalizedConfig);
      setForm(normalizedConfig);
      setConfigVersion(nextRev);
      setLastSavedIso(nowIso);
      setSaveState('saved');
      onConfigSaved?.(normalizedConfig);

      addToast({
        tone: 'ok',
        title: `Settings applied (revision v${nextRev})`,
        description: `Polling every ${normalizedConfig.pollingIntervalSec}s at ${normalizedConfig.gatewayUrl}.`,
      });

      window.setTimeout(() => {
        setSaveState('idle');
      }, 1400);
    } catch {
      setSaveState('error');
      setSaveErrorMsg('Unable to persist settings in browser storage.');
    }
  }, [hasValidationError, isDirty, form, urlValidation.normalized, configVersion, onConfigSaved, addToast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isDirty && !hasValidationError) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDirty, hasValidationError, handleSave]);

  const handleDiscard = () => {
    setForm(savedConfig);
    setSaveState('idle');
    setSaveErrorMsg(null);
    setConnTestState('idle');
    setConnTestLatencyMs(null);
    setConnTestVersion(null);
    setConnTestMessage(null);
    addToast({ tone: 'info', title: 'Unsaved changes discarded' });
  };

  const handleResetToDefaults = () => {
    setForm(DEFAULT_CONFIG);
    setResetConfirmOpen(false);
    addToast({
      tone: 'info',
      title: 'Factory defaults staged',
      description: 'Review staged settings and click Save changes to apply, or Discard to cancel.',
    });
  };

  const handlePolicyToggle = (
    key: 'passiveEnumeration' | 'manualTargetSelection',
    nextVal: boolean
  ) => {
    if (!nextVal) {
      setPendingDisablePolicy(key);
    } else {
      setForm((prev) => ({ ...prev, [key]: true }));
      setAuditNotes((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const confirmDisablePolicy = () => {
    if (!pendingDisablePolicy) return;
    const key = pendingDisablePolicy;
    const stamp = formatTimestampUtc(new Date());
    setForm((prev) => ({ ...prev, [key]: false }));
    setAuditNotes((prev) => ({
      ...prev,
      [key]: `Override logged at ${stamp} (pending Save)`,
    }));
    addToast({
      tone: 'warn',
      title: 'Safety guardrail staged as disabled',
      description: 'Save changes to apply this override.',
    });
    setPendingDisablePolicy(null);
  };

  const activePoliciesCount =
    (form.passiveEnumeration ? 1 : 0) + (form.manualTargetSelection ? 1 : 0);
  const safetyChip: { tone: StatusTone; label: string } =
    activePoliciesCount === 2
      ? { tone: 'ok', label: 'All policies active' }
      : activePoliciesCount === 1
      ? { tone: 'warn', label: '1 of 2 active' }
      : { tone: 'danger', label: 'No policies active' };

  const requestsPerMin = Math.round(60 / form.pollingIntervalSec);

  const formattedLastSaved = useMemo(() => {
    if (!lastSavedIso) return 'Default baseline (not yet modified)';
    const utc = formatTimestampUtc(lastSavedIso);
    if (utc === 'No data') return lastSavedIso;
    const rel = formatRelativeTime(lastSavedIso);
    return `${utc} (${rel})`;
  }, [lastSavedIso]);

  return (
    <div className="w-full pb-28">
      {/* Header & Local Section Anchor Navigation */}
      <div className="mb-6 space-y-4">
        <div className="space-y-1">
          <h1 className="np-page-title">Platform settings</h1>
          <p className="np-helper">
            Configure gateway connectivity, background telemetry cadence, and operational probing safety guardrails.
          </p>
        </div>

        <nav aria-label="Settings sections" className="flex items-center gap-1 border-b border-[var(--border)]">
          {(
            [
              { id: 'gateway', label: 'Gateway' },
              { id: 'telemetry', label: 'Telemetry' },
              { id: 'safety', label: 'Safety' },
            ] as const
          ).map((tab) => {
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(tab.id)}
                className={`h-10 px-3 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-[var(--dur-micro)] ${
                  active
                    ? 'border-[var(--accent)] text-[var(--text)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Responsive Two-Column Grid with minmax(0,1fr) so Side Card NEVER Overflows/Clips */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Left: Main Settings Form */}
        <div className="space-y-6 min-w-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            noValidate
            className="space-y-6"
          >
            {/* 1. Gateway Section */}
            <div
              ref={(el) => {
                sectionRefs.current.gateway = el;
              }}
            >
              <SettingsCard
                id="gateway"
                icon={Globe}
                title="Gateway"
                description="Control-plane gateway used by all dashboard telemetry and diagnostic operations."
                statusSlot={
                  <Tooltip content="Runs locally over FastAPI & Uvicorn">
                    <span className="inline-flex items-center gap-1 text-[12px] text-[var(--text-muted)] cursor-help">
                      <Info className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>FastAPI host</span>
                    </span>
                  </Tooltip>
                }
              >
                <Field
                  id="api-server-url"
                  label="Gateway URL"
                  helper={`Default: ${DEFAULT_API_URL}. Consequence: changing this immediately switches where all live probes, alerts, and history queries execute.`}
                  error={urlValidation.error}
                  warning={urlValidation.warning}
                >
                  <TextInput
                    id="api-server-url"
                    type="url"
                    mono
                    value={form.gatewayUrl}
                    invalid={Boolean(urlValidation.error) || connTestState === 'error'}
                    describedBy="api-server-url-helper api-server-url-feedback"
                    placeholder={DEFAULT_API_URL}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, gatewayUrl: e.target.value }));
                      if (connTestState !== 'idle') {
                        setConnTestState('idle');
                        setConnTestLatencyMs(null);
                        setConnTestVersion(null);
                        setConnTestMessage(null);
                      }
                    }}
                    onBlur={() => {
                      const clean = form.gatewayUrl.trim().replace(/\/+$/, '');
                      if (clean !== form.gatewayUrl) {
                        setForm((prev) => ({ ...prev, gatewayUrl: clean }));
                      }
                    }}
                    leftIcon={<Globe className="w-4 h-4" />}
                    rightAction={
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={connTestState === 'testing' || Boolean(urlValidation.error)}
                        className="h-8 px-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[12px] font-medium text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-50 inline-flex items-center gap-2 transition-colors"
                      >
                        {connTestState === 'testing' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" aria-hidden="true" />
                            <span>Testing…</span>
                          </>
                        ) : (
                          <span>Test connection</span>
                        )}
                      </button>
                    }
                  />
                </Field>

                {/* Inline Connection Test Result with Measured Latency */}
                {connTestState !== 'idle' && (
                  <div
                    role="status"
                    className={`p-3 rounded-[var(--radius-control)] border flex flex-wrap items-center justify-between gap-2 text-[12px] ${
                      connTestState === 'success'
                        ? 'bg-[var(--ok-soft)] border-[var(--ok)]/35 text-[var(--ok)]'
                        : connTestState === 'error'
                        ? 'bg-[var(--danger-soft)] border-[var(--danger)]/35 text-[var(--danger)]'
                        : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 font-medium">
                      {connTestState === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      ) : connTestState === 'error' ? (
                        <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                      )}
                      <span>
                        {connTestState === 'testing'
                          ? `Probing ${urlValidation.normalized}/health…`
                          : connTestMessage}
                      </span>
                    </span>

                    {connTestLatencyMs !== null && (
                      <span className="font-mono font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] np-mono-val">
                        {connTestLatencyMs} ms{connTestVersion ? ` · ${connTestVersion}` : ''}
                      </span>
                    )}
                  </div>
                )}

                {urlChangedFromSaved && !urlValidation.error && (
                  <p className="flex items-center gap-2 text-[13px] text-[var(--warn)]">
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Saving this new URL reconnects all live telemetry pollers immediately.</span>
                  </p>
                )}
              </SettingsCard>
            </div>

            {/* 2. Telemetry Section */}
            <div
              ref={(el) => {
                sectionRefs.current.telemetry = el;
              }}
            >
              <SettingsCard
                id="telemetry"
                icon={Activity}
                title="Telemetry cadence"
                description="Controls background polling frequency for health, latency metrics, and topology status."
                statusSlot={
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/35 text-[var(--accent)] np-mono-val text-[12px]">
                    {form.pollingIntervalSec} s
                  </span>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="np-field-label">Polling interval</span>
                    <span className="text-[12px] font-mono text-[var(--text-muted)]">
                      ~{requestsPerMin} req/min to gateway
                    </span>
                  </div>

                  <Slider
                    value={form.pollingIntervalSec}
                    min={2}
                    max={30}
                    step={1}
                    ticks={POLL_TICKS}
                    minLabel="2s · lowest lag"
                    maxLabel="30s · lowest CPU"
                    unit="s"
                    ariaLabel="Polling interval"
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, pollingIntervalSec: val }))
                    }
                  />

                  <p className="text-[12px] text-[var(--text-secondary)]">
                    <strong>Consequence:</strong> Shorter intervals (2–4s) surface link drops faster but increase local socket and backend SQLite reads; 10–30s reduces CPU and battery overhead.
                  </p>

                  {form.pollingIntervalSec < 3 && (
                    <p className="flex items-start gap-1.5 text-[13px] leading-5 text-[var(--warn)]">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>High polling cadence (2s) increases CPU and socket activity on the backend.</span>
                    </p>
                  )}
                </div>
              </SettingsCard>
            </div>

            {/* 3. Safety Section */}
            <div
              ref={(el) => {
                sectionRefs.current.safety = el;
              }}
            >
              <SettingsCard
                id="safety"
                icon={Shield}
                title="Safety policies"
                description="Operational guardrails preventing unintended active subnet sweeps or unapproved probes."
                statusSlot={<StatusChip size="sm" tone={safetyChip.tone} label={safetyChip.label} />}
              >
                <div className="space-y-3">
                  <Switch
                    checked={form.passiveEnumeration}
                    onChange={(next) => handlePolicyToggle('passiveEnumeration', next)}
                    title="Passive local enumeration"
                    description="Uses OS routing tables and kernel ARP cache instead of subnet-wide sweeps. Consequence of disabling: permits active subnet discovery traffic on LAN links."
                    onLearnMore={() => setLearnMorePolicy('passiveEnumeration')}
                    auditNote={auditNotes.passiveEnumeration}
                  />

                  <Switch
                    checked={form.manualTargetSelection}
                    onChange={(next) => handlePolicyToggle('manualTargetSelection', next)}
                    title="Manual target selection for active probes"
                    description="Requires operator confirmation before transmitting ICMP, TCP, or traceroute traffic. Consequence of disabling: automated triggers can send packets without review."
                    onLearnMore={() => setLearnMorePolicy('manualTargetSelection')}
                    auditNote={auditNotes.manualTargetSelection}
                  />

                  <Switch
                    checked={demoMode}
                    onChange={(next) => setDemoMode(next)}
                    title="Demo screenshot privacy mask"
                    description="Deterministically masks internal IP addresses, hostnames, and MAC addresses across dashboards, topology, tables, and logs for safe screenshot sharing."
                  />
                </div>
              </SettingsCard>
            </div>

            {/* Footer with Confirm-Before-Reset */}
            <footer className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)]">
              <span className="text-[12px] text-[var(--text-muted)]">
                Settings persist in this console and apply immediately on save.
              </span>
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="h-9 px-3 rounded-[var(--radius-control)] inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset to defaults</span>
              </button>
            </footer>
          </form>
        </div>

        {/* Right Sticky Summary Card — properly constrained with w-full min-w-0 so NEVER clipped */}
        <aside aria-label="Current configuration summary" className="w-full min-w-0 lg:sticky lg:top-20">
          <div className="np-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
              <h2 className="np-section-title">Active configuration</h2>
              <StatusChip
                size="sm"
                tone={backendOnline ? 'ok' : 'danger'}
                label={backendOnline ? 'Online' : 'Offline'}
                pulseWhenLiveOrDegraded={!backendOnline}
              />
            </div>

            <dl className="space-y-3.5 text-[13px]">
              <div className="space-y-1">
                <dt className="text-[var(--text-muted)]">Saved gateway URL</dt>
                <dd className="np-mono-val text-[var(--text)] break-all" title={maskText(savedConfig.gatewayUrl)}>
                  {maskText(savedConfig.gatewayUrl)}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Polling cadence</dt>
                <dd className="np-mono-val text-[var(--text)]">{savedConfig.pollingIntervalSec} s</dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Gateway latency</dt>
                <dd className="np-mono-val text-[var(--text)]">
                  {backendOnline && gatewayLatencyMs !== undefined ? `${gatewayLatencyMs} ms` : '—'}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Safety guardrails</dt>
                <dd className="np-mono-val text-[var(--text)]">
                  {(savedConfig.passiveEnumeration ? 1 : 0) +
                    (savedConfig.manualTargetSelection ? 1 : 0)}{' '}
                  of 2 active
                </dd>
              </div>

              <div className="pt-2 border-t border-[var(--border)] space-y-1">
                <dt className="text-[var(--text-muted)]">Last saved revision</dt>
                <dd className="font-mono text-[12px] text-[var(--text-secondary)] leading-5">
                  {formattedLastSaved}
                  {lastSavedIso ? ` · v${configVersion}` : ''}
                </dd>
              </div>
            </dl>

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
              <a
                href={`${savedConfig.gatewayUrl}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                <span>OpenAPI docs</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>

              {!backendOnline && onRetryGateway && (
                <button
                  type="button"
                  onClick={onRetryGateway}
                  className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)]"
                >
                  Retry connection
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Save / Discard Bar on Unsaved Changes */}
      <ActionBar
        visible={isDirty}
        dirtyCount={dirtyFields}
        invalid={hasValidationError}
        saveState={saveState}
        errorMessage={saveErrorMsg}
        onReset={handleDiscard}
        onSave={handleSave}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Safety Policy Disable Confirmation Dialog */}
      <Dialog
        open={pendingDisablePolicy !== null}
        onClose={() => setPendingDisablePolicy(null)}
        onConfirm={confirmDisablePolicy}
        tone="danger"
        title={
          pendingDisablePolicy === 'passiveEnumeration'
            ? 'Disable passive enumeration?'
            : 'Disable manual target confirmation?'
        }
        description={
          pendingDisablePolicy === 'passiveEnumeration'
            ? 'NetPulse will be permitted to run active discovery probes across local subnets.'
            : 'Active ICMP and TCP probes can dispatch automatically without per-target operator confirmation.'
        }
        confirmLabel="Stage override"
        cancelLabel="Keep policy enabled"
      />

      {/* Confirm Before Reset Dialog */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetToDefaults}
        tone="danger"
        title="Reset settings to factory defaults?"
        description="This stages the default gateway URL (http://127.0.0.1:8000), 5s telemetry polling interval, and enables both safety policies. You can review or Discard before saving."
        confirmLabel="Confirm reset to defaults"
        cancelLabel="Cancel"
      />

      {/* Policy Documentation Dialog */}
      <Dialog
        open={learnMorePolicy !== null}
        onClose={() => setLearnMorePolicy(null)}
        onConfirm={() => setLearnMorePolicy(null)}
        tone="accent"
        title={
          learnMorePolicy === 'passiveEnumeration'
            ? 'Passive local enumeration'
            : 'Manual target selection'
        }
        description={
          learnMorePolicy === 'passiveEnumeration'
            ? 'Reads OS routing tables and kernel ARP cache without transmitting intrusive subnet sweeps.'
            : 'Requires explicit target approval before dispatching active ICMP, TCP, or traceroute packets.'
        }
        confirmLabel="Got it"
        cancelLabel="Close"
      >
        <div className="p-3 rounded-[var(--radius-control)] bg-[var(--bg-elev-2)] border border-[var(--border)] flex items-center gap-2 text-[12px] text-[var(--ok)]">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Recommended for production and shared lab environments.</span>
        </div>
      </Dialog>
    </div>
  );
};
