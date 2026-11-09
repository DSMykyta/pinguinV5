/**
 * PINGUIN NEXT — RICH TEXT STATISTICS TESTS
 * Native Node tests for independent logic without browser or engine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { countWords, getTextStats } from './text-stats.js';

test('empty document gives zero statistics', () => {
  assert.deepEqual(getTextStats(''), { characters: 0, words: 0, readingMinutes: 0 });
});
test('Ukrainian words and punctuation', () => {
  assert.equal(countWords('Привіт, світе!'), 2);
  assert.equal(getTextStats('один два три').readingMinutes, 1);
});
test('Unicode code points counted consistently', () => {
  assert.equal(getTextStats('A🙂').characters, 2);
});
