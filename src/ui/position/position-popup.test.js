/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — POPUP POSITIONING TESTS                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Test shared block and submenu inline placement without a browser.     ║
 * ║ ЗАЛЕЖНОСТІ: node:test, node:assert, ./position-popup.js.                          ║
 * ║ ПУБЛІЧНИЙ API: node --test src/ui/position/position-popup.test.js.                ║
 * ║ ПРИНЦИП: Existing vertical popup placement remains backward-compatible.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionPopup } from './position-popup.js';

class FakeElement {
  constructor(rect = {}, scrollHeight = 120) {
    this.rect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect };
    this.scrollHeight = scrollHeight;
    this.style = {};
  }
  getBoundingClientRect() {
    return { ...this.rect,
      height: Math.min(this.scrollHeight, Number.parseFloat(this.style.maxHeight) || this.scrollHeight),
      width: Number.parseFloat(this.style.width) || this.rect.width };
  }
}

function position(anchorRect, width, height, options = {}, viewport = { width: 800, height: 600 }) {
  const previousWindow = globalThis.window;
  const previousHTMLElement = globalThis.HTMLElement;
  globalThis.window = { innerWidth: viewport.width, innerHeight: viewport.height };
  globalThis.HTMLElement = FakeElement;
  try {
    const anchor = new FakeElement(anchorRect);
    const popup = new FakeElement({}, height);
    const result = positionPopup({ anchor, popup, matchWidth: false,
      preferredWidth: width, ...options });
    return { ...result, style: popup.style };
  } finally {
    globalThis.window = previousWindow;
    globalThis.HTMLElement = previousHTMLElement;
  }
}

test('block popup preserves existing downward positioning', () => {
  const pos = position({ left: 20, top: 30, right: 120, bottom: 60, width: 100 }, 180, 100);
  assert.equal(pos.direction, 'down');
  assert.equal(pos.left, 20);
  assert.equal(pos.top, 64);
  assert.equal(pos.width, 180);
});

test('block popup still opens upward without a large extra gap', () => {
  const pos = position({ left: 20, top: 430, right: 120, bottom: 470, width: 100 },
    180, 110, {}, { width: 800, height: 500 });
  assert.equal(pos.direction, 'up');
  assert.equal(pos.top, 316);
  assert.equal(pos.height, 110);
});

test('submenu opens right aligned to its own parent row', () => {
  const pos = position({ left: 32, top: 65, right: 172, bottom: 99, width: 140 },
    180, 90, { placement: 'inline' });
  assert.equal(pos.direction, 'right');
  assert.equal(pos.left, 176);
  assert.equal(pos.top, 65);
  assert.equal(pos.height, 90);
});

test('submenu flips left when right edge has no space', () => {
  const pos = position({ left: 300, top: 75, right: 340, bottom: 110, width: 40 },
    190, 120, { placement: 'inline' }, { width: 360, height: 500 });
  assert.equal(pos.direction, 'left');
  assert.equal(pos.width, 190);
  assert.equal(pos.left, 106);
  assert.equal(pos.top, 75);
});

test('submenu clamps vertically and shrinks on narrow screens', () => {
  const pos = position({ left: 120, top: 345, right: 200, bottom: 385, width: 80 },
    190, 210, { placement: 'inline' }, { width: 320, height: 400 });
  assert.equal(pos.direction, 'right');
  assert.equal(pos.width, 108);
  assert.equal(pos.left, 204);
  assert.equal(pos.top, 182);
});

test('unknown placement fails instead of silently using another geometry mode', () => {
  assert.throws(() => position({ left: 0, right: 90, bottom: 40 },
    180, 80, { placement: 'sideways' }), /Unknown popup placement/);
});
