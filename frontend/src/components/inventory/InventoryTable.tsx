import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Server, CheckCircle, Activity, RefreshCw } from 'lucide-react';
import { fetchInventoryNodes, addInventoryNode, deleteInventoryNode, executePingDiagnostic } from '../../services/api';

interface InventoryNode {
  id: string;
  name: string;
  ip: string;
  type: 'gateway' | 'switch' | 'server' | 'probe';
  status: string;
  interface: string;
  mac?: string;
  source?: string;
}

export const InventoryTable: React.FC = () => {
  const [endpoints, setEndpoints] = useState<InventoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, string>>({});

  // Form state
  const [newName, setNewName] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newType, setNewType] = useState<'gateway' | 'switch' | 'server' | 'probe'>('probe');

  const loadNodes = async () => {
    setLoading(true);
    const { nodes } = await fetchInventoryNodes();
    if (nodes) setEndpoints(nodes);
    setLoading(false);
  };

  useEffect(() => {
    loadNodes();
  }, []);

  const filtered = endpoints.filter((ep) => {
    const matchesSearch =
      ep.name.toLowerCase().includes(search.toLowerCase()) ||
      ep.ip.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || ep.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIp.trim()) return;
    const { node } = await addInventoryNode(newName.trim(), newIp.trim(), newType, 'custom');
    if (node) {
      setEndpoints((prev) => [...prev, node]);
      setNewName('');
      setNewIp('');
      setIsAddOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteInventoryNode(id);
    if (ok) {
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
    }
  };

  const handleQuickPing = async (ep: InventoryNode) => {
    setPingingId(ep.id);
    const { data, error } = await executePingDiagnostic(ep.ip, 2, 32, 1500);
    setPingingId(null);
    if (data) {
      setPingResults((prev) => ({
        ...prev,
        [ep.id]: data.avg_rtt_ms !== null ? `${data.avg_rtt_ms}ms (${data.packet_loss_pct}% loss)` : 'Timeout',
      }));
    } else {
      setPingResults((prev) => ({ ...prev, [ep.id]: error || 'Failed' }));
    }
  };

  return (
    <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[#22D3EE]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Discovered & Monitored Nodes ({filtered.length})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#647C96]" />
            <input
              type="text"
              placeholder="Search by IP or host..."
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
            <option value="switch">LAN ARP Peers</option>
            <option value="server">Host Servers</option>
            <option value="probe">Custom Probes</option>
          </select>

          <button
            onClick={loadNodes}
            className="p-1.5 rounded-lg bg-[#111E30] border border-[#203750] text-[#91A7C0] hover:text-[#EAF3FF]"
            title="Refresh ARP & Gateway Discovery"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

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
              <th className="py-2.5 px-4">MAC / Source</th>
              <th className="py-2.5 px-4">Class</th>
              <th className="py-2.5 px-4">Live Ping Check</th>
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
                <td className="py-3 px-4 text-[#91A7C0]">{ep.mac || ep.interface}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#00D69A]/10 text-[#00D69A] border border-[#00D69A]/30 uppercase">
                    <CheckCircle className="w-2.5 h-2.5" /> {ep.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-[11px]">
                  {pingResults[ep.id] ? (
                    <span className="text-[#00D69A]">{pingResults[ep.id]}</span>
                  ) : (
                    <span className="text-[#647C96]">Click Ping to verify</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right space-x-1">
                  <button
                    onClick={() => handleQuickPing(ep)}
                    disabled={pingingId === ep.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#111E30] border border-[#203750] text-[#22D3EE] hover:border-[#22D3EE]/50 text-[10px]"
                    title="Send 2 ICMP probes"
                  >
                    <Activity className={`w-3 h-3 ${pingingId === ep.id ? 'animate-spin' : ''}`} />
                    <span>{pingingId === ep.id ? '...' : 'Ping'}</span>
                  </button>

                  {ep.source === 'custom' && (
                    <button
                      onClick={() => handleDelete(ep.id)}
                      className="p-1 rounded text-[#647C96] hover:text-[#FF475F] hover:bg-[#111E30] transition-colors"
                      title="Remove Custom Node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[#647C96]">
                  {loading ? 'Discovering network nodes...' : 'No endpoints matched the specified filter criteria.'}
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
              Register Custom Infrastructure Node
            </h4>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">Node Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloudflare Public DNS"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] focus:border-[#22D3EE] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[#91A7C0] mb-1 font-mono">IP Address / Domain</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.1.1.1 or google.com"
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
                  <option value="probe">Probe Target</option>
                  <option value="server">Server</option>
                  <option value="gateway">Gateway</option>
                  <option value="switch">Switch</option>
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
                  Save to SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
