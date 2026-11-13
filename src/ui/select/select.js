/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — NATIVE SELECT                                                                        ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Platform selection with the same outlined floating label as Input/Combobox.            ║
 * ║ ЗАЛЕЖНОСТІ: ../field/field.js                                                                       ║
 * ║ ПУБЛІЧНИЙ API: createSelect()                                                                       ║
 * ║ ПРИНЦИП: Ізольована поведінка, без зв'язків між features.                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createFieldFrame } from '../field/field.js';
let nextSelectId = 0;

function normalizedOptions(options) {
  if (!Array.isArray(options)) throw new TypeError('Select options must be an array');
  return options.map(item => {
    if (!item || typeof item !== 'object') throw new TypeError('Invalid select option');
    if (Array.isArray(item.options)) {
      if (typeof item.label !== 'string') throw new TypeError('Option group needs a label');
      return { label: item.label, options: normalizedOptions(item.options) };
    }
    if (typeof item.label !== 'string' || !['string', 'number'].includes(typeof item.value)) {
      throw new TypeError('Select options require a label and stable value');
    }
    return { label: item.label, value: String(item.value), disabled: Boolean(item.disabled) };
  });
}

export function createSelect({
  label, name, id, options = [], value, placeholder = 'Оберіть значення',
  required = false, disabled = false, description = '', error = '', onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Select label is required');
  const uid = id || 'pg-select-' + (++nextSelectId);
  const element = document.createElement('div');
  element.className = 'pg-select';
  // Shared feedback geometry is owned by Field rather than this component.
  element.classList.add('pg-field-layout');

  const control = document.createElement('select');
  control.className = 'pg-select__control';
  if (name !== undefined) control.name = String(name);
  control.required = Boolean(required);
  control.disabled = Boolean(disabled);

  const frame = createFieldFrame({ label, control, controlId: uid, trailing: 'caret' });
  frame.field.classList.add('pg-select__field');
  frame.label.classList.add('pg-select__label');

  const support = document.createElement('div');
  support.className = 'pg-select__support';
  const detail = document.createElement('span');
  detail.id = uid + '-description';
  detail.textContent = String(description || '');
  detail.hidden = !detail.textContent;
  const problem = document.createElement('span');
  problem.id = uid + '-error';
  problem.className = 'pg-select__error';
  problem.setAttribute('role', 'status');
  problem.hidden = true;
  support.append(detail, problem);
  element.append(frame.field, support);

  function syncA11y() {
    const ids = [!detail.hidden && detail.id, !problem.hidden && problem.id].filter(Boolean);
    if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
    else control.removeAttribute('aria-describedby');
    support.hidden = ids.length === 0;
    if (problem.hidden) control.removeAttribute('aria-invalid');
    else control.setAttribute('aria-invalid', 'true');
  }
  function syncValue() {
    frame.setFilled(control.value !== '');
    element.dataset.pgFilled = String(control.value !== '');
  }
  function setError(message = '') {
    problem.textContent = String(message || '');
    problem.hidden = !problem.textContent;
    element.dataset.pgState = problem.hidden ? 'ready' : 'error';
    frame.setError(!problem.hidden);
    syncA11y();
  }
  function appendOptions(target, items) {
    for (const item of items) {
      if (item.options) {
        const group = document.createElement('optgroup');
        group.label = item.label;
        appendOptions(group, item.options);
        target.append(group);
      } else {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        option.disabled = item.disabled;
        target.append(option);
      }
    }
  }
  function setValue(nextValue) {
    const requested = String(nextValue ?? '');
    const match = Array.from(control.options).find(item => item.value === requested && !item.disabled);
    control.value = match ? requested : '';
    if (!match && placeholder === null) {
      const first = Array.from(control.options).find(item => !item.disabled);
      if (first) control.value = first.value;
    }
    syncValue();
    return control.value;
  }
  function setOptions(items, nextValue = control.value) {
    const normalized = normalizedOptions(items);
    control.replaceChildren();
    if (placeholder !== null) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = String(placeholder);
      option.disabled = true;
      control.append(option);
    }
    appendOptions(control, normalized);
    if (nextValue !== undefined && nextValue !== null) setValue(nextValue);
    else if (placeholder !== null) { control.value = ''; syncValue(); }
    else setValue(null);
    return control.value;
  }
  function handleChange(event) {
    syncValue();
    onChange?.(control.value, event);
  }
  control.addEventListener('change', handleChange);
  frame.setDisabled(disabled);
  setOptions(options, value);
  setError(error);
  return Object.freeze({
    element, select: control, getValue: () => control.value,
    setValue, setOptions, setError, focus: () => control.focus(),
    destroy() { control.removeEventListener('change', handleChange); frame.destroy(); element.remove(); },
  });
}
