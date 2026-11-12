/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — BUTTON GROUP                                                                        ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Універсальна група Material 3 Expressive та адаптер для наявних вкладок.               ║
 * ║ ЗАЛЕЖНОСТІ: Спільні pg-button і icon; жодних shell/features.                                        ║
 * ║ ПУБЛІЧНИЙ API: configureButtonGroup(), createButtonGroup().                                        ║
 * ║ ПРИНЦИП: Один вибір/стан у власника; styling adapter не перехоплює ARIA або події Tabs.             ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

const VARIANTS = new Set(['standard', 'connected']);
const APPEARANCES = new Set(['ghost', 'tonal', 'filled']);
const SHAPES = new Set(['round', 'square']);
const SIZES = new Set(['xs', 's', 'm', 'l', 'xl']);
const SELECTIONS = new Set(['none', 'single', 'multiple']);
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Apply only Material group geometry/appearance metadata; keep the owner's semantics. */
export function configureButtonGroup(element, {
  variant = 'connected', appearance = 'ghost', shape = 'round', size = 's',
} = {}) {
  if (!(element instanceof HTMLElement)) throw new TypeError('Button Group requires an HTMLElement');
  if (!VARIANTS.has(variant) || !APPEARANCES.has(appearance) ||
      !SHAPES.has(shape) || !SIZES.has(size)) {
    throw new TypeError('Unsupported Button Group configuration');
  }
  element.classList.add('pg-button-group');
  element.dataset.pgVariant = variant;
  element.dataset.pgAppearance = appearance;
  element.dataset.pgShape = shape;
  element.dataset.pgSize = size;
  return element;
}

/** Create an independent group of native buttons. Tab panels remain owned by createTabs(). */
export function createButtonGroup({
  label, items, variant = 'connected', appearance = 'tonal', shape = 'round',
  size = 's', selection = 'single', required = true, value, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) {
    throw new TypeError('Button Group needs an accessible label');
  }
  if (!Array.isArray(items) || items.length === 0 || !SELECTIONS.has(selection) ||
      items.some(item => !item || !ID_PATTERN.test(item.id) ||
        typeof item.label !== 'string' || !item.label.trim() ||
        (item.iconOnly && !item.icon)) ||
      new Set(items.map(item => item.id)).size !== items.length) {
    throw new TypeError('Button Group requires unique labeled items and a selection mode');
  }
  if (selection === 'none' && value != null) {
    throw new TypeError('Action groups cannot carry a selected value');
  }

  const root = document.createElement('div');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', label);
  configureButtonGroup(root, { variant, appearance, shape, size });

  const available = new Set(items.filter(item => !item.disabled).map(item => item.id));
  const initial = value === undefined && selection !== 'none'
    ? (items.find(item => !item.disabled)?.id ?? null)
    : value ?? null;
  let selected = new Set();
  const buttons = new Map();
  const controller = new AbortController();

  function normalize(next) {
    if (selection === 'none') {
      if (next != null) throw new TypeError('Action groups cannot select items');
      return new Set();
    }
    const values = selection === 'multiple'
      ? (Array.isArray(next) ? next : next == null ? [] : [next])
      : (next == null ? [] : [next]);
    if (selection === 'single' && Array.isArray(next)) {
      throw new TypeError('Single selection expects one ID');
    }
    if (values.some(id => !available.has(id)) || new Set(values).size !== values.length ||
        (selection === 'single' && values.length > 1) ||
        (required && values.length === 0)) {
      throw new RangeError('Invalid Button Group selection');
    }
    return new Set(values);
  }

  function getValue() {
    if (selection === 'none') return null;
    if (selection === 'single') return [...selected][0] ?? null;
    return items.filter(item => selected.has(item.id)).map(item => item.id);
  }

  function sync() {
    for (const [id, button] of buttons) {
      const active = selected.has(id);
      button.dataset.pgSelected = String(active);
      if (selection !== 'none') button.setAttribute('aria-pressed', String(active));
    }
  }

  function setValue(next) {
    selected = normalize(next);
    sync();
    return getValue();
  }

  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-button pg-button--group';
    button.dataset.pgGroupItem = item.id;
    button.disabled = Boolean(item.disabled);
    button.setAttribute('aria-label', item.label);
    if (item.icon) {
      const icon = createIcon(item.icon);
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon);
    }
    if (!item.iconOnly) {
      const text = document.createElement('span');
      text.textContent = item.label;
      button.append(text);
    }
    button.addEventListener('click', () => {
      if (selection !== 'none') {
        const next = new Set(selected);
        if (selection === 'single') next.clear();
        if (selection === 'single' || !next.has(item.id)) next.add(item.id);
        else if (!required || next.size > 1) next.delete(item.id);
        if (next.size !== selected.size || [...next].some(id => !selected.has(id))) {
          selected = next;
          sync();
          onChange?.(getValue(), item.id);
        }
      }
      item.onClick?.(item.id);
    }, { signal: controller.signal });
    buttons.set(item.id, button);
    root.append(button);
  }

  selected = normalize(initial);
  sync();

  return Object.freeze({
    element: root,
    getValue, setValue,
    destroy() {
      controller.abort();
      root.remove();
    },
  });
}
