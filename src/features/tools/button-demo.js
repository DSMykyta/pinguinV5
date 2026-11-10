/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED BUTTON DEMO                                                                  ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє компонування Icon+Text і живий Loading на існуючих кнопках.                 ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/button/button.js, ../../ui/icon/icon.js.                                      ║
 * ║ ПУБЛІЧНИЙ API: createButtonDemo().                                                                 ║
 * ║ ПРИНЦИП: Демонструє спільні стилі; ніколи не створює іншої фабрики чи стилів кнопки.               ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton, withButtonLoading } from '../../ui/button/button.js';

export function createButtonDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-button-demo';
  const title = document.createElement('h3');
  title.textContent = 'Спільні кнопки';
  const hint = document.createElement('p');
  hint.textContent = 'Іконка до або після тексту; Loading рухається по бордеру, не по вмісту.';
  const row = document.createElement('div');
  row.className = 'pg-tools-button-demo__row';
  const status = document.createElement('p');
  status.className = 'pg-tools-button-demo__status';
  status.setAttribute('role', 'status');
  status.textContent = 'Натисніть «Loading» для демонстрації.';

  function textButton(label, icon, position, variant = 'outline') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-button pg-button--' + variant;
    const text = document.createElement('span');
    text.textContent = label;
    button.append(...(position === 'start'
      ? [createIcon(icon), text]
      : [text, createIcon(icon)]));
    return button;
  }

  const left = textButton('Іконка зліва', 'check', 'start');
  const right = textButton('Іконка справа', 'external-link', 'end', 'secondary');
  left.addEventListener('click', () => { status.textContent = 'Іконка перед текстом.'; });
  right.addEventListener('click', () => { status.textContent = 'Іконка після тексту.'; });

  const loading = textButton('Loading', 'check', 'start', 'primary');
  loading.dataset.pgAction = 'button-loading-demo';
  const compact = createIconButton({
    label: 'Loading компактної кнопки',
    icon: 'search',
    action: 'button-loading-mini-demo',
    variant: 'mini',
  });
  const pending = new Set();

  function demoDelay() {
    return new Promise(resolve => {
      const task = { id: null, finish: null };
      task.finish = () => {
        clearTimeout(task.id);
        pending.delete(task);
        resolve();
      };
      task.id = setTimeout(task.finish, 1400);
      pending.add(task);
    });
  }
  async function demonstrate(button) {
    status.textContent = 'Триває демонстраційне завантаження…';
    await withButtonLoading(button, demoDelay);
    if (element.isConnected) status.textContent = 'Демонстраційне завантаження завершено.';
  }
  loading.addEventListener('click', () => { void demonstrate(loading); });
  compact.addEventListener('click', () => { void demonstrate(compact); });

  row.append(left, right, loading, compact);
  element.append(title, hint, row, status);
  return {
    element,
    destroy() {
      for (const task of [...pending]) task.finish();
      element.remove();
    },
  };
}
