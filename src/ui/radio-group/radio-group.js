/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — NATIVE RADIO GROUP                                                                   ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Fieldset/legend and same-name inputs supply browser keyboard behavior.                 ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: createRadioGroup()                                                                   ║
 * ║ ПРИНЦИП: Ізольована поведінка, без зв'язків між features.                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

let nextGroupId = 0;

function validateOptions(options) {
  if (!Array.isArray(options)) throw new TypeError('Radio Group options must be an array');
  const seen = new Set();
  return options.map(option => {
    if (!option || typeof option.label !== 'string' ||
      !['number', 'string'].includes(typeof option.value)) {
      throw new TypeError('Radio Group options require value and label');
    }
    const value = String(option.value);
    if (seen.has(value)) throw new TypeError('Radio Group options need unique values');
    seen.add(value);
    return { value, label: option.label, description: String(option.description || ''), disabled: Boolean(option.disabled) };
  });
}

export function createRadioGroup({
  label, id, name, options = [], value = '', description = '',
  required = false, disabled = false, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Radio Group label is required');
  const uid = id || 'pg-radio-group-' + (++nextGroupId);
  const groupName = String(name || uid);
  const element = document.createElement('fieldset');
  element.className = 'pg-radio-group';
  element.id = uid;
  element.disabled = Boolean(disabled);
  const legend = document.createElement('legend');
  legend.className = 'pg-radio-group__legend';
  legend.textContent = label;
  const list = document.createElement('div');
  list.className = 'pg-radio-group__list';
  const hint = document.createElement('p');
  hint.id = uid + '-description';
  hint.className = 'pg-radio-group__description';
  hint.textContent = String(description || '');
  hint.hidden = !hint.textContent;
  const problem = document.createElement('p');
  problem.id = uid + '-error';
  problem.className = 'pg-radio-group__error';
  problem.setAttribute('role', 'status');
  problem.hidden = true;
  element.append(legend, list, hint, problem);
  let normalized = [];
  let inputs = [];
  let optionsController = new AbortController();

  function getValue() {
    return inputs.find(input => input.checked)?.value ?? '';
  }
  function setError(message = '') {
    problem.textContent = String(message || '');
    problem.hidden = !problem.textContent;
    element.dataset.pgState = message ? 'error' : disabled ? 'disabled' : 'ready';
    for (const input of inputs) {
      const ids = [!hint.hidden && hint.id, !problem.hidden && problem.id].filter(Boolean);
      if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
      else input.removeAttribute('aria-describedby');
      if (!problem.hidden) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
  function setValue(next) {
    const requested = String(next ?? '');
    const available = normalized.find(option => option.value === requested && !option.disabled);
    const chosen = available ? available.value : '';
    for (const input of inputs) input.checked = input.value === chosen && chosen !== '';
    return chosen;
  }
  function setOptions(next) {
    optionsController.abort();
    optionsController = new AbortController();
    const previous = getValue();
    normalized = validateOptions(next);
    inputs = [];
    list.replaceChildren();
    normalized.forEach((option, index) => {
      const row = document.createElement('label');
      row.className = 'pg-radio-group__row';
      const input = document.createElement('input');
      input.className = 'pg-radio-group__control';
      input.type = 'radio';
      input.name = groupName;
      input.value = option.value;
      input.disabled = option.disabled;
      input.required = Boolean(required);
      input.id = uid + '-choice-' + index;
      const copy = document.createElement('span');
      copy.className = 'pg-radio-group__copy';
      const title = document.createElement('span');
      title.className = 'pg-radio-group__option-label';
      title.textContent = option.label;
      copy.append(title);
      if (option.description) {
        const detail = document.createElement('span');
        detail.className = 'pg-radio-group__option-description';
        detail.textContent = option.description;
        copy.append(detail);
      }
      row.append(input, copy);
      list.append(row);
      inputs.push(input);
      input.addEventListener('change', event => {
        if (input.checked) onChange?.(input.value, event);
      }, { signal: optionsController.signal });
    });
    setValue(previous);
    setError(problem.textContent);
  }
  setOptions(options);
  if (value !== '') setValue(value);
  setError('');
  return Object.freeze({
    element, getValue, setValue, setOptions, setError,
    focus() { (inputs.find(input => input.checked && !input.disabled) ||
      inputs.find(input => !input.disabled))?.focus(); },
    destroy() { optionsController.abort(); element.remove(); },
  });
}
