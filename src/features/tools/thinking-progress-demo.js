/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — THINKING PROGRESS DEMO                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Показує «Думання» у демо вкладки «Таблиці».                         ║
 * ║ ЗАЛЕЖНОСТІ: Спільний src/ui/thinking-progress.                                   ║
 * ║ ПУБЛІЧНИЙ API: createThinkingProgressDemo() → { element, destroy }.              ║
 * ║ ПРИНЦИП: Демо володіє тільки підписами та розміщенням готового індикатора.       ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createThinkingProgress } from '../../ui/thinking-progress/thinking-progress.js';

export function createThinkingProgressDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-thinking-progress-demo';
  element.setAttribute('aria-label', 'Демонстрація індикатора «Думання»');

  const title = document.createElement('h3');
  title.textContent = 'Думання';
  const description = document.createElement('p');
  description.className = 'pg-tools-thinking-progress-demo__description';
  description.textContent = 'Безперервний індикатор обробки без визначеного відсотка.';

  const progress = createThinkingProgress();
  element.append(title, description, progress.element);

  return Object.freeze({
    element,
    destroy() {
      progress.destroy();
      element.remove();
    },
  });
}
