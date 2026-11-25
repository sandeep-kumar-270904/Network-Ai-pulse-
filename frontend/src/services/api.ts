import axios, { AxiosInstance } from 'axios';
import { HealthResponse } from '../types';

export const DEFAULT_API_URL = 'http://127.0.0.1:8000';

export const getStoredGatewayUrl = (): string => {
  try {
    return window.localStorage.getItem('netpulse_gateway_url') || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
};

export const API_BASE_URL = getStoredGatewayUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setApiBaseUrl = (url: string) => {
  apiClient.defaults.baseURL = url;
};

export const testGatewayConnection = async (
  url: string
): Promise<{ ok: boolean; latencyMs: number; version?: string; error?: string }> => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const start = performance.now();
  try {
    const res = await axios.get<HealthResponse>(`${cleanUrl}/health`, { timeout: 4000 });
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    const rawVer = res.data?.version || '1.0.0';
    const cleanVer = rawVer.replace(/-day\d+/i, '');
    return { ok: true, latencyMs, version: `v${cleanVer.replace(/^v/, '')}` };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      latencyMs,
      error: extractAxiosError(err, "Can't reach server. Check the address and that the service is running."),
    };
  }
};

export interface ModuleStatusItem {
  name: string;
  description: string;
  status: string;
  icon: string;
}

const extractAxiosError = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message;
  }
  return err instanceof Error ? err.message : fallback;
};

export const fetchHealth = async (): Promise<{ data: HealthResponse | null; latencyMs: number; error: string | null }> => {
  const start = performance.now();
  try {
    const res = await apiClient.get<HealthResponse>('/health');
    const latencyMs = Math.round(performance.now() - start);
    return { data: res.data, latencyMs, error: null };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    return { data: null, latencyMs, error: extractAxiosError(err, 'Backend unreachable') };
  }
};

export const fetchSystemInfo = async (): Promise<{ data: any | null; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/system');
    return { data: res.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractAxiosError(err, 'Failed to fetch system info') };
  }
};

export const fetchNetworkEnv = async (): Promise<{ data: any | null; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/network-environment');
    return { data: res.data?.network_environment || null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractAxiosError(err, 'Failed to fetch network environment') };
  }
};

export const fetchModules = async (): Promise<{ modules: ModuleStatusItem[]; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/modules');
    return { modules: res.data?.modules || [], error: null };
  } catch (err: unknown) {
    return { modules: [], error: extractAxiosError(err, 'Failed to fetch modules') };
  }
};

export interface PingResultPayload {
  id: string;
  timestamp: string;
  test_type: string;
  target: string;
  resolved_ip: string;
  status: 'passed' | 'failed';
  duration_ms: number;
  packets_sent: number;
  packets_received: number;
  packet_loss_pct: number;
  min_rtt_ms: number | null;
  avg_rtt_ms: number | null;
  max_rtt_ms: number | null;
  jitter_ms: number;
  replies: Array<{
    seq: number;
    ip: string;
    bytes?: number;
    port?: number;
    rtt_ms: number | null;
    ttl?: number | null;
    status: string;
  }>;
  summary: string;
  raw_output?: string;
}

export const executePingDiagnostic = async (
  target: string,
  count: number = 4,
  packetSize: number = 32,
  timeoutMs: number = 2000,
): Promise<{ data: PingResultPayload | null; error: string | null }> => {
  try {
    const res = await apiClient.post('/api/diagnostics/ping', {
      target,
      count,
      packet_size: packetSize,
      timeout_ms: timeoutMs,
    }, { timeout: 25000 });
    return { data: res.data?.data || null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractAxiosError(err, 'ICMP diagnostic execution failed') };
  }
};

export const executeTcpProbeDiagnostic = async (
  target: string,
  port: number = 443,
  count: number = 4,
  timeoutMs: number = 2000,
): Promise<{ data: PingResultPayload | null; error: string | null }> => {
  try {
    const res = await apiClient.post('/api/diagnostics/tcp-probe', {
      target,
      port,
      count,
      timeout_ms: timeoutMs,
    }, { timeout: 25000 });
    return { data: res.data?.data || null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractAxiosError(err, 'TCP handshake probe failed') };
  }
};

export const executeTracerouteDiagnostic = async (
  target: string,
  maxHops: number = 12,
): Promise<{ data: any | null; error: string | null }> => {
  try {
    const res = await apiClient.post('/api/diagnostics/traceroute', {
      target,
      max_hops: maxHops,
    }, { timeout: 35000 });
    return { data: res.data?.data || null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractAxiosError(err, 'Traceroute execution failed') };
  }
};

export const fetchDiagnosticHistory = async (limit: number = 50): Promise<{ records: any[]; error: string | null }> => {
  try {
    const res = await apiClient.get(`/api/diagnostics/history?limit=${limit}`);
    return { records: res.data?.records || [], error: null };
  } catch (err: unknown) {
    return { records: [], error: extractAxiosError(err, 'Failed to fetch history') };
  }
};

export const fetchDynamicTopology = async (): Promise<{ nodes: any[]; edges: any[]; gateway: any; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/network-topology');
    return {
      nodes: res.data?.nodes || [],
      edges: res.data?.edges || [],
      gateway: res.data?.gateway || null,
      error: null,
    };
  } catch (err: unknown) {
    return { nodes: [], edges: [], gateway: null, error: extractAxiosError(err, 'Failed to fetch topology') };
  }
};

