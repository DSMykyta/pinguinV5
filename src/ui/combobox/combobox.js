/**
 * PINGUIN NEXT — EDITABLE COMBOBOX
 * Native text editing + WAI-ARIA listbox; selection has a stable value.
 * API: createCombobox({label,options?,loadOptions?,onChange?}).
 */
import { createFieldFrame } from '../field/field.js';
import { positionPopup } from '../position/position-popup.js';
import { dismissOnOutsideScroll } from '../position/dismiss-on-scroll.js';
let nextComboId = 0;
const normalize = value => String(value ?? '').toLocaleLowerCase('uk').trim();
function parseOptions(items) {
  if (!Array.isArray(items)) throw new TypeError('Combobox options must be an array');
  return items.map(item => {
    if (!item || typeof item.label !== 'string' || !['string', 'number'].includes(typeof item.value))
      throw new TypeError('Combobox options require label and value');
    return { value: String(item.value), label: item.label, disabled: Boolean(item.disabled) };
  });
}

export function createCombobox({
  label, id, name, options = [], loadOptions, value = '', placeholder = '',
  description = '', required = false, disabled = false, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Combobox label is required');
  if (loadOptions !== undefined && typeof loadOptions !== 'function')
    throw new TypeError('loadOptions must be a function');
  const uid = id || 'pg-combobox-' + (++nextComboId);
  const element = document.createElement('div');
  element.className = 'pg-combobox';
  const input = document.createElement('input');
  input.type = 'text';
  input.id = uid;
  input.className = 'pg-combobox__input';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.disabled = Boolean(disabled);
  const stored = document.createElement('input');
  stored.type = 'hidden';
  if (name !== undefined) stored.name = String(name);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');
  input.setAttribute('aria-controls', uid + '-list');
  input.setAttribute('aria-expanded', 'false');
  if (required) input.setAttribute('aria-required', 'true');
  const list = document.createElement('ul');
  list.id = uid + '-list';
  list.className = 'pg-combobox__list pg-scrollbar';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label + ': варіанти');
  list.hidden = true;
  // Supported browsers lift the list above modal scroll containers.
  const hasPopover = typeof list.showPopover === 'function';
  if (hasPopover) list.setAttribute('popover', 'manual');
  const support = document.createElement('div');
  support.className = 'pg-combobox__support';
  const detail = document.createElement('span');
  detail.id = uid + '-description';
  detail.textContent = String(description || '');
  detail.hidden = !detail.textContent;
  const error = document.createElement('span');
  error.id = uid + '-error';
  error.className = 'pg-combobox__error';
  error.setAttribute('role', 'status');
  error.hidden = true;
  const status = document.createElement('span');
  status.className = 'pg-combobox__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  support.append(detail, error, status);
  const caret = document.createElement('span');
  caret.className = 'pg-combobox__caret';
  caret.setAttribute('aria-hidden', 'true');
  const frame = createFieldFrame({ label, control: input, controlId: uid, trailing: caret });
  frame.field.classList.add('pg-combobox__field');
  frame.label.classList.add('pg-combobox__label');
  frame.setDisabled(disabled);
  element.append(frame.field, stored, list, support);

  const controller = new AbortController();
  let source = parseOptions(options);
  let suggestions = [];
  let activeIndex = -1;
  let selected = '';
  let open = false;
  let destroyed = false;
  let generation = 0;
  let request = null;
  let pendingTimer = null;
  let composing = false;

  function a11y() {
    const ids = [!detail.hidden && detail.id, !error.hidden && error.id].filter(Boolean);
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
    support.hidden = !ids.length && !status.textContent;
    if (error.hidden) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
  }
  function setError(message = '') {
    error.textContent = String(message || '');
    error.hidden = !error.textContent;
    element.dataset.pgState = error.hidden ? 'ready' : 'error';
    frame.setError(!error.hidden);
    a11y();
  }
  function setStatus(value) {
    status.textContent = value;
    a11y();
  }
  function position() {
    if (!hasPopover || !open) return;
    positionPopup({ anchor: frame.surface, popup: list, maxHeight: 260 });
  }
  function display(openNow) {
    if (destroyed || input.disabled) return;
    if (open === openNow) return;
    open = openNow;
    input.setAttribute('aria-expanded', String(open));
    element.dataset.pgOpen = String(open);
    if (open) {
      list.hidden = false;
      if (hasPopover) list.showPopover();
      position();
    } else {
      if (hasPopover && list.matches(':popover-open')) list.hidePopover();
      list.hidden = true;
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
    }
  }
  function setActive(index) {
    const eligible = suggestions.map((option, i) => option.disabled ? -1 : i).filter(i => i >= 0);
    if (!eligible.length) { activeIndex = -1; input.removeAttribute('aria-activedescendant'); return; }
    activeIndex = eligible.includes(index) ? index : eligible[0];
    Array.from(list.querySelectorAll('[role="option"]')).forEach((option, i) => {
      const current = i === activeIndex;
      option.setAttribute('aria-selected', String(current));
      if (current) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
      }
    });
  }
  function render(items, emptyMessage = 'Нічого не знайдено') {
    suggestions = parseOptions(items);
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    list.replaceChildren();
    suggestions.forEach((option, index) => {
      const node = document.createElement('li');
      node.className = 'pg-combobox__option';
      node.id = uid + '-option-' + index;
      node.setAttribute('role', 'option');
      node.setAttribute('aria-selected', 'false');
      node.setAttribute('aria-disabled', String(option.disabled));
      node.textContent = option.label;
      node.addEventListener('pointerdown', event => event.preventDefault(), { signal: controller.signal });
      node.addEventListener('click', () => choose(index), { signal: controller.signal });
      list.append(node);
    });
    if (!suggestions.length) {
      const empty = document.createElement('li');
      empty.className = 'pg-combobox__empty';
      empty.setAttribute('role', 'presentation');
      empty.textContent = emptyMessage;
      list.append(empty);
    }
    setStatus('');
    if (open) position();
  }
  function abortPending() {
    generation++;
    request?.abort();
    request = null;
    if (pendingTimer !== null) clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  function refresh(query) {
    abortPending();
    const mine = generation;
    if (!loadOptions) {
      const needle = normalize(query);
      render(source.filter(option => normalize(option.label).includes(needle)));
      display(true);
      return;
    }
    render([], 'Завантаження…');
    setStatus('Завантаження варіантів');
    display(true);
    const current = new AbortController();
    request = current;
    pendingTimer = setTimeout(async () => {
      pendingTimer = null;
      try {
        const data = await loadOptions(query, { signal: current.signal });
        if (destroyed || mine !== generation || current.signal.aborted) return;
        request = null;
        source = parseOptions(data);
        render(source);
      } catch (reason) {
        if (destroyed || mine !== generation || current.signal.aborted) return;
        request = null;
        render([], 'Не вдалося отримати варіанти');
        setStatus('Помилка завантаження');
      }
    }, 120);
  }
  function choose(index) {
    const option = suggestions[index];
    if (!option || option.disabled || destroyed) return false;
    const changed = selected !== option.value;
    selected = option.value;
    stored.value = selected;
    input.setCustomValidity('');
    input.value = option.label;
    frame.setFilled(true);
    display(false);
    setError('');
    if (changed) onChange?.(selected);
    input.focus();
    return true;
  }
  function setValue(value) {
    const requested = String(value ?? '');
    const found = source.find(option => option.value === requested && !option.disabled);
    selected = found ? found.value : '';
    stored.value = selected;
    input.setCustomValidity(required && !selected ? 'Оберіть значення зі списку' : '');
    input.value = found ? found.label : '';
    frame.setFilled(Boolean(found));
    display(false);
    return selected;
  }
  function setOptions(items) {
    abortPending();
    source = parseOptions(items);
    setValue(selected);
    if (open) refresh(input.value);
  }
  function handleInput(event) {
    if (composing || event.isComposing) return;
    if (selected) { selected = ''; stored.value = ''; onChange?.(''); }
    input.setCustomValidity(required ? 'Оберіть значення зі списку' : '');
    frame.setFilled(Boolean(input.value));
    refresh(input.value);
  }
  function handleKeys(event) {
    if (composing || event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) refresh(input.value);
      const eligible = suggestions.map((option, i) => option.disabled ? -1 : i).filter(i => i >= 0);
      if (!eligible.length) return;
      const place = eligible.indexOf(activeIndex);
      const next = event.key === 'ArrowDown'
        ? eligible[(place + 1) % eligible.length]
        : eligible[(place <= 0 ? eligible.length : place) - 1];
      setActive(next);
    } else if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      event.preventDefault();
      display(false);
    } else if (event.key === 'Tab') display(false);
  }
  function handleOutside(event) {
    if (!element.contains(event.target)) display(false);
  }
  input.addEventListener('focus', () => refresh(input.value), { signal: controller.signal });
  input.addEventListener('input', handleInput, { signal: controller.signal });
  input.addEventListener('keydown', handleKeys, { signal: controller.signal });
  input.addEventListener('compositionstart', () => { composing = true; }, { signal: controller.signal });
  input.addEventListener('compositionend', () => { composing = false; refresh(input.value); }, { signal: controller.signal });
  document.addEventListener('pointerdown', handleOutside, { signal: controller.signal });
  document.addEventListener('focusin', handleOutside, { signal: controller.signal });
  window.addEventListener('resize', position, { signal: controller.signal });
  dismissOnOutsideScroll({
    popup: list, isOpen: () => open, dismiss: () => display(false),
    signal: controller.signal,
  });
  setValue(value);
  setError('');

  return Object.freeze({
    element, input, getValue: () => selected,
    setValue, setOptions, setError,
    focus: () => input.focus(),
    destroy() {
      destroyed = true;
      abortPending();
      if (hasPopover && list.matches(':popover-open')) list.hidePopover();
      controller.abort();
      frame.destroy();
      element.remove();
    },
  });
}
