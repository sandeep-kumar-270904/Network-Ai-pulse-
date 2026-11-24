import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Router, Server, Cpu, Radio, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchDynamicTopology } from '../../services/api';

interface DeviceData {
  label: string;
  ip: string;
  type: 'gateway' | 'switch' | 'server' | 'probe';
  status: 'online' | 'degraded' | 'offline';
  interface?: string;
}

const initialNodes: Node[] = [
  {
    id: 'gw-1',
    type: 'default',
    position: { x: 280, y: 30 },
    data: {
      label: 'Core Gateway (Edge)',
      ip: '192.168.1.1',
      type: 'gateway',
      status: 'online',
      interface: 'eth0',
    },
    style: {
      background: '#13243A',
      color: '#EAF3FF',
      border: '1px solid #22D3EE',
      borderRadius: '10px',
      padding: '10px',
      fontFamily: 'JetBrains Mono',
      fontSize: '11px',
      width: 180,
    },
  },
  {
    id: 'sw-1',
    type: 'default',
    position: { x: 120, y: 150 },
    data: {
      label: 'Dist Switch A',
      ip: '192.168.1.2',
      type: 'switch',
      status: 'online',
      interface: 'eth1',
    },
    style: {
      background: '#0D192B',
      color: '#EAF3FF',
      border: '1px solid #287EFF',
      borderRadius: '10px',
      padding: '10px',
      fontFamily: 'JetBrains Mono',
      fontSize: '11px',
      width: 170,
    },
  },
  {
    id: 'sw-2',
    type: 'default',
    position: { x: 440, y: 150 },
    data: {
      label: 'Lab Switch B',
      ip: '192.168.1.3',
      type: 'switch',
      status: 'online',
      interface: 'eth2',
    },
    style: {
      background: '#0D192B',
      color: '#EAF3FF',
      border: '1px solid #287EFF',
      borderRadius: '10px',
      padding: '10px',
      fontFamily: 'JetBrains Mono',
      fontSize: '11px',
      width: 170,
    },
  },
  {
    id: 'srv-1',
    type: 'default',
    position: { x: 40, y: 280 },
    data: {
      label: 'Test Host 01',
      ip: '192.168.1.101',
      type: 'server',
      status: 'online',
      interface: 'eth0',
    },
    style: {
      background: '#111E30',
      color: '#EAF3FF',
      border: '1px solid #203750',
      borderRadius: '10px',
      padding: '10px',
      fontFamily: 'JetBrains Mono',
      fontSize: '11px',
      width: 160,
    },
  },
  {
    id: 'srv-2',
    type: 'default',
    position: { x: 220, y: 280 },
    data: {
      label: 'FastAPI Backend Core',
      ip: '127.0.0.1:8000',
      type: 'server',
      status: 'online',
      interface: 'lo',
    },
    style: {
      background: '#13243A',
      color: '#EAF3FF',
      border: '1px solid #00D69A',
      borderRadius: '10px',
      padding: '10px',
      fontFamily: 'JetBrains Mono',
      fontSize: '11px',
      width: 180,
    },
  },
  {
    id: 'probe-1',
    type: 'default',
    position: { x: 440, y: 280 },
    data: {
      label: 'NetPulse Probe Node',
      ip: '192.168.1.200',
      type: 'probe',
      status: 'online',
      interface: 'wlan0',
    },
    style: {
      background: '#111E30',
      color: '#EAF3FF',
      border: '1px solid #203750',
      borderRadius: '10px',
      padding: '10px',
      fontFamily: 'JetBrains Mono',
      fontSize: '11px',
      width: 170,
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-gw-sw1', source: 'gw-1', target: 'sw-1', animated: true, style: { stroke: '#22D3EE', strokeWidth: 2 } },
  { id: 'e-gw-sw2', source: 'gw-1', target: 'sw-2', animated: true, style: { stroke: '#287EFF', strokeWidth: 2 } },
  { id: 'e-sw1-srv1', source: 'sw-1', target: 'srv-1', style: { stroke: '#203750', strokeWidth: 1.5 } },
  { id: 'e-sw1-srv2', source: 'sw-1', target: 'srv-2', animated: true, style: { stroke: '#00D69A', strokeWidth: 1.5 } },
  { id: 'e-sw2-probe1', source: 'sw-2', target: 'probe-1', style: { stroke: '#203750', strokeWidth: 1.5 } },
];

export const TopologyGraph: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    fetchDynamicTopology().then(({ nodes: dynamicNodes, edges: dynamicEdges }) => {
      if (dynamicNodes && dynamicNodes.length > 0) {
        setNodes(dynamicNodes);
      }
      if (dynamicEdges && dynamicEdges.length > 0) {
        setEdges(dynamicEdges);
      }
    });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  return (
    <div className="relative w-full h-[460px] bg-[#080E19] rounded-xl border border-[#203750] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#203750" />
        <Controls
          style={{
            background: '#0D192B',
            border: '1px solid #203750',
            borderRadius: '8px',
            color: '#EAF3FF',
          }}
        />
      </ReactFlow>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-72 p-4 rounded-xl bg-[#0D192B]/95 backdrop-blur-md border border-[#22D3EE]/40 shadow-xl space-y-3 font-mono text-xs z-10">
          <div className="flex items-center justify-between pb-2 border-b border-[#203750]">
            <span className="font-bold text-[#EAF3FF]">{String(selectedNode.data?.label || selectedNode.id)}</span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[#91A7C0] hover:text-[#EAF3FF]"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#647C96]">IP Address:</span>
              <span className="text-[#22D3EE] font-semibold">{String(selectedNode.data?.ip || 'N/A')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#647C96]">Role:</span>
              <span className="text-[#EAF3FF] uppercase">{String(selectedNode.data?.type || 'node')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#647C96]">Interface:</span>
              <span className="text-[#91A7C0]">{String(selectedNode.data?.interface || 'eth0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#647C96]">Operational:</span>
              <span className="text-[#00D69A] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Nominal
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
