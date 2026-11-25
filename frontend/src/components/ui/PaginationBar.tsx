import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

interface PaginationBarProps {
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

const PAGE_SIZE_OPTIONS = [
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
  { value: '250', label: '250 / page' },
];

export const PaginationBar: React.FC<PaginationBarProps> = ({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[13px]">
      <div className="font-mono text-[12px] text-[var(--text-secondary)] np-mono-val">
        Showing <span className="font-semibold text-[var(--text)]">{startIdx}–{endIdx}</span> of{' '}
        <span className="font-semibold text-[var(--text)]">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-[120px]">
          <Select
            id="pagination-page-size"
            ariaLabel="Rows per page"
            value={String(pageSize)}
            options={PAGE_SIZE_OPTIONS}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
          />
        </div>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Previous page"
            className="h-10 w-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-40 inline-flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 font-mono text-[12px] text-[var(--text-secondary)] np-mono-val">
            Page {safePage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Next page"
            className="h-10 w-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-40 inline-flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
