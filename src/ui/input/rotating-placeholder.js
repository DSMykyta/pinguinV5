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
const SUPPORTED_TYPES = new Set(['text', 'search']);
const mountedInputs = new WeakMap();
const DEFAULT_INTERVAL = 5200;

function intervalInRange(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 2400 && parsed <= 20000
    ? parsed : DEFAULT_INTERVAL;
}

export function mountRotatingPlaceholder(input, options = {}) {
  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError('Rotating placeholder requires a native input');
  }
  if (mountedInputs.has(input)) return mountedInputs.get(input).destroy;
  if (!SUPPORTED_TYPES.has(input.type) || !input.hasAttribute('data-pg-rotating-placeholder')) {
    return () => {};
  }

  // An explicit opt-in is enough; the field's stable native name owns its history.
  const historyKey = options.historyKey || input.getAttribute('data-pg-placeholder-history') || input.name;
  if (!historyKey) return () => {};
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
    if (previous?.textContent === phrase) {
      // An interrupted animation must never leave the outgoing word visible.
      if (overlay.childElementCount > 1 || previous.hasAttribute('data-pg-state')) {
        overlay.replaceChildren(previous);
        previous.removeAttribute('data-pg-state');
      }
      return;
    }
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
      }, 860);
    } else {
      overlay.replaceChildren(current);
    }
  }

  function refreshWords() {
    words = getInputPlaceholderHistory(historyKey);
    index = 0;
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
    if (!input.disabled && !input.readOnly) {
      saveInputPlaceholderHistory(historyKey, input.value);
      refreshWords();
    }
    updateVisibility();
  }

  input.addEventListener('focus', updateVisibility, { signal: controller.signal });
  input.addEventListener('blur', () => { refreshWords(); updateVisibility(); }, { signal: controller.signal });
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

// One mount per application root; only changed opt-in inputs are inspected.
export function mountRotatingPlaceholders(root = document) {
  if (!(root instanceof Element) && !(root instanceof Document)) {
    throw new TypeError('Rotating placeholder root must be an Element or Document');
  }
  const disposers = new Map();

  function isWithinRoot(input) {
    return root === input || root.contains(input);
  }

  function syncInput(input, isReconfigured = false) {
    const destroy = disposers.get(input);
    if (destroy && (isReconfigured || !isWithinRoot(input) || !input.matches(SELECTOR))) {
      destroy();
      disposers.delete(input);
    }
    if (!disposers.has(input) && isWithinRoot(input) && input.matches(SELECTOR)) {
      disposers.set(input, mountRotatingPlaceholder(input));
    }
  }

  function collectOptedInInputs(node, changed) {
    if (node instanceof Element && node.matches(SELECTOR)) changed.add(node);
    node.querySelectorAll?.(SELECTOR).forEach(input => changed.add(input));
  }

  root.querySelectorAll(SELECTOR).forEach(input => syncInput(input));
  if (root instanceof HTMLInputElement && root.matches(SELECTOR)) syncInput(root);

  const observer = new MutationObserver(records => {
    const changed = new Set();
    const reconfigured = new Set();
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLInputElement) {
        changed.add(record.target);
        reconfigured.add(record.target);
      } else if (record.type === 'childList') {
        record.addedNodes.forEach(node => collectOptedInInputs(node, changed));
        record.removedNodes.forEach(node => collectOptedInInputs(node, changed));
      }
    }
    for (const input of changed) syncInput(input, reconfigured.has(input));
  });
  observer.observe(root, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ['data-pg-rotating-placeholder', 'data-pg-placeholder-history', 'data-pg-placeholder-interval', 'name', 'type'],
  });
  return () => {
    observer.disconnect();
    for (const destroy of disposers.values()) destroy();
    disposers.clear();
  };
}
