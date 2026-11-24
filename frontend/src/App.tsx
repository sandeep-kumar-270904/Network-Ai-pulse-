import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
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
import { SettingsPage } from './pages/Settings';
import { fetchHealth, fetchSystemInfo, fetchNetworkEnv } from './services/api';
import { HealthResponse } from './types';

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [gatewayLatencyMs, setGatewayLatencyMs] = useState<number | undefined>(undefined);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [systemData, setSystemData] = useState<any | null>(null);
  const [networkEnvData, setNetworkEnvData] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const location = useLocation();

  // Page titles map
  const routeTitles: Record<string, { title: string; subtitle: string }> = {
    '/': {
      title: 'NOC Overview',
      subtitle: 'Real-time telemetry, platform subsystems and core health metrics.',
    },
    '/diagnostics': {
      title: 'Network Diagnostics',
      subtitle: 'Live ICMP socket probe transmitters, real packet RTT, and jitter telemetry.',
    },
    '/topology': {
      title: 'Network Topology',
      subtitle: 'Interactive React Flow device map and connection fabric.',
    },
    '/inventory': {
      title: 'Infrastructure Inventory',
      subtitle: 'Monitored routers, distribution switches, probe sensors and local adapters.',
    },
    '/performance': {
      title: 'Performance Testing',
      subtitle: 'Throughput capacity, UDP packet jitter, and RFC 2544 benchmark configuration.',
    },
    '/automation': {
      title: 'Test Automation',
      subtitle: 'Scheduled cron jobs and autonomous network regression routines.',
    },
    '/ai-analysis': {
      title: 'AI Anomaly Detection',
      subtitle: 'Statistical variance modeling and Scikit-learn unsupervised anomaly detection.',
    },
    '/alerts': {
      title: 'Alerts & Events',
      subtitle: 'Subsystem audit logs, gateway transitions, and connection events.',
    },
    '/history': {
      title: 'Test History',
      subtitle: 'SQLite-backed execution archive of diagnostic runs.',
    },
    '/analytics': {
      title: 'Performance Analytics',
      subtitle: 'Historical trends, latency percentiles, and capacity forecasting.',
    },
    '/reports': {
      title: 'Technical Reports',
      subtitle: 'Automated executive summaries and compliance export profiles.',
    },
    '/system': {
      title: 'System Information',
      subtitle: 'Host hardware, OS platform, memory metrics, and passive network interfaces.',
    },
    '/settings': {
      title: 'Settings',
      subtitle: 'REST gateway URL, telemetry sampling frequency, and security policies.',
    },
  };

  const currentMeta = routeTitles[location.pathname] || {
    title: 'NetPulse AI',
    subtitle: 'Network Performance Testing & Intelligence Platform',
  };

  const pollTelemetry = useCallback(async () => {
    const healthRes = await fetchHealth();
    if (healthRes.data) {
      setBackendOnline(true);
      setGatewayLatencyMs(healthRes.latencyMs);
      setHealthData(healthRes.data);
    } else {
      setBackendOnline(false);
      setGatewayLatencyMs(undefined);
    }

    const sysRes = await fetchSystemInfo();
    if (sysRes.data) {
      setSystemData(sysRes.data);
    }

    const netRes = await fetchNetworkEnv();
    if (netRes.data) {
      setNetworkEnvData(netRes.data);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await pollTelemetry();
    setIsRefreshing(false);
  };

  useEffect(() => {
    pollTelemetry();
    const interval = setInterval(pollTelemetry, 5000);
    return () => clearInterval(interval);
  }, [pollTelemetry]);

  return (
    <div className="min-h-screen bg-[#080E19] text-[#EAF3FF] flex">
      {/* Fixed Collapsible Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        backendOnline={backendOnline}
        version="v1.0.0-day1"
      />

      {/* Main Operations Canvas */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          gatewayLatencyMs={gatewayLatencyMs}
          backendOnline={backendOnline}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-6 overflow-y-auto">
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
                />
              }
            />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/topology" element={<Topology />} />
            <Route
              path="/inventory"
              element={<Inventory networkEnv={networkEnvData} />}
            />
            <Route path="/performance" element={<Performance />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/ai-analysis" element={<AIAnalysis />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/history" element={<TestHistory />} />
            <Route path="/analytics" element={<Analytics />} />
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
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
};

export default App;
