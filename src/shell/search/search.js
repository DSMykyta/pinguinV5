/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — GLOBAL SEARCH                                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Видиме пошукове поле у спільній шапці всіх сторінок.                                 ║
 * ║ ЗАЛЕЖНОСТІ: UI icon, entries від реєстру та активного модуля.                                     ║
 * ║ ПУБЛІЧНИЙ API: createSearch() → element, setEntries(), open(), close(), destroy().                ║
 * ║ ПРИНЦИП: Пошук дійсно працює; мобільна версія розкривається за фокусом.                           ║
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
  input.setAttribute('aria-controls', 'pg-search-results');
  input.setAttribute('aria-expanded', 'false');
  input.autocomplete = 'off';
  input.spellcheck = false;
  field.append(input);

  const results = document.createElement('div');
  results.id = 'pg-search-results';
  results.className = 'pg-search__results';
  results.setAttribute('role', 'region');
  results.setAttribute('aria-label', 'Результати пошуку');
  results.hidden = true;
  root.append(field, results);

  let entries = [];
  let isOpen = false;

  function render() {
    const query = input.value.trim().toLocaleLowerCase('uk');
    const found = entries.filter(entry =>
      (entry.label + ' ' + (entry.group ?? '')).toLocaleLowerCase('uk').includes(query));
    results.replaceChildren();

    if (!found.length) {
      const empty = document.createElement('p');
      empty.className = 'pg-search__empty';
      empty.textContent = 'Нічого не знайдено';
      results.append(empty);
    }

    for (const entry of found) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pg-search__result';
      button.dataset.pgSearchResult = entry.id;

      const label = document.createElement('span');
      label.textContent = entry.label;
      button.append(label);

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
    if (!isOpen) {
      onOpen?.();
      isOpen = true;
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      render();
    }
    input.focus();
  }

  function close({ restoreFocus = false } = {}) {
    isOpen = false;
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.value = '';
    if (restoreFocus) input.focus();
    else if (root.contains(document.activeElement)) input.blur();
  }

  function setEntries(next) {
    entries = Array.isArray(next) ? next.filter(entry =>
      entry && typeof entry.id === 'string' &&
      typeof entry.label === 'string' && typeof entry.activate === 'function') : [];
    if (isOpen) render();
  }

  function onInput() {
    if (!isOpen) open();
    else render();
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
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = [...results.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = index + (event.key === 'ArrowDown' ? 1 : -1);
    if (next < 0) input.focus();
    else buttons[Math.min(next, buttons.length - 1)]?.focus();
  }

  function onDocumentPointer(event) {
    if (isOpen && !root.contains(event.target)) close();
  }

  function onDocumentFocus(event) {
    if (isOpen && !root.contains(event.target)) close();
  }

  function onDocumentKey(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    }
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }

  input.addEventListener('focus', open);
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onInputKey);
  results.addEventListener('keydown', onResultsKey);
  document.addEventListener('pointerdown', onDocumentPointer);
  document.addEventListener('focusin', onDocumentFocus);
  document.addEventListener('keydown', onDocumentKey);

  return {
    element: root,
    input,
    setEntries,
    open,
    close,
    destroy() {
      close();
      input.removeEventListener('focus', open);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onInputKey);
      results.removeEventListener('keydown', onResultsKey);
      document.removeEventListener('pointerdown', onDocumentPointer);
      document.removeEventListener('focusin', onDocumentFocus);
      document.removeEventListener('keydown', onDocumentKey);
    },
  };
}
