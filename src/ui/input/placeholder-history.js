/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — INPUT PLACEHOLDER HISTORY                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Opt-in локальна історія значень несекретних полів.                    ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API Web Storage; без UI та features.                       ║
 * ║ ПУБЛІЧНИЙ API: getInputPlaceholderHistory(), saveInputPlaceholderHistory(),        ║
 * ║                clearInputPlaceholderHistory().                                     ║
 * ║ ПРИНЦИП: Жодного збереження без явного ключа, відмова storage не ламає Input.       ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

const STORAGE_PREFIX = 'pg:v1:input-placeholder-history:';
const HISTORY_LIMIT = 12;
const VALUE_LIMIT = 100;

function getStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function storageKey(key) {
  if (typeof key !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.\[\]-]{0,119}$/.test(key)) return '';
  return STORAGE_PREFIX + encodeURIComponent(key);
}

export function getInputPlaceholderHistory(key, storage = getStorage()) {
  const name = storageKey(key);
  if (!name || !storage) return [];
  try {
    const values = JSON.parse(storage.getItem(name) || '[]');
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter(value =>
      typeof value === 'string' && value.trim() && value.length <= VALUE_LIMIT
    ))].slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function saveInputPlaceholderHistory(key, value, storage = getStorage()) {
  const name = storageKey(key);
  const text = typeof value === 'string' ? value.trim() : '';
  if (!name || !storage || !text || text.length > VALUE_LIMIT || /[\r\n]/.test(text)) {
    return getInputPlaceholderHistory(key, storage);
  }
  const values = getInputPlaceholderHistory(key, storage)
    .filter(item => item.toLocaleLowerCase() !== text.toLocaleLowerCase());
  values.unshift(text);
  const updated = values.slice(0, HISTORY_LIMIT);
  try { storage.setItem(name, JSON.stringify(updated)); } catch { /* Storage disabled/quota. */ }
  return updated;
}

export function clearInputPlaceholderHistory(key, storage = getStorage()) {
  const name = storageKey(key);
  if (!name || !storage) return;
  try { storage.removeItem(name); } catch { /* Storage disabled. */ }
}
