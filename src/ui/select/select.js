/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SINGLE SELECT ADAPTER                                                                        ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Single-value API backed by the existing Pinguin Listbox.            ║
 * ║ ЗАЛЕЖНОСТІ: ../listbox/listbox.js                                                                       ║
 * ║ ПУБЛІЧНИЙ API: createSelect()                                                                       ║
 * ║ ПРИНЦИП: Ізольована поведінка, без зв'язків між features.                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createListbox } from '../listbox/listbox.js';

// Preserve the single-value contract; the Listbox owns the entire visual
// field, popup, selection, keyboard navigation and disposal.
function normalizeOptions(options, group = '') {
  if (!Array.isArray(options)) throw new TypeError('Select options must be an array');
  return options.flatMap(item => {
    if (!item || typeof item !== 'object') throw new TypeError('Invalid select option');
    if (Array.isArray(item.options)) {
      if (typeof item.label !== 'string') throw new TypeError('Option group needs a label');
      return normalizeOptions(item.options, group ? group + ' / ' + item.label : item.label);
    }
    if (typeof item.label !== 'string' || !['string', 'number'].includes(typeof item.value)) {
      throw new TypeError('Select options require a label and stable value');
    }
    return { label: group ? group + ' — ' + item.label : item.label,
      value: String(item.value), disabled: Boolean(item.disabled) };
  });
}

export function createSelect({
  label, name, id, options = [], value, placeholder = 'Оберіть значення',
  required = false, disabled = false, description = '', error = '', onChange,
} = {}) {
  let items = normalizeOptions(options);
  const resolve = next => {
    const requested = String(next ?? '');
    const match = items.find(item => item.value === requested && !item.disabled);
    return match ? [match.value] : placeholder === null
      ? items.filter(item => !item.disabled).slice(0, 1).map(item => item.value) : [];
  };
  const initial = resolve(value);
  const controller = new AbortController();
  // A non-interactive form proxy retains native constraint validation and
  // submission/reset without a native select or any additional visible field.
  const proxy = document.createElement('input');
  proxy.type = 'text';
  proxy.className = 'pg-select__form-value';
  proxy.tabIndex = -1;
  proxy.setAttribute('aria-hidden', 'true');
  proxy.autocomplete = 'off';
  if (name !== undefined) proxy.name = String(name);
  proxy.required = Boolean(required);
  proxy.disabled = Boolean(disabled);
  const listbox = createListbox({
    label, id, options: items, value: initial, multiple: false, searchable: false,
    placeholder: placeholder ?? '', required, disabled, description, error,
    onChange(values, event) {
      proxy.value = values[0] ?? '';
      onChange?.(proxy.value, event);
    },
  });
  const { element, trigger } = listbox;
  element.classList.add('pg-select');
  proxy.defaultValue = initial[0] ?? '';
  proxy.value = proxy.defaultValue;
  element.append(proxy);
  function setValue(next) {
    listbox.setValue(resolve(next));
    proxy.value = listbox.getValue()[0] ?? '';
    return proxy.value;
  }
  function setOptions(next, nextValue = proxy.value) {
    const normalized = normalizeOptions(next);
    listbox.setOptions(normalized);
    items = normalized;
    return setValue(nextValue);
  }
  proxy.addEventListener('invalid', event => {
    event.preventDefault();
    listbox.setError('Оберіть значення.');
    trigger.focus({ preventScroll: true });
  }, { signal: controller.signal });
  // Reset is dispatched on the owning form, not the child field.
  document.addEventListener('reset', event => {
    if (event.target !== proxy.form) return;
    queueMicrotask(() => {
      if (event.defaultPrevented || controller.signal.aborted) return;
      setValue(proxy.defaultValue);
      listbox.setError(error);
    });
  }, { signal: controller.signal });
  return Object.freeze({
    element, trigger, getValue: () => proxy.value,
    setValue, setOptions, setError: listbox.setError,
    open: listbox.open, close: listbox.close, focus: listbox.focus,
    destroy() { controller.abort(); listbox.destroy(); },
  });
}
