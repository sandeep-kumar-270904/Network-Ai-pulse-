import React, { useState, useEffect } from 'react';
import { Activity, Server, Radio, Shield, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { KpiCard } from '../components/dashboard/KpiCard';
import { StatusPanel } from '../components/dashboard/StatusPanel';
import { ResourceGauge } from '../components/charts/ResourceGauge';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { TopologyGraph } from '../components/topology/TopologyGraph';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { fetchHealth, fetchSystemInfo, fetchNetworkEnv } from '../services/api';
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
  const sysInfo = system?.system || health?.system;
  const memoryUsedPercent = sysInfo?.memory_used_percent ?? 38.4;
  const cpuCount = sysInfo?.cpu_count_logical ?? 4;
  const interfaceCount = networkEnv?.interfaces?.length ?? 2;

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Core Edge Gateway"
          value={backendOnline ? `${gatewayLatencyMs ?? 0.8}` : 'OFFLINE'}
          unit={backendOnline ? 'ms' : ''}
          subtext={backendOnline ? '127.0.0.1:8000 nominal' : 'Service unreachable'}
          icon={Radio}
          status={backendOnline ? 'nominal' : 'critical'}
          trend={{ direction: 'flat', value: '0.1ms' }}
        />

        <KpiCard
          label="Monitored Nodes"
          value="4"
          unit="endpoints"
          subtext="1 Gateway, 2 Switches, 1 Probe"
          icon={Server}
          status="neutral"
          trend={{ direction: 'flat', value: '100% up' }}
        />

        <KpiCard
          label="Platform SLA"
          value="99.98"
          unit="%"
          subtext="Target: 99.90% operational"
          icon={Activity}
          status="nominal"
          trend={{ direction: 'up', value: '0.02%' }}
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
          <PerformanceChart />
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
              Interactive canvas of core distribution nodes, probe sensors and edge gateways.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111E30] text-[#22D3EE] border border-[#203750]">
            REACT FLOW CANVAS
          </span>
        </div>
        <TopologyGraph />
      </div>

      {/* Monitored Inventory Table */}
      <InventoryTable />
    </div>
  );
};
