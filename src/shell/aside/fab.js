/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PERSISTENT ASIDE FAB.                                                                ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: The action launcher belongs to the right-hand shell rail, not the transient            ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/icon/icon.js, ../../ui/button/button.js, ./aside.js                            ║
 * ║ ПУБЛІЧНИЙ API: createAsideFab()                                                                     ║
 * ║ ПРИНЦИП: aside popover: hiding/inerting the popover must never hide the fourth corner. Actions are  ║
 * ║ taken from the active page's existing aside context.                                                ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';
import { DEFAULT_LINKS } from './aside.js';

export function createAsideFab({
  id = 'pg-fab-actions',
  action = 'aside-fab-toggle',
  label = 'швидкі дії',
  icon = 'plus',
  position = 'corner',
  showLabels = true,
  onOpen,
} = {}) {
  if (!['corner', 'adjacent', 'footer'].includes(position)) throw new RangeError('Invalid FAB position');
  const element = document.createElement('div');
  element.className = 'pg-fab';
  element.dataset.pgFabState = 'closed';
  element.dataset.pgFabPosition = position;

  const actions = document.createElement('nav');
  actions.className = 'pg-fab__actions';
  actions.id = id;
  actions.setAttribute('aria-label', label.charAt(0).toLocaleUpperCase('uk') + label.slice(1));

  let open = false;

  function setOpen(value) {
    open = Boolean(value);
    if (open) onOpen?.();
    element.dataset.pgFabState = open ? 'open' : 'closed';
    actions.inert = !open;
    actions.setAttribute('aria-hidden', String(!open));
    if (open) syncChoices();
    button.setAttribute('aria-expanded', String(open));
    const title = (open ? 'Закрити ' : 'Відкрити ') + label;
    button.setAttribute('aria-label', title);
    button.dataset.pgTooltip = title;
  }

  const button = createIconButton({
    label: 'Відкрити ' + label,
    icon,
    action,
    variant: 'corner',
    onClick: () => setOpen(!open),
  });
  button.classList.add('pg-fab__trigger');
  // Both FAB instances use exactly the same face and same hover/open motion.
  // It may contain either an SVG icon or text, but is never replaced.
  const face = document.createElement('span');
  face.className = 'pg-fab__face';
  const iconNode = button.firstElementChild;
  if (iconNode) face.append(iconNode);
  button.append(face);
  button.setAttribute('aria-controls', actions.id);
  button.setAttribute('aria-haspopup', 'true');

  // Each independent instance can expose links or page-supplied actions.
  // The Shell owns placement; page content never creates a second FAB implementation.
  let actionContext = null;
  // Preserve one value element: replacing it on each refresh loses CSS/WAAPI motion.
  const valueIndicator = document.createElement('span');
  valueIndicator.className = 'pg-fab__trigger-value';
  valueIndicator.setAttribute('aria-hidden', 'true');
  let lastValue = null;

  function setTriggerValue(value) {
    const next = value === null ? null : String(value);
    if (position !== 'footer') return;
    if (next === null) {
      lastValue = null;
      face.replaceChildren(createIcon(icon));
      button.classList.remove('pg-fab__trigger--value');
      return;
    }
    if (!face.contains(valueIndicator)) {
      face.replaceChildren(valueIndicator);
      button.classList.add('pg-fab__trigger--value');
    }
    if (next === lastValue) return;
    lastValue = next;
    valueIndicator.textContent = next;
  }

  function syncChoices() {
    if (!actionContext) {
      setTriggerValue(null);
      return;
    }
    for (const item of actions.querySelectorAll('[data-pg-fab-value]')) {
      const choice = actionContext.items.find(entry => String(entry.value) === item.dataset.pgFabValue);
      const active = typeof choice?.selected === 'function'
        ? Boolean(choice.selected()) : Boolean(choice?.selected);
      item.setAttribute('aria-pressed', String(active));
    }
    // Footer uses the SAME FAB; its trigger reflects the current page size
    // rather than an unrelated static table icon. Global FAB keeps its icon.
    if (position === 'footer') {
      const current = actionContext.items.find(entry =>
        typeof entry.selected === 'function' ? entry.selected() : entry.selected);
      setTriggerValue(current ? (current.symbol ?? current.value) : null);
    }
  }

  function setContext(context) {
    setOpen(false);
    actions.replaceChildren();
    actionContext = context?.fabActions ?? null;
    const entries = actionContext ? actionContext.items : context?.links ?? DEFAULT_LINKS;
    if (!Array.isArray(entries)) throw new TypeError('FAB items must be an array');
    if (actionContext && typeof actionContext.onSelect !== 'function') {
      throw new TypeError('FAB actions require onSelect');
    }
    for (const [index, entry] of entries.entries()) {
      const item = document.createElement(actionContext ? 'button' : 'a');
      item.className = 'pg-fab__item';
      item.style.setProperty('--pg-fab-delay', `${index * 45}ms`);
      if (actionContext) {
        item.type = 'button';
        item.dataset.pgFabValue = String(entry.value);
        item.setAttribute('aria-label', entry.label);
      } else {
        item.href = entry.url;
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
      }

      const label = document.createElement('span');
      label.className = 'pg-fab__label';
      label.textContent = entry.label;

      const symbol = document.createElement('span');
      symbol.className = 'pg-fab__symbol';
      if (entry.icon) symbol.append(createIcon(entry.icon));
      else symbol.textContent = String(entry.symbol ?? entry.value ?? '');
      item.setAttribute('aria-label', entry.label);
      if (showLabels) item.append(label);
      item.append(symbol);
      actions.append(item);
    }
    syncChoices();
  }

  actions.addEventListener('click', event => {
    const choice = event.target.closest('[data-pg-fab-value]');
    if (choice && actions.contains(choice) && actionContext) {
      actionContext.onSelect(choice.dataset.pgFabValue);
      syncChoices();
      setOpen(false);
      button.focus();
      return;
    }
    if (event.target.closest('a')) setOpen(false);
  });

  element.append(actions, button);
  setContext(null);

  return {
    element,
    button,
    setContext,
    close: () => setOpen(false),
    isOpen: () => open,
    refresh: syncChoices,
  };
}
