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

  // Feedback for screen readers; no visual dropdown or extra panel.
  const status = document.createElement('span');
  status.className = 'pg-search__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  root.append(field, status);

  let entries = [];

  function setEntries(next) {
    entries = Array.isArray(next) ? next.filter(entry =>
      entry && typeof entry.id === 'string' &&
      typeof entry.label === 'string' && typeof entry.activate === 'function') : [];
  }

  function open() {
    onOpen?.();
    input.focus();
  }

  function close() {
    input.value = '';
    status.textContent = '';
    if (root.contains(document.activeElement)) input.blur();
  }

  function activateBestMatch() {
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
  }

  function onInputKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      activateBestMatch();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
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
    setEntries,
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
