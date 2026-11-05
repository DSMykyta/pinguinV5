/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED INPUT                                                            ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Доступне текстове поле з floating, standard та search варіантами.        ║
 * ║ ЗАЛЕЖНОСТІ: UI icon; native HTML input і label.                                       ║
 * ║ ПУБЛІЧНИЙ API: createInput(options).                                                  ║
 * ║ ПРИНЦИП: Єдине джерело значення — native input.value; без глобального стану.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

const VARIANTS = new Set(['floating', 'standard', 'search']);
const INPUT_TYPES = new Set(['text', 'email', 'password', 'tel', 'url']);
let nextInputId = 0;

/**
 * Create a text field. The label is mandatory even when the search variant
 * hides its visual presentation. onInput/onChange receive (value, nativeEvent).
 */
export function createInput({
  label,
  id,
  name,
  variant = 'floating',
  type = 'text',
  value = '',
  placeholder = '',
  description = '',
  error = '',
  required = false,
  disabled = false,
  readOnly = false,
  autocomplete,
  inputMode,
  clearable,
  onInput,
  onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) {
    throw new TypeError('Input label must be a non-empty string');
  }
  if (!VARIANTS.has(variant)) {
    throw new TypeError('Unknown input variant: ' + variant);
  }
  if (variant !== 'search' && !INPUT_TYPES.has(type)) {
    throw new TypeError('Unsupported input type: ' + type);
  }

  const inputId = id || 'pg-input-' + (++nextInputId);
  const element = document.createElement('div');
  element.className = 'pg-input pg-input--' + variant;
  element.dataset.pgState = disabled ? 'disabled' : 'ready';

  const field = document.createElement('div');
  field.className = 'pg-input__field';

  const input = document.createElement('input');
  input.className = 'pg-input__control';
  input.type = variant === 'search' ? 'search' : type;
  input.id = inputId;
  if (name !== undefined) input.name = name;
  input.value = String(value ?? '');
  // A whitespace placeholder makes :placeholder-shown reliable even without visible hint.
  input.placeholder = typeof placeholder === 'string' && placeholder ? placeholder : ' ';
  input.required = Boolean(required);
  input.disabled = Boolean(disabled);
  input.readOnly = Boolean(readOnly);
  if (autocomplete !== undefined) input.autocomplete = autocomplete;
  if (inputMode !== undefined) input.inputMode = inputMode;

  const caption = document.createElement('label');
  caption.className = 'pg-input__label';
  caption.htmlFor = inputId;
  caption.textContent = label;

  if (variant === 'search') {
    const leadingIcon = document.createElement('span');
    leadingIcon.className = 'pg-input__leading-icon';
    leadingIcon.append(createIcon('search'));
    field.append(leadingIcon);
    element.append(caption);
  } else if (variant === 'standard') {
    element.append(caption);
  }

  field.append(input);
  if (variant === 'floating') field.append(caption);

  const shouldClear = clearable === undefined ? variant === 'search' : Boolean(clearable);
  let clearButton = null;
  if (shouldClear) {
    clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'pg-input__clear';
    clearButton.dataset.pgAction = 'input-clear';
    clearButton.setAttribute('aria-label', 'Очистити поле ' + label);
    clearButton.append(createIcon('x'));
    field.append(clearButton);
  }

  element.append(field);

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
  errorElement.textContent = '';
  errorElement.hidden = true;
  support.append(descriptionElement, errorElement);
  element.append(support);

  function updateDescribedBy() {
    const ids = [];
    if (!descriptionElement.hidden) ids.push(descriptionElement.id);
    if (!errorElement.hidden) ids.push(errorElement.id);
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
    support.hidden = ids.length === 0;
  }

  function updateFilledState() {
    element.dataset.pgFilled = String(input.value.length > 0);
  }

  function setError(message = '') {
    errorElement.textContent = String(message ?? '');
    errorElement.hidden = !errorElement.textContent;
    if (errorElement.hidden) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    element.dataset.pgState = disabled ? 'disabled' : errorElement.hidden ? 'ready' : 'error';
    updateDescribedBy();
  }

  function handleInput(event) {
    updateFilledState();
    if (typeof onInput === 'function') onInput(input.value, event);
  }

  function handleChange(event) {
    updateFilledState();
    if (typeof onChange === 'function') onChange(input.value, event);
  }

  function handleClear() {
    if (input.disabled || input.readOnly || !input.value) return;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  }

  input.addEventListener('input', handleInput);
  input.addEventListener('change', handleChange);
  if (clearButton) clearButton.addEventListener('click', handleClear);
  updateFilledState();
  setError(error);

  return Object.freeze({
    element,
    input,
    getValue() {
      return input.value;
    },
    setValue(nextValue) {
      input.value = String(nextValue ?? '');
      updateFilledState();
    },
    setError,
    focus() {
      input.focus();
    },
    destroy() {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('change', handleChange);
      if (clearButton) clearButton.removeEventListener('click', handleClear);
      element.remove();
    },
  });
}
