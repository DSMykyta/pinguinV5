/**
 * PINGUIN NEXT — NUMBER FIELD
 * Native numeric spinbutton with optional accessible step controls.
 * No custom number parser, value coercion or duplicate keyboard handler.
 */
import { createFieldFrame } from '../field/field.js';
import { createFieldSupport } from '../field/support.js';

let nextNumberId = 0;

export function createNumberField({
  label, id, name, value = null, min, max, step = 1, unit = '',
  leading, trailing, showSteppers = true, required = false,
  disabled = false, readOnly = false, description = '', error = '',
  onInput, onChange,
} = {}) {
  if (step !== 'any' && (!Number.isFinite(step) || step <= 0)) {
    throw new RangeError('Number Field step must be positive or any');
  }
  if (min !== undefined && !Number.isFinite(min) || max !== undefined && !Number.isFinite(max)) {
    throw new TypeError('Number Field bounds must be finite numbers');
  }
  if (min !== undefined && max !== undefined && min > max) {
    throw new RangeError('min must not exceed max');
  }
  const uid = id || 'pg-number-field-' + (++nextNumberId);
  const element = document.createElement('div');
  element.className = 'pg-number-field';
  const input = document.createElement('input');
  input.className = 'pg-number-field__control';
  input.type = 'number';
  input.inputMode = 'decimal';
  input.placeholder = ' ';
  if (name !== undefined) input.name = String(name);
  input.disabled = Boolean(disabled);
  input.readOnly = Boolean(readOnly);
  input.required = Boolean(required);
  input.step = String(step);
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  input.value = value === null || value === undefined ? '' : String(value);

  const postfix = [];
  if (unit) {
    const unitNode = document.createElement('span');
    unitNode.className = 'pg-number-field__unit';
    unitNode.textContent = String(unit);
    postfix.push(unitNode);
  }
  if (trailing != null) postfix.push(...(Array.isArray(trailing) ? trailing : [trailing]));
  let decrement = null;
  let increment = null;
  if (showSteppers && step !== 'any') {
    const steps = document.createElement('div');
    steps.className = 'pg-number-field__steppers';
    decrement = document.createElement('button');
    increment = document.createElement('button');
    decrement.type = increment.type = 'button';
    decrement.className = increment.className = 'pg-number-field__step';
    decrement.textContent = '−';
    increment.textContent = '+';
    decrement.setAttribute('aria-label', 'Зменшити ' + label);
    increment.setAttribute('aria-label', 'Збільшити ' + label);
    steps.append(decrement, increment);
    postfix.push(steps);
  }
  const frame = createFieldFrame({
    label, control: input, controlId: uid, leading, trailing: postfix,
  });
  frame.field.classList.add('pg-number-field__field');
  frame.setDisabled(disabled);
  frame.setReadOnly(readOnly);
  const support = createFieldSupport({ id: uid, control: input, description, error });
  element.append(frame.field, support.element);
  const controller = new AbortController();

  function getValue() {
    return input.value && Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : null;
  }
  function sync() {
    frame.setFilled(input.value !== '');
    const number = getValue();
    if (decrement) decrement.disabled = Boolean(disabled || readOnly || number !== null && min !== undefined && number <= min);
    if (increment) increment.disabled = Boolean(disabled || readOnly || number !== null && max !== undefined && number >= max);
  }
  function setError(message = '') {
    support.setError(message);
    frame.setError(Boolean(message));
    element.dataset.pgState = message ? 'error' : disabled ? 'disabled' : 'ready';
  }
  function stepBy(direction) {
    if (input.disabled || input.readOnly) return;
    const before = input.value;
    try {
      if (direction > 0) input.stepUp();
      else input.stepDown();
    } catch {
      return; // Native input handles invalid step/bounds; never fabricate a value.
    }
    if (before !== input.value) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    input.focus();
  }
  input.addEventListener('input', event => { sync(); onInput?.(getValue(), event); }, { signal: controller.signal });
  input.addEventListener('change', event => { sync(); onChange?.(getValue(), event); }, { signal: controller.signal });
  decrement?.addEventListener('click', () => stepBy(-1), { signal: controller.signal });
  increment?.addEventListener('click', () => stepBy(1), { signal: controller.signal });

  sync();
  setError(error);
  return Object.freeze({
    element, input, getValue, getRawValue: () => input.value,
    setValue(next) { input.value = next == null ? '' : String(next); sync(); },
    setError, focus() { input.focus(); },
    destroy() { controller.abort(); frame.destroy(); element.remove(); },
  });
}
