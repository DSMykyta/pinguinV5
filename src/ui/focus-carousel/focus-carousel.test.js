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
import { getCarouselFocus } from './focus-carousel.js';

test('focus has equal edges, a center plateau and continuous interpolation', () => {
  assert.deepEqual(getCarouselFocus(0), { scale: .85, opacity: .7 });
  assert.deepEqual(getCarouselFocus(1), getCarouselFocus(0));
  assert.deepEqual(getCarouselFocus(.5), { scale: 1, opacity: 1 });
  assert.deepEqual(getCarouselFocus(.3), getCarouselFocus(.5));
  assert.ok(Math.abs(getCarouselFocus(.15).scale - .925) < 1e-9);
  assert.ok(Math.abs(getCarouselFocus(.85).scale - .925) < 1e-9);
  assert.deepEqual(getCarouselFocus(-1), getCarouselFocus(0));
});
