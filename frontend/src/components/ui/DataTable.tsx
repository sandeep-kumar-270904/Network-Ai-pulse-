import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  numeric?: boolean;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  render: (row: T) => React.ReactNode;
}

export type TableDensity = 'comfortable' | 'compact';

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  density?: TableDensity;
  onDensityChange?: (d: TableDensity) => void;
  showDensityToggle?: boolean;
  stickyHeader?: boolean;
  maxHeightClass?: string;
  emptySlot?: React.ReactNode;
  caption?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  density: controlledDensity,
  onDensityChange,
  showDensityToggle = false,
  stickyHeader = true,
  maxHeightClass = 'max-h-[480px]',
  emptySlot,
  caption,
}: DataTableProps<T>) {
  const [internalDensity, setInternalDensity] = useState<TableDensity>('comfortable');
  const density = controlledDensity ?? internalDensity;
  const setDensity = (d: TableDensity) => {
    setInternalDensity(d);
    onDensityChange?.(d);
  };

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: DataColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const getVal = col.sortValue || ((r: T) => (r as Record<string, unknown>)[col.key]);

    return [...data].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, columns, sortKey, sortDir]);

  const cellPad = density === 'compact' ? 'py-2 px-3' : 'py-3 px-4';

  return (
    <div className="space-y-3">
      {showDensityToggle && (
        <div className="flex items-center justify-end gap-2">
          <span className="np-caption">Density</span>
          <div className="inline-flex p-1 rounded-[var(--radius-control)] bg-[var(--surface-2)] gap-1">
            {(['comfortable', 'compact'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDensity(mode)}
                aria-pressed={density === mode}
                className={`h-8 px-3 rounded-[var(--radius-control)] text-[12px] font-medium capitalize transition-colors ${
                  density === mode
                    ? 'bg-[var(--surface-1)] text-[var(--text)] shadow-[var(--shadow-card)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {sortedData.length === 0 && emptySlot ? (
        emptySlot
      ) : (
        <div className={`overflow-auto rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] ${stickyHeader ? maxHeightClass : ''}`}>
          <table className="w-full border-collapse text-left text-[13px] leading-5">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead
              className={`bg-[var(--surface-2)] text-[var(--text-secondary)] border-b border-[var(--border)] ${
                stickyHeader ? 'sticky top-0 z-10' : ''
              }`}
            >
              <tr>
                {columns.map((col) => {
                  const isRight = col.align === 'right' || col.numeric;
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`${cellPad} text-[12px] leading-4 font-semibold whitespace-nowrap ${
                        isRight ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col)}
                          className={`inline-flex items-center gap-1.5 min-h-[32px] rounded px-1 -mx-1 hover:text-[var(--text)] transition-colors ${
                            isRight ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <span>{col.header}</span>
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)]" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border)]">
              {sortedData.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="hover:bg-[var(--surface-3)] transition-colors duration-[var(--dur-micro)]"
                >
                  {columns.map((col) => {
                    const isRight = col.align === 'right' || col.numeric;
                    return (
                      <td
                        key={col.key}
                        className={`${cellPad} ${
                          isRight ? 'text-right np-mono-val' : 'text-left'
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
