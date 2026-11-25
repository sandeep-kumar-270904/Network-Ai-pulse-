/**
 * Canonical formatting helpers for NetPulse AI.
 * Enforces one timestamp format (YYYY-MM-DD HH:mm:ss UTC), relative time for hover tooltips,
 * consistent metric units, and uniform decimal precision across every screen.
 */

const parseUtcDate = (value?: string | number | Date | null): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  // Normalize naive ISO strings ("YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS") to UTC
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
  const normalized = hasTz ? raw.replace(' ', 'T') : `${raw.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Formats a timestamp strictly as `YYYY-MM-DD HH:mm:ss UTC`, or `No data` if invalid.
 */
export const formatTimestampUtc = (value?: string | number | Date | null): string => {
  const date = parseUtcDate(value);
  if (!date) return 'No data';
  const yyyy = date.getUTCFullYear();
  const mm = pad2(date.getUTCMonth() + 1);
  const dd = pad2(date.getUTCDate());
  const hh = pad2(date.getUTCHours());
  const min = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`;
};

/**
 * Formats a compact UTC time label `HH:mm:ss UTC` for dense chart axes.
 */
export const formatChartTimeUtc = (value?: string | number | Date | null): string => {
  const date = parseUtcDate(value);
  if (!date) return 'No data';
  const hh = pad2(date.getUTCHours());
  const min = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());
  return `${hh}:${min}:${ss} UTC`;
};

/**
 * Formats a human-readable relative time string for hover titles (e.g. "42s ago").
 */
export const formatRelativeTime = (value?: string | number | Date | null): string => {
  const date = parseUtcDate(value);
  if (!date) return 'No data';
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 0) {
    const ahead = Math.abs(diffSec);
    if (ahead < 60) return `in ${ahead}s`;
    if (ahead < 3600) return `in ${Math.round(ahead / 60)}m`;
    return `in ${Math.round(ahead / 3600)}h`;
  }
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};

const isValidNumber = (val: unknown): val is number =>
  typeof val === 'number' && Number.isFinite(val);

/**
 * Latency (ms) — 1 decimal place or 'No data'. Distinguishes true 0.0 ms from null/missing.
 */
export const formatLatencyMs = (val?: number | null, includeUnit = true): string => {
  if (!isValidNumber(val)) return 'No data';
  const formatted = val.toFixed(1);
  return includeUnit ? `${formatted} ms` : formatted;
};

/**
 * Jitter (ms) — 2 decimal places or 'No data'.
 */
export const formatJitterMs = (val?: number | null, includeUnit = true): string => {
  if (!isValidNumber(val)) return 'No data';
  const formatted = val.toFixed(2);
  return includeUnit ? `${formatted} ms` : formatted;
};

/**
 * Percentages (pass rate, packet loss, CPU/Mem/Disk) — 1 decimal place or 'No data'.
 */
export const formatPercent = (val?: number | null, includeUnit = true): string => {
  if (!isValidNumber(val)) return 'No data';
  const formatted = val.toFixed(1);
  return includeUnit ? `${formatted}%` : formatted;
};

/**
 * Throughput (Mbps) — 2 decimal places or 'No data'.
 */
export const formatThroughputMbps = (val?: number | null, includeUnit = true): string => {
  if (!isValidNumber(val)) return 'No data';
  const formatted = val.toFixed(2);
  return includeUnit ? `${formatted} Mbps` : formatted;
};
