/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LOCAL TABS                                                                         ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перемикає незалежні секції всередині однієї сторінки.                               ║
 * ║ ЗАЛЕЖНОСТІ: Спільна бібліотека SVG-іконок і передані DOM-панелі.                                  ║
 * ║ ПУБЛІЧНИЙ API: createTabs().                                                                       ║
 * ║ ПРИНЦИП: Центрується весь ряд; кнопки розкриваються у природному flex-порядку.                            ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';
import { configureButtonGroup } from '../button-group/button-group.js';

/**
 * Each item: { id, label, icon, content: HTMLElement }.
 * The caller owns content; the shared component owns selection and keyboard behavior.
 * navHost mounts the entire row in the shared workspace subnavigation slot.
 */
export function createTabs({ idPrefix, label, items, onChange, navHost = null }) {
  if (!/^[a-z][a-z0-9-]*$/.test(idPrefix) || !Array.isArray(items) || !items.length) {
    throw new TypeError('Tabs require a stable idPrefix and at least one item');
  }
  if (navHost !== null && !(navHost instanceof HTMLElement)) {
    throw new TypeError('navHost must be an HTMLElement');
  }
  const ids = new Set(items.map(item => item.id));
  if (ids.size !== items.length || items.some(item => !/^[a-z][a-z0-9-]*$/.test(item.id) ||
    !item.label || !(item.content instanceof HTMLElement))) {
    throw new TypeError('Tabs require unique IDs, labels and DOM panels');
  }

  const root = document.createElement('section');
  root.className = 'pg-tabs';

  const nav = document.createElement('div');
  nav.className = 'pg-tabs__nav';
  configureButtonGroup(nav, { variant: 'connected', appearance: 'ghost', shape: 'round', size: 's' });
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', label);

  const panelHost = document.createElement('div');
  panelHost.className = 'pg-tabs__content';
  const buttons = new Map();
  const panels = new Map();
  let currentId = null;

  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-tabs__tab pg-button pg-button--group';
    button.id = idPrefix + '-tab-' + item.id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', idPrefix + '-panel-' + item.id);
    button.setAttribute('aria-selected', 'false');
    button.tabIndex = -1;
    button.dataset.pgTab = item.id;
    button.setAttribute('aria-label', item.label);
    if (item.icon) button.append(createIcon(item.icon));
    const text = document.createElement('span');
    text.className = 'pg-tabs__label';
    text.textContent = item.label;
    button.append(text);
    button.addEventListener('click', () => activate(item.id));

    const panel = document.createElement('section');
    panel.className = 'pg-tabs__panel pg-scrollbar';
    panel.id = idPrefix + '-panel-' + item.id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    panel.hidden = true;
    panel.append(item.content);

    nav.append(button);
    panelHost.append(panel);
    buttons.set(item.id, button);
    panels.set(item.id, panel);
  }

  const orderedIds = items.map(item => item.id);

  function activate(id, focus = false) {
    if (!buttons.has(id)) return false;
    if (currentId !== id) {
      currentId = id;
      for (const itemId of orderedIds) {
        const active = itemId === id;
        const button = buttons.get(itemId);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        panels.get(itemId).hidden = !active;
      }
      onChange?.(id);
    }
    if (focus) buttons.get(id).focus();
    return true;
  }

  function handleKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tab = event.target.closest('[role="tab"]');
    if (!tab || !nav.contains(tab)) return;
    event.preventDefault();
    const currentIndex = orderedIds.indexOf(tab.dataset.pgTab);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End'
      ? orderedIds.length - 1 : event.key === 'ArrowRight'
        ? (currentIndex + 1) % orderedIds.length
        : (currentIndex - 1 + orderedIds.length) % orderedIds.length;
    activate(orderedIds[nextIndex], true);
  }

  nav.addEventListener('keydown', handleKeydown);
  if (navHost) navHost.replaceChildren(nav);
  root.append(panelHost);
  if (!navHost) root.prepend(nav);
  activate(orderedIds[0]);

  return {
    element: root,
    activate,
    getActive: () => currentId,
    destroy: () => {
      nav.removeEventListener('keydown', handleKeydown);
      nav.remove();
      root.replaceChildren();
    },
  };
}
