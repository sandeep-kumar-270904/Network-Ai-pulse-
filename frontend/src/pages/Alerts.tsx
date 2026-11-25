import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  Check,
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import {
  fetchAlerts,
  updateAlertState,
  bulkUpdateAlertState,
  clearAlerts,
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
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useSavedViews, SavedView } from '../hooks/useSavedViews';
import { useToast } from '../components/ui/Toast';
import { useDemoMode } from '../contexts/DemoModeContext';
import { exportToCsv, exportToJson } from '../utils/export';
import { formatRelativeTime, formatTimestampUtc } from '../utils/formatters';

type AlertLifecycle = 'open' | 'acknowledged' | 'resolved';

interface AlertRecord {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  acknowledged: boolean;
  state: AlertLifecycle;
  snoozed_until?: string | null;
  snoozed?: boolean;
}

interface AlertGroupRow {
  groupKey: string;
  lead: AlertRecord;
  items: AlertRecord[];
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
  hasNew: boolean;
}

interface AlertsSavedState {
  search: string;
  severityFilter: string;
  stateFilter: string;
  timeFilter: LocalTimeFilter;
  grouped: boolean;
}

const LAST_SEEN_KEY = 'netpulse_alerts_last_seen_ms';

const levelToTone = (level: string): StatusTone => {
  if (level === 'critical') return 'danger';
  if (level === 'warning') return 'warn';
  if (level === 'success') return 'ok';
  return 'info';
};

const stateToTone = (evt: AlertRecord): { tone: StatusTone; label: string } => {
  if (evt.snoozed) return { tone: 'neutral', label: 'Snoozed' };
  if (evt.state === 'resolved') return { tone: 'ok', label: 'Resolved' };
  if (evt.state === 'acknowledged' || evt.acknowledged) return { tone: 'info', label: 'Acknowledged' };
  return { tone: 'warn', label: 'Open' };
};

const levelIcon = (level: string) => {
  switch (level) {
    case 'critical':
      return <AlertCircle className="w-4 h-4 text-[var(--danger)]" aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-[var(--warn)]" aria-hidden="true" />;
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" aria-hidden="true" />;
    default:
      return <Info className="w-4 h-4 text-[var(--info)]" aria-hidden="true" />;
  }
};

const normalizeMessageKey = (msg: string): string =>
  msg
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*/g, '<ts>')
    .replace(/\b\d+(\.\d+)?\s*(ms|%)/g, '<n>$2')
    .trim();

