import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Server,
  Wifi,
  Router,
  Cpu,
  Radio,
  Plus,
  Trash2,
  Activity,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  fetchInventoryNodes,
  addInventoryNode,
  deleteInventoryNode,
  executePingDiagnostic,
  fetchDiagnosticHistory,
} from '../services/api';
import {
  ListViewToolbar,
  FilterChipOption,
  LocalTimeFilter,
  filterByTimeWindow,
} from '../components/ui/ListViewToolbar';
import { PaginationBar } from '../components/ui/PaginationBar';
import { SideDrawer } from '../components/ui/SideDrawer';
import { Dialog } from '../components/ui/Dialog';
import { StatusChip, StatusTone } from '../components/ui/StatusChip';
import { CopyButton } from '../components/ui/CopyButton';
import { EmptyState } from '../components/ui/EmptyState';
import { TextInput } from '../components/ui/TextInput';
import { Select } from '../components/ui/Select';
import { useSavedViews, SavedView } from '../hooks/useSavedViews';
import { useToast } from '../components/ui/Toast';
import { exportToCsv, exportToJson } from '../utils/export';
import {
  formatLatencyMs,
  formatRelativeTime,
  formatTimestampUtc,
} from '../utils/formatters';

interface InventoryProps {
  networkEnv: any | null;
}

interface UnifiedAssetRow {
  id: string;
  assetKind: 'node' | 'adapter';
  name: string;
  ip: string;
  role: 'gateway' | 'switch' | 'server' | 'probe' | 'adapter';
  status: 'online' | 'offline' | 'down' | 'unprobed';
  lastSeen: string | null;
  latencyMs: number | null;
  macOrSource: string;
  interfaceName: string;
  speedOrNotes: string;
  removable: boolean;
}

interface InventorySavedState {
  search: string;
  filterChip: string;
  timeFilter: LocalTimeFilter;
}

const ROLE_OPTIONS = [
  { value: 'probe', label: 'Probe target' },
  { value: 'server', label: 'Server' },
  { value: 'gateway', label: 'Gateway' },
  { value: 'switch', label: 'Switch / LAN peer' },
];

const IP_OR_HOST_PATTERN =
  /^(localhost|(\d{1,3}\.){3}\d{1,3}(:\d{1,5})?|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d{1,5})?)$/;

const roleIcon = (role: UnifiedAssetRow['role']) => {
  switch (role) {
    case 'gateway':
      return Router;
    case 'server':
      return Server;
    case 'switch':
      return Cpu;
    case 'adapter':
      return Wifi;
    default:
      return Radio;
  }
};

