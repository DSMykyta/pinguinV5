/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT DEMO                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: CSS-градієнт і Aurora WebGL в одному спільному Dialog.            ║
 * ║ ЗАЛЕЖНОСТІ: Button, ButtonGroup, Dialog, AnimatedGradient, CloudGradient.          ║
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradientDemo().                                       ║
 * ║ ПРИНЦИП: Demo складає наявні UI, жодного унікального modal/button skin.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton } from '../../ui/button/button.js';
import { createButtonGroup } from '../../ui/button-group/button-group.js';
import { showDialog } from '../../ui/dialog/dialog.js';
import { createAnimatedGradient } from '../../ui/animated-gradient/animated-gradient.js';
import { createCloudGradient } from '../../ui/cloud-gradient/cloud-gradient.js';
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
      const gradient = createAnimatedGradient({ text: 'pinguinV6', preset: 'light' });
      // Composition belongs to the demo; neither UI primitive imports the other.
      const sparkles = createSparkles({ visible: false });
      gradient.append(sparkles.element);
      const switcher = createButtonGroup({
        label: 'Тип руху градієнта',
        items: PRESETS,
        value: 'light',
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

  // A second preview reuses the SAME CloudGradient already used by login-demo.
  // Keep the three established CSS movement modes and their dialog untouched.
  const auroraTrigger = document.createElement('button');
  auroraTrigger.type = 'button';
  auroraTrigger.className = 'pg-button pg-button--primary';
  auroraTrigger.dataset.pgAction = 'aurora-gradient-demo';
  auroraTrigger.textContent = 'Aurora';
  auroraTrigger.setAttribute('aria-label', 'Відкрити триколірну Aurora');

  auroraTrigger.addEventListener('click', () => {
    const cloud = createCloudGradient({ variant: 'aurora' });
    const preview = document.createElement('div');
    preview.className = 'pg-tools-gradient-preview';
    cloud.element.classList.add('pg-tools-gradient-preview__aurora');

    // Reuse the existing AnimatedGradient typography; never render the CSS
    // animation underneath WebGL and never create a second modal system.
    const titleArea = document.createElement('div');
    titleArea.className = 'pg-tools-gradient-preview__aurora-title';
    const title = document.createElement('p');
    title.className = 'pg-animated-gradient__title';
    title.textContent = 'pinguinV6';
    titleArea.append(title);
    preview.append(cloud.element, titleArea);

    const closed = showDialog({
      title: 'Aurora — триколірний градієнт',
      presentation: 'edge-to-edge',
      content: preview,
    });
    // showDialog inserts the content synchronously for this user-initiated
    // demo. WebGL is created ONLY after insertion, then released on close.
    cloud.mount();
    void closed.finally(() => cloud.destroy());
  });

  section.append(label, trigger, auroraTrigger);
  return section;
}
