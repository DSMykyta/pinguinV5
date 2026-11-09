/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PREFERENCES TESTS                                                                   ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє збереження та сумісність з V5.                                              ║
 * ║ ЗАЛЕЖНОСТІ: Node.js test, preferences.                                                             ║
 * ║ ПУБЛІЧНИЙ API: Модульні тести.                                                                     ║
 * ║ ПРИНЦИП: Без даних користувача.                                                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PREFERENCES,
  SHELL_STORAGE_KEY,
  LEGACY_THEME_KEY,
  normalizePreferences,
  loadPreferences,
  savePreferences,
  loadStoredValue,
  saveStoredValue,
  createStoredChoice,
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
  }), { theme: 'system', sidebarCollapsed: false, asideOpen: false, asidePinned: false });
});

test('preferences round-trip through storage', () => {
  const storage = createStorage();
  const values = { theme: 'dark', sidebarCollapsed: true, asideOpen: false, asidePinned: false };
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


test('legacy V5 theme-mode overrides older workspace setting', () => {
  const storage = createStorage();
  storage.setItem(SHELL_STORAGE_KEY, JSON.stringify({ theme: 'light', sidebarCollapsed: false, asideOpen: false }));
  storage.setItem(LEGACY_THEME_KEY, 'dark');
  assert.equal(loadPreferences(storage).theme, 'dark');
});

test('saving shell preferences also keeps the legacy theme-mode key current', () => {
  const storage = createStorage();
  savePreferences(storage, { theme: 'dark', sidebarCollapsed: false, asideOpen: false });
  assert.equal(storage.getItem(LEGACY_THEME_KEY), 'dark');
});


test('pinned context is persisted, restored and cannot remain logically closed', () => {
  const storage = createStorage();
  savePreferences(storage, { theme: 'system', sidebarCollapsed: true, asideOpen: false, asidePinned: true });
  assert.deepEqual(loadPreferences(storage), {
    theme: 'system', sidebarCollapsed: true, asideOpen: true, asidePinned: true,
  });
  assert.deepEqual(normalizePreferences({ asidePinned: 'yes', asideOpen: true }), {
    theme: 'system', sidebarCollapsed: false, asideOpen: true, asidePinned: false,
  });
});

test('shared preference IO tolerates invalid JSON and unavailable storage', () => {
  const storage = createStorage();
  storage.setItem('pg:v1:brands:view', '{invalid-json');
  assert.equal(loadStoredValue(storage, 'pg:v1:brands:view', 'table'), 'table');
  assert.equal(loadStoredValue(null, 'pg:v1:brands:view', 'table'), 'table');
  assert.equal(saveStoredValue(storage, 'pg:v1:brands:view', 'tiles'), true);
  assert.equal(loadStoredValue(storage, 'pg:v1:brands:view', 'table'), 'tiles');
  const blocked = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(loadStoredValue(blocked,'pg:v1:brands:view','table'),'table');
  assert.equal(saveStoredValue(blocked,'pg:v1:brands:view','tiles'),false);
});

test('stored choices persist across instances, validate allowed values, and isolate features', () => {
  const storage = createStorage();
  const props = {storage,choices:['table','tiles'],defaultValue:'table'};
  const brands = createStoredChoice({...props,key:'pg:v1:brands:view'});
  const products = createStoredChoice({...props,key:'pg:v1:products:view'});
  assert.equal(brands.getValue(),'table');
  assert.equal(brands.setValue('tiles'),true);
  assert.equal(brands.getValue(),'tiles');
  assert.equal(products.getValue(),'table');
  assert.equal(createStoredChoice({...props,key:'pg:v1:brands:view'}).getValue(),'tiles');
  assert.throws(()=>brands.setValue('random'),RangeError);
  assert.throws(()=>createStoredChoice({...props,key:'unversioned'}),TypeError);
  storage.setItem('pg:v1:products:view',JSON.stringify('broken'));
  assert.equal(createStoredChoice({...props,key:'pg:v1:products:view'}).getValue(),'table');
});

test('choice continues within session when persistence is blocked', () => {
  const storage = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  const choice = createStoredChoice({
    storage,key:'pg:v1:tools-data-views:view',choices:['table','tiles'],defaultValue:'table',
  });
  assert.equal(choice.setValue('tiles'),false);
  assert.equal(choice.getValue(),'tiles');
});
