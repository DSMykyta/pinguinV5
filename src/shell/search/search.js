/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — GLOBAL SEARCH                                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Пошук сторінок і вкладок у полі шапки без випадної панелі.                           ║
 * ║ ЗАЛЕЖНОСТІ: UI icon, маршрути й дії активної сторінки через setEntries().                         ║
 * ║ ПУБЛІЧНИЙ API: createSearch() → element, setEntries(), open(), close(), destroy().                ║
 * ║ ПРИНЦИП: Enter відкриває збіг, Escape очищує, Ctrl/Cmd+K фокусує поле.                            ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';

export function createSearch({ onOpen } = {}) {
  const root = document.createElement('div');
  root.className = 'pg-search';

  const field = document.createElement('label');
  field.className = 'pg-search__field';
  field.append(createIcon('search'));

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'pg-search__input';
  input.dataset.pgAction = 'site-search-input';
  input.placeholder = 'Пошук у Pinguin';
  input.setAttribute('aria-label', 'Пошук розділів');
  input.autocomplete = 'off';
  input.spellcheck = false;
  field.append(input);

  // The browser's own search-cancel glyph is platform-colored and inconsistent
  // with Material Symbols. Reuse the shared IconButton, not a second icon skin.
  const clearButton = createIconButton({
    label: 'Очистити пошук', icon: 'x', variant: 'mini', action: 'site-search-clear',
    onClick() {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    },
  });
  clearButton.classList.add('pg-search__clear');
  clearButton.hidden = true;

  // Feedback for screen readers; no visual dropdown or extra panel.
  const status = document.createElement('span');
  status.className = 'pg-search__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  root.append(field, clearButton, status);

  let entries = [];
  // null = global page navigation search, false = no searchable content,
  // object = a page-supplied query handler. One input, never a duplicate.
  let currentContext = null;
  const defaultPlaceholder = input.placeholder;
  const defaultLabel = input.getAttribute('aria-label');
  function syncClear() {
    clearButton.hidden = input.value.length === 0 || root.hidden;
  }
  function setContext(next) {
    if (next !== null && next !== false &&
        (typeof next !== 'object' || typeof next.onQuery !== 'function')) {
      throw new TypeError('Search context must be null, false or onQuery handler');
    }
    close();
    currentContext = next;
    root.hidden = next === false;
    input.placeholder = next && next.placeholder ? String(next.placeholder) : defaultPlaceholder;
    input.setAttribute('aria-label',next && next.label ? String(next.label) : defaultLabel);
    if (next && next.value) input.value = String(next.value);
    syncClear();
  }

  function setEntries(next) {
    entries = Array.isArray(next) ? next.filter(entry =>
      entry && typeof entry.id === 'string' &&
      typeof entry.label === 'string' && typeof entry.activate === 'function') : [];
  }

  function open() {
    if (root.hidden) return;
    input.focus();
  }

  function close() {
    input.value = '';
    status.textContent = '';
    syncClear();
    if (root.contains(document.activeElement)) input.blur();
  }

  function activateBestMatch() {
    if (currentContext) return;
    const query = input.value.trim().toLocaleLowerCase('uk');
    if (!query) return;
    const normalized = label => label.toLocaleLowerCase('uk');
    const matches = entries.filter(entry =>
      normalized(entry.label + ' ' + (entry.group ?? '')).includes(query));
    const match = matches.find(entry => normalized(entry.label) === query) ??
      matches.find(entry => normalized(entry.label).startsWith(query)) ??
      matches[0];

    if (!match) {
      status.textContent = 'Нічого не знайдено';
      return;
    }
    close();
    match.activate();
  }

  function onInput() {
    status.textContent = '';
    syncClear();
    if (currentContext) currentContext.onQuery(input.value);
  }

  function onInputKey(event) {
    if (event.key === 'Enter' && !currentContext) {
      event.preventDefault();
      activateBestMatch();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      if (currentContext) currentContext.onQuery('');
    }
  }

  function onDocumentKey(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    }
  }

  input.addEventListener('focus', onOpen);
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onInputKey);
  document.addEventListener('keydown', onDocumentKey);

  return {
    element: root,
    input,
    setEntries, setContext,
    open,
    close,
    destroy() {
      close();
      input.removeEventListener('focus', onOpen);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onInputKey);
      document.removeEventListener('keydown', onDocumentKey);
    },
  };
}
