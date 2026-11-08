/**
 * PINGUIN NEXT — TEXTAREA
 * Native multiline editing, independent autogrow, shared outlined label.
 */
import { createFieldFrame } from '../field/field.js';
import { createFieldSupport } from '../field/support.js';

let nextTextareaId = 0;

function positiveRows(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(name + ' must be a positive integer');
  return value;
}

export function createTextarea({
  label, id, name, value = '', placeholder = '', description = '', error = '',
  required = false, disabled = false, readOnly = false,
  rows = 3, minRows = rows, maxRows = 12, autoResize = true,
  maxLength, showCount = false, leading, trailing, onInput, onChange,
} = {}) {
  positiveRows(rows, 'rows');
  positiveRows(minRows, 'minRows');
  if (maxRows !== Infinity) positiveRows(maxRows, 'maxRows');
  if (maxRows < minRows) throw new RangeError('maxRows must not be smaller than minRows');
  if (maxLength !== undefined && (!Number.isInteger(maxLength) || maxLength < 0)) {
    throw new RangeError('maxLength must be a non-negative integer');
  }

  const uid = id || 'pg-textarea-' + (++nextTextareaId);
  const element = document.createElement('div');
  element.className = 'pg-textarea';
  const control = document.createElement('textarea');
  control.className = 'pg-textarea__control';
  control.rows = rows;
  control.value = String(value ?? '');
  control.placeholder = placeholder || ' ';
  control.required = Boolean(required);
  control.disabled = Boolean(disabled);
  control.readOnly = Boolean(readOnly);
  if (name !== undefined) control.name = String(name);
  if (maxLength !== undefined) control.maxLength = maxLength;

  const frame = createFieldFrame({ label, control, controlId: uid, leading, trailing });
  frame.field.classList.add('pg-textarea__field');
  frame.setDisabled(disabled);
  frame.setReadOnly(readOnly);
  const support = createFieldSupport({ id: uid, control, description, error });
  const meta = document.createElement('div');
  meta.className = 'pg-textarea__meta';
  meta.append(support.element);

  const counter = document.createElement('span');
  counter.className = 'pg-textarea__counter';
  if (showCount) {
    counter.id = uid + '-count';
    counter.setAttribute('aria-live', 'off');
    meta.append(counter);
  }
  element.append(frame.field, meta);
  const controller = new AbortController();
  let destroyed = false;
  let scheduledFrame = null;

  function syncCounter() {
    if (!showCount) return;
    const length = Array.from(control.value).length;
    counter.textContent = maxLength === undefined ? String(length) : length + ' / ' + maxLength;
  }
  function resize() {
    if (destroyed || !autoResize) return;
    if (!control.isConnected) {
      if (scheduledFrame === null) {
        scheduledFrame = requestAnimationFrame(() => {
          scheduledFrame = null;
          if (!destroyed && control.isConnected) resize();
        });
      }
      return;
    }
    const style = getComputedStyle(control);
    const lineHeight = parseFloat(style.lineHeight) || 21;
    const vertical = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
      + (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    const minimum = minRows * lineHeight + vertical;
    const maximum = maxRows === Infinity ? Infinity : maxRows * lineHeight + vertical;
    control.style.height = 'auto';
    const requiredHeight = Math.max(minimum, control.scrollHeight);
    control.style.height = Math.min(requiredHeight, maximum) + 'px';
    control.style.overflowY = requiredHeight > maximum ? 'auto' : 'hidden';
  }
  function sync() {
    frame.setFilled(control.value.length > 0);
    syncCounter();
    resize();
  }
  function setError(message = '') {
    support.setError(message);
    frame.setError(Boolean(message));
    element.dataset.pgState = message ? 'error' : disabled ? 'disabled' : 'ready';
  }
  control.addEventListener('input', event => {
    sync();
    onInput?.(control.value, event);
  }, { signal: controller.signal });
  control.addEventListener('change', event => {
    sync();
    onChange?.(control.value, event);
  }, { signal: controller.signal });
  control.addEventListener('focus', resize, { signal: controller.signal });

  element.dataset.pgAutoResize = String(Boolean(autoResize));
  sync();
  setError(error);
  return Object.freeze({
    element, textarea: control,
    getValue: () => control.value,
    setValue(next) { control.value = String(next ?? ''); sync(); },
    setError,
    focus() { control.focus(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.abort();
      if (scheduledFrame !== null) cancelAnimationFrame(scheduledFrame);
      element.remove();
    },
  });
}
