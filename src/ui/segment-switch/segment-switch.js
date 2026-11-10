/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LEGACY-INSPIRED SEGMENTED SWITCH                                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Native radios, one animated selection plate and per-instance state.                    ║
 * ║ ЗАЛЕЖНОСТІ: ../icon/icon.js                                                                         ║
 * ║ ПУБЛІЧНИЙ API: createSegmentSwitch()                                                                ║
 * ║ ПРИНЦИП: Variants: filled, outline, compact, fit; no global registry or synthetic clicks.           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

let sequence = 0;
export function createSegmentSwitch({
  label, options, value, variant = 'filled', compact = false, fit = false,
  disabled = false, onChange,
} = {}) {
  if (!label || typeof label !== 'string') throw new TypeError('Switch label is required');
  if (!Array.isArray(options) || options.length < 2 || options.length > 6 ||
      options.some(item => !item || typeof item.value !== 'string' ||
        typeof item.label !== 'string' || !item.value || !item.label) ||
      new Set(options.map(item => item.value)).size !== options.length ||
      !['filled', 'outline'].includes(variant)) {
    throw new TypeError('Switch requires 2–6 unique options and a supported variant');
  }
  const values = new Set(options.map(item => item.value));
  const initial = value ?? options[0].value;
  if (!values.has(initial)) throw new RangeError('Initial switch value is unsupported');
  const root = document.createElement('div');
  root.className = 'pg-segment-switch';
  root.dataset.pgVariant = variant;
  root.dataset.pgCompact = String(Boolean(compact));
  root.dataset.pgFit = String(Boolean(fit));
  root.style.setProperty('--pg-switch-count', String(options.length));
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', label);

  const plate = document.createElement('span');
  plate.className = 'pg-segment-switch__plate';
  plate.setAttribute('aria-hidden', 'true');
  root.append(plate);
  const controller = new AbortController();
  let current = initial;
  const radios = [];
  for (const [index, item] of options.entries()) {
    const id = 'pg-segment-switch-' + (++sequence);
    const radio = document.createElement('input');
    radio.className = 'pg-segment-switch__radio';
    radio.type = 'radio';
    radio.name = 'pg-segment-switch-group-' + (sequence - index);
    radio.id = id;
    radio.value = item.value;
    radio.setAttribute('aria-label',item.label);
    radio.disabled = Boolean(disabled || item.disabled);
    radio.checked = item.value === current;
    const optionLabel = document.createElement('label');
    optionLabel.className = 'pg-segment-switch__label';
    optionLabel.htmlFor = id;
    optionLabel.title = item.label;
    optionLabel.setAttribute('aria-label', item.label);
    if (item.icon) {
      const icon = createIcon(item.icon);
      icon.setAttribute('aria-hidden', 'true');
      optionLabel.append(icon);
    }
    if (!item.iconOnly) {
      const text = document.createElement('span');
      text.textContent = item.label;
      optionLabel.append(text);
    }
    radio.addEventListener('change', event => {
      if (!radio.checked || radio.disabled || current === radio.value) return;
      current = radio.value;
      sync();
      onChange?.(current, event);
    }, { signal: controller.signal });
    radios.push(radio);
    root.append(radio, optionLabel);
  }
  // Radios must share the same group; a unique name separates switch instances.
  const name = 'pg-segment-switch-' + (++sequence);
  radios.forEach(radio => { radio.name = name; });

  function sync() {
    const position = options.findIndex(item => item.value === current);
    root.style.setProperty('--pg-switch-index', String(position));
    root.dataset.pgValue = current;
    radios.forEach(radio => { radio.checked = radio.value === current; });
  }
  function setValue(next) {
    if (!values.has(next)) throw new RangeError('Unknown switch value');
    const radio = radios.find(input => input.value === next);
    if (radio.disabled) return false;
    current = next;
    sync();
    return true;
  }
  function setDisabled(next) {
    root.dataset.pgDisabled = String(Boolean(next));
    radios.forEach((radio, i) => {
      radio.disabled = Boolean(next || options[i].disabled);
    });
  }
  setDisabled(disabled);
  sync();
  return Object.freeze({
    element: root,
    getValue: () => current,
    setValue, setDisabled,
    focus() { radios.find(radio => radio.checked)?.focus(); },
    destroy() { controller.abort(); root.remove(); },
  });
}
