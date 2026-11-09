/**
 * PINGUIN NEXT — selection-dependent header actions.
 * Owns only view state and interaction; the caller owns the records and effects.
 */
import { createRevealPanel } from '../reveal-panel/reveal-panel.js';

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

  const counter = document.createElement('span');
  counter.className = 'pg-selection-actions__count';
  counter.setAttribute('role', 'status');
  counter.setAttribute('aria-live', 'polite');

  const controller = new AbortController();
  const groups = new Map();
  for (const [mode, choices] of [['single', single], ['multiple', multiple]]) {
    const group = document.createElement('div');
    group.className = 'pg-selection-actions__group';
    group.dataset.pgGroup = mode;
    group.inert = true;
    group.hidden = true;
    for (const choice of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pg-selection-actions__action';
      button.textContent = choice.label;
      button.dataset.pgSelectionAction = choice.value;
      button.addEventListener('click', () => onAction(choice.value), {
        signal: controller.signal,
      });
      group.append(button);
    }
    groups.set(mode, group);
  }

  element.append(counter, groups.get('single'), groups.get('multiple'));
  // Reuse the same top-reveal animation as the adjacent Shell controls.
  // Positioning is owned by the host; the selection actions take no flex space.
  const reveal = createRevealPanel({ element, direction: 'top' });

  function setSelection(ids) {
    if (!Array.isArray(ids)) throw new TypeError('Expected selected row IDs');
    const count = ids.length;
    const mode = getSelectionMode(count);
    counter.textContent = count > 1 ? count + ' вибрано' : '';
    counter.hidden = count <= 1;
    element.dataset.pgMode = mode;
    for (const [name, group] of groups) {
      group.inert = name !== mode;
      group.hidden = name !== mode;
    }
    reveal.setVisible(mode !== 'none');
  }

  setSelection([]);
  return Object.freeze({
    element,
    setSelection,
    destroy() { reveal.destroy(); controller.abort(); element.remove(); },
  });
}
