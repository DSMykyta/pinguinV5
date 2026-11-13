/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT DEMO                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Три типи руху одного живого градієнта у спільному Dialog.        ║
 * ║ ЗАЛЕЖНОСТІ: Existing Button, Button Group, Dialog, AnimatedGradient.               ║
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradientDemo().                                       ║
 * ║ ПРИНЦИП: Demo складає наявні UI, жодного унікального modal/button skin.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton } from '../../ui/button/button.js';
import { createButtonGroup } from '../../ui/button-group/button-group.js';
import { showDialog } from '../../ui/dialog/dialog.js';
import { createAnimatedGradient } from '../../ui/animated-gradient/animated-gradient.js';
import { createSparkles } from '../../ui/sparkles/sparkles.js';
import { createSwitch } from '../../ui/switch/switch.js';

const PRESETS = Object.freeze([
  { id: 'light', label: 'Переміщення' },
  { id: 'storm', label: 'Обертання' },
  { id: 'dawn', label: 'Пульсація' },
]);

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
      const gradient = createAnimatedGradient({ text: 'pinguinV6', preset: 'dawn' });
      // Composition belongs to the demo; neither UI primitive imports the other.
      const sparkles = createSparkles({ visible: false });
      gradient.append(sparkles.element);
      const switcher = createButtonGroup({
        label: 'Тип руху градієнта',
        items: PRESETS,
        value: 'dawn',
        variant: 'connected',
        appearance: 'filled',
        shape: 'round',
        size: 'xs',
        selection: 'single',
        onChange: value => gradient.setPreset(value),
      });
      switcher.element.classList.add('pg-tools-gradient-preview__switch');
      const sparklesSwitch = createSwitch({
        label: 'Іскри',
        checked: false,
        onChange: value => sparkles.setVisible(value),
      });
      sparklesSwitch.element.classList.add('pg-tools-gradient-preview__sparkles');
      const controls = document.createElement('div');
      controls.className = 'pg-tools-gradient-preview__controls';
      controls.append(sparklesSwitch.element, switcher.element);
      const preview = document.createElement('div');
      preview.className = 'pg-tools-gradient-preview';
      preview.append(gradient, controls);
      // The shared Dialog manages focus, Escape, close and backdrop.
      void showDialog({
        title: 'Анімований градієнт',
        presentation: 'edge-to-edge',
        content: preview,
      }).finally(() => {
        switcher.destroy();
        sparklesSwitch.destroy();
        sparkles.destroy();
      });
    },
  });

  section.append(label, trigger);
  return section;
}
