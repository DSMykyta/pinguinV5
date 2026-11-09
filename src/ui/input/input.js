/**
 * PINGUIN NEXT — SHARED INPUT
 * All variants use one permanent-label frame; search only adds an icon.
 * Supports DOM adornments on either side of the editable region.
 */
import { createIcon } from '../icon/icon.js';
import { createFieldFrame } from '../field/field.js';

const VARIANTS = new Set(['floating', 'standard', 'search']);
const INPUT_TYPES = new Set(['text', 'email', 'password', 'tel', 'url']);
let nextInputId = 0;

export function createInput({
  label, id, name, variant = 'floating', type = 'text',
  value = '', placeholder = '', description = '', error = '',
  required = false, disabled = false, readOnly = false,
  autocomplete, inputMode, clearable, leading, trailing, onInput, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Input label must be a non-empty string');
  if (!VARIANTS.has(variant)) throw new TypeError('Unknown input variant: ' + variant);
  if (variant !== 'search' && !INPUT_TYPES.has(type)) throw new TypeError('Unsupported input type: ' + type);

  const inputId = id || 'pg-input-' + (++nextInputId);
  const element = document.createElement('div');
  element.className = 'pg-input pg-input--' + variant;
  element.dataset.pgState = disabled ? 'disabled' : 'ready';

  const input = document.createElement('input');
  input.className = 'pg-input__control';
  input.type = variant === 'search' ? 'search' : type;
  if (name !== undefined) input.name = name;
  input.value = String(value ?? '');
  input.placeholder = typeof placeholder === 'string' && placeholder ? placeholder : ' ';
  input.required = Boolean(required);
  input.disabled = Boolean(disabled);
  input.readOnly = Boolean(readOnly);
  if (autocomplete !== undefined) input.autocomplete = autocomplete;
  if (inputMode !== undefined) input.inputMode = inputMode;

  const addons = [];
  if (variant === 'search') {
    const icon = document.createElement('span');
    icon.className = 'pg-input__leading-icon';
    icon.append(createIcon('search'));
    addons.push(icon);
  }
  if (leading != null) addons.push(...(Array.isArray(leading) ? leading : [leading]));

  const shouldClear = clearable === undefined ? variant === 'search' : Boolean(clearable);
  let clearButton = null;
  const suffixes = [];
  if (trailing != null) suffixes.push(...(Array.isArray(trailing) ? trailing : [trailing]));
  if (shouldClear) {
    clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'pg-input__clear';
    clearButton.dataset.pgAction = 'input-clear';
    clearButton.setAttribute('aria-label', 'Очистити поле ' + label);
    clearButton.append(createIcon('x'));
    suffixes.push(clearButton);
  }
  // All variants share the exact same frame/label layout; search only adds an icon.
  const frame = createFieldFrame({
    label, control: input, controlId: inputId,
    leading: addons, trailing: suffixes,
  });
  frame.field.classList.add('pg-input__field');
  frame.label.classList.add('pg-input__label');
  element.append(frame.field);

  const support = document.createElement('div');
  support.className = 'pg-input__support';
  const descriptionElement = document.createElement('span');
  descriptionElement.className = 'pg-input__description';
  descriptionElement.id = inputId + '-description';
  descriptionElement.textContent = String(description ?? '');
  descriptionElement.hidden = !descriptionElement.textContent;
  const errorElement = document.createElement('span');
  errorElement.className = 'pg-input__error';
  errorElement.id = inputId + '-error';
  errorElement.setAttribute('role', 'status');
  errorElement.hidden = true;
  support.append(descriptionElement, errorElement);
  element.append(support);
  const controller = new AbortController();

  function updateDescribedBy() {
    const ids = [];
    if (!descriptionElement.hidden) ids.push(descriptionElement.id);
    if (!errorElement.hidden) ids.push(errorElement.id);
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
    support.hidden = ids.length === 0;
  }
  function syncValue() {
    const filled = input.value.length > 0;
    element.dataset.pgFilled = String(filled);
    frame.setFilled(filled);
    if (clearButton) clearButton.hidden = !filled || input.disabled || input.readOnly;
  }
  function setError(message = '') {
    errorElement.textContent = String(message ?? '');
    errorElement.hidden = !errorElement.textContent;
    if (errorElement.hidden) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    element.dataset.pgState = disabled ? 'disabled' : errorElement.hidden ? 'ready' : 'error';
    frame.setError(!errorElement.hidden);
    updateDescribedBy();
  }
  function handleInput(event) {
    syncValue();
    if (typeof onInput === 'function') onInput(input.value, event);
  }
  function handleChange(event) {
    syncValue();
    if (typeof onChange === 'function') onChange(input.value, event);
  }
  function handleClear() {
    if (input.disabled || input.readOnly || !input.value) return;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  }
  input.addEventListener('input', handleInput, { signal: controller.signal });
  input.addEventListener('change', handleChange, { signal: controller.signal });
  clearButton?.addEventListener('click', handleClear, { signal: controller.signal });
  frame.setDisabled(disabled);
  frame.setReadOnly(readOnly);
  syncValue();
  setError(error);

  return Object.freeze({
    element, input, leadingSlot: frame.leadingSlot, trailingSlot: frame.trailingSlot,
    getValue: () => input.value,
    setValue(nextValue) {
      input.value = String(nextValue ?? '');
      syncValue();
    },
    setError,
    focus: () => input.focus(),
    destroy() { controller.abort(); frame.destroy(); element.remove(); },
  });
}
