/** Pure text statistics checks without a browser or npm. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getEditorTextStats } from './stats.js';

test('empty document has zero words and characters', () => {
  assert.deepEqual(getEditorTextStats(''), { characters: 0, words: 0 });
});
test('Ukrainian words ignore punctuation', () => {
  assert.equal(getEditorTextStats('Привіт, світе!').words, 2);
});
test('Unicode code points counted without surrogate-pair duplication', () => {
  assert.equal(getEditorTextStats('A🙂').characters, 2);
});