export const Alerts: React.FC = () => {
  const [events, setEvents] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<LocalTimeFilter>('all');
  const [grouped, setGrouped] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeGroup, setActiveGroup] = useState<AlertGroupRow | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const [previousSeenMs] = useState<number>(() => {
    try {
      const saved = Number(window.localStorage.getItem(LAST_SEEN_KEY) || 0);
      return Number.isFinite(saved) && saved > 0 ? saved : Date.now() - 120_000;
    } catch {
      return Date.now() - 120_000;
    }
  });

  const { views, saveView, deleteView } = useSavedViews<AlertsSavedState>('alerts');
  const { addToast } = useToast();
  const { maskText } = useDemoMode();
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const { events: list, error } = await fetchAlerts(1000);
    setLoadError(error || null);
    setEvents(list);
    setLoading(false);
    try {
      window.localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const timer = window.setInterval(loadAlerts, 15000);
    return () => window.clearInterval(timer);
  }, [loadAlerts]);

  const isEventNew = useCallback(
    (ts: string): boolean => {
      const parsed = new Date(ts).getTime();
      return !Number.isNaN(parsed) && parsed > previousSeenMs;
    },
    [previousSeenMs]
  );

  const timeAndSearchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((evt) => {
      if (!filterByTimeWindow(evt.timestamp, timeFilter)) return false;
      if (stateFilter === 'snoozed' && !evt.snoozed) return false;
      if (stateFilter !== 'all' && stateFilter !== 'snoozed' && evt.state !== stateFilter) return false;
      if (!q) return true;
      return (
        evt.source.toLowerCase().includes(q) ||
        evt.message.toLowerCase().includes(q) ||
        evt.id.toLowerCase().includes(q) ||
        evt.level.toLowerCase().includes(q)
      );
    });
  }, [events, search, stateFilter, timeFilter]);

  const severityCounts = useMemo(() => {
    const counts = { all: timeAndSearchFiltered.length, critical: 0, warning: 0, info: 0, success: 0 };
    timeAndSearchFiltered.forEach((e) => {
      if (e.level === 'critical') counts.critical += 1;
      else if (e.level === 'warning') counts.warning += 1;
      else if (e.level === 'success') counts.success += 1;
      else counts.info += 1;
    });
    return counts;
  }, [timeAndSearchFiltered]);

  const filteredEvents = useMemo(() => {
    if (severityFilter === 'all') return timeAndSearchFiltered;
    return timeAndSearchFiltered.filter((e) => e.level === severityFilter);
  }, [timeAndSearchFiltered, severityFilter]);

  const rowsToDisplay: AlertGroupRow[] = useMemo(() => {
    if (!grouped) {
      return filteredEvents.map((evt) => ({
        groupKey: evt.id,
        lead: evt,
        items: [evt],
        count: 1,
        firstTimestamp: evt.timestamp,
        lastTimestamp: evt.timestamp,
        hasNew: isEventNew(evt.timestamp),
      }));
    }

    const map = new Map<string, AlertGroupRow>();
    filteredEvents.forEach((evt) => {
      const key = `${evt.level}|${evt.source}|${evt.state}|${normalizeMessageKey(evt.message)}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          groupKey: key,
          lead: evt,
          items: [evt],
          count: 1,
          firstTimestamp: evt.timestamp,
          lastTimestamp: evt.timestamp,
          hasNew: isEventNew(evt.timestamp),
        });
      } else {
        existing.items.push(evt);
        existing.count += 1;
        if (evt.timestamp < existing.firstTimestamp) existing.firstTimestamp = evt.timestamp;
        if (evt.timestamp > existing.lastTimestamp) {
          existing.lastTimestamp = evt.timestamp;
          existing.lead = evt;
        }
        if (isEventNew(evt.timestamp)) existing.hasNew = true;
      }
    });
    return Array.from(map.values());
  }, [filteredEvents, grouped, isEventNew]);

  useEffect(() => {
    setPage(1);
  }, [search, severityFilter, stateFilter, timeFilter, grouped]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rowsToDisplay.slice(start, start + pageSize);
  }, [rowsToDisplay, page, pageSize]);

  const selectedEventIds = useMemo(
    () => Object.keys(selectedIds).filter((id) => selectedIds[id]),
    [selectedIds]
  );

  const toggleSelectGroup = (row: AlertGroupRow, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      row.items.forEach((i) => {
        if (checked) next[i.id] = true;
        else delete next[i.id];
      });
      return next;
    });
  };

  const isRowSelected = (row: AlertGroupRow): boolean =>
    row.items.length > 0 && row.items.every((i) => Boolean(selectedIds[i.id]));

  const handleStateAction = async (
    ids: string[],
    state: AlertLifecycle,
    snoozeMinutes?: number
  ) => {
    if (!ids.length) return;
    if (ids.length === 1) {
      await updateAlertState(ids[0], state, snoozeMinutes);
    } else {
      await bulkUpdateAlertState(ids, state, snoozeMinutes);
    }
    setSelectedIds({});
    await loadAlerts();
    if (activeGroup) {
      const updatedLead = {
        ...activeGroup.lead,
        state,
        acknowledged: state !== 'open',
        snoozed: Boolean(snoozeMinutes && snoozeMinutes > 0),
      };
      setActiveGroup({ ...activeGroup, lead: updatedLead });
    }
    addToast({
      tone: 'ok',
      title: snoozeMinutes ? `Snoozed ${ids.length} alert(s)` : `Updated ${ids.length} alert(s) to ${state}`,
    });
  };

  const handleClearAll = async () => {
    await clearAlerts();
    setConfirmClearOpen(false);
    setSelectedIds({});
    setActiveGroup(null);
    await loadAlerts();
    addToast({ tone: 'info', title: 'Alert stream cleared' });
  };

  const severityChips: FilterChipOption[] = [
    { value: 'all', label: 'All severities', count: severityCounts.all, tone: 'neutral' },
    { value: 'critical', label: 'Critical', count: severityCounts.critical, tone: 'danger' },
    { value: 'warning', label: 'Warning', count: severityCounts.warning, tone: 'warn' },
    { value: 'info', label: 'Info', count: severityCounts.info, tone: 'info' },
    { value: 'success', label: 'Success', count: severityCounts.success, tone: 'ok' },
  ];

  const handleApplySavedView = (view: SavedView<AlertsSavedState>) => {
    setSearch(view.state.search);
    setSeverityFilter(view.state.severityFilter);
    setStateFilter(view.state.stateFilter);
    setTimeFilter(view.state.timeFilter);
    setGrouped(view.state.grouped);
  };

  return (
    <div className="space-y-4">
      <ListViewToolbar<AlertsSavedState>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search alerts by source, message, severity, or ID…"
        chips={severityChips}
        activeChip={severityFilter}
        onChipChange={setSeverityFilter}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        grouped={grouped}
        onGroupedChange={setGrouped}
        groupLabel="Group repeated"
        savedViews={views}
        onApplySavedView={handleApplySavedView}
        onSaveCurrentView={(name) => {
          saveView(name, { search, severityFilter, stateFilter, timeFilter, grouped });
          addToast({ tone: 'ok', title: `Saved view "${name}"` });
        }}
        onDeleteSavedView={deleteView}
        onExportCsv={() =>
          exportToCsv(
            'netpulse-alerts-filtered.csv',
            filteredEvents.map((e) => ({
              id: e.id,
              timestamp_utc: formatTimestampUtc(e.timestamp),
              level: e.level,
              state: e.snoozed ? 'snoozed' : e.state,
              source: e.source,
              message: e.message,
            }))
          )
        }
        onExportJson={() => exportToJson('netpulse-alerts-filtered.json', filteredEvents)}
        onRefresh={loadAlerts}
        loading={loading}
        extraControls={
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--danger)] text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        }
      />

      {/* Lifecycle state filter tabs + Bulk actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
          {([
            { value: 'all', label: 'All states' },
            { value: 'open', label: 'Open' },
            { value: 'acknowledged', label: 'Acknowledged' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'snoozed', label: 'Snoozed' },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStateFilter(tab.value)}
              className={`h-8 px-3 rounded-[var(--radius-control)] text-[12px] font-medium transition-colors ${
                stateFilter === tab.value
                  ? 'bg-[var(--surface-1)] text-[var(--text)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedEventIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-[var(--radius-card)] bg-[var(--accent-soft)] border border-[var(--accent)]/35 text-[12px]">
            <span className="font-semibold text-[var(--text)]">
              {selectedEventIds.length} selected
            </span>
            <button
              type="button"
              onClick={() => handleStateAction(selectedEventIds, 'acknowledged')}
              className="h-8 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Acknowledge</span>
            </button>
            <button
              type="button"
              onClick={() => handleStateAction(selectedEventIds, 'resolved')}
              className="h-8 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[var(--ok)]" />
              <span>Resolve</span>
            </button>
            <button
              type="button"
              onClick={() => handleStateAction(selectedEventIds, 'acknowledged', 60)}
              className="h-8 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5 text-[var(--warn)]" />
              <span>Snooze 1h</span>
            </button>
          </div>
        )}
      </div>

      {/* Grouped / De-duplicated Sticky-Header Table */}
      {paginatedRows.length > 0 ? (
        <div className="overflow-auto max-h-[600px] rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-[var(--text-secondary)] text-[12px] font-semibold border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible alerts"
                    checked={
                      paginatedRows.length > 0 && paginatedRows.every((row) => isRowSelected(row))
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedIds((prev) => {
                        const next = { ...prev };
                        paginatedRows.forEach((row) =>
                          row.items.forEach((item) => {
                            if (checked) next[item.id] = true;
                            else delete next[item.id];
                          })
                        );
                        return next;
                      });
                    }}
                    className="w-4 h-4 rounded accent-[var(--accent)]"
                  />
                </th>
                <th className="py-3 px-3">Alert & Summary</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">State</th>
                <th className="py-3 px-3">Window (UTC)</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedRows.map((row) => {
                const evt = row.lead;
                const expanded = Boolean(expandedGroups[row.groupKey]);
                const stMeta = stateToTone(evt);
                const ids = row.items.map((i) => i.id);

                return (
                  <React.Fragment key={row.groupKey}>
                    <tr
                      onClick={() => setActiveGroup(row)}
                      className={`cursor-pointer hover:bg-[var(--surface-3)]/70 transition-colors ${
                        evt.state === 'resolved' ? 'opacity-65' : ''
                      }`}
                    >
                      <td
                        className="py-3.5 px-3 align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${evt.source} alert`}
                          checked={isRowSelected(row)}
                          onChange={(e) => toggleSelectGroup(row, e.target.checked)}
                          className="w-4 h-4 rounded accent-[var(--accent)] mt-0.5"
                        />
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">{levelIcon(evt.level)}</div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[var(--text)]">{evt.source}</span>
                              {row.count > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedGroups((prev) => ({
                                      ...prev,
                                      [row.groupKey]: !prev[row.groupKey],
                                    }));
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[12px] font-mono text-[var(--accent)] hover:bg-[var(--surface-3)]"
                                >
                                  {expanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                  <span>×{row.count}</span>
                                </button>
                              )}
                              {row.hasNew && (
                                <span className="px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--accent-soft)] text-[var(--accent)] text-[12px] font-medium">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-[var(--text-secondary)] leading-5 break-words">
                              {maskText(evt.message)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <StatusChip
                          size="sm"
                          tone={levelToTone(evt.level)}
                          label={evt.level.charAt(0).toUpperCase() + evt.level.slice(1)}
                        />
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <StatusChip size="sm" tone={stMeta.tone} label={stMeta.label} />
                      </td>
                      <td
                        className="py-3.5 px-3 font-mono text-[12px] text-[var(--text-secondary)] whitespace-nowrap np-mono-val"
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
                          <span>{formatTimestampUtc(evt.timestamp)}</span>
                        )}
                      </td>
                      <td
                        className="py-3.5 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {evt.state === 'open' && (
                            <button
                              type="button"
                              onClick={() => handleStateAction(ids, 'acknowledged')}
                              className="h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Ack</span>
                            </button>
                          )}
                          {evt.state !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleStateAction(ids, 'resolved')}
                              className="h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[12px] font-medium text-[var(--ok)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>
                          )}
                          {evt.state === 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleStateAction(ids, 'open', 0)}
                              className="h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reopen</span>
                            </button>
                          )}
                        </div>
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
                              hasNew: isEventNew(child.timestamp),
                            })
                          }
                          className="bg-[var(--surface-2)]/50 hover:bg-[var(--surface-3)]/70 cursor-pointer"
                        >
                          <td className="py-2.5 px-3" />
                          <td className="py-2.5 px-3 pl-9 text-[12px] text-[var(--text-secondary)]">
                            <span className="font-mono text-[var(--text-muted)] mr-2">{child.id}</span>
                            <span>{child.message}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[12px] text-[var(--text-muted)] capitalize">
                            {child.level}
                          </td>
                          <td className="py-2.5 px-3 text-[12px] text-[var(--text-muted)] capitalize">
                            {child.snoozed ? 'Snoozed' : child.state}
                          </td>
                          <td
                            className="py-2.5 px-3 font-mono text-[12px] text-[var(--text-muted)] whitespace-nowrap"
                            title={formatRelativeTime(child.timestamp)}
                          >
                            {formatTimestampUtc(child.timestamp)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[12px] text-[var(--accent)]">
                            Inspect
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : loadError && events.length === 0 ? (
        <ErrorState
          title="Unable to load alerts and events"
          message={loadError}
          why="The NetPulse gateway failed to return alert records from SQLite."
          howToFix="Verify the gateway is running and check Settings -> Gateway URL, then click Retry."
          onRetry={loadAlerts}
          retrying={loading}
        />
      ) : loading && events.length === 0 ? (
        <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <div className="p-8 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
          <EmptyState
            title="No alerts match the current filters"
            description="Adjust your severity chips, lifecycle state tab, or search term."
          />
        </div>
      )}

      <PaginationBar
        totalItems={rowsToDisplay.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel={grouped ? 'alert groups' : 'alerts'}
      />

      {/* Detail SideDrawer */}
      <SideDrawer
        open={Boolean(activeGroup)}
        onClose={() => setActiveGroup(null)}
        title={activeGroup?.lead.source || 'Alert details'}
        description={
          activeGroup && activeGroup.count > 1
            ? `${activeGroup.count} occurrences between ${formatTimestampUtc(activeGroup.firstTimestamp)} and ${formatTimestampUtc(activeGroup.lastTimestamp)}`
            : activeGroup
            ? formatTimestampUtc(activeGroup.lead.timestamp)
            : undefined
        }
        footer={
          activeGroup && (
            <div className="flex flex-wrap items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-1.5">
                {[15, 60, 1440].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      handleStateAction(
                        activeGroup.items.map((i) => i.id),
                        'acknowledged',
                        mins
                      )
                    }
                    className="h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[12px] text-[var(--text)] hover:bg-[var(--surface-3)]"
                  >
                    Snooze {mins === 15 ? '15m' : mins === 60 ? '1h' : '24h'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {activeGroup.lead.state !== 'acknowledged' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStateAction(
                        activeGroup.items.map((i) => i.id),
                        'acknowledged'
                      )
                    }
                    className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border-strong)] text-[12px] font-medium text-[var(--accent)]"
                  >
                    Acknowledge
                  </button>
                )}
                {activeGroup.lead.state !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStateAction(
                        activeGroup.items.map((i) => i.id),
                        'resolved'
                      )
                    }
                    className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-ink)] text-[12px] font-semibold"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          )
        }
      >
        {activeGroup && (
          <div className="space-y-4 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip
                size="sm"
                tone={levelToTone(activeGroup.lead.level)}
                label={activeGroup.lead.level}
              />
              <StatusChip
                size="sm"
                tone={stateToTone(activeGroup.lead).tone}
                label={stateToTone(activeGroup.lead).label}
              />
              <div className="inline-flex items-center gap-1 ml-auto">
                <span className="font-mono text-[12px] text-[var(--text-muted)]">
                  {activeGroup.lead.id}
                </span>
                <CopyButton value={activeGroup.lead.id} label="Copy event ID" compact />
              </div>
            </div>

            <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="text-[12px] font-medium text-[var(--text-muted)] mb-1">Message</div>
              <p className="text-[13px] text-[var(--text)] leading-5">{activeGroup.lead.message}</p>
            </div>

            {activeGroup.lead.snoozed_until && (
              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--warn-soft)] border border-[var(--warn)]/30 text-[12px] text-[var(--text)]">
                Snoozed until <span className="font-mono">{formatTimestampUtc(activeGroup.lead.snoozed_until)}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-[var(--text-secondary)]">
                Occurrence timeline ({activeGroup.items.length})
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {activeGroup.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-2 text-[12px]"
                  >
                    <span className="font-mono text-[var(--text)]">{formatTimestampUtc(item.timestamp)}</span>
                    <span className="text-[var(--text-muted)] capitalize">
                      {item.snoozed ? 'snoozed' : item.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SideDrawer>

      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear all alerts?"
        description="This permanently removes all recorded operational alerts from SQLite and writes one audit event."
        confirmLabel="Clear alerts"
        tone="danger"
        onConfirm={handleClearAll}
      />
    </div>
  );
};
