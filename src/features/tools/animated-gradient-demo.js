/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT DEMO                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Тестова кнопка діалогу із живим градієнтом у «Таблицях».              ║
 * ║ ЗАЛЕЖНОСТІ: Спільні Button, Dialog та AnimatedGradient.                          ║
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradientDemo().                                       ║
 * ║ ПРИНЦИП: Demo лише збирає існуючі компоненти, не змінює Shell.                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton } from '../../ui/button/button.js';
import { showDialog } from '../../ui/dialog/dialog.js';
import { createAnimatedGradient } from '../../ui/animated-gradient/animated-gradient.js';

export function createAnimatedGradientDemo() {
  const section = document.createElement('section');
  section.className = 'pg-tools-animated-gradient-demo';
  section.setAttribute('aria-label', 'Тестування анімованого градієнта');

  const label = document.createElement('span');
  label.className = 'pg-tools-animated-gradient-demo__label';
  label.textContent = 'Тест градієнта';

  const trigger = createIconButton({
    label: 'Відкрити анімований градієнт',
    icon: 'layers',
    action: 'animated-gradient-demo',
    variant: 'corner',
    onClick: () => {
      void showDialog({
        title: 'Анімований градієнт',
        content: createAnimatedGradient({ text: 'pinguin V6' }),
        confirmText: 'Закрити',
      });
    },
  });

  section.append(label, trigger);
  return section;
}
