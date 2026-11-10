/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — BUTTON COMPONENT                                                                    ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює спільну доступну кнопку.                                                      ║
 * ║ ЗАЛЕЖНОСТІ: UI icon, делегований tooltip за data-pg-tooltip.                                                                               ║
 * ║ ПУБЛІЧНИЙ API: createIconButton({ label, icon, action?, onClick?, variant? }).                                                                 ║
 * ║ ПРИНЦИП: Одна реалізація для кожного інструмента.                                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

/**
 * Creates a reusable accessible icon button.
 * The callback is attached once and belongs to the component's owner.
 */
export function createIconButton({ label, icon, action, onClick, variant = 'default' }) {
  if (!['default', 'mini', 'corner'].includes(variant)) throw new TypeError('Unknown IconButton variant');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pg-icon-button';
  if (variant === 'mini') button.classList.add('pg-mini-button');
  if (variant === 'corner') button.classList.add('pg-icon-button--corner');
  button.setAttribute('aria-label', label);
  button.dataset.pgTooltip = label;
  button.setAttribute('data-pg-tooltip-always', '');
  if (action) button.dataset.pgAction = action;
  button.append(createIcon(icon));
  if (typeof onClick === 'function') button.addEventListener('click', onClick);
  return button;
}
