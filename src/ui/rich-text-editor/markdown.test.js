/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MARKDOWN DETECTION TESTS
 * ╠════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Незалежна поведінка текстового редактора.
 * ║ ЗАЛЕЖНОСТІ: node:test, node:assert/strict, ./markdown.js
 * ║ ПУБЛІЧНИЙ API: node --test
 * ║ ПРИНЦИП: Один власник стану, без залежності від Shell або features.
 * ╚════════════════════════════════════════════════════════════════════╝
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getPastedMarkdown } from './markdown.js';
test('recognizes strong Markdown evidence and explicit MIME', () => {
  for (const value of ['## Heading\n\n**Bold**', '- one\n- two', '[link](https://example.com)', '~~strike~~']) assert.equal(getPastedMarkdown(value), value);
  assert.equal(getPastedMarkdown('ordinary text', true), 'ordinary text');
});
test('plain prose does not change format', () => {
  for (const value of ['plain text', '10 * 2', '- one', 'Ціна < 10', 'one_two', '#123']) assert.equal(getPastedMarkdown(value), null);
});