// Performance Benchmarking
export const executePerformanceBenchmark = async (
  mode: 'throughput_tcp' | 'jitter_udp' | 'mtu_sweep',
  target: string,
  duration: number,
  streams: number,
): Promise<{ data: any | null; error: string | null }> => {
  try {
    const res = await apiClient.post('/api/performance/benchmark', {
      mode,
      target,
      duration,
      streams,
    }, { timeout: 30000 });
    return { data: res.data?.data || null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractAxiosError(err, 'Benchmark failed') };
  }
};

// Test Automation
export const fetchAutomationJobs = async (): Promise<{ jobs: any[]; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/automation/jobs');
    return { jobs: res.data?.jobs || [], error: null };
  } catch (err: unknown) {
    return { jobs: [], error: extractAxiosError(err, 'Failed to fetch automation jobs') };
  }
};

export const createAutomationJob = async (
  name: string,
  target: string,
  testType: string,
  intervalSeconds: number,
): Promise<{ job: any | null; error: string | null }> => {
  try {
    const res = await apiClient.post('/api/automation/jobs', {
      name,
      target,
      test_type: testType,
      interval_seconds: intervalSeconds,
    });
    return { job: res.data?.job || null, error: null };
  } catch (err: unknown) {
    return { job: null, error: extractAxiosError(err, 'Failed to create job') };
  }
};

export const toggleAutomationJob = async (jobId: string, enabled: boolean): Promise<boolean> => {
  try {
    await apiClient.patch(`/api/automation/jobs/${jobId}`, { enabled });
    return true;
  } catch {
    return false;
  }
};

export const runAutomationJobNow = async (jobId: string): Promise<{ data: any | null; error: string | null }> => {
  try {
    const res = await apiClient.post(`/api/automation/jobs/${jobId}/run`, {}, { timeout: 25000 });
    return { data: res.data?.data || null, error: null };
  } catch (err: unknown) {
    return { data: null, error: extractAxiosError(err, 'Failed to run job') };
  }
};

export const deleteAutomationJob = async (jobId: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/api/automation/jobs/${jobId}`);
    return true;
  } catch {
    return false;
  }
};

// Alerts & Events
export const fetchAlerts = async (limit: number = 100): Promise<{ events: any[]; error: string | null }> => {
  try {
    const res = await apiClient.get(`/api/alerts?limit=${limit}`);
    return { events: res.data?.events || [], error: null };
  } catch (err: unknown) {
    return { events: [], error: extractAxiosError(err, 'Failed to fetch alerts') };
  }
};

export const acknowledgeAlert = async (eventId: string): Promise<boolean> => {
  try {
    await apiClient.post(`/api/alerts/${eventId}/acknowledge`);
    return true;
  } catch {
    return false;
  }
};

export const clearAlerts = async (): Promise<boolean> => {
  try {
    await apiClient.delete('/api/alerts');
    return true;
  } catch {
    return false;
  }
};

// Analytics & AI Anomaly Detection
export const fetchAnalyticsSummary = async (
  window: string = '1h',
  limit: number = 500,
): Promise<{ analytics: any | null; error: string | null }> => {
  try {
    const res = await apiClient.get(`/api/analytics?window=${encodeURIComponent(window)}&limit=${limit}`);
    return { analytics: res.data?.analytics || null, error: null };
  } catch (err: unknown) {
    return { analytics: null, error: extractAxiosError(err, 'Failed to fetch analytics') };
  }
};

export const runAiAnomalyScan = async (): Promise<{ analysis: any | null; error: string | null }> => {
  try {
    const res = await apiClient.post('/api/ai/analyze', {}, { timeout: 20000 });
    return { analysis: res.data?.analysis || null, error: null };
  } catch (err: unknown) {
    return { analysis: null, error: extractAxiosError(err, 'AI anomaly scan failed') };
  }
};

export const toggleAnomalyFalsePositive = async (
  testId: string,
  falsePositive: boolean,
  note: string = '',
): Promise<{ analysis: any | null; error: string | null }> => {
  try {
    const res = await apiClient.post(`/api/ai/false-positive/${encodeURIComponent(testId)}`, {
      false_positive: falsePositive,
      note,
    });
    return { analysis: res.data?.analysis || null, error: null };
  } catch (err: unknown) {
    return { analysis: null, error: extractAxiosError(err, 'Failed to update false-positive flag') };
  }
};

// Dynamic Inventory
export const fetchInventoryNodes = async (): Promise<{ nodes: any[]; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/inventory');
    return { nodes: res.data?.nodes || [], error: null };
  } catch (err: unknown) {
    return { nodes: [], error: extractAxiosError(err, 'Failed to fetch inventory') };
  }
};

export const addInventoryNode = async (
  name: string,
  ip: string,
  nodeType: string,
  iface: string,
): Promise<{ node: any | null; error: string | null }> => {
  try {
    const res = await apiClient.post('/api/inventory', {
      name,
      ip,
      node_type: nodeType,
      interface: iface,
    });
    return { node: res.data?.node || null, error: null };
  } catch (err: unknown) {
    return { node: null, error: extractAxiosError(err, 'Failed to add node') };
  }
};

export const deleteInventoryNode = async (nodeId: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/api/inventory/${nodeId}`);
    return true;
  } catch {
    return false;
  }
};
