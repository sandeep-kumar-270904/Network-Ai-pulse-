/**
 * Client-side CSV and JSON export helpers for filtered list views.
 */

const triggerBlobDownload = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csvEscape = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportToCsv = (
  filename: string,
  rows: Record<string, unknown>[],
  columns?: { key: string; header: string }[]
) => {
  if (!rows.length) return;
  const cols =
    columns && columns.length
      ? columns
      : Object.keys(rows[0]).map((key) => ({ key, header: key }));
  const headerLine = cols.map((c) => csvEscape(c.header)).join(',');
  const lines = rows.map((row) => cols.map((c) => csvEscape(row[c.key])).join(','));
  triggerBlobDownload(filename, [headerLine, ...lines].join('\r\n'), 'text/csv;charset=utf-8;');
};

export const exportToJson = (filename: string, data: unknown) => {
  triggerBlobDownload(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8;');
};
