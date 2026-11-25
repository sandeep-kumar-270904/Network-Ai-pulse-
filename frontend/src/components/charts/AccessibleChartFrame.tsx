import React, { useState } from 'react';
import { Table, BarChart3 } from 'lucide-react';

export interface ChartTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

interface AccessibleChartFrameProps {
  title: string;
  summary: string;
  columns: ChartTableColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

/**
 * Wraps visual charts with an explicit screen-reader summary and a keyboard-accessible
 * toggle to inspect underlying values as a semantic HTML table.
 */
export const AccessibleChartFrame: React.FC<AccessibleChartFrameProps> = ({
  title,
  summary,
  columns,
  rows,
  children,
  headerRight,
}) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      aria-label={title}
      className="space-y-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="sr-only">{summary}</span>
        <div className="flex items-center gap-2 ml-auto">
          {headerRight}
          {rows.length > 0 && (
            <button
              type="button"
              aria-pressed={showTable}
              aria-label={showTable ? `Show visual chart for ${title}` : `Show data table for ${title}`}
              onClick={() => setShowTable((prev) => !prev)}
              className="h-8 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1.5 transition-colors"
            >
              {showTable ? (
                <>
                  <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Chart view</span>
                </>
              ) : (
                <>
                  <Table className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Data table</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showTable ? (
        <div className="overflow-x-auto max-h-64 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--bg)]">
          <table className="w-full border-collapse text-left text-[12px]">
            <caption className="sr-only">
              {title}: {summary}
            </caption>
            <thead className="sticky top-0 bg-[var(--surface-2)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`py-2 px-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-mono np-mono-val">
              {rows.slice(0, 60).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[var(--surface-2)]/60">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-1.5 px-3 ${
                        col.align === 'right' ? 'text-right text-[var(--text)]' : 'text-left text-[var(--text-secondary)]'
                      }`}
                    >
                      {row[col.key] === null || row[col.key] === undefined || row[col.key] === ''
                        ? 'No data'
                        : String(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={`${title}. ${summary}`}>
          {children}
        </div>
      )}
    </section>
  );
};
