/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — INPUT PLACEHOLDER HISTORY                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Ізольована локальна історія для явно обраних несекретних полів.        ║
 * ║ ЗАЛЕЖНОСТІ: Web Storage; без DOM, Shell та features.                                ║
 * ║ ПУБЛІЧНИЙ API: get/save/remove/clearInputPlaceholderHistory(),                     ║
 * ║                subscribeInputPlaceholderHistory().                                 ║
 * ║ ПРИНЦИП: Малий provider з явним ключем, лімітами й безпечними storage failures.    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

export const INPUT_PLACEHOLDER_HISTORY_PREFIX = 'pg:v1:input-placeholder-history:';
const HISTORY_LIMIT = 12;
const VALUE_LIMIT = 100;
const subscribers = new Set();

function getStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function storageKey(key) {
  if (typeof key !== 'string' || !key || key.length > 160 || /[\u0000-\u001f\u007f]/.test(key)) return '';
  return INPUT_PLACEHOLDER_HISTORY_PREFIX + encodeURIComponent(key);
}

function normalize(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.filter(value => {
    if (typeof value !== 'string' || !value.trim() || value.length > VALUE_LIMIT) return false;
    const id = value.toLocaleLowerCase();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, HISTORY_LIMIT);
}

function notify(key) {
  for (const subscriber of subscribers) subscriber(key);
}

export function subscribeInputPlaceholderHistory(onChange) {
  if (typeof onChange !== 'function') throw new TypeError('History subscriber must be a function');
  subscribers.add(onChange);
  return () => subscribers.delete(onChange);
}

export function getInputPlaceholderHistory(key, storage = getStorage()) {
  const name = storageKey(key);
  if (!name || !storage) return [];
  try { return normalize(JSON.parse(storage.getItem(name) || '[]')); }
  catch { return []; }
}

export function saveInputPlaceholderHistory(key, value, storage = getStorage()) {
  const name = storageKey(key);
  const text = typeof value === 'string' ? value.trim() : '';
  if (!name || !storage || !text || text.length > VALUE_LIMIT || /[\r\n]/.test(text)) {
    return getInputPlaceholderHistory(key, storage);
  }
  const next = normalize([text, ...getInputPlaceholderHistory(key, storage)]);
  try {
    storage.setItem(name, JSON.stringify(next));
    notify(key);
  } catch { /* Storage disabled / quota exceeded. */ }
  return next;
}

export function removeInputPlaceholderHistoryValue(key, value, storage = getStorage()) {
  const name = storageKey(key);
  const previous = getInputPlaceholderHistory(key, storage);
  if (!name || !storage || typeof value !== 'string') return previous;
  const next = previous.filter(text => text.toLocaleLowerCase() !== value.trim().toLocaleLowerCase());
  if (next.length !== previous.length) {
    try {
      if (next.length) storage.setItem(name, JSON.stringify(next));
      else storage.removeItem(name);
      notify(key);
    } catch { /* Storage disabled. */ }
  }
  return next;
}

export function clearInputPlaceholderHistory(key, storage = getStorage()) {
  const name = storageKey(key);
  if (!name || !storage) return;
  try {
    storage.removeItem(name);
    notify(key);
  } catch { /* Storage disabled. */ }
}
