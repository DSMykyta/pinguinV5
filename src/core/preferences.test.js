import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PREFERENCES,
  SHELL_STORAGE_KEY,
  normalizePreferences,
  loadPreferences,
  savePreferences,
} from './preferences.js';

function createStorage() {
  const content = new Map();
  return {
    getItem: key => content.get(key) ?? null,
    setItem: (key, value) => content.set(key, value),
  };
}

test('default preferences use system theme and expanded navigation', () => {
  assert.deepEqual(normalizePreferences(null), DEFAULT_PREFERENCES);
});

test('invalid stored values are replaced with safe defaults', () => {
  assert.deepEqual(normalizePreferences({
    theme: 'neon',
    sidebarCollapsed: 'yes',
    asideOpen: false,
  }), { theme: 'system', sidebarCollapsed: false, asideOpen: false });
});

test('preferences round-trip through storage', () => {
  const storage = createStorage();
  const values = { theme: 'dark', sidebarCollapsed: true, asideOpen: false };
  assert.equal(savePreferences(storage, values), true);
  assert.ok(storage.getItem(SHELL_STORAGE_KEY));
  assert.deepEqual(loadPreferences(storage), values);
});

test('storage failures cannot crash the application shell', () => {
  const brokenStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  assert.deepEqual(loadPreferences(brokenStorage), DEFAULT_PREFERENCES);
  assert.equal(savePreferences(brokenStorage, DEFAULT_PREFERENCES), false);
});
