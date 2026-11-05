/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — CONTEXT POPOVER                                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює компактне контекстне меню.                                                    ║
 * ║ ЗАЛЕЖНОСТІ: Спільні SVG-іконки.                                                                    ║
 * ║ ПУБЛІЧНИЙ API: createAside(), setPinned().                                                                      ║
 * ║ ПРИНЦИП: Закріплення змінює лише layout; вигляд aside залишається незмінним.                                                              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';

const LINKS = Object.freeze([
  { label: 'Код проєкту', url: 'https://github.com/DSMykyta/pinguinV5/tree/work', icon: 'code' },
  { label: 'Правила компонентів', url: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/conventions.md', icon: 'file-text' },
]);

/**
 * Transient popover by default; pinning only reserves space in the Shell grid.
 */
export function createAside({ onPinToggle }) {
  const aside = document.createElement('aside');
  aside.id = 'pg-aside-panel';
  aside.className = 'pg-aside';
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

  const list = document.createElement('nav');
  list.className = 'pg-aside__list';
  list.setAttribute('aria-label', 'Посилання проєкту');

  for (const link of LINKS) {
    const item = document.createElement('a');
    item.className = 'pg-aside__item';
    item.href = link.url;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';

    const symbol = createIcon(link.icon);
    symbol.classList.add('pg-aside__item-icon');

    const label = document.createElement('span');
    label.textContent = link.label;

    const arrow = createIcon('external-link');
    arrow.classList.add('pg-aside__item-arrow');
    item.append(symbol, label, arrow);
    list.append(item);
  }

  aside.append(list);

  function setPinned(isPinned, isNarrow) {
    pinButton.hidden = isNarrow;
    pinButton.setAttribute('aria-pressed', String(isPinned));
    const label = isPinned ? 'Відкріпити панель' : 'Закріпити панель';
    pinButton.setAttribute('aria-label', label);
    pinButton.title = label;
  }

  return { element: aside, pinButton, setPinned };
}
