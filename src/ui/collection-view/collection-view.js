/**
 * PINGUIN NEXT — SHARED DATA COLLECTION
 * One data model, sortable native table and optional feature-rendered tiles.
 * Does not access storage, Shell, fetch APIs, or feature-specific records.
 */
import { createViewSwitch } from '../view-switch/view-switch.js';

let collectionSequence = 0;
const collator = new Intl.Collator('uk', { numeric: true, sensitivity: 'base' });

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

function validateColumns(columns) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new TypeError('Collection needs at least one column');
  }
  const keys = new Set();
  for (const column of columns) {
    if (!column || typeof column.key !== 'string' || !column.key ||
        typeof column.label !== 'string' || !column.label.trim() ||
        keys.has(column.key) ||
        (column.align !== undefined && !['start', 'end'].includes(column.align)) ||
        (column.render !== undefined && typeof column.render !== 'function') ||
        (column.sortValue !== undefined && typeof column.sortValue !== 'function')) {
      throw new TypeError('Invalid or duplicate collection column');
    }
    keys.add(column.key);
  }
}

function appendContent(target, value) {
  if (value instanceof Node) target.append(value);
  else if (value != null) target.textContent = String(value);
}

export function createCollectionView({
  label, rows = [], columns, getRowId = row => row.id,
  renderTile, modes = ['table'], initialMode = 'table',
  initialSort = null, onModeChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Collection label is required');
  if (typeof getRowId !== 'function') throw new TypeError('getRowId must be a function');
  validateColumns(columns);
  if (!Array.isArray(modes) || !modes.length || new Set(modes).size !== modes.length ||
      modes.some(mode => !['table', 'tiles'].includes(mode)) || !modes.includes(initialMode) ||
      (modes.includes('tiles') && typeof renderTile !== 'function')) {
    throw new TypeError('Collection views require valid modes and a tile renderer for tiles');
  }
  if (initialSort !== null && (!columns.some(col => col.key === initialSort.key && col.sortable !== false) ||
      !['asc', 'desc'].includes(initialSort.direction))) {
    throw new TypeError('Initial sort must reference a sortable column');
  }

  const element = document.createElement('section');
  element.className = 'pg-collection-view';
  element.setAttribute('aria-label', label);
  const tableScroller = document.createElement('div');
  tableScroller.className = 'pg-collection-view__table-scroll pg-scrollbar';
  tableScroller.tabIndex = 0;
  tableScroller.setAttribute('role', 'region');
  tableScroller.setAttribute('aria-label', 'Таблиця: ' + label + '. Прокручуйте для перегляду стовпців.');
  const table = document.createElement('table');
  table.className = 'pg-collection-view__table';
  const caption = document.createElement('caption');
  caption.className = 'pg-collection-view__caption';
  caption.textContent = label;
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const tbody = document.createElement('tbody');
  const tiles = document.createElement('div');
  tiles.className = 'pg-collection-view__tiles';
  tiles.setAttribute('role', 'list');
  tiles.setAttribute('aria-label', 'Плитки: ' + label);
  const empty = document.createElement('p');
  empty.className = 'pg-collection-view__empty';
  empty.textContent = 'Немає записів';
  empty.hidden = true;
  const controller = new AbortController();
  const headers = new Map();
  let dataset = [];
  let currentMode = initialMode;
  let sort = initialSort ? { ...initialSort } : null;

  const switcher = modes.length > 1 ? createViewSwitch({
    modes, value: currentMode,
    onChange(value) {
      setMode(value);
      onModeChange?.(value);
    },
  }) : null;

  for (const column of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.dataset.pgColumn = column.key;
    if (column.align === 'end') th.dataset.pgAlign = 'end';
    if (column.primary) th.dataset.pgPrimary = 'true';
    if (column.sortable === false) {
      th.textContent = column.label;
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pg-collection-view__sort';
      const name = document.createElement('span');
      name.textContent = column.label;
      const marker = document.createElement('span');
      marker.className = 'pg-collection-view__sort-mark';
      marker.setAttribute('aria-hidden', 'true');
      button.append(name, marker);
      button.addEventListener('click', () => {
        const direction = sort?.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc';
        sort = { key: column.key, direction };
        renderData();
      }, { signal: controller.signal });
      th.append(button);
      headers.set(column.key, { th, button, marker, label: column.label });
    }
    headerRow.append(th);
  }
  thead.append(headerRow);
  table.append(caption, thead, tbody);
  tableScroller.append(table);
  element.append(tableScroller, tiles, empty);

  function sortedRows() {
    if (!sort) return [...dataset];
    const column = columns.find(col => col.key === sort.key);
    return dataset.map((row, index) => ({ row, index })).sort((left, right) => {
      const getValue = column.sortValue || (record => record[column.key]);
      const compare = compareValues(getValue(left.row), getValue(right.row));
      return (sort.direction === 'asc' ? compare : -compare) || (left.index - right.index);
    }).map(item => item.row);
  }

  function renderData() {
    const ordered = sortedRows();
    tbody.replaceChildren();
    tiles.replaceChildren();
    for (const row of ordered) {
      const tr = document.createElement('tr');
      tr.dataset.pgRowId = String(getRowId(row));
      for (const column of columns) {
        const td = document.createElement('td');
        if (column.align === 'end') td.dataset.pgAlign = 'end';
        if (column.primary) td.dataset.pgPrimary = 'true';
        if (column.muted) td.dataset.pgMuted = 'true';
        const content = column.render ? column.render(row) : row[column.key];
        const contentEl = document.createElement('span');
        contentEl.className = 'pg-collection-view__cell-content';
        appendContent(contentEl, content);
        if (!(content instanceof Node) && content != null) contentEl.title = String(content);
        td.append(contentEl);
        tr.append(td);
      }
      tbody.append(tr);
      if (modes.includes('tiles')) {
        const tile = renderTile(row);
        if (!(tile instanceof HTMLElement)) throw new TypeError('renderTile must return an HTMLElement');
        const item = document.createElement('div');
        item.className = 'pg-collection-view__tile';
        item.dataset.pgRowId = String(getRowId(row));
        item.setAttribute('role', 'listitem');
        item.append(tile);
        tiles.append(item);
      }
    }
    const hasRows = ordered.length > 0;
    empty.hidden = hasRows;
    tableScroller.hidden = !hasRows || currentMode !== 'table';
    tiles.hidden = !hasRows || currentMode !== 'tiles';
    for (const [key, entry] of headers) {
      const state = sort?.key === key
        ? (sort.direction === 'asc' ? 'ascending' : 'descending') : null;
      if (state) entry.th.setAttribute('aria-sort', state);
      else entry.th.removeAttribute('aria-sort');
      const next = state === 'ascending' ? 'за спаданням' : 'за зростанням';
      entry.button.setAttribute('aria-label', 'Сортувати ' + entry.label + ' ' + next);
      entry.marker.textContent = state === 'ascending' ? '↑' : state === 'descending' ? '↓' : '↕';
    }
  }

  function setRows(next) {
    if (!Array.isArray(next)) throw new TypeError('Collection rows must be an array');
    const ids = next.map(row => String(getRowId(row)));
    if (ids.some(id => !id || id === 'undefined') || new Set(ids).size !== ids.length) {
      throw new TypeError('Collection rows require unique stable ids');
    }
    dataset = [...next];
    renderData();
  }

  function setMode(next) {
    if (!modes.includes(next)) throw new RangeError('Unsupported collection mode: ' + next);
    currentMode = next;
    switcher?.setValue(next);
    element.dataset.pgView = next;
    const hasRows = dataset.length > 0;
    tableScroller.hidden = !hasRows || next !== 'table';
    tiles.hidden = !hasRows || next !== 'tiles';
  }

  setRows(rows);
  setMode(currentMode);
  return Object.freeze({
    element,
    headerActions: switcher?.element ?? null,
    getMode: () => currentMode,
    setMode,
    getRows: () => sortedRows(),
    getSort: () => sort ? { ...sort } : null,
    setRows,
    destroy() {
      controller.abort();
      switcher?.destroy();
      element.remove();
    },
  });
}
