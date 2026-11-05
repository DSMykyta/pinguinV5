/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — GLOBAL SEARCH                                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Пошук доступних сторінок та дій активного інструмента.                              ║
 * ║ ЗАЛЕЖНОСТІ: UI button; дані реєстру або активної сторінки через setEntries().                     ║
 * ║ ПУБЛІЧНИЙ API: createSearch() → element, setEntries(), close(), destroy().                         ║
 * ║ ПРИНЦИП: Жодного вбудованого списку інструментів, клавіатура й cleanup обов'язкові.                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton } from '../../ui/button/button.js';

export function createSearch({ onOpen } = {}) {
  const root = document.createElement('div');
  root.className = 'pg-search';

  const toggle = createIconButton({
    label: 'Пошук',
    icon: 'search',
    action: 'site-search-toggle',
    onClick: () => (isOpen ? close() : open()),
  });
  toggle.setAttribute('aria-controls', 'pg-search-panel');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.classList.add('pg-icon-button--corner');

  const panel = document.createElement('section');
  panel.id = 'pg-search-panel';
  panel.className = 'pg-search__panel';
  panel.setAttribute('aria-label', 'Пошук по Pinguin');
  panel.hidden = true;

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'pg-search__input';
  input.placeholder = 'Знайти розділ…';
  input.setAttribute('aria-label', 'Пошук розділів');
  input.autocomplete = 'off';
  input.spellcheck = false;

  const results = document.createElement('div');
  results.className = 'pg-search__results';
  results.id = 'pg-search-results';

  panel.append(input, results);
  root.append(toggle, panel);

  let entries = [];
  let isOpen = false;

  function matches(entry, query) {
    return (entry.label + ' ' + (entry.group ?? '')).toLocaleLowerCase('uk')
      .includes(query.toLocaleLowerCase('uk'));
  }

  function render() {
    const query = input.value.trim();
    const found = entries.filter(entry => matches(entry, query));
    results.replaceChildren();

    if (!found.length) {
      const empty = document.createElement('p');
      empty.className = 'pg-search__empty';
      empty.textContent = 'Нічого не знайдено';
      results.append(empty);
      return;
    }

    for (const entry of found) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pg-search__result';
      button.dataset.pgSearchResult = entry.id;

      const title = document.createElement('span');
      title.className = 'pg-search__result-title';
      title.textContent = entry.label;
      button.append(title);

      if (entry.group) {
        const group = document.createElement('span');
        group.className = 'pg-search__result-group';
        group.textContent = entry.group;
        button.append(group);
      }

      button.addEventListener('click', () => {
        close();
        entry.activate();
      });
      results.append(button);
    }
  }

  function open() {
    if (isOpen) return;
    onOpen?.();
    isOpen = true;
    input.value = '';
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    render();
    input.focus();
  }

  function close({ restoreFocus = false } = {}) {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  }

  function setEntries(next) {
    entries = Array.isArray(next) ? next.filter(entry =>
      entry && typeof entry.id === 'string' &&
      typeof entry.label === 'string' && typeof entry.activate === 'function') : [];
    if (isOpen) render();
  }

  function onDocumentPointer(event) {
    if (isOpen && !root.contains(event.target)) close();
  }

  function onDocumentKey(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (!isOpen) open();
      else input.focus();
      return;
    }
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close({ restoreFocus: true });
    }
  }

  function onInputKey(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      results.querySelector('button')?.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      results.querySelector('button')?.click();
    }
  }

  function onResultsKey(event) {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const buttons = [...results.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = index + (event.key === 'ArrowDown' ? 1 : -1);
    if (next < 0) input.focus();
    else buttons[Math.min(next, buttons.length - 1)]?.focus();
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', onInputKey);
  results.addEventListener('keydown', onResultsKey);
  document.addEventListener('pointerdown', onDocumentPointer);
  document.addEventListener('keydown', onDocumentKey);

  return {
    element: root,
    toggleButton: toggle,
    setEntries,
    open,
    close,
    destroy() {
      close();
      document.removeEventListener('pointerdown', onDocumentPointer);
      document.removeEventListener('keydown', onDocumentKey);
      input.removeEventListener('input', render);
      input.removeEventListener('keydown', onInputKey);
      results.removeEventListener('keydown', onResultsKey);
    },
  };
}
