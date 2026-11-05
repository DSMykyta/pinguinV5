/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TOAST DEMO FOR TOOLS                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Ізольована тестова кнопка для перевірки справжнього Toast.             ║
 * ║ ЗАЛЕЖНОСТІ: Спільна кнопка UI, спільний Toast.                                      ║
 * ║ ПУБЛІЧНИЙ API: createToastDemo().                                                   ║
 * ║ ПРИНЦИП: Тимчасова демонстрація; не змінює Shell або реалізацію Toast.              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton } from '../../ui/button/button.js';
import { showToast } from '../../ui/toast/toast.js';

/** Return a removable, self-contained preview of an existing UI component. */
export function createToastDemo() {
  const section = document.createElement('section');
  section.className = 'pg-tools-toast-demo';
  section.setAttribute('aria-label', 'Тестування сповіщень');

  const label = document.createElement('span');
  label.className = 'pg-tools-toast-demo__label';
  label.textContent = 'Тест Toast';

  const trigger = createIconButton({
    label: 'Показати Toast',
    icon: 'check-circle',
    action: 'toast-demo',
    onClick: () => showToast('Зміни збережено', { type: 'success' }),
  });
  trigger.classList.add('pg-icon-button--corner');

  section.append(label, trigger);
  return section;
}
