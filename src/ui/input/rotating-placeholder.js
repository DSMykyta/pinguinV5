/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ROTATING PLACEHOLDER                                               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Опційна HTML-атрибутна підказка у звичайному native input.            ║
 * ║ ЗАЛЕЖНОСТІ: ./placeholder-history.js, native DOM/CSS анімація.                   ║
 * ║ ПУБЛІЧНИЙ API: mountRotatingPlaceholder(), mountRotatingPlaceholders(),            ║
 * ║                refreshRotatingPlaceholder().                                        ║
 * ║ ПРИНЦИП: Лише opt-in; жодного дублювання Input, зміни його value чи autocomplete.  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { getInputPlaceholderHistory, saveInputPlaceholderHistory } from './placeholder-history.js';

const SELECTOR = 'input[data-pg-rotating-placeholder]';
const SUPPORTED_TYPES = new Set(['text', 'search', 'email', 'tel', 'url']);
const mountedInputs = new WeakMap();
const DEFAULT_INTERVAL = 2600;

function normalizePhrases(value) {
  const candidates = Array.isArray(value) ? value : String(value ?? '').split('|');
  return [...new Set(candidates
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item && item.length <= 100))].slice(0, 20);
}

function intervalInRange(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1200 && parsed <= 10000
    ? parsed : DEFAULT_INTERVAL;
}

export function mountRotatingPlaceholder(input, options = {}) {
  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError('Rotating placeholder requires a native input');
  }
  if (mountedInputs.has(input)) return mountedInputs.get(input).destroy;
  if (!SUPPORTED_TYPES.has(input.type) || (options.phrases === undefined && !input.hasAttribute('data-pg-rotating-placeholder'))) {
    return () => {};
  }

  const phrases = normalizePhrases(options.phrases ?? input.getAttribute('data-pg-rotating-placeholder'));
  const historyKey = options.historyKey ?? input.getAttribute('data-pg-placeholder-history') ?? '';
  const interval = intervalInRange(options.interval ?? input.getAttribute('data-pg-placeholder-interval'));
  const originalPlaceholder = input.getAttribute('placeholder');
  const isSharedField = input.parentElement?.classList.contains('pg-field__edit');
  const host = isSharedField ? input.parentElement : document.createElement('span');
  if (!isSharedField) {
    host.className = 'pg-input__rotating-native-host';
    input.before(host);
    host.append(input);
  }
  host.classList.add('pg-input__rotating-host');

  const overlay = document.createElement('span');
  overlay.className = 'pg-input__rotating-placeholder';
  overlay.setAttribute('aria-hidden', 'true');
  host.append(overlay);

  const controller = new AbortController();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let words = [];
  let index = 0;
  let timer = null;
  let cleanupTimer = null;
  let disposed = false;

  function clearTimers() {
    clearTimeout(timer);
    clearTimeout(cleanupTimer);
    timer = null;
    cleanupTimer = null;
  }

  function displayWord(animated = false) {
    const phrase = words[index];
    if (!phrase) {
      overlay.replaceChildren();
      return;
    }
    const previous = overlay.lastElementChild;
    if (previous?.textContent === phrase) return;
    const current = document.createElement('span');
    current.className = 'pg-input__rotating-word';
    current.textContent = phrase;
    if (animated && previous && !reducedMotion?.matches) {
      current.dataset.pgState = 'entering';
      previous.dataset.pgState = 'leaving';
      overlay.append(current);
      clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(() => {
        if (disposed) return;
        overlay.replaceChildren(current);
        current.removeAttribute('data-pg-state');
        cleanupTimer = null;
      }, 430);
    } else {
      overlay.replaceChildren(current);
    }
  }

  function refreshWords() {
    const history = historyKey ? getInputPlaceholderHistory(historyKey) : [];
    words = normalizePhrases([...history, ...phrases]);
    if (index >= words.length) index = 0;
    input.placeholder = words.length ? ' ' : originalPlaceholder ?? '';
    displayWord();
  }

  function canShow() {
    return Boolean(words.length) && !input.value && !input.disabled && !input.readOnly &&
      !input.matches(':focus') && !document.hidden;
  }

  function scheduleNext() {
    clearTimeout(timer);
    timer = null;
    if (disposed || !canShow() || reducedMotion?.matches || words.length < 2) return;
    timer = setTimeout(() => {
      timer = null;
      if (disposed || !canShow()) return;
      index = (index + 1) % words.length;
      displayWord(true);
      scheduleNext();
    }, interval);
  }

  function updateVisibility() {
    if (disposed) return;
    const visible = canShow();
    overlay.hidden = !visible;
    if (!visible) {
      clearTimers();
      displayWord();
    } else {
      displayWord();
      scheduleNext();
    }
  }

  function handleChange() {
    if (historyKey && !input.disabled && !input.readOnly) {
      saveInputPlaceholderHistory(historyKey, input.value);
      refreshWords();
    }
    updateVisibility();
  }

  input.addEventListener('focus', updateVisibility, { signal: controller.signal });
  input.addEventListener('blur', updateVisibility, { signal: controller.signal });
  input.addEventListener('input', updateVisibility, { signal: controller.signal });
  input.addEventListener('change', handleChange, { signal: controller.signal });
  document.addEventListener('visibilitychange', updateVisibility, { signal: controller.signal });
  reducedMotion?.addEventListener?.('change', updateVisibility, { signal: controller.signal });

  function destroy() {
    if (disposed) return;
    disposed = true;
    clearTimers();
    controller.abort();
    overlay.remove();
    input.placeholder = originalPlaceholder ?? '';
    if (isSharedField) {
      host.classList.remove('pg-input__rotating-host');
    } else {
      host.before(input);
      host.remove();
    }
    mountedInputs.delete(input);
  }

  mountedInputs.set(input, { destroy, refresh: updateVisibility });
  refreshWords();
  updateVisibility();
  return destroy;
}

export function refreshRotatingPlaceholder(input) {
  mountedInputs.get(input)?.refresh();
}

// One mount per application root; dynamically inserted HTML with data-pg-* is supported.
export function mountRotatingPlaceholders(root = document) {
  if (!(root instanceof Element) && !(root instanceof Document)) {
    throw new TypeError('Rotating placeholder root must be an Element or Document');
  }
  const disposers = new Map();
  function synchronize() {
    const found = new Set(root.querySelectorAll(SELECTOR));
    if (root instanceof HTMLInputElement && root.matches(SELECTOR)) found.add(root);
    for (const [input, destroy] of disposers) {
      if (!found.has(input)) {
        destroy();
        disposers.delete(input);
      }
    }
    for (const input of found) {
      if (!disposers.has(input)) disposers.set(input, mountRotatingPlaceholder(input));
    }
  }

  synchronize();
  const observer = new MutationObserver(records => {
    const changed = records.some(record => record.type === 'childList' ||
      record.attributeName === 'data-pg-rotating-placeholder' ||
      record.attributeName === 'data-pg-placeholder-history' ||
      record.attributeName === 'data-pg-placeholder-interval');
    if (!changed) return;
    for (const record of records) {
      if (record.type !== 'attributes' || !(record.target instanceof HTMLInputElement)) continue;
      const existing = disposers.get(record.target);
      if (existing) {
        existing();
        disposers.delete(record.target);
      }
    }
    synchronize();
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-pg-rotating-placeholder', 'data-pg-placeholder-history', 'data-pg-placeholder-interval'],
  });
  return () => {
    observer.disconnect();
    for (const destroy of disposers.values()) destroy();
    disposers.clear();
  };
}
