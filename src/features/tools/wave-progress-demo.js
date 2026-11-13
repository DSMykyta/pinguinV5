/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — WAVE PROGRESS DEMO                                                   ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Живий приклад хвилястого прогресу у вкладці «Таблиці».                ║
 * ║ ЗАЛЕЖНОСТІ: src/ui/wave-progress і спільний src/ui/slider.                          ║
 * ║ ПУБЛІЧНИЙ API: createWaveProgressDemo().                                            ║
 * ║ ПРИНЦИП: Імітація належить тільки demo, індикатор не знає про таймери.             ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createWaveProgress } from '../../ui/wave-progress/wave-progress.js';
import { createSlider } from '../../ui/slider/slider.js';

export function createWaveProgressDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-wave-demo';
  element.setAttribute('aria-label', 'Демонстрація хвилястого прогресу');

  const title = document.createElement('h3');
  title.textContent = 'Хвилясте завантаження';
  const description = document.createElement('p');
  description.className = 'pg-tools-wave-demo__description';
  description.textContent = 'Рухайте повзунок або запустіть демонстраційне завантаження.';

  const known = createWaveProgress({ value: 61, label: 'Демонстраційний прогрес' });
  const unknown = createWaveProgress({ value: null, label: 'Завантаження без визначеного відсотка' });

  const knownHeading = document.createElement('div');
  knownHeading.className = 'pg-tools-wave-demo__heading';
  const knownLabel = document.createElement('span');
  knownLabel.textContent = 'Відомий прогрес';
  const percent = document.createElement('output');
  percent.className = 'pg-tools-wave-demo__percent';
  percent.textContent = '61%';
  knownHeading.append(knownLabel, percent);

  const unknownHeading = document.createElement('div');
  unknownHeading.className = 'pg-tools-wave-demo__heading';
  unknownHeading.textContent = 'Невизначене завантаження';

  let frame = null;
  let startTime = null;
  let destroyed = false;
  function stopAnimation() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    startTime = null;
  }

  const slider = createSlider({
    label: 'Прогрес',
    min: 0, max: 100, step: 1, value: 61,
    formatValue: value => value + '%',
    onInput(value) {
      stopAnimation();
      update(value);
    },
  });
  function update(value) {
    known.setValue(value);
    percent.textContent = Math.round(value) + '%';
    slider.setValue(value);
  }

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'pg-button pg-button--secondary';
  replay.dataset.pgAction = 'wave-progress-demo-play';
  replay.textContent = 'Відтворити завантаження';

  const duration = 3600;
  function animate(now) {
    if (destroyed || !element.isConnected) {
      stopAnimation();
      return;
    }
    if (startTime === null) startTime = now;
    const value = Math.min(100, Math.floor((now - startTime) / duration * 100));
    update(value);
    if (value < 100) frame = requestAnimationFrame(animate);
    else stopAnimation();
  }
  replay.addEventListener('click', () => {
    stopAnimation();
    update(0);
    frame = requestAnimationFrame(animate);
  });

  const sliderSlot = document.createElement('div');
  sliderSlot.className = 'pg-tools-wave-demo__slider';
  sliderSlot.append(slider.element);
  const actionSlot = document.createElement('div');
  actionSlot.className = 'pg-tools-wave-demo__actions';
  actionSlot.append(replay);

  element.append(title, description, knownHeading, known.element, sliderSlot,
    actionSlot, unknownHeading, unknown.element);

  return Object.freeze({
    element,
    destroy() {
      destroyed = true;
      stopAnimation();
      slider.destroy();
      known.destroy();
      unknown.destroy();
      element.remove();
    },
  });
}
