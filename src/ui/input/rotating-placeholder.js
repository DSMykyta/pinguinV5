/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ROTATING PLACEHOLDER                                               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Opt-in history hints with one visibility observer and one scheduler.  ║
 * ║ ЗАЛЕЖНОСТІ: ./placeholder-history.js; native DOM, IntersectionObserver, CSS.      ║
 * ║ ПУБЛІЧНИЙ API: mountRotatingPlaceholder(), mountRotatingPlaceholders(),            ║
 * ║                refreshRotatingPlaceholder(), setRotatingPlaceholdersPaused().       ║
 * ║ ПРИНЦИП: No second Input, per-field timers, fake data, or work while invisible.    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import {
  INPUT_PLACEHOLDER_HISTORY_PREFIX, getInputPlaceholderHistory,
  saveInputPlaceholderHistory, subscribeInputPlaceholderHistory,
} from './placeholder-history.js';

const SELECTOR = 'input[data-pg-rotating-placeholder]';
const DEFAULT_INTERVAL = 5200;
const entries = new Map();
const byKey = new Map();
const historyCache = new Map();
let observer = null;
let listeners = null;
let unsubscribe = null;
let reducedMotion = null;
let timer = null;
let isPaused = false;

function intervalInRange(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 2400 && number <= 20000
    ? number : DEFAULT_INTERVAL;
}

function isAllowed(input) {
  if (!input.matches(SELECTOR) || !['text', 'search'].includes(input.type)) return false;
  const autocomplete = input.autocomplete.toLowerCase();
  const name = input.name.toLowerCase();
  return !/(?:^|[\s-])(password|email|tel|phone|cc|address|otp|token|secret|passport|iban|ssn|birth|cvv)(?:$|[\s-])/.test(name) &&
    !/(?:password|cc-|one-time-code|email|tel|street-address|address-line|postal-code|bday|name|username)/.test(autocomplete);
}

function historyKey(input, explicitKey) {
  if (explicitKey) return explicitKey;
  const key = input.getAttribute('data-pg-placeholder-history');
  if (key) return key;
  const name = input.name.replace(/\[\d+\]/g, '[]');
  if (!name) return '';
  const owner = input.closest('[data-pg-module]')?.getAttribute('data-pg-module');
  return owner ? owner + ':' + name : name;
}

function settle(state) {
  if (!state.overlay || state.overlay.childElementCount < 2) return;
  const current = state.overlay.lastElementChild;
  state.overlay.replaceChildren(current);
  current.removeAttribute('data-pg-state');
}

function drawWord(state, animate = false) {
  const overlay = state.overlay;
  if (!overlay) return;
  const phrase = state.words[state.index];
  if (!phrase) { overlay.replaceChildren(); return; }
  const old = overlay.lastElementChild;
  if (old?.textContent === phrase) { settle(state); old.removeAttribute('data-pg-state'); return; }
  settle(state);
  const previous = overlay.lastElementChild;
  const current = document.createElement('span');
  current.className = 'pg-input__rotating-word';
  current.textContent = phrase;
  if (animate && previous && !reducedMotion?.matches) {
    previous.dataset.pgState = 'leaving';
    current.dataset.pgState = 'entering';
    overlay.append(current);
    current.addEventListener('animationend', () => {
      if (overlay.lastElementChild !== current) return;
      overlay.replaceChildren(current);
      current.removeAttribute('data-pg-state');
    }, { once: true });
  } else {
    overlay.replaceChildren(current);
  }
}

function ensureOverlay(state) {
  if (state.overlay) return;
  const input = state.input;
  const shared = input.parentElement?.classList.contains('pg-field__edit');
  const host = shared ? input.parentElement : document.createElement('span');
  if (!shared) {
    host.className = 'pg-input__rotating-native-host';
    input.before(host);
    host.append(input);
  }
  host.classList.add('pg-input__rotating-host');
  const overlay = document.createElement('span');
  overlay.className = 'pg-input__rotating-placeholder';
  overlay.setAttribute('aria-hidden', 'true');
  host.append(overlay);
  state.host = host;
  state.shared = shared;
  state.overlay = overlay;
  input.placeholder = ' ';
}

function eligible(state) {
  const input = state.input;
  return Boolean(state.words.length && state.inView && input.isConnected &&
    !document.hidden && !input.value && !input.disabled && !input.readOnly &&
    !input.matches(':focus'));
}

