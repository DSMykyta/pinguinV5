/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HOLOGRAPHIC FOIL POSE TEST
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Опційний шар голографічного відбиття.
 * ║ ЗАЛЕЖНОСТІ: Node test, чиста функція getFoilPose().
 * ║ ПУБЛІЧНИЙ API: createHolographicFoil(), setOptions(), destroy().
 * ║ ПРИНЦИП: Окремі екземпляри; без таймерів, глобального стану чи залежності від feature.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFoilPose } from './holographic-foil.js';

const rect = { left: 100, top: 50, width: 400, height: 200 };
test('center is neutral; edges map to bounded, opposite background travel', () => {
  assert.deepEqual(getFoilPose(300, 150, rect), { x: 50, y: 50, rotateX: 0, rotateY: 0, backgroundX: 50, backgroundY: 50 });
  const left = getFoilPose(0, 0, rect);
  const right = getFoilPose(900, 900, rect);
  assert.deepEqual(left, { x: 0, y: 0, rotateX: 10, rotateY: -12, backgroundX: 15, backgroundY: 25 });
  assert.deepEqual(right, { x: 100, y: 100, rotateX: -10, rotateY: 12, backgroundX: 85, backgroundY: 75 });
  assert.equal(getFoilPose(100, 100, { left: 0, top: 0, width: 0, height: 0 }).backgroundX, 50);
});
