import React, { useState } from 'react';
import { Search, Plus, Trash2, Server, Router, Radio, CheckCircle, AlertCircle } from 'lucide-react';
import { Endpoint } from '../../types';

interface InventoryTableProps {
  initialEndpoints?: Endpoint[];
}

const DEFAULT_ENDPOINTS: Endpoint[] = [
  {
    id: 'ep-1',
    name: 'Core Edge Gateway',
    ip: '192.168.1.1',
    type: 'gateway',
    status: 'online',
    latencyMs: 1.2,
    interface: 'eth0',
    lastChecked: 'Just now',
  },
  {
    id: 'ep-2',
    name: 'Distribution Switch 01',
    ip: '192.168.1.2',
    type: 'switch',
    status: 'online',
    latencyMs: 0.8,
    interface: 'eth1',
    lastChecked: 'Just now',
  },
  {
    id: 'ep-3',
    name: 'FastAPI REST Core Host',
    ip: '127.0.0.1:8000',
    type: 'server',
    status: 'online',
    latencyMs: 0.4,
    interface: 'lo',
    lastChecked: 'Just now',
  },
  {
    id: 'ep-4',
    name: 'Lab Test Probe Node',
    ip: '192.168.1.200',
    type: 'probe',
    status: 'online',
    latencyMs: 2.1,
    interface: 'wlan0',
    lastChecked: '1m ago',
  },
];

export const InventoryTable: React.FC<InventoryTableProps> = ({ initialEndpoints }) => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints || DEFAULT_ENDPOINTS);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newType, setNewType] = useState<'gateway' | 'switch' | 'server' | 'probe'>('server');

  const filtered = endpoints.filter((ep) => {
    const matchesSearch =
      ep.name.toLowerCase().includes(search.toLowerCase()) ||
      ep.ip.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || ep.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIp.trim()) return;

    const newEndpoint: Endpoint = {
      id: `ep-${Date.now()}`,
      name: newName.trim(),
      ip: newIp.trim(),
      type: newType,
      status: 'online',
      latencyMs: 1.0,
      interface: 'eth0',
      lastChecked: 'Just now',
    };

    setEndpoints([...endpoints, newEndpoint]);
    setNewName('');
    setNewIp('');
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    setEndpoints(endpoints.filter((ep) => ep.id !== id));
  };

  return (
    <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[#22D3EE]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Monitored Endpoints ({filtered.length})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#647C96]" />
            <input
              type="text"
              placeholder="Search by IP or hostname..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#111E30] border border-[#203750] text-xs text-[#EAF3FF] placeholder-[#647C96] focus:outline-none focus:border-[#22D3EE] font-mono"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#111E30] border border-[#203750] text-xs text-[#91A7C0] focus:outline-none focus:border-[#22D3EE] font-mono"
          >
            <option value="all">All Types</option>
            <option value="gateway">Gateways</option>
            <option value="switch">Switches</option>
            <option value="server">Servers</option>
            <option value="probe">Probes</option>
          </select>

          {/* Add endpoint button */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#287EFF] hover:bg-[#168BFF] text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Node</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#203750]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#111E30] text-[#91A7C0] font-mono uppercase text-[10px] tracking-wider border-b border-[#203750]">
            <tr>
              <th className="py-2.5 px-4">Node / Identity</th>
              <th className="py-2.5 px-4">IP Address</th>
              <th className="py-2.5 px-4">Device Class</th>
              <th className="py-2.5 px-4">Interface</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#203750]/50 font-mono">
            {filtered.map((ep) => (
              <tr key={ep.id} className="hover:bg-[#13243A]/60 transition-colors">
                <td className="py-3 px-4 text-[#EAF3FF] font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
                  {ep.name}
                </td>
                <td className="py-3 px-4 text-[#22D3EE]">{ep.ip}</td>
                <td className="py-3 px-4 text-[#91A7C0] uppercase text-[11px]">{ep.type}</td>
                <td className="py-3 px-4 text-[#647C96]">{ep.interface || 'eth0'}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#00D69A]/10 text-[#00D69A] border border-[#00D69A]/30">
                    <CheckCircle className="w-2.5 h-2.5" /> ONLINE
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleDelete(ep.id)}
                    className="p-1 rounded text-[#647C96] hover:text-[#FF475F] hover:bg-[#111E30] transition-colors"
                    title="Remove Node"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[#647C96]">
                  No endpoints matched the specified filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Node Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-xl bg-[#0D192B] border border-[#22D3EE]/40 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-[#EAF3FF] font-mono uppercase tracking-wider">
              Register Infrastructure Node
            </h4>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Node Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Aggregation Switch"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] focus:border-[#22D3EE] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">IP Address / Host</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.50 or host.local"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] focus:border-[#22D3EE] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Device Role</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] focus:border-[#22D3EE] focus:outline-none font-mono"
                >
                  <option value="gateway">Gateway</option>
                  <option value="switch">Switch</option>
                  <option value="server">Server</option>
                  <option value="probe">Probe</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#13243A] text-[#91A7C0] hover:text-[#EAF3FF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#287EFF] hover:bg-[#168BFF] text-white font-medium"
                >
                  Save Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
