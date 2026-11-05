/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ROUTER TESTS                                                                        ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє перехід між адресами та історію.                                            ║
 * ║ ЗАЛЕЖНОСТІ: Node.js test, router.                                                                  ║
 * ║ ПУБЛІЧНИЙ API: Модульні тести.                                                                     ║
 * ║ ПРИНЦИП: Тестовий браузер замість window.                                                          ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from './router.js';
import { createPageRegistry } from './page-registry.js';

function createBrowser() {
  const listeners = new Map();
  const browser = {
    location: { pathname: '/' },
    history: {
      pushState: (_state, _title, pathname) => { browser.location.pathname = pathname; },
      replaceState: (_state, _title, pathname) => { browser.location.pathname = pathname; },
    },
    addEventListener: (name, callback) => { listeners.set(name, callback); },
    removeEventListener: name => { listeners.delete(name); },
    emit: name => listeners.get(name)?.(),
  };
  return browser;
}

test('router navigates valid routes, ignores duplicates and handles back', () => {
  const browser = createBrowser();
  const registry = createPageRegistry([
    { id: 'settings', route: '/', type: 'settings', title: 'Налаштування', load: async () => ({}) },
    { id: 'table-generator', route: '/table-generator', type: 'tool', title: 'Таблиці', load: async () => ({}) },
  ]);
  const resolved = [];
  const router = createRouter({ browserWindow: browser, registry, onChange: page => resolved.push(page?.id ?? null) });
  router.start();
  assert.deepEqual(resolved, ['settings']);
  assert.equal(router.navigate('/table-generator'), true);
  assert.equal(browser.location.pathname, '/table-generator');
  assert.equal(router.navigate('/table-generator'), true);
  assert.deepEqual(resolved, ['settings', 'table-generator']);
  assert.equal(router.navigate('/not-a-page'), false);
  browser.location.pathname = '/';
  browser.emit('popstate');
  assert.deepEqual(resolved, ['settings', 'table-generator', 'settings']);
  router.stop();
  browser.location.pathname = '/table-generator';
  browser.emit('popstate');
  assert.equal(resolved.length, 3);
});


test('root replaces itself with the configured functional start page', () => {
  const browser = createBrowser();
  const registry = createPageRegistry([
    { id: 'tools', route: '/tools', type: 'tool', title: 'Інструменти',
      load: async () => ({}) },
  ]);
  const changes = [];
  const router = createRouter({
    browserWindow: browser, registry, defaultRoute: '/tools',
    onChange: page => changes.push(page?.id),
  });
  router.start();
  assert.equal(browser.location.pathname, '/tools');
  assert.deepEqual(changes, ['tools']);
  assert.equal(router.navigate('/'), false);
  router.stop();
});
