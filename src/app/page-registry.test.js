/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PAGE REGISTRY TESTS                                                                 ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Тестує типи сторінок, URL і дублікати маршрутів.                                      ║
 * ║ ЗАЛЕЖНОСТІ: Node.js test, page-registry.                                                           ║
 * ║ ПУБЛІЧНИЙ API: Модульні тести.                                                                     ║
 * ║ ПРИНЦИП: Не використовує браузер.                                                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPageRegistry, normalizePathname, pageRegistry } from './page-registry.js';
import { PAGE_TYPES, isPageType } from './page-types.js';

const testPage = (id, route, options = {}) => ({
  id, route, type: PAGE_TYPES.tool, title: id,
  load: async () => ({ mount: () => () => {} }),
  ...options,
});

test('page types form a stable finite vocabulary', () => {
  assert.equal(isPageType('overview'), false);
  assert.equal(isPageType('tool'), true);
  assert.equal(isPageType('collection'), true);
  assert.equal(isPageType('record'), true);
  assert.equal(isPageType('settings'), true);
  assert.equal(isPageType('dashboard'), false);
});

test('normalizePathname strips trailing slash and query strings', () => {
  assert.equal(normalizePathname('/'), '/');
  assert.equal(normalizePathname('/table-generator/'), '/table-generator');
  assert.equal(normalizePathname('table-generator?mode=html'), '/table-generator');
  assert.equal(normalizePathname('/products/item-1/#edit'), '/products/item-1');
});

test('registry resolves real pages and excludes unshipped features', () => {
  assert.equal(pageRegistry.resolve('/'), null);
  assert.equal(pageRegistry.resolve('/table-generator'), null);
  assert.equal(pageRegistry.resolve('/tools')?.id, 'tools');
  assert.equal(pageRegistry.resolve('/login-demo')?.id, 'login-demo');
  assert.deepEqual(pageRegistry.resolve('/login-demo')?.shellControls,
    { headerActions: false, quickActions: false });
  assert.deepEqual(pageRegistry.getNavigation().map(page => page.id), ['tools', 'login-demo']);
});

test('registry rejects invalid and duplicate manifests', () => {
  assert.throws(() => createPageRegistry([testPage('tool', '/bad path')]), /Invalid page route/);
  assert.throws(() => createPageRegistry([testPage('tool', '/tool', { type: 'unknown' })]), /Invalid page type/);
  assert.throws(() => createPageRegistry([testPage('tool', '/tool'), testPage('tool', '/another')]), /Duplicate/);
  assert.throws(() => createPageRegistry([testPage('tool-a', '/tool'), testPage('tool-b', '/tool')]), /Duplicate/);
});

test('optional Shell controls accept only declared boolean capabilities', () => {
  assert.equal(createPageRegistry([testPage('default', '/default')])
    .resolve('/default').shellControls, undefined);
  assert.throws(() => createPageRegistry([
    testPage('bad', '/bad', { shellControls: { quickActions: 'false' } }),
  ]), /Invalid Shell control/);
  assert.throws(() => createPageRegistry([
    testPage('bad', '/bad', { shellControls: { other: false } }),
  ]), /Invalid Shell control/);
  assert.throws(() => createPageRegistry([
    testPage('bad', '/bad', { shellControls: false }),
  ]), /Shell controls must be an object/);
});

test('navigation ordering is deliberate and never materializes hidden pages', () => {
  const registry = createPageRegistry([
    testPage('second', '/second', { navigation: { icon: 'house', order: 20 } }),
    testPage('hidden', '/hidden'),
    testPage('first', '/first', { navigation: { icon: 'house', order: 10 } }),
  ]);
  assert.deepEqual(registry.getNavigation().map(x => x.id), ['first', 'second']);
});
