/**
 * PINGUIN NEXT — NATIVE CHECKBOX
 * Two-state or mixed-state selection. No application state or global registry.
 */
let nextCheckboxId = 0;

export function createCheckbox({
  label, id, name, value = 'on', description = '',
  checked = false, indeterminate = false, required = false,
  disabled = false, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Checkbox label is required');
  const uid = id || 'pg-checkbox-' + (++nextCheckboxId);
  const element = document.createElement('div');
  element.className = 'pg-checkbox';
  const row = document.createElement('label');
  row.className = 'pg-checkbox__row';
  row.htmlFor = uid;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = uid;
  input.className = 'pg-checkbox__control';
  input.checked = Boolean(checked);
  input.indeterminate = Boolean(indeterminate);
  input.required = Boolean(required);
  input.disabled = Boolean(disabled);
  input.value = String(value);
  if (name !== undefined) input.name = String(name);
  const copy = document.createElement('span');
  copy.className = 'pg-checkbox__label';
  copy.textContent = label;
  row.append(input, copy);
  element.append(row);
  if (description) {
    const detail = document.createElement('p');
    detail.id = uid + '-description';
    detail.className = 'pg-checkbox__description';
    detail.textContent = String(description);
    input.setAttribute('aria-describedby', detail.id);
    element.append(detail);
  }
  const controller = new AbortController();

  function sync() {
    element.dataset.pgState = disabled ? 'disabled' : 'ready';
    element.dataset.pgChecked = String(input.checked);
    element.dataset.pgMixed = String(input.indeterminate);
  }
  function setChecked(next) {
    input.checked = Boolean(next);
    input.indeterminate = false;
    sync();
  }
  function setIndeterminate(next) {
    input.indeterminate = Boolean(next);
    sync();
  }
  input.addEventListener('change', event => {
    sync();
    onChange?.(input.checked, event);
  }, { signal: controller.signal });
  sync();
  return Object.freeze({
    element, input,
    getState: () => ({ checked: input.checked, indeterminate: input.indeterminate }),
    setChecked, setIndeterminate,
    focus() { input.focus(); },
    destroy() { controller.abort(); element.remove(); },
  });
}
