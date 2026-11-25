import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar, TimeRangeOption } from './components/layout/TopBar';
import { CommandPalette } from './components/ui/CommandPalette';
import { ToastProvider } from './components/ui/Toast';
import { ThemeMode } from './components/ui/ThemeToggle';
import { Overview } from './pages/Overview';
import { Diagnostics } from './pages/Diagnostics';
import { Topology } from './pages/Topology';
import { Inventory } from './pages/Inventory';
import { Performance } from './pages/Performance';
import { Automation } from './pages/Automation';
import { AIAnalysis } from './pages/AIAnalysis';
import { Alerts } from './pages/Alerts';
import { TestHistory } from './pages/History';
import { Analytics } from './pages/Analytics';
import { Reports } from './pages/Reports';
import { SystemInfoPage } from './pages/SystemInfo';
import { SettingsPage, PlatformConfig } from './pages/Settings';
import { DesignSystemPage } from './pages/DesignSystem';
import {
  fetchHealth,
  fetchSystemInfo,
  fetchNetworkEnv,
  getStoredGatewayUrl,
  setApiBaseUrl,
} from './services/api';
import { HealthResponse, GlobalHealthLevel } from './types';

const SIDEBAR_STORAGE_KEY = 'netpulse_sidebar_collapsed';
const THEME_STORAGE_KEY = 'netpulse_theme';
const TIMERANGE_STORAGE_KEY = 'netpulse_time_range';

const ROUTE_META: Record<string, { section: string; page: string; title: string; subtitle: string }> = {
  '/': {
    section: 'Observability',
    page: 'Overview',
    title: 'Network overview',
    subtitle: 'Host telemetry, gateway latency, and active interface status.',
  },
  '/topology': {
    section: 'Observability',
    page: 'Network Topology',
    title: 'Network topology',
    subtitle: 'Device map resolved from your default gateway and local ARP table.',
  },
  '/inventory': {
    section: 'Observability',
    page: 'Inventory',
    title: 'Infrastructure inventory',
    subtitle: 'Discovered local network peers, host adapters, and monitored targets.',
  },
  '/diagnostics': {
    section: 'Active Testing',
    page: 'Diagnostics',
    title: 'Network diagnostics',
    subtitle: 'ICMP echo probes, TCP port handshakes, and Layer-3 path traceroutes.',
  },
  '/performance': {
    section: 'Active Testing',
    page: 'Synthetic Tests',
    title: 'Synthetic tests',
    subtitle: 'Multi-stream TCP throughput, jitter stability bursts, and Path MTU checks.',
  },
  '/automation': {
    section: 'Active Testing',
    page: 'Automation',
    title: 'Test automation',
    subtitle: 'Scheduled background probe jobs and execution intervals.',
  },
  '/history': {
    section: 'Active Testing',
    page: 'Test History',
    title: 'Test history',
    subtitle: 'Execution log stored in the local telemetry database.',
  },
  '/ai-analysis': {
    section: 'Intelligence',
    page: 'Anomaly Detection',
    title: 'Anomaly detection',
    subtitle: 'IsolationForest scoring across recorded latency and packet loss telemetry.',
  },
  '/alerts': {
    section: 'Intelligence',
    page: 'Alerts & Events',
    title: 'Alerts and events',
    subtitle: 'Event stream for packet loss, latency thresholds, and scheduled runs.',
  },
  '/analytics': {
    section: 'Intelligence',
    page: 'Analytics',
    title: 'Performance analytics',
    subtitle: 'P50, P95, and P99 latency percentiles and longitudinal stability trends.',
  },
  '/reports': {
    section: 'Intelligence',
    page: 'Reports',
    title: 'Technical reports',
    subtitle: 'Export CSV latency datasets and JSON infrastructure audits.',
  },
  '/system': {
    section: 'System',
    page: 'System Info',
    title: 'System information',
    subtitle: 'Host hardware, operating system environment, and network interfaces.',
  },
  '/settings': {
    section: 'Settings',
    page: 'Platform',
    title: 'Platform settings',
    subtitle: 'Configure the API gateway connection, polling cadence, and safety policies.',
  },
  '/design-system': {
    section: 'System',
    page: 'UI Components',
    title: 'Component gallery',
    subtitle: 'Shared design tokens, interactive states, and accessible primitives in dark and light themes.',
  },
};

