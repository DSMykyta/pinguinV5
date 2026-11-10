/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — RICH TEXT PASTE                                                                      ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: One optional input behavior: clipboard HTML, HTML source copied as text,               ║
 * ║ ЗАЛЕЖНОСТІ: ./html.js, ./commands.js                                                                ║
 * ║ ПУБЛІЧНИЙ API: getPastedHtmlSource(), mountEditorPaste()                                            ║
 * ║ ПРИНЦИП: and ordinary text all use the existing safe DOM parser. No global listeners.               ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { parseSafeHtml } from './html.js';
import { getEditorSelection } from './commands.js';

const STARTS_WITH_MARKUP = /^<(?:!doctype\s+html\b|html\b|body\b|p\b|div\b|h[1-3]\b|ul\b|ol\b|li\b|blockquote\b|strong\b|em\b|b\b|i\b|u\b|s\b|a\b|pre\b|code\b|br\b|hr\b)/i;
const HAS_ENDING_TAG = /<\/(?:html|body|p|div|h[1-3]|ul|ol|li|blockquote|strong|em|b|i|u|s|a|pre|code)\s*>|<(?:br|hr)(?:\s[^<>]*)?\s*\/?>/i;
const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'ul', 'ol', 'blockquote', 'pre']);

/** Recognize a complete HTML snippet, not incidental text containing angle brackets. */
export function getPastedHtmlSource(value) {
  const raw = String(value ?? '').trim();
  const fenced = /^\x60\x60\x60(?:html)?[ \t]*\r?\n([\s\S]*?)\r?\n\x60\x60\x60$/i.exec(raw);
  const html = fenced ? fenced[1].trim() : raw;
  return STARTS_WITH_MARKUP.test(html) && HAS_ENDING_TAG.test(html) ? html : null;
}

function fragmentContainsBlocks(fragment) {
  return [...fragment.childNodes].some(node => node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.localName));
}

function topLevelTextBlock(root, start) {
  let node = start.nodeType === Node.ELEMENT_NODE ? start : start.parentElement;
  while (node && node !== root) {
    if (node.parentElement === root && ['p', 'div', 'h1', 'h2', 'h3', 'blockquote'].includes(node.localName)) return node;
    node = node.parentElement;
  }
  return null;
}

function setCaretAfter(root, last) {
  if (!last) return;
  const selection = root.ownerDocument.getSelection();
  const caret = root.ownerDocument.createRange();
  caret.setStartAfter(last);
  caret.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(caret);
}

function insertFragment(root, fragment) {
  const range = getEditorSelection(root);
  const last = fragment.lastChild;
  if (!range) {
    root.append(fragment);
    setCaretAfter(root, last);
    return;
  }

  if (fragmentContainsBlocks(fragment)) {
    const block = range.collapsed ? topLevelTextBlock(root, range.startContainer) : null;
    if (block) {
      // Full HTML paragraphs/lists must be siblings, not nested inside <p>.
      const after = range.cloneRange();
      after.setEnd(block, block.childNodes.length);
      const tail = after.extractContents();
      const nextBlock = block.cloneNode(false);
      nextBlock.append(tail);
      block.after(fragment, nextBlock);
      if (!nextBlock.textContent?.trim() && !nextBlock.querySelector('br')) nextBlock.remove();
      if (!block.textContent?.trim() && !block.querySelector('br')) block.remove();
      setCaretAfter(root, last);
      return;
    }
  }
  range.deleteContents();
  range.insertNode(fragment);
  setCaretAfter(root, last);
}

function insertPlainText(root, plain) {
  const fragment = root.ownerDocument.createDocumentFragment();
  String(plain).replace(/\r\n?/g, '\n').split('\n').forEach((part, index) => {
    if (index) fragment.append(root.ownerDocument.createElement('br'));
    fragment.append(root.ownerDocument.createTextNode(part));
  });
  insertFragment(root, fragment);
}

export function mountEditorPaste({ input, isEditable, onInput }) {
  const controller = new AbortController();
  input.addEventListener('paste', event => {
    if (!isEditable()) return;
    const rich = event.clipboardData?.getData('text/html') || '';
    const plain = event.clipboardData?.getData('text/plain') || '';
    if (!rich && !plain) return;
    event.preventDefault();

    const source = getPastedHtmlSource(plain);
    // A copied code block may provide rich HTML wrapping literal HTML source.
    const richAsText = rich ? new DOMParser().parseFromString(rich, 'text/html').body.textContent : '';
    if (source && (!rich || getPastedHtmlSource(richAsText))) {
      insertFragment(input, parseSafeHtml(source));
    } else if (rich) {
      insertFragment(input, parseSafeHtml(rich));
    } else {
      insertPlainText(input, plain);
    }
    onInput();
  }, { signal: controller.signal });
  input.addEventListener('drop', event => event.preventDefault(), { signal: controller.signal });
  return { dispose() { controller.abort(); } };
}
