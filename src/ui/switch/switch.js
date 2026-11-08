/**
 * PINGUIN NEXT — NATIVE SWITCH
 * Accessible checkbox input with role=switch; optional async commit and rollback.
 */
let nextSwitchId = 0;

export function createSwitch({
  label, id, name, value = 'on', description = '',
  checked = false, disabled = false, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Switch label is required');
  const uid = id || 'pg-switch-' + (++nextSwitchId);
  const element = document.createElement('div');
  element.className = 'pg-switch';
  const row = document.createElement('label');
  row.className = 'pg-switch__row';
  row.htmlFor = uid;
  const copy = document.createElement('span');
  copy.className = 'pg-switch__copy';
  const text = document.createElement('span');
  text.className = 'pg-switch__label';
  text.textContent = label;
  copy.append(text);
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('role', 'switch');
  input.className = 'pg-switch__control';
  input.id = uid;
  input.checked = Boolean(checked);
  input.value = String(value);
  if (name !== undefined) input.name = String(name);
  const detail = document.createElement('span');
  detail.id = uid + '-description';
  detail.className = 'pg-switch__description';
  detail.textContent = String(description || '');
  if (detail.textContent) {
    copy.append(detail);
    input.setAttribute('aria-describedby', detail.id);
  }
  const status = document.createElement('span');
  status.className = 'pg-switch__status';
  status.id = uid + '-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  row.append(copy, input);
  element.append(row, status);

  const controller = new AbortController();
  let disposed = false;
  let pending = false;
  let externalBusy = false;
  let generation = 0;

  function sync() {
    input.disabled = Boolean(disabled || pending || externalBusy);
    element.dataset.pgState = pending ? 'pending' : input.disabled ? 'disabled' : 'ready';
    element.dataset.pgChecked = String(input.checked);
    element.setAttribute('aria-busy', String(pending));
  }
  function message(value) {
    status.textContent = value;
    status.hidden = !value;
  }
  function setChecked(next) {
    generation++;
    input.checked = Boolean(next);
    message('');
    sync();
  }
  function setBusy(next) {
    externalBusy = Boolean(next);
    sync();
  }
  input.addEventListener('change', async event => {
    if (disposed || pending || externalBusy) return;
    generation++;
    const current = generation;
    const previous = !input.checked;
    sync();
    message('');
    try {
      const result = onChange?.(input.checked, event);
      if (result && typeof result.then === 'function') {
        pending = true;
        message('Збереження зміни…');
        sync();
        const accepted = await result;
        if (disposed || current !== generation) return;
        if (accepted === false) {
          input.checked = previous;
          message('Зміну відхилено. Попереднє значення відновлено.');
        } else message('');
      } else if (result === false) {
        input.checked = previous;
        message('Зміну відхилено. Попереднє значення відновлено.');
      }
    } catch {
      if (!disposed && current === generation) {
        input.checked = previous;
        message('Не вдалося зберегти зміну. Попереднє значення відновлено.');
      }
    } finally {
      if (!disposed && current === generation) {
        pending = false;
        sync();
      }
    }
  }, { signal: controller.signal });
  sync();
  return Object.freeze({
    element, input,
    getChecked: () => input.checked, setChecked, setBusy,
    focus() { input.focus(); },
    destroy() {
      disposed = true;
      generation++;
      controller.abort();
      element.remove();
    },
  });
}
