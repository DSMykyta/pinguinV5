/**
 * PINGUIN NEXT — RICH TEXT ENGINE
 * Purpose: One ProseMirror/Tiptap document and transaction history per editor.
 * Dependencies: Tiptap, shared HTML sanitizer. Public API: createEditorEngine.
 * Principle: No toolbar, app state or global page listeners.
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { sanitizeEditorHtml } from './sanitize.js';

export function createEditorEngine({ element, content = '<p></p>', editable = true, extensions = [], onChange } = {}) {
  if (!(element instanceof HTMLElement)) throw new TypeError('Editor surface must be an HTMLElement');
  const normalized = typeof content === 'string' ? sanitizeEditorHtml(content) : content;
  return new Editor({
    element,
    content: normalized,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
      ...extensions,
    ],
    editorProps: {
      attributes: { class: 'pg-rich-text-editor__content', 'aria-label': 'Текстовий редактор' },
      transformPastedHTML: sanitizeEditorHtml,
    },
    onUpdate({ editor, transaction }) {
      if (transaction.docChanged) {
        onChange?.({ json: editor.getJSON(), html: sanitizeEditorHtml(editor.getHTML()), text: editor.getText() });
      }
    },
  });
}
