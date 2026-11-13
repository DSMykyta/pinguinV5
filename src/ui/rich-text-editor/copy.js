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

/** Plain-text paste yields source tags; HTML-aware paste retains formatting. */
export function mountEditorCopy({ input }) {
  const controller = new AbortController();
  input.addEventListener('copy', event => {
    const selection = input.ownerDocument.getSelection();
    if (!event.clipboardData || !selection?.rangeCount || selection.isCollapsed) return;

    const html = serializeEditorSelection(input, selection.getRangeAt(0));
    if (!html) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', html);
    event.clipboardData.setData('text/html', html);
  }, { signal: controller.signal });
  return { dispose() { controller.abort(); } };
}