function update(state) {
  const visible = eligible(state);
  state.nextAt = 0;
  if (!visible) {
    if (state.overlay) { state.overlay.hidden = true; settle(state); }
    return;
  }
  ensureOverlay(state);
  state.overlay.hidden = false;
  drawWord(state);
  if (state.words.length > 1 && !isPaused && !reducedMotion?.matches &&
      !state.input.matches(':hover')) {
    state.nextAt = Date.now() + state.interval;
  }
}

function schedule() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  let soonest = Infinity;
  for (const state of entries.values()) {
    if (state.nextAt && state.nextAt < soonest) soonest = state.nextAt;
  }
  if (soonest !== Infinity) timer = setTimeout(tick, Math.max(1, soonest - Date.now()));
}

function tick() {
  timer = null;
  const now = Date.now();
  for (const state of entries.values()) {
    if (!state.nextAt || state.nextAt > now) continue;
    if (!eligible(state) || isPaused || reducedMotion?.matches || state.input.matches(':hover')) {
      update(state);
      continue;
    }
    state.index = (state.index + 1) % state.words.length;
    drawWord(state, true);
    state.nextAt = now + state.interval;
  }
  schedule();
}

function loadHistory(key) {
  if (!historyCache.has(key)) historyCache.set(key, getInputPlaceholderHistory(key));
  return historyCache.get(key);
}

function updateHistory(state, words = loadHistory(state.key)) {
  state.words = words;
  state.index = 0;
  if (state.words.length && !state.observed && observer) {
    observer.observe(state.input);
    state.observed = true;
  } else if (!state.words.length && state.observed && observer) {
    observer.unobserve(state.input);
    state.observed = false;
    state.inView = false;
  }
  if (!state.words.length && state.overlay) state.input.placeholder = state.originalPlaceholder ?? '';
  update(state);
}

function refreshKey(key) {
  historyCache.delete(key);
  const related = byKey.get(key);
  if (!related?.size) return;
  const words = loadHistory(key);
  let changedClock = false;
  for (const state of related) {
    changedClock ||= Boolean(state.nextAt);
    updateHistory(state, words);
    changedClock ||= Boolean(state.nextAt);
  }
  if (changedClock) schedule();
}

function refreshAll() {
  for (const state of entries.values()) update(state);
  schedule();
}

function onInputEvent(event) {
  const state = entries.get(event.target);
  if (!state) return;
  if (event.type === 'change' && state.saveMode === 'change' &&
      !state.input.disabled && !state.input.readOnly && state.input.validity.valid) {
    saveInputPlaceholderHistory(state.key, state.input.value);
  }
  const previous = state.nextAt;
  update(state);
  if (previous || state.nextAt) schedule();
}

function onSubmit(event) {
  if (!(event.target instanceof HTMLFormElement)) return;
  for (const state of entries.values()) {
    if (state.saveMode === 'submit' && state.input.form === event.target &&
        !state.input.disabled && !state.input.readOnly && state.input.validity.valid) {
      saveInputPlaceholderHistory(state.key, state.input.value);
    }
  }
}

function onReset(event) {
  if (!(event.target instanceof HTMLFormElement)) return;
  // The native reset default action runs after the reset event has dispatched.
  setTimeout(() => {
    let changed = false;
    for (const state of entries.values()) {
      if (state.input.form === event.target) {
        changed ||= Boolean(state.nextAt);
        update(state);
        changed ||= Boolean(state.nextAt);
      }
    }
    if (changed) schedule();
  }, 0);
}

function start() {
  const controller = new AbortController();
  listeners = controller;
  const signal = controller.signal;
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(changes => {
      for (const change of changes) {
        const state = entries.get(change.target);
        if (!state) continue;
        state.inView = change.isIntersecting;
        update(state);
      }
      schedule();
    });
  }
  for (const name of ['input', 'change', 'focusin', 'focusout', 'pointerover', 'pointerout']) {
    document.addEventListener(name, onInputEvent, { capture: true, signal });
  }
  document.addEventListener('visibilitychange', refreshAll, { signal });
  document.addEventListener('submit', onSubmit, { capture: true, signal });
  document.addEventListener('reset', onReset, { capture: true, signal });
  reducedMotion?.addEventListener?.('change', refreshAll, { signal });
  window.addEventListener('storage', event => {
    if (event.key === null) {
      historyCache.clear();
      for (const state of entries.values()) updateHistory(state);
      schedule();
    } else if (event.key.startsWith(INPUT_PLACEHOLDER_HISTORY_PREFIX)) {
      try {
        refreshKey(decodeURIComponent(event.key.slice(INPUT_PLACEHOLDER_HISTORY_PREFIX.length)));
      } catch { /* Invalid external storage key. */ }
    }
  }, { signal });
  unsubscribe = subscribeInputPlaceholderHistory(refreshKey);
}

