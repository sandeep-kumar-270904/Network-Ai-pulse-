import axios, { AxiosInstance } from 'axios';
import { HealthResponse, SystemInfo, NetworkEnvironment } from '../types';

export const API_BASE_URL = 'http://127.0.0.1:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ModuleStatusItem {
  name: string;
  description: string;
  status: string;
  icon: string;
}

export const fetchHealth = async (): Promise<{ data: HealthResponse | null; latencyMs: number; error: string | null }> => {
  const start = performance.now();
  try {
    const res = await apiClient.get<HealthResponse>('/health');
    const latencyMs = Math.round(performance.now() - start);
    return { data: res.data, latencyMs, error: null };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : 'Backend unreachable';
    return { data: null, latencyMs, error: msg };
  }
};

export const fetchSystemInfo = async (): Promise<{ data: any | null; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/system');
    return { data: res.data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch system info' };
  }
};

export const fetchNetworkEnv = async (): Promise<{ data: any | null; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/network-environment');
    return { data: res.data?.network_environment || null, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch network environment' };
  }
};

export const fetchModules = async (): Promise<{ modules: ModuleStatusItem[]; error: string | null }> => {
  try {
    const res = await apiClient.get('/api/modules');
    return { modules: res.data?.modules || [], error: null };
  } catch (err: unknown) {
    return { modules: [], error: err instanceof Error ? err.message : 'Failed to fetch modules' };
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
    bytes: number;
    rtt_ms: number | null;
    ttl: number | null;
    status: string;
  }>;
  summary: string;
  raw_output: string;
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
    });
    return { data: res.data?.data || null, error: null };
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err)
      ? err.response?.data?.message || err.message
      : err instanceof Error
      ? err.message
      : 'Diagnostic probe execution failed';
    return { data: null, error: msg };
  }
};

export const fetchDiagnosticHistory = async (limit: number = 50): Promise<{ records: any[]; error: string | null }> => {
  try {
    const res = await apiClient.get(`/api/diagnostics/history?limit=${limit}`);
    return { records: res.data?.records || [], error: null };
  } catch (err: unknown) {
    return { records: [], error: err instanceof Error ? err.message : 'Failed to fetch history' };
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
    return { nodes: [], edges: [], gateway: null, error: err instanceof Error ? err.message : 'Failed to fetch topology' };
  }
};
