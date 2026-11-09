/**
 * PINGUIN NEXT — NATIVE CHECKBOX WITH MORPHING CIRCLE
 * Native input remains available to keyboard, assistive technology and forms.
 * Visual box changes from rounded square to circle on checked/mixed states.
 */
let nextCheckboxId = 0;

export function createCheckbox({
  label, id, name, value = 'on', description = '', error = '',
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

  const box = document.createElement('span');
  box.className = 'pg-checkbox__box';
  box.setAttribute('aria-hidden', 'true');
  const copy = document.createElement('span');
  copy.className = 'pg-checkbox__copy';
  const text = document.createElement('span');
  text.id = uid + '-label';
  text.className = 'pg-checkbox__label';
  text.textContent = label;
  input.setAttribute('aria-labelledby', text.id);
  copy.append(text);
  if (description) {
    const detail = document.createElement('span');
    detail.id = uid + '-description';
    detail.className = 'pg-checkbox__description';
    detail.textContent = String(description);
    input.setAttribute('aria-describedby', detail.id);
    copy.append(detail);
  }
  row.append(input, box, copy);
  element.append(row);
  const problem = document.createElement('span');
  problem.className = 'pg-checkbox__error';
  problem.id = uid + '-error';
  problem.setAttribute('role', 'status');
  problem.hidden = true;
  element.append(problem);
  const controller = new AbortController();

  function sync() {
    element.dataset.pgState = problem.hidden ? (disabled ? 'disabled' : 'ready') : 'error';
    element.dataset.pgChecked = String(input.checked);
    element.dataset.pgMixed = String(input.indeterminate);
  }
  function setError(message = '') {
    problem.textContent = String(message ?? '');
    problem.hidden = !problem.textContent;
    const hintId = description ? uid + '-description' : '';
    const ids = [hintId, !problem.hidden ? problem.id : ''].filter(Boolean);
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
    if (problem.hidden) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    sync();
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

  setError(error);
  return Object.freeze({
    element, input,
    getState: () => ({ checked: input.checked, indeterminate: input.indeterminate }),
    setChecked, setIndeterminate, setError,
    focus() { input.focus(); },
    destroy() { controller.abort(); element.remove(); },
  });
}
