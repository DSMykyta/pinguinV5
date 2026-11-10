/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SELECTION-DEPENDENT HEADER ACTIONS.                                                  ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Owns only view state and interaction; the caller owns the records and effects.         ║
 * ║ ЗАЛЕЖНОСТІ: ../reveal-panel/reveal-panel.js                                                         ║
 * ║ ПУБЛІЧНИЙ API: getSelectionMode(), createSelectionActions()                                         ║
 * ║ ПРИНЦИП: Ізольована поведінка, без зв'язків між features.                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createRevealPanel } from '../reveal-panel/reveal-panel.js';
import { setButtonColor } from '../button/button.js';

export function getSelectionMode(count) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('Invalid selection count');
  return count === 0 ? 'none' : count === 1 ? 'single' : 'multiple';
}

export function createSelectionActions({ single = [], multiple = [], onAction } = {}) {
  if (typeof onAction !== 'function') {
    throw new TypeError('Selection actions need onAction');
  }
  if (![single, multiple].every(group => Array.isArray(group) && group.every(
    entry => entry && typeof entry.value === 'string' && typeof entry.label === 'string'
      && entry.value.length && entry.label.trim(),
  ))) throw new TypeError('Selection actions require value and label');

  const element = document.createElement('div');
  element.className = 'pg-selection-actions';
  element.dataset.pgMode = 'none';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Дії з вибраними записами');

  const controller = new AbortController();
  const groups = new Map();
  let multipleCount = null;
  const singleButtons=[];
  for (const [mode, choices] of [['single', single], ['multiple', multiple]]) {
    const group = document.createElement('div');
    group.className = 'pg-selection-actions__group';
    group.dataset.pgGroup = mode;
    // The count belongs to the multi-selection group; it is never rendered for one.
    if (mode === 'multiple') {
      const counter = document.createElement('span');
      counter.className = 'pg-selection-actions__count';
      counter.setAttribute('role', 'status');
      counter.setAttribute('aria-live', 'polite');
      multipleCount = counter;
      group.append(counter);
    }
    for (const choice of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pg-selection-actions__action pg-button pg-button--pill';
      button.textContent = choice.label;
      button.dataset.pgSelectionAction = choice.value;
      if (choice.tone != null || choice.appearance != null) {
        setButtonColor(button, { tone:choice.tone, appearance:choice.appearance ?? 'soft' });
      }
      button.addEventListener('click', () => onAction(choice.value), {
        signal: controller.signal,
      });
      group.append(button);
      if(mode==='single')singleButtons.push(button);
    }
    // Each group reuses the same Shell RevealPanel animation. Switching
    // 1 ↔ 2+ animates both groups rather than instantly toggling hidden.
    const reveal = createRevealPanel({ element: group, direction: 'top' });
    groups.set(mode, { element: group, reveal });
    element.append(group);
  }

  function setSelection(ids, scope = {}) {
    if (!Array.isArray(ids)) throw new TypeError('Expected selected row IDs');
    const mode = getSelectionMode(ids.length);
    const outside = Number.isInteger(scope.outsideResults)
      ? Math.max(0,Math.min(scope.outsideResults,ids.length)) : 0;
    element.dataset.pgMode = mode;
    element.inert = mode === 'none';
    element.setAttribute('aria-hidden', String(mode === 'none'));
    multipleCount.textContent = mode === 'multiple'
      ? ids.length + ' вибрано' + (outside ? ' · ' + outside + ' поза пошуком' : '') : '';
    for (const button of singleButtons) {
      button.setAttribute('aria-label',button.textContent
        + (outside ? ' (вибраний запис за межами поточного пошуку)' : ''));
    }
    for (const [name, group] of groups) group.reveal.setVisible(name === mode);
  }

  setSelection([]);
  return Object.freeze({
    element,
    setSelection,
    destroy() {
      for (const group of groups.values()) group.reveal.destroy();
      controller.abort();
      element.remove();
    },
  });
}
