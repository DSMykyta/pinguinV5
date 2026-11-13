/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED PASSWORD INPUT                                                          ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Єдиний парольний Input з доступним показом/приховуванням значення.               ║
 * ║ ЗАЛЕЖНОСТІ: createInput(), createIconButton(), createIcon().                                    ║
 * ║ ПУБЛІЧНИЙ API: createPasswordInput(options), спільні Input setters, visibilityButton, isVisible.║
 * ║ ПРИНЦИП: Один native input, жодних копій Field, стилів кнопки або збереження пароля.           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createInput } from './input.js';
import { createIconButton } from '../button/button.js';
import { createIcon } from '../icon/icon.js';

/**
 * Password-aware composition of the existing shared Input.
 * Defaults are for an existing account; signup may pass autocomplete:'new-password'.
 */
export function createPasswordInput(options = {}) {
  const visibilityButton = createIconButton({
    label: 'Показати пароль',
    icon: 'visibility',
    action: 'password-visibility-toggle',
    variant: 'mini',
  });
  visibilityButton.classList.add('pg-input__visibility');
  visibilityButton.disabled = Boolean(options.disabled);

  const field = createInput({
    ...options,
    label: options.label ?? 'Пароль',
    type: 'password',
    clearable: false,
    autocomplete: options.autocomplete ?? 'current-password',
    trailing: visibilityButton,
    rotatingPlaceholder: false,
  });
  visibilityButton.setAttribute('aria-controls', field.input.id);
  let isVisible = false;

  function setVisible(next) {
    isVisible = Boolean(next);
    field.input.type = isVisible ? 'text' : 'password';
    const label = isVisible ? 'Приховати пароль' : 'Показати пароль';
    visibilityButton.setAttribute('aria-label', label);
    visibilityButton.dataset.pgTooltip = label;
    visibilityButton.replaceChildren(createIcon(isVisible ? 'visibility-off' : 'visibility'));
    field.element.dataset.pgPasswordVisible = String(isVisible);
  }

  // A pointer click should not move the caret away from a focused password.
  // Keyboard Tab and Enter/Space still focus/activate the real button.
  visibilityButton.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') event.preventDefault();
  });
  visibilityButton.addEventListener('click', () => setVisible(!isVisible));
  setVisible(false);

  return Object.freeze({
    ...field,
    visibilityButton,
    isVisible: () => isVisible,
  });
}
