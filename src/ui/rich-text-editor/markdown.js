/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MARKDOWN FORMAT
 * ╠════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Незалежна поведінка текстового редактора.
 * ║ ЗАЛЕЖНОСТІ: marked, turndown, ./html.js
 * ║ ПУБЛІЧНИЙ API: getPastedMarkdown(), markdownToHtml(), htmlToMarkdown()
 * ║ ПРИНЦИП: Один власник стану, без залежності від Shell або features.
 * ╚════════════════════════════════════════════════════════════════════╝
 */

import { marked } from 'marked';
import TurndownService from 'turndown';
import { parseSafeHtml, serializeSafeHtml } from './html.js';

const converter = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**' });
// CommonMark has no underline, and complex tables/ordered-list starts cannot
// be represented reliably by a generic serializer. Keep safe HTML extensions.
converter.keep(['u', 'table']);
converter.addRule('strike', {
  filter: ['s', 'del', 'strike'],
  replacement: content => '~~' + content + '~~',
});
converter.addRule('orderedStart', {
  filter: node => node.nodeName === 'OL' && node.hasAttribute('start') && node.getAttribute('start') !== '1',
  replacement: (_, node) => '\n\n' + node.outerHTML + '\n\n',
});

export function markdownToHtml(value, doc = document) {
  const raw = String(value ?? '');
  const holder = doc.createElement('div');
  holder.append(parseSafeHtml(marked.parse(raw, { gfm: true, async: false }), doc));
  return serializeSafeHtml(holder);
}
export function htmlToMarkdown(value, doc = document) {
  const holder = doc.createElement('div');
  holder.append(parseSafeHtml(value, doc));
  return converter.turndown(holder);
}

/** Strong syntactic evidence only; a lone hyphen, number or asterisk is plain text. */
export function getPastedMarkdown(value, explicit = false) {
  const raw = String(value ?? '').replace(/\r\n?/g, '\n');
  if (!raw.trim()) return null;
  const fence = /^(?:\x60{3,}|~{3,})(?:md|markdown)[ \t]*\n([\s\S]*?)\n(?:\x60{3,}|~{3,})[ \t]*$/i.exec(raw.trim());
  if (fence) return fence[1];
  if (explicit) return raw;
  if (/^(?: {0,3}#{1,6}[ \t]+\S| {0,3}>[ \t]+\S| {0,3}(?:\x60{3,}|~{3,})[^\n]*\n[\s\S]*?\n {0,3}(?:\x60{3,}|~{3,})[ \t]*$)/m.test(raw)) return raw;
  if (/^\S[^\n]*\n {0,3}(?:={3,}|-{3,})[ \t]*$/m.test(raw)) return raw;
  if ((raw.match(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+\S/gm) || []).length >= 2) return raw;
  if (/(?:\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\[[^\]\n]+\]\([^) \n]+\)|\x60[^\x60\n]+\x60)/.test(raw)) return raw;
  if (/^\s*\|.+\|\s*\n\s*\|?[\s:|-]*---[\s:|-]*$/m.test(raw)) return raw;
  return null;
}
