/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — CONTEXT POPOVER                                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює компактне контекстне меню.                                                    ║
 * ║ ЗАЛЕЖНОСТІ: Спільні SVG-іконки.                                                                    ║
 * ║ ПУБЛІЧНИЙ API: createAside().                                                                      ║
 * ║ ПРИНЦИП: Не займає додаткову колонку.                                                              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../../ui/icon/icon.js';

const LINKS = Object.freeze([
  { label: 'Код проєкту', url: 'https://github.com/DSMykyta/pinguinV5/tree/work', icon: 'code' },
  { label: 'Правила компонентів', url: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/conventions.md', icon: 'file-text' },
]);

/**
 * A contextual popover. It does not occupy a grid column or control page width.
 * A feature can replace the link content via the public API in a later phase.
 */
export function createAside() {
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
  return { element: aside };
}
