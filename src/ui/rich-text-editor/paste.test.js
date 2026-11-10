/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HTML SOURCE RECOGNITION, INDEPENDENT OF BROWSER.                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Реалізація paste із самостійним контрактом.                                            ║
 * ║ ЗАЛЕЖНОСТІ: node:test, node:assert/strict, ./paste.js                                               ║
 * ║ ПУБЛІЧНИЙ API: Набір тестів Node.js.                                                                ║
 * ║ ПРИНЦИП: Ізольована поведінка, без зв'язків між features.                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getPastedHtmlSource } from './paste.js';

test('recognizes a formatted product description copied as plain text', () => {
  const html = '<p><strong>Комплекс</strong> — опис</p>\n<h3>Особливості</h3>\n<ul><li>Магній</li></ul>';
  assert.equal(getPastedHtmlSource(html), html);
});
test('recognizes HTML copied from a fenced code block', () => {
  assert.equal(getPastedHtmlSource('\x60\x60\x60html\n<p>Привіт</p>\n\x60\x60\x60'), '<p>Привіт</p>');
});
test('does not interpret ordinary text containing angle brackets as markup', () => {
  for (const input of ['Вміст < 10 г', 'Текст <strong> без закриття', 'Просто абзац', '<3', 'Ціна <strong>вигідна</strong>']) {
    assert.equal(getPastedHtmlSource(input), null);
  }
});
test('does not interpret standalone executable snippets as HTML', () => {
  assert.equal(getPastedHtmlSource('<script>alert(1)</script>'), null);
  assert.equal(getPastedHtmlSource('<img src=x onerror=alert(1)>'), null);
});
