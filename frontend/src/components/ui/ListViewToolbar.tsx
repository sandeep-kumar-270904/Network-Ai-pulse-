import React, { useState } from 'react';
import {
  Search,
  X,
  Download,
  Bookmark,
  BookmarkPlus,
  Layers,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Select } from './Select';
import { SavedView } from '../../hooks/useSavedViews';

export interface FilterChipOption {
  value: string;
  label: string;
  count: number;
  tone?: 'neutral' | 'danger' | 'warn' | 'ok' | 'info';
}

export type LocalTimeFilter = 'all' | '15m' | '1h' | '6h' | '24h' | '7d';

const TIME_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '15m', label: 'Last 15m' },
  { value: '1h', label: 'Last 1h' },
  { value: '6h', label: 'Last 6h' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7d' },
];

export const filterByTimeWindow = (timestamp: string | null | undefined, windowVal: LocalTimeFilter): boolean => {
  if (windowVal === 'all' || !timestamp) return true;
  const raw = String(timestamp).trim();
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
  const parsed = new Date(hasTz ? raw.replace(' ', 'T') : `${raw.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return true;
  const minsMap: Record<Exclude<LocalTimeFilter, 'all'>, number> = {
    '15m': 15,
    '1h': 60,
    '6h': 360,
    '24h': 1440,
    '7d': 10080,
  };
  return Date.now() - parsed.getTime() <= minsMap[windowVal] * 60 * 1000;
};

interface ListViewToolbarProps<TState> {
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  chips: FilterChipOption[];
  activeChip: string;
  onChipChange: (val: string) => void;
  timeFilter?: LocalTimeFilter;
  onTimeFilterChange?: (val: LocalTimeFilter) => void;
  grouped?: boolean;
  onGroupedChange?: (val: boolean) => void;
  groupLabel?: string;
  savedViews?: SavedView<TState>[];
  onApplySavedView?: (view: SavedView<TState>) => void;
  onSaveCurrentView?: (name: string) => void;
  onDeleteSavedView?: (id: string) => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  extraControls?: React.ReactNode;
}

export function ListViewToolbar<TState>({
  search,
  onSearchChange,
  searchPlaceholder = 'Filter by target, message, or ID…',
  chips,
  activeChip,
  onChipChange,
  timeFilter,
  onTimeFilterChange,
  grouped,
  onGroupedChange,
  groupLabel = 'Group repeated',
  savedViews = [],
  onApplySavedView,
  onSaveCurrentView,
  onDeleteSavedView,
  onExportCsv,
  onExportJson,
  onRefresh,
  loading = false,
  extraControls,
}: ListViewToolbarProps<TState>) {
  const [savingView, setSavingView] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewsOpen, setViewsOpen] = useState(false);

  const chipStyle = (opt: FilterChipOption, active: boolean) => {
    if (!active) {
      return 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]';
    }
    switch (opt.tone) {
      case 'danger':
        return 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/40 font-semibold';
      case 'warn':
        return 'bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn)]/40 font-semibold';
      case 'ok':
        return 'bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok)]/40 font-semibold';
      default:
        return 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 font-semibold';
    }
  };

  return (
    <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
      {/* Row 1: Search, Time range, Grouping, Saved Views, Export, Refresh */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full h-10 pl-9 pr-8 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {timeFilter !== undefined && onTimeFilterChange && (
          <div className="w-[132px]">
            <Select
              id="list-time-filter"
              ariaLabel="Time range filter"
              value={timeFilter}
              options={TIME_OPTIONS}
              onChange={(e) => onTimeFilterChange(e.target.value as LocalTimeFilter)}
            />
          </div>
        )}

        {onGroupedChange !== undefined && (
          <button
            type="button"
            aria-pressed={Boolean(grouped)}
            onClick={() => onGroupedChange(!grouped)}
            className={`h-10 px-3 rounded-[var(--radius-control)] border text-[13px] font-medium inline-flex items-center gap-2 transition-colors ${
              grouped
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span>{groupLabel}</span>
          </button>
        )}

        {/* Saved Views dropdown + save toggle */}
        {(onApplySavedView || onSaveCurrentView) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setViewsOpen((p) => !p)}
              className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span>Saved views ({savedViews.length})</span>
            </button>

            {viewsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border-strong)] shadow-[var(--shadow-popover)] z-30 space-y-2.5">
                <div className="flex items-center justify-between text-[12px] font-semibold text-[var(--text)]">
                  <span>Saved filter views</span>
                  {onSaveCurrentView && (
                    <button
                      type="button"
                      onClick={() => setSavingView((s) => !s)}
                      className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Save current</span>
                    </button>
                  )}
                </div>

                {savingView && onSaveCurrentView && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!viewName.trim()) return;
                      onSaveCurrentView(viewName.trim());
                      setViewName('');
                      setSavingView(false);
                    }}
                    className="flex gap-1.5"
                  >
                    <input
                      type="text"
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      placeholder="View name…"
                      className="flex-1 h-9 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="h-9 px-3 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-ink)] text-[12px] font-semibold"
                    >
                      Save
                    </button>
                  </form>
                )}

                {savedViews.length > 0 ? (
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {savedViews.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-[var(--radius-control)] hover:bg-[var(--surface-2)]"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onApplySavedView?.(v);
                            setViewsOpen(false);
                          }}
                          className="flex-1 text-left text-[13px] text-[var(--text)] truncate"
                        >
                          {v.name}
                        </button>
                        {onDeleteSavedView && (
                          <button
                            type="button"
                            onClick={() => onDeleteSavedView(v.id)}
                            aria-label={`Delete view ${v.name}`}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-[var(--text-muted)]">
                    No saved views yet. Save current filters for quick recall.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {(onExportCsv || onExportJson) && (
          <div className="inline-flex items-center gap-1.5">
            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>CSV</span>
              </button>
            )}
            {onExportJson && (
              <button
                type="button"
                onClick={onExportJson}
                className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>JSON</span>
              </button>
            )}
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh list"
            className="h-10 w-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}

        {extraControls}
      </div>

      {/* Row 2: Severity / Class filter chips with counts */}
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((opt) => {
          const active = activeChip === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChipChange(opt.value)}
              className={`h-9 px-3 rounded-[var(--radius-pill)] border text-[12px] inline-flex items-center gap-2 transition-colors ${chipStyle(
                opt,
                active
              )}`}
            >
              <span>{opt.label}</span>
              <span className="font-mono np-mono-val opacity-85">{opt.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
