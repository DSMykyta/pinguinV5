/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — CONTEXT POPOVER                                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює компактне контекстне меню.                                                    ║
 * ║ ЗАЛЕЖНОСТІ: Спільні SVG-іконки.                                                                    ║
 * ║ ПУБЛІЧНИЙ API: createAside(), setPinned(), setContext().                                                                      ║
 * ║ ПРИНЦИП: Закріплення змінює лише layout; вигляд aside залишається незмінним.                                                              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';

export const DEFAULT_LINKS = Object.freeze([
  { label: 'Код проєкту', url: 'https://github.com/DSMykyta/pinguinV5/tree/work', icon: 'code' },
  { label: 'Правила компонентів', url: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/conventions.md', icon: 'file-text' },
]);

/**
 * Transient popover by default; pinning only reserves space in the Shell grid.
 */
export function createAside({ onPinToggle }) {
  const aside = document.createElement('aside');
  aside.id = 'pg-aside-panel';
  aside.className = 'pg-aside pg-scrollbar';
  aside.setAttribute('aria-label', 'Контекстне меню');
  aside.setAttribute('aria-hidden', 'true');
  aside.inert = true;

  const title = document.createElement('h2');
  title.className = 'pg-aside__heading';
  title.textContent = 'Проєкт';
  const header = document.createElement('div');
  header.className = 'pg-aside__header';

  const pinButton = createIconButton({
    label: 'Закріпити панель',
    icon: 'pin',
    action: 'aside-pin',
    onClick: onPinToggle,
  });
  pinButton.classList.add('pg-aside__pin');
  pinButton.setAttribute('aria-pressed', 'false');
  pinButton.setAttribute('aria-controls', 'pg-aside-panel');
  header.append(title, pinButton);
  aside.append(header);

  const controlsHost = document.createElement('div');
  controlsHost.className = 'pg-aside__controls';
  controlsHost.hidden = true;

  const list = document.createElement('nav');
  list.className = 'pg-aside__list';
  list.setAttribute('aria-label', 'Посилання проєкту');

  function setContext(context) {
    const heading = context?.title || 'Проєкт';
    const links = context?.links || DEFAULT_LINKS;
    title.textContent = heading;
    list.setAttribute('aria-label', 'Посилання: ' + heading);
    list.replaceChildren();
    const controls = context?.controls ?? null;
    if (controls !== null && !(controls instanceof HTMLElement)) {
      throw new TypeError('Aside controls must be an HTMLElement or null');
    }
    controlsHost.replaceChildren(...(controls ? [controls] : []));
    controlsHost.hidden = !controls;
    list.hidden = Boolean(controls);
    for (const link of links) {
    const item = document.createElement('a');
    item.className = 'pg-aside__item';
    item.href = link.url;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';

    const symbol = createIcon(link.icon);
    symbol.classList.add('pg-aside__item-icon');

    const label = document.createElement('span');
    label.textContent = link.label;

    item.append(symbol, label);
    list.append(item);
  }

  }

  setContext(null);

  aside.append(list, controlsHost);

  function setPinned(isPinned, isNarrow) {
    pinButton.hidden = isNarrow;
    pinButton.setAttribute('aria-pressed', String(isPinned));
    const label = isPinned ? 'Відкріпити панель' : 'Закріпити панель';
    pinButton.setAttribute('aria-label', label);
    pinButton.dataset.pgTooltip = label;
  }

  return { element: aside, pinButton, setPinned, setContext };
}
