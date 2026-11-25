import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Globe,
  Activity,
  Shield,
  Loader2,
  ExternalLink,
  Lock,
  Info,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
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
import { SettingsSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { DEFAULT_API_URL, testGatewayConnection } from '../services/api';

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
    const pollingIntervalSec = rawPoll >= 2 && rawPoll <= 30 ? rawPoll : DEFAULT_CONFIG.pollingIntervalSec;
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

const validateGatewayUrl = (raw: string): { error: string | null; warning: string | null; normalized: string } => {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return { error: 'API server URL is required. Enter a valid HTTP or HTTPS address.', warning: null, normalized: trimmed };
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

  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.savedAt) || 'Not saved yet';
    } catch {
      return 'Not saved yet';
    }
  });

  // UI & Validation States
  const [activeSection, setActiveSection] = useState<SectionKey>('gateway');
  const [connTestState, setConnTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connTestMessage, setConnTestMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Safety Confirmation Dialog State
  const [pendingDisablePolicy, setPendingDisablePolicy] = useState<'passiveEnumeration' | 'manualTargetSelection' | null>(null);
  const [auditNotes, setAuditNotes] = useState<Record<string, string>>({});
  const [learnMorePolicy, setLearnMorePolicy] = useState<'passiveEnumeration' | 'manualTargetSelection' | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Preview / Edge-state switches (read-only permission-denied, loading skeleton, simulate save failure)
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [simulateSaveFail, setSimulateSaveFail] = useState(false);

  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    gateway: null,
    telemetry: null,
    safety: null,
  });

  // Persist draft safely
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(form));
    } catch {
      // Ignore quota errors
    }
  }, [form]);

  // Dirty tracking
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

  // Warn before browser unload if dirty
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

  // Scroll-spy for local section nav
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
    const el = sectionRefs.current[key];
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Test Connection
  const handleTestConnection = useCallback(async () => {
    if (urlValidation.error) {
      setConnTestState('error');
      setConnTestMessage(urlValidation.error);
      return;
    }

    const clean = urlValidation.normalized;
    setForm((prev) => ({ ...prev, gatewayUrl: clean }));
    setConnTestState('testing');
    setConnTestMessage(null);

    const res = await testGatewayConnection(clean);
    if (res.ok) {
      setConnTestState('success');
      setConnTestMessage(`Connected · ${res.latencyMs} ms · ${res.version}`);
      addToast({
        tone: 'ok',
        title: 'Gateway reachable',
        description: `Responded in ${res.latencyMs} ms (${res.version}).`,
      });
    } else {
      setConnTestState('error');
      setConnTestMessage("Can't reach server. Check the address and that the service is running.");
      addToast({
        tone: 'danger',
        title: 'Connection test failed',
        description: "Can't reach server. Check the address and that the service is running.",
        action: { label: 'Retry', onClick: handleTestConnection },
      });
    }
  }, [urlValidation, addToast]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (readOnlyMode || hasValidationError || !isDirty) return;

    const normalizedConfig: PlatformConfig = {
      ...form,
      gatewayUrl: urlValidation.normalized,
    };

    setSaveState('saving');
    setSaveErrorMsg(null);

    // Realistic transition delay so spinner & locked button width behave smoothly
    await new Promise((r) => setTimeout(r, 320));

    if (simulateSaveFail) {
      setSaveState('error');
      setSaveErrorMsg('Gateway rejected configuration update (simulated 503).');
      addToast({
        tone: 'danger',
        title: 'Failed to save settings',
        description: 'Gateway rejected configuration update. Check connectivity and retry.',
        action: { label: 'Retry', onClick: handleSave },
      });
      return;
    }

    try {
      const nextRev = configVersion + 1;
      const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      window.localStorage.setItem(STORAGE_KEYS.url, normalizedConfig.gatewayUrl);
      window.localStorage.setItem(STORAGE_KEYS.polling, String(normalizedConfig.pollingIntervalSec));
      window.localStorage.setItem(STORAGE_KEYS.passive, String(normalizedConfig.passiveEnumeration));
      window.localStorage.setItem(STORAGE_KEYS.manual, String(normalizedConfig.manualTargetSelection));
      window.localStorage.setItem(STORAGE_KEYS.savedAt, nowLabel);
      window.localStorage.setItem(STORAGE_KEYS.version, String(nextRev));
      window.localStorage.removeItem(STORAGE_KEYS.draft);

      setSavedConfig(normalizedConfig);
      setForm(normalizedConfig);
      setConfigVersion(nextRev);
      setLastSavedTime(nowLabel);
      setSaveState('saved');
      onConfigSaved?.(normalizedConfig);

      addToast({
        tone: 'ok',
        title: `Settings saved · applied to gateway (v${nextRev})`,
        description: `Polling every ${normalizedConfig.pollingIntervalSec}s at ${normalizedConfig.gatewayUrl}.`,
      });

      window.setTimeout(() => {
        setSaveState('idle');
      }, 1500);
    } catch {
      setSaveState('error');
      setSaveErrorMsg('Unable to persist settings in browser storage.');
    }
  }, [
    readOnlyMode,
    hasValidationError,
    isDirty,
    form,
    urlValidation.normalized,
    simulateSaveFail,
    configVersion,
    onConfigSaved,
    addToast,
  ]);

  // Keyboard shortcut Cmd/Ctrl+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isDirty && !hasValidationError && !readOnlyMode) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDirty, hasValidationError, readOnlyMode, handleSave]);

  const handleReset = () => {
    setForm(savedConfig);
    setSaveState('idle');
    setSaveErrorMsg(null);
    setConnTestState('idle');
    setConnTestMessage(null);
  };

  const handleResetToDefaults = () => {
    setForm(DEFAULT_CONFIG);
    setResetConfirmOpen(false);
    addToast({
      tone: 'info',
      title: 'Default values staged',
      description: 'Review the defaults and click Save changes to apply.',
    });
  };

  // Safety policy switch handler (requires confirmation when turning OFF)
  const handlePolicyToggle = (key: 'passiveEnumeration' | 'manualTargetSelection', nextVal: boolean) => {
    if (readOnlyMode) return;
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
    const stamp = new Date().toISOString().substring(11, 19) + ' UTC';
    setForm((prev) => ({ ...prev, [key]: false }));
    setAuditNotes((prev) => ({
      ...prev,
      [key]: `Audit note: Policy disabled by operator at ${stamp}`,
    }));
    addToast({
      tone: 'warn',
      title: 'Safety policy disabled',
      description: 'This override is logged for operational review. Save changes to apply.',
    });
    setPendingDisablePolicy(null);
  };

  // Dynamic Safety Summary
  const activePoliciesCount =
    (form.passiveEnumeration ? 1 : 0) + (form.manualTargetSelection ? 1 : 0);
  const safetyChip: { tone: StatusTone; label: string } =
    activePoliciesCount === 2
      ? { tone: 'ok', label: 'All policies active' }
      : activePoliciesCount === 1
      ? { tone: 'warn', label: '1 of 2 active' }
      : { tone: 'danger', label: 'No policies active' };

  const requestsPerMin = Math.round(60 / form.pollingIntervalSec);

  const triggerLoadingPreview = () => {
    setIsLoadingPreview(true);
    window.setTimeout(() => setIsLoadingPreview(false), 1200);
  };

  return (
    <div className="max-w-[1040px] mx-auto pb-28">
      {/* Page Title & Local Anchor Navigation */}
      <div className="mb-6 space-y-4">
        <div className="space-y-1">
          <h1 className="np-page-title">Platform settings</h1>
          <p className="np-helper">
            Configure the API server connection, background telemetry polling cadence, and active probing guardrails.
          </p>
        </div>

        {/* Local Section Anchor Nav */}
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

      {/* Permission-Denied / Read-Only Mode Banner */}
      {readOnlyMode && (
        <div
          role="status"
          className="mb-6 p-4 rounded-[var(--radius-card)] bg-[var(--warn-soft)] border border-[var(--warn)]/35 flex items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-[var(--warn)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-[var(--text)]">
                Read-only mode active
              </p>
              <p className="text-[13px] text-[var(--text-secondary)]">
                You do not have write permissions to modify platform configuration. Controls are locked.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReadOnlyMode(false)}
            className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--bg-elev-1)] border border-[var(--border-strong)] text-[13px] font-medium text-[var(--text)] hover:bg-[var(--bg-hover)] shrink-0"
          >
            Unlock
          </button>
        </div>
      )}

      {/* Two-Column Content Grid (>=1280px: Form + 320px Sticky Rail) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main Settings Form */}
        <div className="space-y-6 min-w-0">
          {isLoadingPreview ? (
            <SettingsSkeleton />
          ) : (
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
                  description="Address where the control-plane API listens for health and diagnostic commands."
                  statusSlot={
                    <Tooltip content="Runs locally over FastAPI & Uvicorn">
                      <span className="inline-flex items-center gap-1 text-[12px] text-[var(--text-muted)] cursor-help">
                        <Info className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Advanced</span>
                      </span>
                    </Tooltip>
                  }
                >
                  <Field
                    id="api-server-url"
                    label="API server URL"
                    helper={`The address of your NetPulse backend. Default: ${DEFAULT_API_URL}`}
                    error={urlValidation.error || (connTestState === 'error' ? connTestMessage : null)}
                    warning={urlValidation.warning}
                    success={connTestState === 'success' ? connTestMessage : null}
                  >
                    <TextInput
                      id="api-server-url"
                      type="url"
                      mono
                      disabled={readOnlyMode}
                      value={form.gatewayUrl}
                      invalid={Boolean(urlValidation.error) || connTestState === 'error'}
                      describedBy="api-server-url-helper api-server-url-feedback"
                      placeholder={DEFAULT_API_URL}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, gatewayUrl: e.target.value }));
                        if (connTestState !== 'idle') {
                          setConnTestState('idle');
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
                          disabled={readOnlyMode || connTestState === 'testing' || Boolean(urlValidation.error)}
                          className="h-8 px-3 rounded-[6px] bg-[var(--bg-elev-1)] border border-[var(--border-strong)] text-[12px] font-medium text-[var(--text)] hover:bg-[var(--bg-hover)] disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
                        >
                          {connTestState === 'testing' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" aria-hidden="true" />
                              <span>Testing…</span>
                            </>
                          ) : connTestState === 'error' ? (
                            <span>Retry</span>
                          ) : (
                            <span>Test connection</span>
                          )}
                        </button>
                      }
                    />
                  </Field>

                  {urlChangedFromSaved && !urlValidation.error && (
                    <p className="flex items-center gap-2 text-[13px] text-[var(--warn)]">
                      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Changing this reconnects all live views</span>
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
                  title="Telemetry"
                  description="Frequency at which the dashboard polls the gateway for health and host metrics."
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
                        ~{requestsPerMin} requests/min to the gateway
                      </span>
                    </div>

                    <Slider
                      value={form.pollingIntervalSec}
                      min={2}
                      max={30}
                      step={1}
                      ticks={POLL_TICKS}
                      minLabel="Faster · more load"
                      maxLabel="Slower · less load"
                      unit="s"
                      ariaLabel="Polling interval"
                      disabled={readOnlyMode}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, pollingIntervalSec: val }))
                      }
                    />

                    {form.pollingIntervalSec < 3 && (
                      <p className="flex items-start gap-1.5 text-[13px] leading-5 text-[var(--warn)]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>High frequency may increase CPU use on the backend.</span>
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
                  description="Operational guardrails protecting local and external networks from unapproved traffic."
                  statusSlot={
                    <StatusChip size="sm" tone={safetyChip.tone} label={safetyChip.label} />
                  }
                >
                  <div className="space-y-3">
                    <Switch
                      checked={form.passiveEnumeration}
                      disabled={readOnlyMode}
                      onChange={(next) => handlePolicyToggle('passiveEnumeration', next)}
                      title="Passive local enumeration"
                      description="Discover local interfaces and neighbors using OS route and ARP tables without external port sweeps."
                      onLearnMore={() => setLearnMorePolicy('passiveEnumeration')}
                      auditNote={auditNotes.passiveEnumeration}
                    />

                    <Switch
                      checked={form.manualTargetSelection}
                      disabled={readOnlyMode}
                      onChange={(next) => handlePolicyToggle('manualTargetSelection', next)}
                      title="Manual target selection for active probes"
                      description="Require explicit operator approval before sending ICMP, TCP, or traceroute packets to any host."
                      onLearnMore={() => setLearnMorePolicy('manualTargetSelection')}
                      auditNote={auditNotes.manualTargetSelection}
                    />
                  </div>
                </SettingsCard>
              </div>

              {/* Page Footer */}
              <footer className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)]">
                <span className="text-[12px] text-[var(--text-muted)]">
                  Preferences apply to this operator console and sync immediately on save.
                </span>
                <button
                  type="button"
                  disabled={readOnlyMode}
                  onClick={() => setResetConfirmOpen(true)}
                  className="h-9 px-2.5 rounded-[var(--radius-control)] inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset to defaults</span>
                </button>
              </footer>
            </form>
          )}
        </div>

        {/* Sticky Right Rail: Current Configuration (>=1280px beside form, below on smaller) */}
        <aside aria-label="Current configuration summary" className="xl:sticky xl:top-24 space-y-4">
          <div className="np-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--border)]">
              <h2 className="np-section-title">Current configuration</h2>
              <StatusChip
                size="sm"
                tone={backendOnline ? 'ok' : 'danger'}
                label={backendOnline ? 'Online' : 'Offline'}
                pulseWhenDegraded
              />
            </div>

            <dl className="space-y-4 text-[13px]">
              <div className="space-y-1">
                <dt className="text-[var(--text-muted)]">Effective API URL</dt>
                <dd className="np-mono-val text-[var(--text)] break-all">{savedConfig.gatewayUrl}</dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Polling interval</dt>
                <dd className="np-mono-val text-[var(--text)]">{savedConfig.pollingIntervalSec} s</dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Gateway latency</dt>
                <dd className="np-mono-val text-[var(--text)]">
                  {backendOnline && gatewayLatencyMs !== undefined ? `${gatewayLatencyMs} ms` : '—'}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Active policies</dt>
                <dd className="np-mono-val text-[var(--text)]">
                  {(savedConfig.passiveEnumeration ? 1 : 0) + (savedConfig.manualTargetSelection ? 1 : 0)} of 2
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--text-muted)]">Last saved</dt>
                <dd className="np-mono-val text-[var(--text-secondary)]">
                  {lastSavedTime} (v{configVersion})
                </dd>
              </div>
            </dl>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <a
                href={`${savedConfig.gatewayUrl}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] rounded px-0.5"
              >
                <span>Open API reference</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>

              {!backendOnline && onRetryGateway && (
                <button
                  type="button"
                  onClick={onRetryGateway}
                  className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)]"
                >
                  Retry
                </button>
              )}
            </div>
          </div>

          {/* Discreet State Inspection Controls for Operator Verification */}
          <details className="np-card p-4 group">
            <summary className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer select-none flex items-center justify-between list-none">
              <span>Preview UI states</span>
              <span className="font-mono text-[11px]">Inspect</span>
            </summary>
            <div className="pt-3 mt-3 border-t border-[var(--border)] space-y-2 text-[12px]">
              <button
                type="button"
                onClick={triggerLoadingPreview}
                className="w-full h-9 px-3 rounded-[var(--radius-control)] bg-[var(--bg-elev-2)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-left text-[var(--text-secondary)]"
              >
                Show loading skeleton (1.2s)
              </button>
              <label className="flex items-center justify-between h-9 px-3 rounded-[var(--radius-control)] bg-[var(--bg-elev-2)] border border-[var(--border)] cursor-pointer">
                <span className="text-[var(--text-secondary)]">Read-only permission mode</span>
                <input
                  type="checkbox"
                  checked={readOnlyMode}
                  onChange={(e) => setReadOnlyMode(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
              </label>
              <label className="flex items-center justify-between h-9 px-3 rounded-[var(--radius-control)] bg-[var(--bg-elev-2)] border border-[var(--border)] cursor-pointer">
                <span className="text-[var(--text-secondary)]">Simulate save failure</span>
                <input
                  type="checkbox"
                  checked={simulateSaveFail}
                  onChange={(e) => setSimulateSaveFail(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
              </label>
            </div>
          </details>
        </aside>
      </div>

      {/* Sticky Bottom Action Bar */}
      <ActionBar
        visible={isDirty}
        dirtyCount={dirtyFields}
        invalid={hasValidationError || readOnlyMode}
        saveState={saveState}
        errorMessage={saveErrorMsg}
        onReset={handleReset}
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
            ? 'NetPulse will be allowed to run active scans against unapproved subnets. This is logged.'
            : 'Active ICMP and TCP socket probes may dispatch without manual operator review. This is logged.'
        }
        confirmLabel="Disable policy"
        cancelLabel="Cancel"
      />

      {/* Reset to Defaults Confirmation Dialog */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetToDefaults}
        tone="accent"
        title="Reset to factory defaults?"
        description="Restores the default localhost API address (http://127.0.0.1:8000), 5s polling cadence, and both safety policies."
        confirmLabel="Stage defaults"
        cancelLabel="Cancel"
      />

      {/* Policy Documentation Info Dialog */}
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
            ? 'Reads your local OS routing tables and kernel ARP cache without transmitting intrusive subnet sweeps.'
            : 'Prevents accidental probing of unauthorized hosts by requiring an explicit IPv4 or domain input.'
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
