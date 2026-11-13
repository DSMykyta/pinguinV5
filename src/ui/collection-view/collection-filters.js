/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — COLLECTION COLUMN FILTERS                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Scalar values, AND/OR matching and contextual facet counts.    ║
 * ║ ЗАЛЕЖНОСТІ: Standard JavaScript only.                                     ║
 * ║ ПУБЛІЧНИЙ API: getFilterValue, matchesColumnFilters, getColumnOptions.      ║
 * ║ ПРИНЦИП: Pure data logic; no DOM, persistence or duplicate collection state.║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const collator = new Intl.Collator('uk', { numeric: true, sensitivity: 'base' });

export function getFilterValue(row, column) {
  const value = column.filterValue ? column.filterValue(row) : row[column.key];
  return String(value ?? '');
}

export function matchesColumnFilters(row, columns, filters, exceptKey = null) {
  return columns.every(column => column.key === exceptKey || !filters.has(column.key) ||
    filters.get(column.key).has(getFilterValue(row, column)));
}

export function getColumnOptions(rows, column, matchingRows) {
  const counts = new Map();
  for (const row of rows) counts.set(getFilterValue(row, column), 0);
  for (const row of matchingRows) {
    const value = getFilterValue(row, column);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, label: value || 'Порожньо', count }))
    .sort((a, b) => a.value === '' ? 1 : b.value === '' ? -1 : collator.compare(a.label, b.label));
}
