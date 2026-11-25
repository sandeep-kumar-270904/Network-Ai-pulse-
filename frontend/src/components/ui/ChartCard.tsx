import React, { useState } from 'react';
import { Table2, BarChart2 } from 'lucide-react';

interface ChartCardProps {
  title: string;
  description?: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
  dataSummaryTable?: {
    headers: string[];
    rows: Array<Array<string | number>>;
  };
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  controls,
  children,
  dataSummaryTable,
}) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <figure className="np-card p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div className="space-y-1 min-w-0">
          <figcaption className="np-section-title">{title}</figcaption>
          {description && <p className="np-helper">{description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {controls}
          {dataSummaryTable && (
            <button
              type="button"
              onClick={() => setShowTable((p) => !p)}
              aria-expanded={showTable}
              className="h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center gap-1.5 transition-colors"
            >
              {showTable ? (
                <>
                  <BarChart2 className="w-4 h-4" aria-hidden="true" />
                  <span>Chart</span>
                </>
              ) : (
                <>
                  <Table2 className="w-4 h-4" aria-hidden="true" />
                  <span>Data table</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showTable && dataSummaryTable ? (
        <div className="overflow-x-auto rounded-[var(--radius-control)] bg-[var(--surface-2)]">
          <table className="w-full text-[13px] leading-5 border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                {dataSummaryTable.headers.map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`py-2 px-3 text-[12px] font-semibold ${
                      i > 0 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {dataSummaryTable.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-2 px-3 ${
                        cIdx > 0 ? 'text-right np-mono-val' : 'text-left text-[var(--text)]'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
};
