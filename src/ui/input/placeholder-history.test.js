/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PLACEHOLDER HISTORY TESTS                                          ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Валідація ключів, ізоляції, лімітів та збоїв storage.                  ║
 * ║ ЗАЛЕЖНОСТІ: node:test, node:assert, ./placeholder-history.js.                    ║
 * ║ ПУБЛІЧНИЙ API: node --test src/ui/input/placeholder-history.test.js.              ║
 * ║ ПРИНЦИП: Тест без браузера та глобального localStorage.                            ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getInputPlaceholderHistory, saveInputPlaceholderHistory, clearInputPlaceholderHistory,
} from './placeholder-history.js';

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key),
  };
}

test('history records only explicit keys, deduplicates and keeps independent fields', () => {
  const storage = memoryStorage();
  saveInputPlaceholderHistory('product-feature', 'Sugar Free', storage);
  saveInputPlaceholderHistory('product-feature', 'Time Release', storage);
  saveInputPlaceholderHistory('product-feature', 'sugar free', storage);
  saveInputPlaceholderHistory('other-field', '50 mg', storage);
  saveInputPlaceholderHistory('', 'hidden', storage);
  assert.deepEqual(getInputPlaceholderHistory('product-feature', storage), ['sugar free', 'Time Release']);
  assert.deepEqual(getInputPlaceholderHistory('other-field', storage), ['50 mg']);
  assert.deepEqual(getInputPlaceholderHistory('', storage), []);
  clearInputPlaceholderHistory('product-feature', storage);
  assert.deepEqual(getInputPlaceholderHistory('product-feature', storage), []);
  assert.deepEqual(getInputPlaceholderHistory('other-field', storage), ['50 mg']);
});

test('history limits count and length and ignores multiline or empty values', () => {
  const storage = memoryStorage();
  for (let i = 0; i < 18; i++) saveInputPlaceholderHistory('feature', String(i), storage);
  saveInputPlaceholderHistory('feature', ' '.repeat(10), storage);
  saveInputPlaceholderHistory('feature', 'x'.repeat(101), storage);
  saveInputPlaceholderHistory('feature', 'two\nlines', storage);
  assert.equal(getInputPlaceholderHistory('feature', storage).length, 12);
  assert.equal(getInputPlaceholderHistory('feature', storage)[0], '17');
});

test('unavailable or corrupted storage is non-fatal', () => {
  const broken = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } };
  assert.deepEqual(getInputPlaceholderHistory('feature', broken), []);
  assert.deepEqual(saveInputPlaceholderHistory('feature', 'abc', broken), ['abc']);
  assert.doesNotThrow(() => clearInputPlaceholderHistory('feature', broken));
  const invalid = { getItem: () => '{invalid', setItem() {} };
  assert.deepEqual(getInputPlaceholderHistory('feature', invalid), []);
});
