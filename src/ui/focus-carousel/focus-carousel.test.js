/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FOCUS CAROUSEL TEST
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевірка симетричної шкали фокусу.
 * ║ ЗАЛЕЖНОСТІ: DOM, CSS і спільні токени.
 * ║ ПУБЛІЧНИЙ API: Node test.
 * ║ ПРИНЦИП: Незалежний екземпляр, без глобального стану.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCarouselFocus, getCarouselIndex } from './focus-carousel.js';

test('focus has equal edges, a center plateau and continuous interpolation', () => {
  assert.deepEqual(getCarouselFocus(0), { scale: .85, opacity: .7 });
  assert.deepEqual(getCarouselFocus(1), getCarouselFocus(0));
  assert.deepEqual(getCarouselFocus(.5), { scale: 1, opacity: 1 });
  assert.deepEqual(getCarouselFocus(.3), getCarouselFocus(.5));
  assert.ok(Math.abs(getCarouselFocus(.15).scale - .925) < 1e-9);
  assert.ok(Math.abs(getCarouselFocus(.85).scale - .925) < 1e-9);
  assert.deepEqual(getCarouselFocus(-1), getCarouselFocus(0));
});

test('logical index wraps only in loop mode', () => {
  assert.equal(getCarouselIndex(-1, 5, true), 4);
  assert.equal(getCarouselIndex(5, 5, true), 0);
  assert.equal(getCarouselIndex(11, 5, true), 1);
  assert.equal(getCarouselIndex(-1, 5), 0);
  assert.equal(getCarouselIndex(5, 5), 4);
  assert.equal(getCarouselIndex(0, 0, true), 0);
});
