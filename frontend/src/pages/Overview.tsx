import React, { useState, useEffect } from 'react';
import { Activity, Server, Radio, Shield } from 'lucide-react';
import { KpiCard } from '../components/dashboard/KpiCard';
import { StatusPanel } from '../components/dashboard/StatusPanel';
import { ResourceGauge } from '../components/charts/ResourceGauge';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { TopologyGraph } from '../components/topology/TopologyGraph';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { fetchAnalyticsSummary, fetchInventoryNodes } from '../services/api';
import { HealthResponse } from '../types';
import { TimeRangeOption } from '../components/layout/TopBar';
import { formatLatencyMs, formatPercent } from '../utils/formatters';

interface OverviewProps {
  backendOnline: boolean;
  gatewayLatencyMs?: number;
  health: HealthResponse | null;
  system: any | null;
  networkEnv: any | null;
  timeRange?: TimeRangeOption;
}

export const Overview: React.FC<OverviewProps> = ({
  backendOnline,
  gatewayLatencyMs,
  health,
  system,
  networkEnv,
  timeRange = '1h',
}) => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [nodeCount, setNodeCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [anaRes, invRes] = await Promise.all([
        fetchAnalyticsSummary(timeRange, 500),
        fetchInventoryNodes(),
      ]);
      if (!active) return;
      if (anaRes.analytics) setAnalytics(anaRes.analytics);
      if (invRes.nodes) setNodeCount(invRes.nodes.length);
    };
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [backendOnline, timeRange]);

  const sysInfo = system?.system || health?.system;
  const memoryUsedPercent = sysInfo?.memory_used_percent ?? null;
  const cpuCount = sysInfo?.cpu_count_logical ?? null;
  const defaultGw = networkEnv?.default_gateway || 'No data';
  const passRate: number | null = analytics?.pass_rate_pct ?? null;
  const windowLabel: string = analytics?.window_label || `Last ${timeRange}`;

  const seriesData = analytics?.series?.timestamps?.length
    ? {
        latency: {
          timestamps: analytics.series.timestamps,
          isoTimestamps: analytics.series.iso_timestamps,
          statuses: analytics.series.statuses,
          targets: analytics.series.targets,
          values: analytics.series.latency,
        },
        jitter: {
          timestamps: analytics.series.timestamps,
          isoTimestamps: analytics.series.iso_timestamps,
          statuses: analytics.series.statuses,
          targets: analytics.series.targets,
          values: analytics.series.jitter,
        },
        loss: {
          timestamps: analytics.series.timestamps,
          isoTimestamps: analytics.series.iso_timestamps,
          statuses: analytics.series.statuses,
          targets: analytics.series.targets,
          values: analytics.series.loss,
        },
      }
    : undefined;

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Backend API Latency"
          value={
            backendOnline
              ? gatewayLatencyMs !== undefined
                ? formatLatencyMs(gatewayLatencyMs, false)
                : 'No data'
              : 'Offline'
          }
          unit={backendOnline && gatewayLatencyMs !== undefined ? 'ms' : ''}
          subtext={backendOnline ? `Gateway: ${defaultGw}` : 'Service unreachable'}
          icon={Radio}
          status={
            !backendOnline
              ? 'critical'
              : gatewayLatencyMs !== undefined && gatewayLatencyMs > 150
              ? 'warning'
              : 'nominal'
          }
        />

        <KpiCard
          label="Active Network Nodes"
          value={
            nodeCount > 0
              ? `${nodeCount}`
              : networkEnv?.arp_neighbors?.length
              ? `${networkEnv.arp_neighbors.length + 1}`
              : 'No data'
          }
          unit={nodeCount > 0 || networkEnv?.arp_neighbors?.length ? 'discovered' : ''}
          subtext={`Host + Gateway + ARP LAN peers`}
          icon={Server}
          status="neutral"
        />

        <KpiCard
          label={`Probe Pass Rate (${windowLabel})`}
          value={passRate !== null ? formatPercent(passRate, false) : 'No data'}
          unit={passRate !== null ? '%' : ''}
          subtext={
            analytics?.total_tests > 0
              ? `Across ${analytics.total_tests} probes (${analytics.outage_count ?? 0} failed)`
              : `No probes recorded in ${windowLabel}`
          }
          icon={Activity}
          status={
            passRate === null
              ? 'neutral'
              : passRate >= 95
              ? 'nominal'
              : passRate >= 70
              ? 'warning'
              : 'critical'
          }
        />

        <KpiCard
          label="Host RAM Utilization"
          value={memoryUsedPercent !== null ? `${Number(memoryUsedPercent).toFixed(1)}` : 'No data'}
          unit={memoryUsedPercent !== null ? '%' : ''}
          subtext={cpuCount !== null ? `${cpuCount} logical CPU cores` : 'CPU info unavailable'}
          icon={Shield}
          status={memoryUsedPercent !== null && memoryUsedPercent > 85 ? 'warning' : 'nominal'}
        />
      </div>

      {/* Operations Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart
            windowLabel={windowLabel}
            outages={analytics?.outages || []}
            seriesData={seriesData}
          />
        </div>
        <div className="space-y-6">
          <StatusPanel
            health={health}
            system={system}
            networkEnv={networkEnv}
            backendOnline={backendOnline}
          />

          <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750]">
            <div className="flex items-center justify-between pb-2 border-b border-[#203750]">
              <span className="text-xs font-mono uppercase text-[#EAF3FF] font-bold">
                Local Host Memory Capacity
              </span>
              <span className="text-[10px] font-mono text-[#22D3EE]">REAL-TIME</span>
            </div>
            <ResourceGauge
              title="RAM Used"
              value={Number(memoryUsedPercent) || 0}
              unit="%"
              color="#287EFF"
            />
          </div>
        </div>
      </div>

      {/* Network Topology Visualizer */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
              Live Network Topology Preview
            </h3>
            <p className="text-[11px] text-[#647C96]">
              Dynamic graph constructed from your local default gateway, OS host, and kernel ARP neighbors.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111E30] text-[#22D3EE] border border-[#203750]">
            LIVE TOPOLOGY
          </span>
        </div>
        <TopologyGraph />
      </div>

      {/* Monitored Inventory Table */}
      <InventoryTable />
    </div>
  );
};
