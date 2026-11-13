/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — RICH TEXT EDITOR COPY                                                               ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Copy selected WYSIWYG content as safe HTML source, preserving enclosing markup.       ║
 * ║ ЗАЛЕЖНОСТІ: ./html.js                                                                              ║
 * ║ ПУБЛІЧНИЙ API: serializeEditorSelection(), mountEditorCopy()                                       ║
 * ║ ПРИНЦИП: Clipboard behavior only; no editor state, history, global listeners or other components.  ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { serializeSafeHtml } from './html.js';

/** Reapply enclosing markup omitted by Range.cloneContents() for partial selections. */
export function serializeEditorSelection(input, range) {
  if (!range || range.collapsed ||
      !input.contains(range.startContainer) || !input.contains(range.endContainer)) return '';

  let fragment = range.cloneContents();
  let ancestor = range.commonAncestorContainer;
  if (ancestor.nodeType !== Node.ELEMENT_NODE) ancestor = ancestor.parentNode;

  while (ancestor && ancestor !== input) {
    if (ancestor.nodeType === Node.ELEMENT_NODE) {
      const wrapper = ancestor.cloneNode(false);
      wrapper.append(fragment);
      fragment = input.ownerDocument.createDocumentFragment();
      fragment.append(wrapper);
    }
    ancestor = ancestor.parentNode;
  }

  const holder = input.ownerDocument.createElement('div');
  holder.append(fragment);
  return serializeSafeHtml(holder);
}

/**
 * HTML-aware targets prefer text/html over text/plain. If we place the actual
 * markup in text/html, the target renders it and its tags vanish from view.
 * Encode it as text inside <pre> so both plain and rich targets paste HTML
 * SOURCE rather than visually formatted text.
 */
function sourceAsClipboardHtml(html, doc) {
  const holder = doc.createElement('div');
  holder.textContent = html;
  return '<pre>' + holder.innerHTML + '</pre>';
}

/** Copy a visual selection as literal, sanitized HTML source in both MIME paths. */
export function mountEditorCopy({ input }) {
  const controller = new AbortController();
  input.addEventListener('copy', event => {
    const selection = input.ownerDocument.getSelection();
    if (!event.clipboardData || !selection?.rangeCount || selection.isCollapsed) return;

    const html = serializeEditorSelection(input, selection.getRangeAt(0));
    if (!html) return;
    event.preventDefault();
    // Paste into textarea => raw tags; paste into rich editor => visible tags.
    event.clipboardData.setData('text/plain', html);
    event.clipboardData.setData('text/html', sourceAsClipboardHtml(html, input.ownerDocument));
  }, { signal: controller.signal });
  return { dispose() { controller.abort(); } };
}
