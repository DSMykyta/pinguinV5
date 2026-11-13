/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — WAVE PROGRESS                                                        ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Хвилястий progressbar для відомого та невизначеного прогресу.          ║
 * ║ ЗАЛЕЖНОСТІ: Нативні DOM API; стилі wave-progress.css через застосунок.             ║
 * ║ ПУБЛІЧНИЙ API: createWaveProgress({ value, label }).                               ║
 * ║ ПРИНЦИП: Зовнішній власник подає прогрес; жодних таймерів, кнопок чи Shell.        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

/** No local timers or duplicate progress state; null means indeterminate. */
export function createWaveProgress({ value = null, label = 'Завантаження' } = {}) {
  if (typeof label !== 'string' || !label.trim()) {
    throw new TypeError('WaveProgress label must be a non-empty string');
  }
  const element = document.createElement('div');
  element.className = 'pg-wave-progress';
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-label', label);
  element.setAttribute('aria-valuemin', '0');
  element.setAttribute('aria-valuemax', '100');

  const wave = document.createElement('span');
  wave.className = 'pg-wave-progress__wave';
  wave.setAttribute('aria-hidden', 'true');
  const rest = document.createElement('span');
  rest.className = 'pg-wave-progress__rest';
  rest.setAttribute('aria-hidden', 'true');
  element.append(wave, rest);

  let current = null;
  function setValue(next) {
    if (next === null) {
      current = null;
      element.dataset.pgState = 'indeterminate';
      element.style.removeProperty('--pg-wave-progress-width');
      element.removeAttribute('aria-valuenow');
      return;
    }
    if (typeof next !== 'number' || !Number.isFinite(next)) {
      throw new TypeError('WaveProgress value must be a finite number or null');
    }
    current = Math.min(100, Math.max(0, next));
    element.dataset.pgState = current === 0 ? 'empty' :
      current === 100 ? 'complete' : 'determinate';
    element.style.setProperty('--pg-wave-progress-width', current + '%');
    element.setAttribute('aria-valuenow', String(current));
  }
  setValue(value);

  return Object.freeze({
    element, setValue,
    getValue: () => current,
    destroy() { element.remove(); },
  });
}
