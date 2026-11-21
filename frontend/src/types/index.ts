export type StatusLevel = 'healthy' | 'warning' | 'critical' | 'offline' | 'unknown';

export interface HealthResponse {
  status: string;
  application?: string;
  service?: string;
  version: string;
  uptime_seconds?: number;
  uptime_since?: string;
  environment?: string;
  timestamp?: string;
  system?: any;
  services?: Record<string, string>;
}

export interface SystemInfo {
  os: string;
  os_release: string;
  os_version: string;
  machine: string;
  processor: string;
  python_version: string;
  python_compiler: string;
  cpu_count_logical: number;
  cpu_count_physical: number;
  cpu_freq_mhz?: number;
  cpu_usage_percent?: number;
  memory_total_gb: number;
  memory_available_gb: number;
  memory_used_gb: number;
  memory_usage_percent: number;
  disk_total_gb?: number;
  disk_used_gb?: number;
  disk_free_gb?: number;
  disk_usage_percent?: number;
  boot_time?: string;
}

export interface NetworkInterface {
  name: string;
  ip_address: string;
  netmask: string;
  broadcast?: string;
  mac_address?: string;
  is_up: boolean;
  speed_mbps?: number;
}

export interface NetworkEnvironment {
  interfaces: NetworkInterface[];
  default_gateway?: string;
  primary_ip?: string;
  hostname?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  event: string;
  level: 'info' | 'warn' | 'error' | 'success';
  details?: Record<string, unknown> | string;
}

export interface Endpoint {
  id: string;
  name: string;
  ip: string;
  type: 'gateway' | 'switch' | 'server' | 'probe' | 'firewall';
  status: 'online' | 'degraded' | 'offline' | 'unmonitored';
  latencyMs?: number;
  packetLossPercent?: number;
  lastChecked?: string;
  interface?: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: 'gateway' | 'switch' | 'server' | 'probe';
  ip: string;
  status: 'online' | 'degraded' | 'offline';
  x: number;
  y: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  status?: 'nominal' | 'congested' | 'down';
}

export interface PerformanceMetricPoint {
  timestamp: string;
  latencyMs: number;
  jitterMs: number;
  packetLossPercent: number;
  throughputMbps: number;
}

export interface TestExecutionRecord {
  id: string;
  timestamp: string;
  testType: 'icmp_ping' | 'traceroute' | 'bandwidth_tcp' | 'jitter_udp';
  target: string;
  status: 'passed' | 'failed' | 'running';
  durationMs: number;
  summary: string;
  parameters: Record<string, unknown>;
}

export interface DiagnosticTargetForm {
  target: string;
  protocol: 'ICMP' | 'TCP' | 'UDP';
  packetSize: number;
  count: number;
  intervalMs: number;
  timeoutSeconds: number;
}
