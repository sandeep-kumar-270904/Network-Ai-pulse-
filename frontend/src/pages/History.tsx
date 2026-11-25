import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  ChevronDown,
  ChevronRight,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchDiagnosticHistory } from '../services/api';
import {
  ListViewToolbar,
  FilterChipOption,
  LocalTimeFilter,
  filterByTimeWindow,
} from '../components/ui/ListViewToolbar';
import { PaginationBar } from '../components/ui/PaginationBar';
import { SideDrawer } from '../components/ui/SideDrawer';
import { StatusChip } from '../components/ui/StatusChip';
import { CopyButton } from '../components/ui/CopyButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useSavedViews, SavedView } from '../hooks/useSavedViews';
import { useToast } from '../components/ui/Toast';
import { useDemoMode } from '../contexts/DemoModeContext';
import { exportToCsv, exportToJson } from '../utils/export';
import {
  formatJitterMs,
  formatLatencyMs,
  formatPercent,
  formatRelativeTime,
  formatTimestampUtc,
} from '../utils/formatters';

interface HistoryRecord {
  id: string;
  timestamp: string;
  test_type: string;
  target: string;
  resolved_ip?: string | null;
  status: string;
  duration_ms?: number | null;
  packets_sent?: number | null;
  packets_received?: number | null;
  packet_loss_pct?: number | null;
  min_rtt_ms?: number | null;
  avg_rtt_ms?: number | null;
  max_rtt_ms?: number | null;
  jitter_ms?: number | null;
  summary?: string | null;
}

interface HistoryGroupRow {
  groupKey: string;
  lead: HistoryRecord;
  items: HistoryRecord[];
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
  isFailureGroup: boolean;
}

interface HistorySavedState {
  search: string;
  statusFilter: string;
  timeFilter: LocalTimeFilter;
  grouped: boolean;
}

