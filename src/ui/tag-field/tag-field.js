/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TAG FIELD                                                                            ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Owns a collection of short text values, independently of feature data.                 ║
 * ║ ЗАЛЕЖНОСТІ: ../field/field.js, ../icon/icon.js                                                                       ║
 * ║ ПУБЛІЧНИЙ API: createTagField()                                                                     ║
 * ║ ПРИНЦИП: Public API: createTagField(options).                                                       ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';
import { createFieldFrame } from '../field/field.js';
let nextTagFieldId = 0;
const normalize = value => String(value ?? '').trim().replace(/\s+/gu, ' ');
const keyFor = value => normalize(value).toLocaleLowerCase('uk');

export function createTagField({
  label, name, id, values = [], placeholder = 'Додати значення',
  description = '', required = false, disabled = false,
  maxTags = Infinity, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Tag Field label is required');
  if (!Number.isInteger(maxTags) && maxTags !== Infinity || maxTags < 1)
    throw new RangeError('maxTags must be a positive integer');
  if (!Array.isArray(values)) throw new TypeError('Tag Field values must be an array');
  const uid = id || 'pg-tag-field-' + (++nextTagFieldId);
  const element = document.createElement('div');
  element.className = 'pg-tag-field';
  const collection = document.createElement('div');
  collection.className = 'pg-tag-field__tokens';
  const input = document.createElement('input');
  input.className = 'pg-tag-field__input';
  input.id = uid;
  input.type = 'text';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.disabled = Boolean(disabled);
  // Values, not the partially edited text, are serialized in forms.
  const hiddenValues = document.createElement('span');
  hiddenValues.hidden = true;
  const support = document.createElement('div');
  support.className = 'pg-tag-field__support';
  const detail = document.createElement('span');
  detail.id = uid + '-description';
  detail.textContent = String(description || '');
  detail.hidden = !detail.textContent;
  const error = document.createElement('span');
  error.className = 'pg-tag-field__error';
  error.id = uid + '-error';
  error.setAttribute('role', 'status');
  const status = document.createElement('span');
  status.id = uid + '-status';
  status.className = 'pg-tag-field__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  support.append(detail, error, status);
  const composite = document.createElement('div');
  composite.className = 'pg-tag-field__composite';
  composite.append(collection, input, hiddenValues);
  const frame = createFieldFrame({
    label, control: composite, controlId: uid + '-contents',
  });
  const field = frame.field;
  field.classList.add('pg-tag-field__field');
  const caption = frame.label;
  caption.classList.add('pg-tag-field__label');
  caption.htmlFor = uid; // Always label the real editable input, never the composite.
  frame.setDisabled(disabled);
  element.append(field, support);
  let tokens = [];
  let armed = -1;
  let destroyed = false;
  let composing = false;
  let removed = null;
  const controller = new AbortController();

  function syncSupport() {
    const ids = [!detail.hidden && detail.id, !error.hidden && error.id].filter(Boolean);
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
    support.hidden = ids.length === 0 && !status.textContent;
    if (error.hidden) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    // A required token collection may have an empty text input after valid tags.
    input.setCustomValidity(required && tokens.length === 0 ? 'Додайте хоча б одне значення' : '');
  }
  function setError(message = '') {
    error.textContent = String(message || '');
    error.hidden = !error.textContent;
    element.dataset.pgState = error.hidden ? 'ready' : 'error';
    frame.setError(!error.hidden);
    syncSupport();
  }
  function announce(text) {
    status.textContent = '';
    // The region exists before its text changes for reliable announcements.
    queueMicrotask(() => {
      if (destroyed) return;
      status.textContent = text;
      syncSupport();
    });
  }
  function emit() { onChange?.(tokens.slice()); }
  function render() {
    collection.replaceChildren();
    hiddenValues.replaceChildren();
    tokens.forEach((value, index) => {
      const tag = document.createElement('span');
      tag.className = 'pg-tag-field__tag';
      if (armed === index) tag.dataset.pgArmed = 'true';
      const text = document.createElement('span');
      text.className = 'pg-tag-field__tag-text';
      text.textContent = value;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pg-tag-field__remove pg-button pg-button--chip-remove';
      button.setAttribute('aria-label', 'Видалити ' + value);
      button.disabled = Boolean(disabled);
      button.append(createIcon('x'));
      button.addEventListener('click', () => remove(index), { signal: controller.signal });
      button.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          (collection.querySelectorAll('button')[index - 1] || input).focus();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          (collection.querySelectorAll('button')[index + 1] || input).focus();
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          remove(index, true);
        } else if (event.key === 'Escape') {
          armed = -1;
          render();
          input.focus();
        }
      }, { signal: controller.signal });
      tag.append(text, button);
      collection.append(tag);
      if (name !== undefined) {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = String(name);
        hidden.value = value;
        hidden.disabled = Boolean(disabled);
        hiddenValues.append(hidden);
      }
    });
    element.dataset.pgFilled = String(tokens.length > 0);
    frame.setFilled(tokens.length > 0 || input.value.length > 0);
    syncSupport();
  }
  function add(items) {
    let changes = 0;
    let exceeded = false;
    for (const raw of items) {
      const candidate = normalize(raw);
      if (!candidate || tokens.some(value => keyFor(value) === keyFor(candidate))) continue;
      if (tokens.length >= maxTags) { exceeded = true; break; }
      tokens.push(candidate);
      changes++;
    }
    if (changes) {
      removed = null;
      armed = -1;
      setError(exceeded ? 'Досягнуто максимальної кількості значень' : '');
      render();
      announce(changes + ' значень додано');
      emit();
    }
    if (exceeded && !changes) setError('Досягнуто максимальної кількості значень');
    return changes;
  }
  function remove(index, focusNeighbour = false) {
    if (disabled || index < 0 || index >= tokens.length) return;
    const [value] = tokens.splice(index, 1);
    removed = { value, index };
    armed = -1;
    render();
    setError('');
    announce('Видалено ' + value);
    emit();
    if (focusNeighbour) {
      const buttons = collection.querySelectorAll('button');
      (buttons[Math.min(index, buttons.length - 1)] || input).focus();
    } else input.focus();
  }
  function setValues(next) {
    if (!Array.isArray(next)) throw new TypeError('Tag Field values must be an array');
    const seen = new Set();
    tokens = [];
    for (const raw of next) {
      const value = normalize(raw);
      const key = keyFor(value);
      if (!value || seen.has(key) || tokens.length >= maxTags) continue;
      tokens.push(value);
      seen.add(key);
    }
    armed = -1;
    removed = null;
    render();
  }
  function handleInput() {
    armed = -1;
    // Visual state is reset as soon as the user starts typing.
    frame.setFilled(tokens.length > 0 || input.value.length > 0);
    if (input.value) setError('');
  }
  function handleKeydown(event) {
    if (disabled || composing || event.isComposing) return;
    if (event.key === 'Enter' && input.value.trim()) {
      event.preventDefault();
      add(input.value.split(/[;,\n]+/u));
      input.value = '';
      frame.setFilled(tokens.length > 0);
    } else if (event.key === 'Backspace' && !input.value && tokens.length) {
      event.preventDefault();
      if (armed === tokens.length - 1) remove(armed);
      else { armed = tokens.length - 1; render(); }
    } else if (event.key === 'ArrowLeft' && !input.value && tokens.length) {
      event.preventDefault();
      collection.querySelectorAll('button')[tokens.length - 1].focus();
    } else if (event.key === 'Escape' && armed !== -1) {
      event.preventDefault();
      armed = -1;
      render();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' &&
      !input.value && removed) {
      event.preventDefault();
      if (tokens.length < maxTags && !tokens.some(value => keyFor(value) === keyFor(removed.value))) {
        tokens.splice(removed.index, 0, removed.value);
        removed = null;
        render();
        announce('Видалення скасовано');
        emit();
      }
    }
  }
  function handlePaste(event) {
    if (disabled) return;
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!/[,;\n]/u.test(text)) return;
    event.preventDefault();
    const parts = (input.value + text).split(/[,;\n]+/u);
    const tail = parts.pop() || '';
    add(parts);
    input.value = tail;
    frame.setFilled(tokens.length > 0 || Boolean(tail));
  }
  input.addEventListener('input', handleInput, { signal: controller.signal });
  input.addEventListener('keydown', handleKeydown, { signal: controller.signal });
  input.addEventListener('paste', handlePaste, { signal: controller.signal });
  input.addEventListener('compositionstart', () => { composing = true; }, { signal: controller.signal });
  input.addEventListener('compositionend', () => { composing = false; }, { signal: controller.signal });
  setValues(values);
  setError('');
  return Object.freeze({
    element, input, getValues: () => tokens.slice(), setValues, setError,
    focus: () => input.focus(),
    destroy() {
      destroyed = true;
      controller.abort();
      frame.destroy();
      element.remove();
    },
  });
}