const AppLayout: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Ignore storage restrictions
    }
    return 'dark';
  });

  const [timeRange, setTimeRange] = useState<TimeRangeOption>(() => {
    try {
      const saved = window.localStorage.getItem(TIMERANGE_STORAGE_KEY) as TimeRangeOption | null;
      if (saved && ['15m', '1h', '6h', '24h', '7d'].includes(saved)) return saved;
    } catch {
      // Ignore
    }
    return '1h';
  });

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);

  const [gatewayUrl, setGatewayUrl] = useState<string>(() => getStoredGatewayUrl());
  const [pollingSec, setPollingSec] = useState<number>(() => {
    try {
      const val = Number(window.localStorage.getItem('netpulse_polling_sec'));
      return val >= 2 && val <= 30 ? val : 5;
    } catch {
      return 5;
    }
  });

  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [gatewayLatencyMs, setGatewayLatencyMs] = useState<number | undefined>(undefined);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [systemData, setSystemData] = useState<any | null>(null);
  const [networkEnvData, setNetworkEnvData] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();

  const currentMeta = ROUTE_META[location.pathname] || {
    section: 'NetPulse AI',
    page: 'Workspace',
    title: 'NetPulse AI',
    subtitle: 'Network performance intelligence platform.',
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleTimeRangeChange = useCallback((range: TimeRangeOption) => {
    setTimeRange(range);
    try {
      window.localStorage.setItem(TIMERANGE_STORAGE_KEY, range);
    } catch {
      // Ignore
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const pollTelemetry = useCallback(async () => {
    const healthRes = await fetchHealth();
    setLastSyncAt(new Date());

    if (healthRes.data) {
      setBackendOnline(true);
      setGatewayLatencyMs(healthRes.latencyMs);
      setHealthData(healthRes.data);
    } else {
      setBackendOnline(false);
      setGatewayLatencyMs(undefined);
    }

    const [sysRes, netRes] = await Promise.all([fetchSystemInfo(), fetchNetworkEnv()]);
    if (sysRes.data) setSystemData(sysRes.data);
    if (netRes.data) setNetworkEnvData(netRes.data);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setIsSyncing(true);
    await pollTelemetry();
    setIsSyncing(false);
  }, [pollTelemetry]);

  useEffect(() => {
    pollTelemetry();
    const interval = window.setInterval(pollTelemetry, pollingSec * 1000);
    return () => window.clearInterval(interval);
  }, [pollTelemetry, pollingSec]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (!isTyping && e.key === '[' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  const handleSettingsSaved = useCallback(
    (cfg: PlatformConfig) => {
      setGatewayUrl(cfg.gatewayUrl);
      setPollingSec(cfg.pollingIntervalSec);
      setApiBaseUrl(cfg.gatewayUrl);
      handleManualRefresh();
    },
    [handleManualRefresh]
  );

  const isSettingsPage = location.pathname === '/settings';

  const probeStatus = healthData?.probe_health?.status;
  const globalHealth: GlobalHealthLevel = !backendOnline
    ? 'critical'
    : probeStatus === 'critical'
    ? 'critical'
    : probeStatus === 'degraded' || (gatewayLatencyMs !== undefined && gatewayLatencyMs > 150)
    ? 'degraded'
    : 'healthy';

  const globalHealthReason = !backendOnline
    ? `Gateway unreachable at ${gatewayUrl}`
    : healthData?.probe_health?.reason ||
      (gatewayLatencyMs !== undefined && gatewayLatencyMs > 150
        ? `Gateway latency elevated (${gatewayLatencyMs} ms)`
        : 'All recent probes passed.');

  return (
    <div className="min-h-screen np-canvas text-[var(--text)] flex">
      <a href="#main-content" className="np-skip-link">
        Skip to main content
      </a>

      <Sidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenPalette={() => setPaletteOpen(true)}
        backendOnline={backendOnline}
        globalHealth={globalHealth}
        globalHealthReason={globalHealthReason}
        version="v1.0.0"
      />

      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 transition-[margin-left] duration-[var(--dur-layout)] ease-[var(--ease-out)] ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[264px]'
        }`}
      >
        <TopBar
          breadcrumbSection={currentMeta.section}
          breadcrumbPage={currentMeta.page}
          gatewayUrl={gatewayUrl}
          gatewayLatencyMs={gatewayLatencyMs}
          backendOnline={backendOnline}
          globalHealth={globalHealth}
          globalHealthReason={globalHealthReason}
          lastSyncAt={lastSyncAt}
          pollingSec={pollingSec}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          onSyncNow={handleManualRefresh}
          isSyncing={isSyncing}
          onOpenMobileMenu={() => setMobileOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-6 sm:px-6 lg:px-8 focus:outline-none"
        >
          {!backendOnline && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-[var(--radius-card)] bg-[var(--danger-soft)] border border-[var(--danger)]/35 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text)]">
                    Backend gateway unreachable
                  </p>
                  <p className="text-[13px] text-[var(--text-secondary)]">
                    Unable to reach <span className="font-mono">{gatewayUrl}</span>. Check that the service is running.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/diagnostics')}
                  className="h-10 px-3 rounded-[var(--radius-control)] text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] inline-flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  <span>View diagnostics</span>
                </button>
              </div>
            </div>
          )}

          {backendOnline && globalHealth !== 'healthy' && (
            <div
              role="status"
              className={`mb-6 p-4 rounded-[var(--radius-card)] border flex flex-wrap items-center justify-between gap-3 ${
                globalHealth === 'critical'
                  ? 'bg-[var(--danger-soft)] border-[var(--danger)]/35'
                  : 'bg-[var(--warn-soft)] border-[var(--warn)]/35'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    globalHealth === 'critical' ? 'text-[var(--danger)]' : 'text-[var(--warn)]'
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text)]">
                    {globalHealth === 'critical' ? 'Critical probe failures detected' : 'Network health degraded'}
                  </p>
                  <p className="text-[13px] text-[var(--text-secondary)]">{globalHealthReason}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/alerts')}
                  className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-3)]"
                >
                  Inspect alerts
                </button>
              </div>
            </div>
          )}

          {!isSettingsPage && (
            <div className="mb-6 space-y-1">
              <h1 className="np-page-title">{currentMeta.title}</h1>
              <p className="np-helper">{currentMeta.subtitle}</p>
            </div>
          )}

          <Routes>
            <Route
              path="/"
              element={
                <Overview
                  backendOnline={backendOnline}
                  gatewayLatencyMs={gatewayLatencyMs}
                  health={healthData}
                  system={systemData}
                  networkEnv={networkEnvData}
                  timeRange={timeRange}
                  theme={theme}
                />
              }
            />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/topology" element={<Topology theme={theme} timeRange={timeRange} />} />
            <Route path="/inventory" element={<Inventory networkEnv={networkEnvData} />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/ai-analysis" element={<AIAnalysis theme={theme} />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/history" element={<TestHistory />} />
            <Route path="/analytics" element={<Analytics timeRange={timeRange} theme={theme} />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/system"
              element={
                <SystemInfoPage
                  system={systemData}
                  networkEnv={networkEnvData}
                  backendOnline={backendOnline}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  backendOnline={backendOnline}
                  gatewayLatencyMs={gatewayLatencyMs}
                  sidebarCollapsed={collapsed}
                  onConfigSaved={handleSettingsSaved}
                  onRetryGateway={handleManualRefresh}
                />
              }
            />
            <Route
              path="/design-system"
              element={<DesignSystemPage theme={theme} onToggleTheme={toggleTheme} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSyncNow={handleManualRefresh}
        onToggleSidebar={toggleSidebar}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
