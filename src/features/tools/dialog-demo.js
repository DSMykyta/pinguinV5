/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ISOLATED DIALOG DEMO                                                 ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Тестові виклики Dialog і Confirm всередині вкладки «Текст».             ║
 * ║ ЗАЛЕЖНОСТІ: Спільні button.js та dialog.js.                                        ║
 * ║ ПУБЛІЧНИЙ API: createDialogDemo().                                                  ║
 * ║ ПРИНЦИП: Незалежний тестовий блок; Shell не змінюється.                             ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton } from '../../ui/button/button.js';
import { showDialog, showConfirmDialog } from '../../ui/dialog/dialog.js';

export function createDialogDemo() {
  const section = document.createElement('section');
  section.className = 'pg-tools-dialog-demo';
  section.setAttribute('aria-label', 'Тестування діалогів');

  const label = document.createElement('span');
  label.className = 'pg-tools-dialog-demo__label';
  label.textContent = 'Тест Dialog';

  const info = createIconButton({
    label: 'Показати Dialog',
    icon: 'info',
    action: 'dialog-demo-info',
    onClick: () => showDialog({
      title: 'Інформація',
      message: 'Це універсальне модальне вікно Pinguin Next.',
      confirmText: 'Зрозуміло',
    }).then(result => { section.dataset.pgDialogResult = result; }),
  });

  const confirm = createIconButton({
    label: 'Показати підтвердження',
    icon: 'circle-alert',
    action: 'dialog-demo-confirm',
    onClick: () => showConfirmDialog({
      title: 'Видалити запис?',
      message: 'Цю дію не можна скасувати.',
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
      destructive: true,
    }).then(result => { section.dataset.pgConfirmResult = String(result); }),
  });

  section.append(label, info, confirm);
  return section;
}
