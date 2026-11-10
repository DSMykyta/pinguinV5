/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — BUTTON COMPONENT                                                                    ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює спільну доступну кнопку.                                                      ║
 * ║ ЗАЛЕЖНОСТІ: UI icon, делегований tooltip за data-pg-tooltip.                                                                               ║
 * ║ ПУБЛІЧНИЙ API: createIconButton({ label, icon, variant?, tone?, appearance? }), setButtonColor().                                                                 ║
 * ║ ПРИНЦИП: Одна реалізація для кожного інструмента.                                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

const TONES = new Set(['main', 'secondary', 'tertiary', 'danger', 'warning', 'success', 'info']);
const APPEARANCES = new Set(['soft', 'solid', 'outline', 'ghost']);

/**
 * Color-only decorator for existing buttons. Does not change geometry,
 * listeners or component ownership. Omitting tone clears a previous override.
 */
export function setButtonColor(button, { tone, appearance } = {}) {
  if (!button?.dataset) throw new TypeError('A button element is required');
  if (tone == null) {
    if (appearance != null) throw new TypeError('Button appearance requires tone');
    delete button.dataset.pgTone;
    delete button.dataset.pgAppearance;
    return button;
  }
  if (!TONES.has(tone)) throw new TypeError('Unknown button tone');
  if (appearance != null && !APPEARANCES.has(appearance)) {
    throw new TypeError('Unknown button appearance');
  }
  button.dataset.pgTone = tone;
  button.dataset.pgAppearance = appearance ?? 'soft';
  return button;
}

/**
 * Creates a reusable accessible icon button.
 * The callback is attached once and belongs to the component's owner.
 */
export function createIconButton({ label, icon, action, onClick, variant = 'default', tone, appearance } = {}) {
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
  if (tone != null || appearance != null) {
    setButtonColor(button, { tone, appearance: appearance ?? 'ghost' });
  }
  button.append(createIcon(icon));
  if (typeof onClick === 'function') button.addEventListener('click', onClick);
  return button;
}
