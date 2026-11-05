/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — CONTEXT POPOVER                                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює компактне контекстне меню.                                                    ║
 * ║ ЗАЛЕЖНОСТІ: Спільні SVG-іконки.                                                                    ║
 * ║ ПУБЛІЧНИЙ API: createAside(), setPinned().                                                                      ║
 * ║ ПРИНЦИП: Закріплена панель займає третю колонку тільки на desktop.                                                              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../../ui/icon/icon.js';

const LINKS = Object.freeze([
  { label: 'Код проєкту', url: 'https://github.com/DSMykyta/pinguinV5/tree/work', icon: 'code' },
  { label: 'Правила компонентів', url: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/conventions.md', icon: 'file-text' },
]);

/**
 * Transient popover by default; pinning docks it into a desktop grid column.
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
  aside.append(title);

  const pinButton = document.createElement('button');
  pinButton.type = 'button';
  pinButton.className = 'pg-aside__item pg-aside__pin';
  pinButton.dataset.pgAction = 'aside-pin';
  pinButton.setAttribute('aria-pressed', 'false');
  pinButton.addEventListener('click', onPinToggle);

  const pinIcon = createIcon('pin');
  pinIcon.classList.add('pg-aside__item-icon');
  const pinLabel = document.createElement('span');
  pinLabel.textContent = 'Закріпити';
  pinButton.append(pinIcon, pinLabel);
  aside.append(pinButton);

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
    pinLabel.textContent = isPinned ? 'Відкріпити' : 'Закріпити';
    const newIcon = createIcon(isPinned ? 'pin-off' : 'pin');
    newIcon.classList.add('pg-aside__item-icon');
    pinButton.replaceChild(newIcon, pinButton.firstChild);
    pinButton.title = isPinned ? 'Повернути плаваюче меню' : 'Закріпити панель справа';
  }

  return { element: aside, pinButton, setPinned };
}