function stop() {
  listeners?.abort();
  listeners = null;
  observer?.disconnect();
  observer = null;
  unsubscribe?.();
  unsubscribe = null;
  reducedMotion = null;
  if (timer !== null) clearTimeout(timer);
  timer = null;
  historyCache.clear();
}

export function mountRotatingPlaceholder(input, options = {}) {
  if (!(input instanceof HTMLInputElement)) throw new TypeError('A native input is required');
  if (entries.has(input)) return entries.get(input).destroy;
  if (!isAllowed(input)) return () => {};
  const key = historyKey(input, options.historyKey);
  if (!key) return () => {};
  if (!listeners) start();
  const state = {
    input, key, words: [], index: 0, interval: intervalInRange(options.interval ??
      input.getAttribute('data-pg-placeholder-interval')),
    saveMode: input.getAttribute('data-pg-placeholder-save') === 'submit' ? 'submit' : 'change',
    originalPlaceholder: input.getAttribute('placeholder'),
    inView: !observer, observed: false, nextAt: 0, overlay: null, host: null, shared: false,
    destroy: null,
  };
  state.destroy = () => {
    if (!entries.has(input)) return;
    if (state.observed) observer?.unobserve(input);
    entries.delete(input);
    const group = byKey.get(state.key);
    group?.delete(state);
    if (!group?.size) { byKey.delete(state.key); historyCache.delete(state.key); }
    if (state.overlay) {
      state.overlay.remove();
      if (state.shared) state.host.classList.remove('pg-input__rotating-host');
      else {
        // Do not pull a field back when its owner intentionally moved it elsewhere.
        if (state.host.contains(input)) state.host.before(input);
        state.host.remove();
      }
    }
    if (state.originalPlaceholder === null) input.removeAttribute('placeholder');
    else input.placeholder = state.originalPlaceholder;
    if (!entries.size) stop();
    else schedule();
  };
  entries.set(input, state);
  if (!byKey.has(key)) byKey.set(key, new Set());
  byKey.get(key).add(state);
  updateHistory(state);
  if (state.nextAt) schedule();
  return state.destroy;
}

export function refreshRotatingPlaceholder(input) {
  const state = entries.get(input);
  if (state) {
    const previous = state.nextAt;
    update(state);
    if (previous || state.nextAt) schedule();
  }
}

export function setRotatingPlaceholdersPaused(paused) {
  isPaused = Boolean(paused);
  refreshAll();
}

// Dynamic HTML opt-in. Mutations are processed only for affected nodes.
export function mountRotatingPlaceholders(root = document) {
  if (!(root instanceof Element) && !(root instanceof Document)) {
    throw new TypeError('Root must be an Element or Document');
  }
  const owned = new Map();

  function syncInput(input, changed = false) {
    const dispose = owned.get(input);
    const eligibleInput = (root === input || root.contains(input)) && isAllowed(input);
    if (dispose && (changed || !eligibleInput ||
        entries.get(input)?.key !== historyKey(input))) {
      dispose();
      owned.delete(input);
    }
    if (!owned.has(input) && eligibleInput) owned.set(input, mountRotatingPlaceholder(input));
  }

  function addInputs(node, affected) {
    if (node instanceof Element && node.matches(SELECTOR)) affected.add(node);
    node.querySelectorAll?.(SELECTOR).forEach(input => affected.add(input));
  }

  root.querySelectorAll(SELECTOR).forEach(input => syncInput(input));
  if (root instanceof HTMLInputElement) syncInput(root);
  const mutations = new MutationObserver(records => {
    const affected = new Set();
    const changed = new Set();
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLInputElement) {
        affected.add(record.target);
        changed.add(record.target);
      } else if (record.type === 'attributes' && record.attributeName === 'data-pg-module') {
        const nested = new Set();
        addInputs(record.target, nested);
        for (const input of nested) { affected.add(input); changed.add(input); }
      } else if (record.type === 'childList') {
        record.addedNodes.forEach(node => addInputs(node, affected));
        record.removedNodes.forEach(node => addInputs(node, affected));
      }
    }
    for (const input of affected) syncInput(input, changed.has(input));
  });
  mutations.observe(root, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ['data-pg-rotating-placeholder', 'data-pg-placeholder-history',
      'data-pg-placeholder-interval', 'data-pg-placeholder-save', 'data-pg-module',
      'name', 'type', 'autocomplete'],
  });
  return () => {
    mutations.disconnect();
    for (const dispose of owned.values()) dispose();
    owned.clear();
  };
}
