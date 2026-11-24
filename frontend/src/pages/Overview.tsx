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

interface OverviewProps {
  backendOnline: boolean;
  gatewayLatencyMs?: number;
  health: HealthResponse | null;
  system: any | null;
  networkEnv: any | null;
}

export const Overview: React.FC<OverviewProps> = ({
  backendOnline,
  gatewayLatencyMs,
  health,
  system,
  networkEnv,
}) => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [nodeCount, setNodeCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [anaRes, invRes] = await Promise.all([
        fetchAnalyticsSummary(30),
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
  }, [backendOnline]);

  const sysInfo = system?.system || health?.system;
  const memoryUsedPercent = sysInfo?.memory_used_percent ?? 0;
  const cpuCount = sysInfo?.cpu_count_logical ?? 1;
  const defaultGw = networkEnv?.default_gateway || '192.168.1.1';
  const passRate = analytics?.total_tests > 0 ? analytics.success_rate_pct : 100.0;

  const seriesData = analytics?.series?.timestamps?.length
    ? {
        latency: {
          timestamps: analytics.series.timestamps,
          values: analytics.series.latency,
        },
        jitter: {
          timestamps: analytics.series.timestamps,
          values: analytics.series.jitter,
        },
        loss: {
          timestamps: analytics.series.timestamps,
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
          value={backendOnline ? `${gatewayLatencyMs ?? 1}` : 'OFFLINE'}
          unit={backendOnline ? 'ms' : ''}
          subtext={backendOnline ? `Gateway: ${defaultGw}` : 'Service unreachable'}
          icon={Radio}
          status={backendOnline ? 'nominal' : 'critical'}
        />

        <KpiCard
          label="Active Network Nodes"
          value={`${nodeCount || (networkEnv?.arp_neighbors?.length ? networkEnv.arp_neighbors.length + 1 : 2)}`}
          unit="discovered"
          subtext={`Host + Gateway + ARP LAN peers`}
          icon={Server}
          status="neutral"
        />

        <KpiCard
          label="Probe Pass Rate"
          value={`${passRate}`}
          unit="%"
          subtext={
            analytics?.total_tests > 0
              ? `Across ${analytics.total_tests} recorded probes`
              : 'Ready for baseline probes'
          }
          icon={Activity}
          status={passRate >= 95 ? 'nominal' : 'warning'}
        />

        <KpiCard
          label="Host RAM Utilization"
          value={memoryUsedPercent !== null ? `${Number(memoryUsedPercent).toFixed(1)}` : 'N/A'}
          unit="%"
          subtext={`${cpuCount} Logical CPU Cores active`}
          icon={Shield}
          status={memoryUsedPercent > 85 ? 'warning' : 'nominal'}
        />
      </div>

      {/* Operations Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart seriesData={seriesData} />
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
