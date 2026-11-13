/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — THINKING PROGRESS                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює тонкий індикатор невизначеної обробки «Думання».             ║
 * ║ ЗАЛЕЖНОСТІ: Нативний DOM; thinking-progress.css через застосунок.                 ║
 * ║ ПУБЛІЧНИЙ API: createThinkingProgress({ label }) → { element, destroy }.          ║
 * ║ ПРИНЦИП: Без таймерів, відсотків, глобальних слухачів чи знання про Shell.       ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

export function createThinkingProgress({ label = 'Думання' } = {}) {
  if (typeof label !== 'string' || !label.trim()) {
    throw new TypeError('ThinkingProgress label must be a non-empty string');
  }

  const element = document.createElement('div');
  element.className = 'pg-thinking-progress';
  element.dataset.pgState = 'indeterminate';
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-label', label);

  const flow = document.createElement('span');
  flow.className = 'pg-thinking-progress__flow';
  flow.setAttribute('aria-hidden', 'true');
  element.append(flow);

  return Object.freeze({
    element,
    destroy() { element.remove(); },
  });
}
