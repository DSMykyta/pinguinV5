/**
 * PINGUIN NEXT — persistent aside FAB.
 * The action launcher belongs to the right-hand shell rail, not the transient
 * aside popover: hiding/inerting the popover must never hide the fourth corner.
 * Actions are taken from the active page's existing aside context.
 */
import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';
import { DEFAULT_LINKS } from './aside.js';

export function createAsideFab() {
  const element = document.createElement('div');
  element.className = 'pg-fab';
  element.dataset.pgFabState = 'closed';

  const actions = document.createElement('nav');
  actions.className = 'pg-fab__actions';
  actions.id = 'pg-fab-actions';
  actions.setAttribute('aria-label', 'Швидкі дії');

  let open = false;

  function setOpen(value) {
    open = Boolean(value);
    element.dataset.pgFabState = open ? 'open' : 'closed';
    actions.inert = !open;
    actions.setAttribute('aria-hidden', String(!open));
    if (open) syncChoices();
    button.setAttribute('aria-expanded', String(open));
    const label = open ? 'Закрити швидкі дії' : 'Відкрити швидкі дії';
    button.setAttribute('aria-label', label);
    button.dataset.pgTooltip = label;
  }

  const button = createIconButton({
    label: 'Відкрити швидкі дії',
    icon: 'plus',
    action: 'aside-fab-toggle',
    onClick: () => setOpen(!open),
  });
  button.classList.add('pg-fab__trigger', 'pg-icon-button--corner');
  button.setAttribute('aria-controls', actions.id);
  button.setAttribute('aria-haspopup', 'true');

  // One existing FAB supports links or page-provided actions, never two launchers.
  let actionContext = null;

  function syncChoices() {
    if (!actionContext) return;
    for (const item of actions.querySelectorAll('[data-pg-fab-value]')) {
      const choice = actionContext.items.find(entry => String(entry.value) === item.dataset.pgFabValue);
      const active = typeof choice?.selected === 'function'
        ? Boolean(choice.selected()) : Boolean(choice?.selected);
      item.setAttribute('aria-pressed', String(active));
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
      item.append(label, symbol);
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
  };
}
