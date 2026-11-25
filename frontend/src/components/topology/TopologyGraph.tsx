import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  NodeProps,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Router,
  Server,
  Cpu,
  Radio,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Activity,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchDynamicTopology, fetchAnalyticsSummary } from '../../services/api';
import { formatLatencyMs, formatPercent } from '../../utils/formatters';
import { StatusChip, StatusTone } from '../ui/StatusChip';
import { CopyButton } from '../ui/CopyButton';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { ThemeMode } from '../ui/ThemeToggle';
import { useDemoMode } from '../../contexts/DemoModeContext';

export type NodeDeviceRole = 'gateway' | 'switch' | 'server' | 'probe';
export type NodeHealthStatus = 'online' | 'degraded' | 'offline';

export interface TopologyNodeData extends Record<string, unknown> {
  label: string;
  ip: string;
  type: NodeDeviceRole;
  status: NodeHealthStatus;
  interface?: string;
  latencyMs?: number | null;
  passRatePct?: number | null;
  highlighted?: boolean;
}

const roleIcon = (role: NodeDeviceRole) => {
  switch (role) {
    case 'gateway':
      return Router;
    case 'server':
      return Server;
    case 'switch':
      return Cpu;
    default:
      return Radio;
  }
};

const statusToTone = (status: NodeHealthStatus): { tone: StatusTone; label: string; border: string; dot: string } => {
  if (status === 'offline') {
    return {
      tone: 'danger',
      label: 'Failing',
      border: 'border-[var(--danger)]',
      dot: 'bg-[var(--danger)]',
    };
  }
  if (status === 'degraded') {
    return {
      tone: 'warn',
      label: 'Degraded',
      border: 'border-[var(--warn)]',
      dot: 'bg-[var(--warn)]',
    };
  }
  return {
    tone: 'ok',
    label: 'Online',
    border: 'border-[var(--border-strong)]',
    dot: 'bg-[var(--ok)]',
  };
};

  const TopologyNodeCard: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as TopologyNodeData;
  const { maskHost, maskIp, maskMacAddr } = useDemoMode();
  const Icon = roleIcon(nodeData.type || 'probe');
  const statusMeta = statusToTone(nodeData.status || 'online');
  const displayLabel = maskHost(nodeData.label);
  const displayIp = maskIp(nodeData.ip);
  const displayIface = nodeData.interface
    ? maskMacAddr(nodeData.interface)
    : 'eth0';

  return (
    <div
      style={{ backgroundColor: 'var(--surface-1)', color: 'var(--text)' }}
      className={`min-w-[188px] max-w-[216px] rounded-[var(--radius-card)] bg-[var(--surface-1)] border-2 px-3 py-2.5 shadow-[var(--shadow-card)] ${
        selected || nodeData.highlighted
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent-ring)]'
          : statusMeta.border
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-[var(--border-control)] !border-0"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-[var(--radius-control)] flex items-center justify-center shrink-0 ${
              nodeData.status === 'offline'
                ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                : nodeData.status === 'degraded'
                ? 'bg-[var(--warn-soft)] text-[var(--warn)]'
                : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[var(--text)] truncate" title={displayLabel}>
              {displayLabel}
            </div>
            <div className="text-[12px] font-mono text-[var(--text-muted)] truncate np-mono-val" title={displayIface}>
              {displayIp}
            </div>
          </div>
        </div>
        <span
          title={statusMeta.label}
          className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${statusMeta.dot}`}
        />
      </div>

      <div className="mt-2 pt-1.5 border-t border-[var(--border)] flex items-center justify-between gap-2 text-[12px]">
        <span className="text-[var(--text-muted)] capitalize">{nodeData.type}</span>
        <span className="font-mono text-[var(--text-secondary)] np-mono-val">
          {nodeData.latencyMs !== undefined && nodeData.latencyMs !== null
            ? formatLatencyMs(nodeData.latencyMs)
            : statusMeta.label}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-[var(--border-control)] !border-0"
      />
    </div>
  );
};

const NODE_TYPES = { custom: TopologyNodeCard };

