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
  element.className = 'pg-aside-fab';
  element.dataset.pgFabState = 'closed';

  const actions = document.createElement('nav');
  actions.className = 'pg-aside-fab__actions';
  actions.id = 'pg-aside-fab-actions';
  actions.setAttribute('aria-label', 'Швидкі дії');

  let open = false;

  function setOpen(value) {
    open = Boolean(value);
    element.dataset.pgFabState = open ? 'open' : 'closed';
    actions.inert = !open;
    actions.setAttribute('aria-hidden', String(!open));
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
  button.classList.add('pg-aside-fab__trigger', 'pg-icon-button--corner');
  button.setAttribute('aria-controls', actions.id);
  button.setAttribute('aria-haspopup', 'true');

  function setContext(context) {
    setOpen(false);
    actions.replaceChildren();
    const entries = context?.links ?? DEFAULT_LINKS;
    for (const [index, entry] of entries.entries()) {
      const link = document.createElement('a');
      link.className = 'pg-aside-fab__item';
      link.href = entry.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.setProperty('--pg-fab-delay', `${index * 45}ms`);

      const label = document.createElement('span');
      label.className = 'pg-aside-fab__label';
      label.textContent = entry.label;

      const symbol = document.createElement('span');
      symbol.className = 'pg-aside-fab__symbol';
      symbol.append(createIcon(entry.icon));
      link.append(label, symbol);
      actions.append(link);
    }
  }

  actions.addEventListener('click', event => {
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