export const Inventory: React.FC<InventoryProps> = ({ networkEnv }) => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterChip, setFilterChip] = useState('all');
  const [timeFilter, setTimeFilter] = useState<LocalTimeFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedAsset, setSelectedAsset] = useState<UnifiedAssetRow | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);

  // Add Node dialog state with validation
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newRole, setNewRole] = useState<'gateway' | 'switch' | 'server' | 'probe'>('probe');
  const [formErrors, setFormErrors] = useState<{ name?: string; ip?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<UnifiedAssetRow | null>(null);

  const { views, saveView, deleteView } = useSavedViews<InventorySavedState>('inventory');
  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [nodeRes, histRes] = await Promise.all([
      fetchInventoryNodes(),
      fetchDiagnosticHistory(500),
    ]);
    setNodes(nodeRes.nodes || []);
    setHistory(histRes.records || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge monitored nodes and host OS physical/virtual network adapters into one unified table
  const unifiedAssets: UnifiedAssetRow[] = useMemo(() => {
    const nodeRows: UnifiedAssetRow[] = nodes.map((n) => {
      const hasProbe = Boolean(n.last_seen);
      const st: UnifiedAssetRow['status'] =
        n.probe_status === 'failed'
          ? 'offline'
          : hasProbe
          ? 'online'
          : n.status === 'offline'
          ? 'offline'
          : n.source === 'custom'
          ? 'unprobed'
          : 'online';

      return {
        id: String(n.id),
        assetKind: 'node',
        name: String(n.name),
        ip: String(n.ip),
        role: (n.type as UnifiedAssetRow['role']) || 'probe',
        status: st,
        lastSeen: n.last_seen || null,
        latencyMs: typeof n.latency_ms === 'number' ? n.latency_ms : null,
        macOrSource: String(n.mac || n.source || 'discovered'),
        interfaceName: String(n.interface || 'custom'),
        speedOrNotes: n.source === 'custom' ? 'Custom endpoint' : 'Auto-discovered',
        removable: n.source === 'custom',
      };
    });

    const interfaces: any[] = networkEnv?.interfaces || [];
    const adapterRows: UnifiedAssetRow[] = interfaces.map((iface, idx) => {
      const ipv4 =
        iface.ipv4_addresses?.[0]?.address ||
        iface.ipv4?.[0]?.address ||
        'No IPv4 bound';
      const isUp = Boolean(iface.is_up);
      return {
        id: `adapter-${idx}-${iface.name}`,
        assetKind: 'adapter',
        name: String(iface.name),
        ip: String(ipv4),
        role: 'adapter',
        status: isUp ? 'online' : 'down',
        lastSeen: isUp ? new Date().toISOString() : null,
        latencyMs: ipv4 === '127.0.0.1' ? 0.1 : null,
        macOrSource: String(iface.mac_address || 'Local OS'),
        interfaceName: String(iface.name),
        speedOrNotes: iface.speed_mbps ? `${iface.speed_mbps} Mbps` : 'Auto link',
        removable: false,
      };
    });

    // Problems first, then active online nodes, then active adapters, then quiet down adapters
    const combined = [...nodeRows, ...adapterRows];
    const rank = (s: UnifiedAssetRow['status']) =>
      s === 'offline' ? 0 : s === 'unprobed' ? 1 : s === 'online' ? 2 : 3;
    combined.sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name));
    return combined;
  }, [nodes, networkEnv]);

  const timeAndSearchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unifiedAssets.filter((row) => {
      if (row.lastSeen && !filterByTimeWindow(row.lastSeen, timeFilter)) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.ip.toLowerCase().includes(q) ||
        row.macOrSource.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    });
  }, [unifiedAssets, search, timeFilter]);

  const counts = useMemo(() => {
    const c = { all: timeAndSearchFiltered.length, online: 0, offline: 0, down: 0, adapters: 0, nodes: 0 };
    timeAndSearchFiltered.forEach((r) => {
      if (r.status === 'online') c.online += 1;
      if (r.status === 'offline') c.offline += 1;
      if (r.status === 'down') c.down += 1;
      if (r.assetKind === 'adapter') c.adapters += 1;
      else c.nodes += 1;
    });
    return c;
  }, [timeAndSearchFiltered]);

  const filteredAssets = useMemo(() => {
    if (filterChip === 'all') return timeAndSearchFiltered;
    if (filterChip === 'online') return timeAndSearchFiltered.filter((r) => r.status === 'online');
    if (filterChip === 'offline') return timeAndSearchFiltered.filter((r) => r.status === 'offline');
    if (filterChip === 'down') return timeAndSearchFiltered.filter((r) => r.status === 'down');
    if (filterChip === 'adapters') return timeAndSearchFiltered.filter((r) => r.assetKind === 'adapter');
    if (filterChip === 'nodes') return timeAndSearchFiltered.filter((r) => r.assetKind === 'node');
    return timeAndSearchFiltered;
  }, [timeAndSearchFiltered, filterChip]);

  useEffect(() => {
    setPage(1);
  }, [search, filterChip, timeFilter]);

  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, page, pageSize]);

  const handleQuickProbe = async (asset: UnifiedAssetRow) => {
    const bareIp = asset.ip.split(':')[0];
    if (!bareIp || bareIp === 'No IPv4 bound') return;
    setPingingId(asset.id);
    const { data, error } = await executePingDiagnostic(bareIp, 2, 32, 1500);
    setPingingId(null);
    await loadData();
    if (error || !data) {
      addToast({ tone: 'danger', title: `Probe failed for ${bareIp}`, description: error || undefined });
    } else {
      addToast({
        tone: data.status === 'passed' ? 'ok' : 'warn',
        title: `${asset.name}: ${data.avg_rtt_ms !== null ? formatLatencyMs(data.avg_rtt_ms) : 'Timeout'}`,
      });
    }
  };

  const validateAddForm = (): boolean => {
    const errs: { name?: string; ip?: string } = {};
    if (newName.trim().length < 2) {
      errs.name = 'Enter a node label of at least 2 characters.';
    }
    if (!IP_OR_HOST_PATTERN.test(newIp.trim())) {
      errs.ip = 'Enter a valid IPv4 address (e.g. 1.1.1.1) or hostname (e.g. dns.google).';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddForm()) return;
    setSubmitting(true);
    const { node, error } = await addInventoryNode(newName.trim(), newIp.trim(), newRole, 'custom');
    setSubmitting(false);
    if (node) {
      setNewName('');
      setNewIp('');
      setFormErrors({});
      setAddOpen(false);
      await loadData();
      addToast({ tone: 'ok', title: `Registered node "${node.name}"` });
    } else {
      addToast({ tone: 'danger', title: 'Failed to add node', description: error || undefined });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteInventoryNode(deleteTarget.id);
    const targetName = deleteTarget.name;
    setDeleteTarget(null);
    if (selectedAsset?.id === deleteTarget.id) setSelectedAsset(null);
    await loadData();
    addToast({
      tone: ok ? 'info' : 'danger',
      title: ok ? `Removed "${targetName}"` : `Unable to remove "${targetName}"`,
    });
  };

  const selectedProbeHistory = useMemo(() => {
    if (!selectedAsset) return [];
    const bare = selectedAsset.ip.split(':')[0];
    return history
      .filter((h) => h.target === selectedAsset.ip || h.target === bare || h.resolved_ip === bare)
      .slice(0, 15);
  }, [selectedAsset, history]);

  const chips: FilterChipOption[] = [
    { value: 'all', label: 'All assets', count: counts.all, tone: 'neutral' },
    { value: 'offline', label: 'Failing', count: counts.offline, tone: 'danger' },
    { value: 'online', label: 'Online', count: counts.online, tone: 'ok' },
    { value: 'nodes', label: 'Nodes', count: counts.nodes, tone: 'info' },
    { value: 'adapters', label: 'Host adapters', count: counts.adapters, tone: 'neutral' },
    { value: 'down', label: 'Down (quiet)', count: counts.down, tone: 'neutral' },
  ];

  const handleApplySavedView = (view: SavedView<InventorySavedState>) => {
    setSearch(view.state.search);
    setFilterChip(view.state.filterChip);
    setTimeFilter(view.state.timeFilter);
  };

  return (
    <div className="space-y-4">
      {/* Compact Top Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Total unified assets</div>
            <div className="text-[24px] font-semibold font-mono text-[var(--text)] mt-1 np-mono-val">
              {unifiedAssets.length}
            </div>
            <div className="text-[12px] text-[var(--text-muted)]">
              {counts.nodes} endpoints · {counts.adapters} host adapters
            </div>
          </div>
          <Server className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
        </div>

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Primary host binding</div>
            <div className="text-[20px] font-semibold font-mono text-[var(--ok)] mt-1 np-mono-val">
              {networkEnv?.primary_ip || '127.0.0.1'}
            </div>
            <div className="text-[12px] text-[var(--text-muted)] truncate max-w-[180px]">
              {networkEnv?.hostname || 'localhost'}
            </div>
          </div>
          <Wifi className="w-5 h-5 text-[var(--ok)]" aria-hidden="true" />
        </div>

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Default gateway</div>
            <div className="text-[20px] font-semibold font-mono text-[var(--text)] mt-1 np-mono-val">
              {networkEnv?.default_gateway || 'No data'}
            </div>
            <div className="text-[12px] text-[var(--text-muted)]">
              {counts.down} quiet down adapters
            </div>
          </div>
          <Router className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
        </div>
      </div>

      {/* Shared List Toolbar */}
      <ListViewToolbar<InventorySavedState>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search nodes and adapters by name, IP, MAC, or role…"
        chips={chips}
        activeChip={filterChip}
        onChipChange={setFilterChip}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        savedViews={views}
        onApplySavedView={handleApplySavedView}
        onSaveCurrentView={(name) => {
          saveView(name, { search, filterChip, timeFilter });
          addToast({ tone: 'ok', title: `Saved view "${name}"` });
        }}
        onDeleteSavedView={deleteView}
        onExportCsv={() =>
          exportToCsv(
            'netpulse-inventory-filtered.csv',
            filteredAssets.map((a) => ({
              name: a.name,
              kind: a.assetKind,
              role: a.role,
              ip: a.ip,
              status: a.status,
              latency_ms: a.latencyMs,
              last_seen_utc: a.lastSeen ? formatTimestampUtc(a.lastSeen) : 'Host OS / Unprobed',
              mac_or_source: a.macOrSource,
            }))
          )
        }
        onExportJson={() => exportToJson('netpulse-inventory-filtered.json', filteredAssets)}
        onRefresh={loadData}
        loading={loading}
        extraControls={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add node</span>
          </button>
        }
      />

      {/* Unified Searchable Assets Table */}
      {paginatedAssets.length > 0 ? (
        <div className="overflow-auto max-h-[580px] rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-[var(--text-secondary)] text-[12px] font-semibold border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-3">Node / Adapter</th>
                <th className="py-3 px-3">IP / Binding</th>
                <th className="py-3 px-3">Kind</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Last seen (UTC)</th>
                <th className="py-3 px-3 text-right">Latency</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedAssets.map((row) => {
                const Icon = roleIcon(row.role);
                const isQuietDown = row.status === 'down';
                const statusTone: StatusTone =
                  row.status === 'offline'
                    ? 'danger'
                    : row.status === 'online'
                    ? 'ok'
                    : 'neutral';
                const statusLabel =
                  row.status === 'offline'
                    ? 'Failing'
                    : row.status === 'online'
                    ? 'Online'
                    : row.status === 'down'
                    ? 'Down'
                    : 'Unprobed';

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedAsset(row)}
                    className={`cursor-pointer hover:bg-[var(--surface-3)]/70 transition-colors ${
                      isQuietDown ? 'opacity-55' : ''
                    }`}
                  >
                    <td className="py-3 px-3 max-w-[230px]">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-[var(--radius-control)] flex items-center justify-center shrink-0 ${
                            isQuietDown
                              ? 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                              : row.status === 'offline'
                              ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                              : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          }`}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--text)] truncate">{row.name}</div>
                          <div className="text-[12px] text-[var(--text-muted)] truncate">
                            {row.macOrSource} · {row.speedOrNotes}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="py-3 px-3 font-mono text-[12px] text-[var(--accent)] whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>{row.ip}</span>
                        {row.ip !== 'No IPv4 bound' && (
                          <CopyButton value={row.ip} label={`Copy ${row.ip}`} compact />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[12px] text-[var(--text-secondary)] capitalize whitespace-nowrap">
                      {row.assetKind === 'adapter' ? 'Host adapter' : row.role}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusChip size="sm" tone={statusTone} label={statusLabel} />
                    </td>
                    <td
                      className="py-3 px-3 font-mono text-[12px] text-[var(--text-secondary)] whitespace-nowrap"
                      title={row.lastSeen ? formatRelativeTime(row.lastSeen) : undefined}
                    >
                      {row.lastSeen
                        ? formatTimestampUtc(row.lastSeen)
                        : row.assetKind === 'adapter'
                        ? 'Link down'
                        : 'No probes yet'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[12px] np-mono-val whitespace-nowrap">
                      <span
                        className={
                          row.latencyMs !== null
                            ? row.latencyMs > 150
                              ? 'text-[var(--danger)] font-semibold'
                              : 'text-[var(--ok)] font-semibold'
                            : 'text-[var(--text-muted)]'
                        }
                      >
                        {formatLatencyMs(row.latencyMs)}
                      </span>
                    </td>
                    <td
                      className="py-3 px-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        {row.ip !== 'No IPv4 bound' && !isQuietDown && (
                          <button
                            type="button"
                            onClick={() => handleQuickProbe(row)}
                            disabled={pingingId === row.id}
                            className="h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center gap-1"
                          >
                            <Activity
                              className={`w-3.5 h-3.5 text-[var(--accent)] ${
                                pingingId === row.id ? 'animate-spin' : ''
                              }`}
                            />
                            <span>Probe</span>
                          </button>
                        )}
                        {row.removable && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            aria-label={`Remove ${row.name}`}
                            className="h-9 w-9 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] inline-flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <EmptyState
            title="No network assets matched"
            description="Adjust your filters or add a custom probe endpoint."
            icon={Server}
          />
        </div>
      )}

      <PaginationBar
        totalItems={filteredAssets.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="assets"
      />

      {/* Unified Asset Detail SideDrawer */}
      <SideDrawer
        open={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset?.name || 'Asset details'}
        description={
          selectedAsset
            ? `${selectedAsset.assetKind === 'adapter' ? 'OS network adapter' : 'Monitored endpoint'} · ${selectedAsset.ip}`
            : undefined
        }
        footer={
          selectedAsset && (
            <div className="flex items-center justify-between w-full gap-2">
              {selectedAsset.removable ? (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedAsset)}
                  className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/35 text-[12px] font-medium inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove node</span>
                </button>
              ) : (
                <div />
              )}
              {selectedAsset.ip !== 'No IPv4 bound' && (
                <button
                  type="button"
                  onClick={() => handleQuickProbe(selectedAsset)}
                  disabled={pingingId === selectedAsset.id}
                  className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-ink)] text-[12px] font-semibold inline-flex items-center gap-1.5"
                >
                  <Activity className={`w-3.5 h-3.5 ${pingingId === selectedAsset.id ? 'animate-spin' : ''}`} />
                  <span>Run live probe</span>
                </button>
              )}
            </div>
          )
        }
      >
        {selectedAsset && (
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="text-[var(--text-muted)]">Inline RTT</div>
                <div className="font-mono font-semibold text-[var(--text)] mt-1">
                  {formatLatencyMs(selectedAsset.latencyMs)}
                </div>
              </div>
              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="text-[var(--text-muted)]">Interface / Link</div>
                <div className="font-mono text-[var(--text)] mt-1 truncate">
                  {selectedAsset.interfaceName} · {selectedAsset.speedOrNotes}
                </div>
              </div>
              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] col-span-2">
                <div className="text-[var(--text-muted)]">MAC / Source</div>
                <div className="font-mono text-[var(--text)] mt-1">{selectedAsset.macOrSource}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-[var(--text-secondary)]">
                Recent diagnostic history ({selectedProbeHistory.length})
              </div>
              {selectedProbeHistory.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {selectedProbeHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-2 text-[12px] font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {h.status === 'passed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                        )}
                        <span className="truncate text-[var(--text)]">{formatTimestampUtc(h.timestamp)}</span>
                      </div>
                      <span className="text-[var(--text-secondary)] shrink-0">
                        {h.status === 'passed' ? formatLatencyMs(h.avg_rtt_ms) : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[var(--text-muted)]">
                  No diagnostic probes recorded yet for {selectedAsset.ip}.
                </p>
              )}
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Validated Add Node Modal */}
      {addOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-backdrop)] backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAddOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Add monitored node"
              className="w-full max-w-md p-6 rounded-[var(--radius-dialog)] bg-[var(--surface-1)] border border-[var(--border-strong)] shadow-[var(--shadow-popover)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">Add monitored node</h2>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  aria-label="Close modal"
                  className="w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label htmlFor="node-label" className="block text-[13px] font-medium text-[var(--text)] mb-1">
                    Node label
                  </label>
                  <TextInput
                    id="node-label"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (formErrors.name) setFormErrors((f) => ({ ...f, name: undefined }));
                    }}
                    placeholder="e.g. Cloudflare Public DNS"
                    invalid={Boolean(formErrors.name)}
                  />
                  {formErrors.name && (
                    <p className="text-[12px] text-[var(--danger)] mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="node-ip" className="block text-[13px] font-medium text-[var(--text)] mb-1">
                    IP address or hostname
                  </label>
                  <TextInput
                    id="node-ip"
                    value={newIp}
                    onChange={(e) => {
                      setNewIp(e.target.value);
                      if (formErrors.ip) setFormErrors((f) => ({ ...f, ip: undefined }));
                    }}
                    placeholder="e.g. 1.1.1.1 or dns.google"
                    mono
                    invalid={Boolean(formErrors.ip)}
                  />
                  {formErrors.ip && (
                    <p className="text-[12px] text-[var(--danger)] mt-1">{formErrors.ip}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="node-role" className="block text-[13px] font-medium text-[var(--text)] mb-1">
                    Device role
                  </label>
                  <Select
                    id="node-role"
                    value={newRole}
                    options={ROLE_OPTIONS}
                    onChange={(e) => setNewRole(e.target.value as any)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-3)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Save node'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Remove "${deleteTarget?.name || ''}"?`}
        description="This deletes the custom registered endpoint from SQLite. Historical probe records remain preserved."
        confirmLabel="Remove node"
        tone="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