interface TopologyGraphProps {
  compact?: boolean;
  theme?: ThemeMode;
  timeRange?: string;
}

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  compact = false,
  theme = 'dark',
  timeRange = '1h',
}) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { maskHost, maskIp, maskMacAddr } = useDemoMode();

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const isLight = theme === 'light';
  const graphColors = useMemo(
    () => ({
      gridDots: isLight ? '#c1cce0' : '#243049',
      edgeHealthy: isLight ? '#065f46' : '#34d399',
      edgeAccent: isLight ? '#155e75' : '#22d3ee',
      edgeDegraded: isLight ? '#92400e' : '#fbbf24',
      edgeFailing: isLight ? '#b91c1c' : '#f87171',
      minimapMask: isLight ? 'rgba(246, 248, 251, 0.72)' : 'rgba(9, 12, 18, 0.72)',
    }),
    [isLight]
  );

  const loadTopologyData = useCallback(async () => {
    setLoading(true);
    const [topoRes, anaRes] = await Promise.all([
      fetchDynamicTopology(),
      fetchAnalyticsSummary(timeRange, 500),
    ]);
    if (topoRes.error && (!topoRes.nodes || topoRes.nodes.length === 0)) {
      setLoadError(topoRes.error);
      setLoading(false);
      return;
    }
    setLoadError(null);

    const perTarget: any[] = anaRes.analytics?.per_target || [];
    const targetByHost = new Map<string, any>();
    perTarget.forEach((pt) => {
      targetByHost.set(pt.target, pt);
      const bareHost = String(pt.target).split(':')[0];
      if (!targetByHost.has(bareHost)) {
        targetByHost.set(bareHost, pt);
      }
    });

    const rawNodes: any[] = topoRes.nodes || [];
    const rawEdges: any[] = topoRes.edges || [];

    // Collect normalized custom nodes placed on clean non-overlapping coordinates
    const normalizedNodes: Node[] = [];
    const normalizedEdges: Edge[] = [];
    const existingIps = new Set<string>();

    const gwNode = rawNodes.find((n) => n.id === 'node-gw') || rawNodes[0];
    const otherBaseNodes = rawNodes.filter((n) => n.id !== gwNode?.id);

    // Extra monitored telemetry targets not already present in base topology
    const extraTargets = compact
      ? perTarget.filter((pt) => pt.failing).slice(0, 2)
      : perTarget.slice(0, 4);

    if (gwNode) {
      const gwIp = String(gwNode.data?.ip || '192.168.1.1');
      existingIps.add(gwIp);
      const gwStats = targetByHost.get(gwIp);
      const gwStatus: NodeHealthStatus =
        gwStats?.latest_status === 'failed' || gwStats?.pass_rate_pct === 0
          ? 'offline'
          : gwStats?.failing
          ? 'degraded'
          : 'online';

      normalizedNodes.push({
        id: gwNode.id,
        type: 'custom',
        position: { x: 260, y: 20 },
        data: {
          label: String(gwNode.data?.label || 'Core Default Gateway'),
          ip: gwIp,
          type: (gwNode.data?.type as NodeDeviceRole) || 'gateway',
          status: gwStatus,
          interface: String(gwNode.data?.interface || 'uplink0'),
          latencyMs: gwStats?.avg_rtt_ms ?? null,
          passRatePct: gwStats?.pass_rate_pct ?? null,
        } satisfies TopologyNodeData,
      });
    }

    const totalLower = otherBaseNodes.length + extraTargets.filter((t) => {
      const bare = String(t.target).split(':')[0];
      return !rawNodes.some((rn) => rn.data?.ip === t.target || rn.data?.ip === bare);
    }).length;

    const lowerGridPosition = (idx: number, total: number) => {
      // Place 2 nodes on tier 1 (flanking open center lane x=260) and remaining nodes on tier 2
      if (total <= 3) {
        const spacing = 230;
        const offset = ((total - 1) * spacing) / 2;
        return { x: 260 - offset + idx * spacing, y: 175 };
      }
      if (idx < 2) {
        return { x: idx === 0 ? 40 : 480, y: 170 };
      }
      const tier2Count = total - 2;
      const tier2Idx = idx - 2;
      const spacing = 235;
      const offset = ((tier2Count - 1) * spacing) / 2;
      return {
        x: 260 - offset + tier2Idx * spacing,
        y: 335,
      };
    };

    let slotIdx = 0;

    otherBaseNodes.forEach((n) => {
      const ip = String(n.data?.ip || '');
      existingIps.add(ip);
      const stats = targetByHost.get(ip);
      const nodeStatus: NodeHealthStatus =
        stats?.latest_status === 'failed' || stats?.pass_rate_pct === 0
          ? 'offline'
          : stats?.failing
          ? 'degraded'
          : ((n.data?.status as NodeHealthStatus) || 'online');

      normalizedNodes.push({
        id: n.id,
        type: 'custom',
        position: lowerGridPosition(slotIdx, totalLower),
        data: {
          label: String(n.data?.label || n.id),
          ip,
          type: (n.data?.type as NodeDeviceRole) || 'server',
          status: nodeStatus,
          interface: String(n.data?.interface || 'eth0'),
          latencyMs: stats?.avg_rtt_ms ?? null,
          passRatePct: stats?.pass_rate_pct ?? null,
        } satisfies TopologyNodeData,
      });
      slotIdx += 1;
    });

    // Add active failing/monitored probe endpoints not already represented so failing links show visibly
    extraTargets.forEach((pt, idx) => {
      const targetStr = String(pt.target);
      const bare = targetStr.split(':')[0];
      if (rawNodes.some((rn) => rn.data?.ip === targetStr || rn.data?.ip === bare)) return;

      const nodeId = `node-probe-${idx}`;
      const nodeStatus: NodeHealthStatus =
        pt.latest_status === 'failed' || pt.pass_rate_pct === 0
          ? 'offline'
          : pt.failing
          ? 'degraded'
          : 'online';

      normalizedNodes.push({
        id: nodeId,
        type: 'custom',
        position: lowerGridPosition(slotIdx, totalLower),
        data: {
          label: nodeStatus === 'offline' ? `Failing probe` : `Monitored target`,
          ip: targetStr,
          type: 'probe',
          status: nodeStatus,
          interface: targetStr.includes(':') ? `tcp/${targetStr.split(':')[1]}` : 'icmp',
          latencyMs: pt.avg_rtt_ms ?? null,
          passRatePct: pt.pass_rate_pct ?? null,
        } satisfies TopologyNodeData,
      });
      slotIdx += 1;

      if (gwNode) {
        normalizedEdges.push({
          id: `edge-gw-probe-${idx}`,
          type: 'smoothstep',
          source: gwNode.id,
          target: nodeId,
          animated: nodeStatus !== 'online',
          label:
            nodeStatus === 'offline'
              ? `Failed (${formatPercent(pt.avg_loss_pct)})`
              : pt.avg_rtt_ms !== null
              ? formatLatencyMs(pt.avg_rtt_ms)
              : 'No data',
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 6,
          style:
            nodeStatus === 'offline'
              ? { stroke: graphColors.edgeFailing, strokeWidth: 2.5, strokeDasharray: '6 4' }
              : nodeStatus === 'degraded'
              ? { stroke: graphColors.edgeDegraded, strokeWidth: 2 }
              : { stroke: graphColors.edgeAccent, strokeWidth: 2 },
        });
      }
    });

    rawEdges.forEach((e) => {
      const targetNode = normalizedNodes.find((n) => n.id === e.target);
      const targetData = targetNode?.data as TopologyNodeData | undefined;
      const st = targetData?.status || 'online';
      const latLabel =
        st === 'offline'
          ? 'Link failed'
          : targetData?.latencyMs !== undefined && targetData?.latencyMs !== null
          ? formatLatencyMs(targetData.latencyMs)
          : undefined;

      normalizedEdges.push({
        id: e.id,
        type: 'smoothstep',
        source: e.source,
        target: e.target,
        animated: st !== 'online',
        label: latLabel,
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
        style:
          st === 'offline'
            ? { stroke: graphColors.edgeFailing, strokeWidth: 2.5, strokeDasharray: '6 4' }
            : st === 'degraded'
            ? { stroke: graphColors.edgeDegraded, strokeWidth: 2 }
            : { stroke: graphColors.edgeHealthy, strokeWidth: 2 },
      });
    });

    setNodes(normalizedNodes);
    setEdges(normalizedEdges);
    setLoading(false);

    window.requestAnimationFrame(() => {
      rfInstanceRef.current?.fitView({ padding: 0.22, duration: 250 });
    });
  }, [compact, graphColors, timeRange]);

  useEffect(() => {
    loadTopologyData();
  }, [loadTopologyData]);

  // Refit graph smoothly whenever container dimensions change
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      rfInstanceRef.current?.fitView({ padding: 0.22 });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const decoratedNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return nodes.map((n) => {
      const nd = n.data as TopologyNodeData;
      const isMatch =
        q.length > 0 &&
        (nd.label.toLowerCase().includes(q) || nd.ip.toLowerCase().includes(q));
      return {
        ...n,
        data: { ...nd, highlighted: isMatch },
      };
    });
  }, [nodes, searchQuery]);

  const selectedNode = useMemo(
    () => decoratedNodes.find((n) => n.id === selectedNodeId) || null,
    [decoratedNodes, selectedNodeId]
  );

  const handleFocusSearchMatch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !rfInstanceRef.current) return;
    const match = nodes.find((n) => {
      const nd = n.data as TopologyNodeData;
      return nd.label.toLowerCase().includes(q) || nd.ip.toLowerCase().includes(q);
    });
    if (match) {
      setSelectedNodeId(match.id);
      rfInstanceRef.current.fitView({ nodes: [{ id: match.id }], padding: 0.8, duration: 300 });
    }
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const selectedData = selectedNode?.data as TopologyNodeData | undefined;
  const selectedStatusMeta = statusToTone(selectedData?.status || 'online');

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search
              className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFocusSearchMatch();
              }}
              placeholder="Search node label or IP…"
              aria-label="Search topology nodes"
              className="w-full h-10 pl-9 pr-8 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => rfInstanceRef.current?.zoomIn({ duration: 200 })}
              aria-label="Zoom in"
              className="h-10 w-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center justify-center"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => rfInstanceRef.current?.zoomOut({ duration: 200 })}
              aria-label="Zoom out"
              className="h-10 w-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center justify-center"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => rfInstanceRef.current?.fitView({ padding: 0.22, duration: 250 })}
              className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Fit graph</span>
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`relative w-full ${
          compact ? 'h-[260px]' : 'h-[480px]'
        } bg-[var(--bg)] rounded-[var(--radius-card)] border border-[var(--border)] overflow-hidden`}
      >
        <ReactFlow
          colorMode={theme}
          nodes={decoratedNodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          onInit={(inst) => {
            rfInstanceRef.current = inst as unknown as ReactFlowInstance;
            inst.fitView({ padding: 0.24, minZoom: 0.15, maxZoom: 1.15 });
          }}
          fitView
          minZoom={0.15}
          maxZoom={1.8}
          fitViewOptions={{ padding: 0.24, minZoom: 0.15, maxZoom: 1.15 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={!compact}
          zoomOnScroll={!compact}
          panOnDrag={!compact}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color={graphColors.gridDots} />
          {!compact && (
            <MiniMap
              className="hidden lg:block"
              pannable
              zoomable
              style={{ width: 150, height: 95 }}
              maskColor={graphColors.minimapMask}
              nodeColor={(n) => {
                const st = (n.data as TopologyNodeData)?.status;
                if (st === 'offline') return graphColors.edgeFailing;
                if (st === 'degraded') return graphColors.edgeDegraded;
                return graphColors.edgeHealthy;
              }}
            />
          )}
        </ReactFlow>

        {loadError && nodes.length === 0 ? (
          <div className="p-4">
            <ErrorState
              title="Unable to resolve network topology"
              message={loadError}
              onRetry={loadTopologyData}
              retrying={loading}
            />
          </div>
        ) : null}

        {loading && nodes.length === 0 && (
          <div className="absolute inset-0 p-6 flex flex-col justify-center gap-4 bg-[var(--surface-backdrop)]">
            <Skeleton className="h-12 w-48 mx-auto rounded-[var(--radius-card)]" />
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto w-full">
              <Skeleton className="h-16 w-full rounded-[var(--radius-card)]" />
              <Skeleton className="h-16 w-full rounded-[var(--radius-card)]" />
              <Skeleton className="h-16 w-full rounded-[var(--radius-card)]" />
            </div>
          </div>
        )}

        {/* Selected Node Details Panel */}
        {selectedNode && selectedData && (
          <div className="absolute top-3 right-3 w-72 p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border-strong)] shadow-[var(--shadow-popover)] space-y-3 z-10">
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-[var(--border)]">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[var(--text)] truncate">
                  {maskHost(selectedData.label)}
                </div>
                <div className="text-[12px] text-[var(--text-muted)] capitalize">
                  {selectedData.type} node
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                aria-label="Close node details"
                className="w-8 h-8 -mr-1 -mt-1 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--text-muted)]">IP / Target</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-semibold text-[var(--accent)]">
                    {maskIp(selectedData.ip)}
                  </span>
                  <CopyButton value={maskIp(selectedData.ip)} label="Copy IP" compact />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--text-muted)]">Interface</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {selectedData.interface
                    ? maskMacAddr(selectedData.interface)
                    : 'eth0'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--text-muted)]">Measured RTT</span>
                <span className="font-mono text-[var(--text)] np-mono-val">
                  {formatLatencyMs(selectedData.latencyMs)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--text-muted)]">Pass rate</span>
                <span className="font-mono text-[var(--text)] np-mono-val">
                  {formatPercent(selectedData.passRatePct)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--text-muted)]">Status</span>
                <StatusChip size="sm" tone={selectedStatusMeta.tone} label={selectedStatusMeta.label} />
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)] flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/diagnostics')}
                className="flex-1 h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-ink)] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[var(--accent-hover)]"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Probe</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="flex-1 h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[var(--text)] text-[12px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[var(--surface-3)]"
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