export const TestHistory: React.FC = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<LocalTimeFilter>('all');
  const [grouped, setGrouped] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeGroup, setActiveGroup] = useState<HistoryGroupRow | null>(null);

  const navigate = useNavigate();
  const { views, saveView, deleteView } = useSavedViews<HistorySavedState>('history');
  const { addToast } = useToast();
  const { maskHost, maskIp, maskText } = useDemoMode();

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const { records: data, error } = await fetchDiagnosticHistory(1000);
    setLoadError(error || null);
    setRecords(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const timeAndSearchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (!filterByTimeWindow(r.timestamp, timeFilter)) return false;
      if (!q) return true;
      return (
        r.target.toLowerCase().includes(q) ||
        (r.resolved_ip || '').toLowerCase().includes(q) ||
        r.test_type.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [records, search, timeFilter]);

  const statusCounts = useMemo(() => {
    let passed = 0;
    let failed = 0;
    timeAndSearchFiltered.forEach((r) => {
      if (r.status === 'passed') passed += 1;
      else failed += 1;
    });
    return { all: timeAndSearchFiltered.length, passed, failed };
  }, [timeAndSearchFiltered]);

  const filteredRecords = useMemo(() => {
    if (statusFilter === 'all') return timeAndSearchFiltered;
    if (statusFilter === 'passed') return timeAndSearchFiltered.filter((r) => r.status === 'passed');
    return timeAndSearchFiltered.filter((r) => r.status !== 'passed');
  }, [timeAndSearchFiltered, statusFilter]);

  // Group repeated failures (e.g., consecutive or repeated failed runs per target + test_type)
  const rowsToDisplay: HistoryGroupRow[] = useMemo(() => {
    if (!grouped) {
      return filteredRecords.map((r) => ({
        groupKey: r.id,
        lead: r,
        items: [r],
        count: 1,
        firstTimestamp: r.timestamp,
        lastTimestamp: r.timestamp,
        isFailureGroup: false,
      }));
    }

    const result: HistoryGroupRow[] = [];
    const failureGroupIndex = new Map<string, number>();

    filteredRecords.forEach((r) => {
      if (r.status !== 'passed') {
        const key = `fail|${r.target}|${r.test_type}|${r.status}`;
        const existingIdx = failureGroupIndex.get(key);
        if (existingIdx !== undefined) {
          const grp = result[existingIdx];
          grp.items.push(r);
          grp.count += 1;
          if (r.timestamp < grp.firstTimestamp) grp.firstTimestamp = r.timestamp;
          if (r.timestamp > grp.lastTimestamp) {
            grp.lastTimestamp = r.timestamp;
            grp.lead = r;
          }
          grp.isFailureGroup = grp.count > 1;
          return;
        }
        failureGroupIndex.set(key, result.length);
      }
      result.push({
        groupKey: r.status !== 'passed' ? `fail|${r.target}|${r.test_type}|${r.status}` : r.id,
        lead: r,
        items: [r],
        count: 1,
        firstTimestamp: r.timestamp,
        lastTimestamp: r.timestamp,
        isFailureGroup: false,
      });
    });

    return result;
  }, [filteredRecords, grouped]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, timeFilter, grouped]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rowsToDisplay.slice(start, start + pageSize);
  }, [rowsToDisplay, page, pageSize]);

  // Chronological timeline strip (up to latest 100 matching probes, left=oldest -> right=newest)
  const timelineSamples = useMemo(() => {
    return [...filteredRecords].slice(0, 100).reverse();
  }, [filteredRecords]);

  const targetFullHistory = useMemo(() => {
    if (!activeGroup) return [];
    return records.filter((r) => r.target === activeGroup.lead.target).slice(0, 20);
  }, [activeGroup, records]);

  const chips: FilterChipOption[] = [
    { value: 'all', label: 'All runs', count: statusCounts.all, tone: 'neutral' },
    { value: 'failed', label: 'Failed', count: statusCounts.failed, tone: 'danger' },
    { value: 'passed', label: 'Passed', count: statusCounts.passed, tone: 'ok' },
  ];

  const handleApplySavedView = (view: SavedView<HistorySavedState>) => {
    setSearch(view.state.search);
    setStatusFilter(view.state.statusFilter);
    setTimeFilter(view.state.timeFilter);
    setGrouped(view.state.grouped);
  };

  return (
    <div className="space-y-4">
      <ListViewToolbar<HistorySavedState>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search runs by target, resolved IP, protocol, or run ID…"
        chips={chips}
        activeChip={statusFilter}
        onChipChange={setStatusFilter}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        grouped={grouped}
        onGroupedChange={setGrouped}
        groupLabel="Group repeated failures"
        savedViews={views}
        onApplySavedView={handleApplySavedView}
        onSaveCurrentView={(name) => {
          saveView(name, { search, statusFilter, timeFilter, grouped });
          addToast({ tone: 'ok', title: `Saved view "${name}"` });
        }}
        onDeleteSavedView={deleteView}
        onExportCsv={() =>
          exportToCsv(
            'netpulse-history-filtered.csv',
            filteredRecords.map((r) => ({
              id: r.id,
              timestamp_utc: formatTimestampUtc(r.timestamp),
              target: r.target,
              resolved_ip: r.resolved_ip || r.target,
              test_type: r.test_type,
              status: r.status,
              avg_rtt_ms: r.status === 'passed' ? r.avg_rtt_ms : null,
              jitter_ms: r.status === 'passed' && r.avg_rtt_ms !== null ? r.jitter_ms : null,
              packet_loss_pct: r.packet_loss_pct,
            }))
          )
        }
        onExportJson={() => exportToJson('netpulse-history-filtered.json', filteredRecords)}
        onRefresh={loadHistory}
        loading={isLoading}
      />

      {/* Pass/Fail Timeline Strip above the table */}
      {timelineSamples.length > 0 && (
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="font-semibold text-[var(--text)]">
              Pass / fail timeline strip (latest {timelineSamples.length} matching probes)
            </span>
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--ok)]" aria-hidden="true" />
                <span>Passed</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--danger)]" aria-hidden="true" />
                <span>Failed</span>
              </span>
            </div>
          </div>

          <div
            role="group"
            aria-label="Probe pass and fail timeline"
            className="flex items-center gap-0.5 h-6 w-full"
          >
            {timelineSamples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() =>
                  setActiveGroup({
                    groupKey: sample.id,
                    lead: sample,
                    items: [sample],
                    count: 1,
                    firstTimestamp: sample.timestamp,
                    lastTimestamp: sample.timestamp,
                    isFailureGroup: false,
                  })
                }
                title={`${formatTimestampUtc(sample.timestamp)} · ${maskHost(sample.target)} · ${
                  sample.status === 'passed' ? formatLatencyMs(sample.avg_rtt_ms) : 'Failed'
                }`}
                aria-label={`${maskHost(sample.target)} ${sample.status} at ${formatTimestampUtc(sample.timestamp)}`}
                className={`flex-1 h-full min-w-[3px] rounded-[2px] transition-opacity hover:opacity-75 ${
                  sample.status === 'passed' ? 'bg-[var(--ok)]' : 'bg-[var(--danger)]'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[12px] font-mono text-[var(--text-muted)]">
            <span>{formatTimestampUtc(timelineSamples[0]?.timestamp)}</span>
            <span>{formatTimestampUtc(timelineSamples[timelineSamples.length - 1]?.timestamp)}</span>
          </div>
        </div>
      )}

      {/* History Sticky-Header Table */}
      {paginatedRows.length > 0 ? (
        <div className="overflow-auto max-h-[560px] rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-[var(--text-secondary)] text-[12px] font-semibold border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4">Run / Group</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Target Host</th>
                <th className="py-3 px-4">Protocol</th>
                <th className="py-3 px-4 text-right">Avg RTT</th>
                <th className="py-3 px-4 text-right">Loss</th>
                <th className="py-3 px-4 text-right">Jitter</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-mono text-[12px] np-mono-val">
              {paginatedRows.map((row) => {
                const r = row.lead;
                const expanded = Boolean(expandedGroups[row.groupKey]);
                const passed = r.status === 'passed';
                return (
                  <React.Fragment key={row.groupKey}>
                    <tr
                      onClick={() => setActiveGroup(row)}
                      className="cursor-pointer hover:bg-[var(--surface-3)]/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {row.count > 1 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedGroups((prev) => ({
                                  ...prev,
                                  [row.groupKey]: !prev[row.groupKey],
                                }));
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/35 font-semibold"
                            >
                              {expanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              <span>Failed ×{row.count}</span>
                            </button>
                          ) : (
                            <span className="text-[var(--accent)] font-semibold">{r.id}</span>
                          )}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap"
                        title={formatRelativeTime(row.lastTimestamp)}
                      >
                        {row.count > 1 ? (
                          <div className="space-y-0.5">
                            <div>Last: {formatTimestampUtc(row.lastTimestamp)}</div>
                            <div className="text-[var(--text-muted)]">
                              First: {formatTimestampUtc(row.firstTimestamp)}
                            </div>
                          </div>
                        ) : (
                          <span>{formatTimestampUtc(r.timestamp)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--text)] font-medium">
                        <div>{maskHost(r.target)}</div>
                        {r.resolved_ip && r.resolved_ip !== r.target && (
                          <div className="text-[var(--text-muted)]">{maskIp(r.resolved_ip)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{r.test_type}</td>
                      <td className="py-3 px-4 text-right text-[var(--ok)]">
                        {passed ? (
                          formatLatencyMs(r.avg_rtt_ms)
                        ) : (
                          <span className="text-[var(--text-muted)]">No data</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={
                            r.packet_loss_pct === 0 ? 'text-[var(--ok)]' : 'text-[var(--danger)]'
                          }
                        >
                          {formatPercent(r.packet_loss_pct)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--accent)]">
                        {passed && r.avg_rtt_ms !== null ? (
                          formatJitterMs(r.jitter_ms)
                        ) : (
                          <span className="text-[var(--text-muted)]">No data</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <StatusChip
                          size="sm"
                          tone={passed ? 'ok' : 'danger'}
                          label={passed ? 'Passed' : 'Failed'}
                        />
                      </td>
                    </tr>

                    {expanded &&
                      row.items.map((child) => (
                        <tr
                          key={child.id}
                          onClick={() =>
                            setActiveGroup({
                              groupKey: child.id,
                              lead: child,
                              items: [child],
                              count: 1,
                              firstTimestamp: child.timestamp,
                              lastTimestamp: child.timestamp,
                              isFailureGroup: false,
                            })
                          }
                          className="bg-[var(--surface-2)]/50 hover:bg-[var(--surface-3)]/70 cursor-pointer"
                        >
                          <td className="py-2 px-4 pl-8 text-[var(--accent)]">{child.id}</td>
                          <td className="py-2 px-4 text-[var(--text-muted)] whitespace-nowrap">
                            {formatTimestampUtc(child.timestamp)}
                          </td>
                          <td className="py-2 px-4 text-[var(--text-secondary)]">{maskHost(child.target)}</td>
                          <td className="py-2 px-4 text-[var(--text-muted)]">{child.test_type}</td>
                          <td className="py-2 px-4 text-right text-[var(--text-muted)]">No data</td>
                          <td className="py-2 px-4 text-right text-[var(--danger)]">
                            {formatPercent(child.packet_loss_pct)}
                          </td>
                          <td className="py-2 px-4 text-right text-[var(--text-muted)]">No data</td>
                          <td className="py-2 px-4 font-sans text-[12px] text-[var(--danger)]">
                            Failed
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : loadError && records.length === 0 ? (
        <ErrorState
          title="Unable to load diagnostic history"
          message={loadError}
          why="The NetPulse gateway failed to return SQLite probe history."
          howToFix="Verify the gateway is running and check Settings -> Gateway URL, then click Retry."
          onRetry={loadHistory}
          retrying={isLoading}
        />
      ) : isLoading && records.length === 0 ? (
        <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="p-8 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <EmptyState
            title="No diagnostic records found"
            description="Run an active ICMP or TCP probe, or clear your current filters."
            icon={Database}
            actionLabel="Open Diagnostics"
            onAction={() => navigate('/diagnostics')}
          />
        </div>
      )}

      <PaginationBar
        totalItems={rowsToDisplay.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel={grouped ? 'entries / failure groups' : 'runs'}
      />

      {/* Full Probe Detail SideDrawer */}
      <SideDrawer
        open={Boolean(activeGroup)}
        onClose={() => setActiveGroup(null)}
        title={activeGroup?.lead.target ? maskHost(activeGroup.lead.target) : 'Diagnostic record'}
        description={
          activeGroup && activeGroup.count > 1
            ? `Failed ×${activeGroup.count} · First ${formatTimestampUtc(activeGroup.firstTimestamp)} · Last ${formatTimestampUtc(activeGroup.lastTimestamp)}`
            : activeGroup
            ? formatTimestampUtc(activeGroup.lead.timestamp)
            : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => {
              setActiveGroup(null);
              navigate('/diagnostics');
            }}
            className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-ink)] text-[12px] font-semibold inline-flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Run new probe</span>
          </button>
        }
      >
        {activeGroup && (
          <div className="space-y-4 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <StatusChip
                size="sm"
                tone={activeGroup.lead.status === 'passed' ? 'ok' : 'danger'}
                label={activeGroup.lead.status === 'passed' ? 'Passed' : 'Failed'}
              />
              <div className="inline-flex items-center gap-1">
                <span className="font-mono text-[12px] text-[var(--text-muted)]">
                  {activeGroup.lead.id}
                </span>
                <CopyButton value={activeGroup.lead.id} label="Copy run ID" compact />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-[12px] np-mono-val">
              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="text-[var(--text-muted)] font-sans">Avg / Min / Max RTT</div>
                <div className="text-[var(--text)] font-semibold mt-1">
                  {activeGroup.lead.status === 'passed'
                    ? `${formatLatencyMs(activeGroup.lead.avg_rtt_ms)} (${formatLatencyMs(activeGroup.lead.min_rtt_ms, false)}–${formatLatencyMs(activeGroup.lead.max_rtt_ms, false)})`
                    : 'No data'}
                </div>
              </div>
              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="text-[var(--text-muted)] font-sans">Jitter / Loss</div>
                <div className="text-[var(--text)] font-semibold mt-1">
                  {activeGroup.lead.status === 'passed' && activeGroup.lead.avg_rtt_ms !== null
                    ? formatJitterMs(activeGroup.lead.jitter_ms)
                    : 'No data'}{' '}
                  · {formatPercent(activeGroup.lead.packet_loss_pct)}
                </div>
              </div>
            </div>

            {activeGroup.lead.summary && (
              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="text-[12px] font-medium text-[var(--text-muted)] mb-1">Summary</div>
                <p className="font-mono text-[12px] text-[var(--text)]">{maskText(activeGroup.lead.summary)}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-[var(--text-secondary)]">
                Recent history for {activeGroup.lead.target} ({targetFullHistory.length})
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {targetFullHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-2 text-[12px] font-mono"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.status === 'passed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                      )}
                      <span className="truncate text-[var(--text)]">
                        {formatTimestampUtc(item.timestamp)}
                      </span>
                    </div>
                    <span className="text-[var(--text-secondary)] shrink-0">
                      {item.status === 'passed' ? formatLatencyMs(item.avg_rtt_ms) : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SideDrawer>
    </div>
  );
};
