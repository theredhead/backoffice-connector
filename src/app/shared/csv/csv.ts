/**
 * Escapes a single CSV field value per RFC 4180.
 * Wraps in double-quotes if the value contains commas, quotes, or newlines.
 */
export function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serialises rows to a CSV string.
 *
 * @param columns - Ordered column definitions with a `key` (data field) and `header` (label).
 * @param rows    - Data rows.
 */
export function buildCsv(
  columns: readonly { key: string; header: string }[],
  rows: readonly Record<string, unknown>[],
): string {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvEscape(String(row[c.key] ?? ''))).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * Triggers a browser file download for the given text content.
 *
 * @param content  - File content.
 * @param filename - Suggested filename (e.g. `"tracks.csv"`).
 * @param mimeType - MIME type (defaults to `"text/csv;charset=utf-8;"`).
 */
export function downloadText(
  content: string,
  filename: string,
  mimeType = 'text/csv;charset=utf-8;',
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
