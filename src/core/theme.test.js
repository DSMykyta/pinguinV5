import test from 'node:test';
import assert from 'node:assert/strict';
import { THEME_CYCLE, getNextTheme, resolveTheme, applyTheme } from './theme.js';

test('theme cycles in the exact legacy order', () => {
  assert.deepEqual(THEME_CYCLE, ['light', 'dark', 'system']);
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'system');
  assert.equal(getNextTheme('system'), 'light');
});

test('system theme follows system color scheme and explicit modes override it', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('only the dark resolved theme sets data-theme', () => {
  const attrs = new Map();
  const root = {
    setAttribute: (key, value) => attrs.set(key, value),
    removeAttribute: key => attrs.delete(key),
  };
  applyTheme(root, 'system', true);
  assert.equal(attrs.get('data-theme'), 'dark');
  applyTheme(root, 'light', true);
  assert.equal(attrs.has('data-theme'), false);
});
