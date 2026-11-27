/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SPLIT BUTTON                                                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Основна дія і незалежне меню пов'язаних дій.                                        ║
 * ║ ЗАЛЕЖНОСТІ: ../menu/menu.js, ../icon/icon.js, спільний Button.                                   ║
 * ║ ПУБЛІЧНИЙ API: createSplitButton(options) → element, primary, trigger, open, close, setDisabled, destroy. ║
 * ║ ПРИНЦИП: Композиція Menu і Button, без власного popup lifecycle.                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createMenu } from '../menu/menu.js';
import { createIcon } from '../icon/icon.js';

export function createSplitButton({
  label, icon, menuLabel = 'Додаткові дії', items, onAction, onSelect,
  disabled = false, primaryDisabled = false, menuDisabled = false,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Split button needs a label');
  if (typeof onAction !== 'function') throw new TypeError('Split button needs a primary action');
  const primary = document.createElement('button');
  primary.type = 'button';
  primary.className = 'pg-button pg-button--primary pg-split-button__primary';
  if (icon) primary.append(createIcon(icon));
  const caption = document.createElement('span');
  caption.textContent = label;
  primary.append(caption);

  const menu = createMenu({ label: menuLabel, items, anchorGroup: true, onSelect });
  const { element, trigger, panel } = menu;
  element.classList.add('pg-split-button');
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', label);
  trigger.classList.replace('pg-button--outline', 'pg-button--primary');
  trigger.classList.add('pg-split-button__trigger');
  trigger.setAttribute('aria-label', menuLabel);
  trigger.replaceChildren(createIcon('expand-more'));
  panel.classList.add('pg-split-button__panel');
  element.prepend(primary);

  const controller = new AbortController();
  primary.addEventListener('click', event => {
    menu.close();
    onAction(event);
  }, { signal: controller.signal });

  let state = { disabled, primaryDisabled, menuDisabled };
  function setDisabled(next = {}) {
    state = { ...state, ...next };
    primary.disabled = Boolean(state.disabled || state.primaryDisabled);
    trigger.disabled = Boolean(state.disabled || state.menuDisabled);
    if (trigger.disabled) menu.close();
  }
  setDisabled();
  return Object.freeze({
    element, primary, trigger, open: menu.open, close: menu.close, setDisabled,
    destroy() { controller.abort(); menu.destroy(); },
  });
}
