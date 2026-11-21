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
