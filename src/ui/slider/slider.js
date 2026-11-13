/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SLIDER                                                    ║
 * ╠════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Нативний range із геометрією стандартного Material 3.        ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні DOM API; стилі slider.css підключає застосунок.     ║
 * ║ ПУБЛІЧНИЙ API: createSlider().                                           ║
 * ║ ПРИНЦИП: Значення належить input; жести й клавіатуру обробляє браузер.    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

let nextSliderId = 0;

export function createSlider({
  label, id, name, description = '', min = 0, max = 100, step = 1,
  value = min, disabled = false, formatValue = String, onInput, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Slider label is required');
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(max - min)) {
    throw new RangeError('Slider requires finite min < max');
  }
  if (step !== 'any' && (!Number.isFinite(step) || step <= 0)) {
    throw new RangeError('Slider step must be positive or any');
  }
  if (!Number.isFinite(value)) throw new TypeError('Slider value must be finite');
  if (typeof formatValue !== 'function') throw new TypeError('Slider formatValue must be a function');

  const uid = id || 'pg-slider-' + (++nextSliderId);
  const element = document.createElement('div');
  element.className = 'pg-slider';
  const header = document.createElement('div');
  header.className = 'pg-slider__header';
  const text = document.createElement('label');
  text.className = 'pg-slider__label';
  text.htmlFor = uid;
  text.textContent = label;
  const output = document.createElement('output');
  output.className = 'pg-slider__value';
  output.htmlFor = uid;
  output.setAttribute('aria-live', 'off');
  header.append(text, output);

  const control = document.createElement('div');
  control.className = 'pg-slider__control';
  const rail = document.createElement('div');
  rail.className = 'pg-slider__rail';
  rail.setAttribute('aria-hidden', 'true');
  for (const part of ['active', 'inactive', 'handle']) {
    const decoration = document.createElement('span');
    decoration.className = 'pg-slider__' + part;
    rail.append(decoration);
  }
  const input = document.createElement('input');
  input.className = 'pg-slider__input';
  input.id = uid;
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.defaultValue = String(value);
  input.value = String(value);
  input.disabled = Boolean(disabled);
  if (name !== undefined) input.name = String(name);
  control.append(rail, input);
  element.append(header, control);
  if (description) {
    const detail = document.createElement('span');
    detail.className = 'pg-slider__description';
    detail.id = uid + '-description';
    detail.textContent = String(description);
    input.setAttribute('aria-describedby', detail.id);
    element.append(detail);
  }

  const controller = new AbortController();
  const options = { signal: controller.signal };
  let pointerId = null;
  let disposed = false;

  function sync() {
    const current = input.valueAsNumber;
    const formatted = String(formatValue(current));
    rail.style.setProperty('--pg-slider-position', ((current - min) / (max - min) * 100) + '%');
    output.value = formatted;
    input.setAttribute('aria-valuetext', formatted);
    element.dataset.pgEdge = current <= min ? 'start' : current >= max ? 'end' : 'middle';
    element.dataset.pgState = input.disabled ? 'disabled' : 'ready';
  }
  function release() {
    pointerId = null;
    delete element.dataset.pgPressed;
  }
  input.addEventListener('input', event => {
    sync();
    onInput?.(input.valueAsNumber, event);
  }, options);
  input.addEventListener('change', event => {
    sync();
    onChange?.(input.valueAsNumber, event);
  }, options);
  input.addEventListener('pointerdown', event => {
    if (input.disabled || pointerId !== null || !event.isPrimary || event.button !== 0) return;
    pointerId = event.pointerId;
    element.dataset.pgPressed = 'true';
  }, options);
  for (const type of ['pointerup', 'pointercancel']) {
    input.ownerDocument.addEventListener(type, event => {
      if (event.pointerId === pointerId) release();
    }, { ...options, capture: true });
  }
  input.addEventListener('blur', release, options);
  input.ownerDocument.defaultView.addEventListener('blur', release, options);
  // A form may be assigned after creation, so resolve input.form at reset time.
  input.ownerDocument.addEventListener('reset', event => {
    if (event.target !== input.form) return;
    queueMicrotask(() => {
      if (!disposed && !event.defaultPrevented) { release(); sync(); }
    });
  }, { ...options, capture: true });

  sync();
  return Object.freeze({
    element, input,
    getValue: () => input.valueAsNumber,
    setValue(next) {
      if (!Number.isFinite(next)) throw new TypeError('Slider value must be finite');
      input.value = String(next);
      sync();
    },
    setDisabled(next) {
      input.disabled = Boolean(next);
      release();
      sync();
    },
    focus() { input.focus(); },
    destroy() {
      disposed = true;
      release();
      controller.abort();
      element.remove();
    },
  });
}
