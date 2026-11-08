/**
 * PINGUIN NEXT — PULL STATE TESTS
 * ПРИЗНАЧЕННЯ: Перевіряє межу прокручування й одиниці жестів.
 * ЗАЛЕЖНОСТІ: Node test та pull-state.
 * ПУБЛІЧНИЙ API: node --test.
 * ПРИНЦИП: Чиста логіка без DOM або редакторів.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isAtBoundary, normalizeWheelDelta, getPullProgress } from './pull-state.js';

test('only the requested edge is eligible, including fractional and rubber-band positions', () => {
  assert.equal(isAtBoundary({ scrollTop: 200, scrollHeight: 1000, clientHeight: 400 }, 'next'), false);
  assert.equal(isAtBoundary({ scrollTop: 599.5, scrollHeight: 1000, clientHeight: 400 }, 'next'), true);
  assert.equal(isAtBoundary({ scrollTop: 601, scrollHeight: 1000, clientHeight: 400 }, 'next'), true);
  assert.equal(isAtBoundary({ scrollTop: -12, scrollHeight: 1000, clientHeight: 400 }, 'previous'), true);
  assert.equal(isAtBoundary({ scrollTop: -12, scrollHeight: 1000, clientHeight: 400 }, 'next'), false);
  assert.equal(isAtBoundary({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 }, 'previous'), false);
});

test('a short panel has both boundaries', () => {
  const metrics = { scrollTop: 0, scrollHeight: 300, clientHeight: 400 };
  assert.equal(isAtBoundary(metrics, 'next'), true);
  assert.equal(isAtBoundary(metrics, 'previous'), true);
});

test('wheel units are normalized before an event contributes at most 60px', () => {
  assert.equal(normalizeWheelDelta({ deltaMode: 0, deltaY: 22 }, 400, 20), 22);
  assert.equal(normalizeWheelDelta({ deltaMode: 1, deltaY: 2 }, 400, 20), 40);
  assert.equal(normalizeWheelDelta({ deltaMode: 2, deltaY: -1 }, 400, 20), -60);
  assert.equal(normalizeWheelDelta({ deltaMode: 0, deltaY: 10000 }, 400, 20), 60);
  assert.equal(normalizeWheelDelta({ deltaMode: 0, deltaY: Infinity }, 400, 20), 0);
});

test('pull progress clamps, arms at 88px, and can be reversed', () => {
  assert.equal(getPullProgress(0), 0);
  assert.equal(getPullProgress(44), 0.5);
  assert.equal(getPullProgress(88), 1);
  assert.equal(getPullProgress(180), 1);
  assert.equal(getPullProgress(-50), 0);
  assert.equal(getPullProgress(20), 20 / 88);
});
