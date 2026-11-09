/**
 * PINGUIN NEXT — READ-ONLY EDITOR MIRROR
 * Optional projection; never changes document, selection or editor history.
 * Displays formatted preview or escaped HTML from the same editor instance.
 */
import { sanitizeEditorHtml } from './sanitize.js';

export function mountMirror({ container, editor, initialMode = 'preview' }) {
  const root = document.createElement('section');
  root.className = 'pg-rich-text-editor__mirror';
  root.setAttribute('aria-label', 'Дзеркальний перегляд');
  const header = document.createElement('div');
  header.className = 'pg-rich-text-editor__mirror-header';
  const title = document.createElement('span');
  title.className = 'pg-rich-text-editor__mirror-title';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pg-rich-text-editor__mirror-switch';
  button.setAttribute('aria-label', 'Перемкнути перегляд HTML');
  const body = document.createElement('div');
  body.className = 'pg-rich-text-editor__mirror-body';
  body.setAttribute('aria-live', 'off');
  let mode = initialMode === 'html' ? 'html' : 'preview';

  function render() {
    const html = sanitizeEditorHtml(editor.getHTML());
    if (mode === 'html') {
      const source = document.createElement('pre');
      source.className = 'pg-rich-text-editor__html';
      source.textContent = html;
      body.replaceChildren(source);
    } else {
      const preview = document.createElement('div');
      preview.className = 'pg-rich-text-editor__rendered';
      preview.innerHTML = html; // sanitized by strict allowlist; only this projection injects HTML
      body.replaceChildren(preview);
    }
    title.textContent = mode === 'preview' ? 'Перегляд' : 'HTML-код';
    button.textContent = mode === 'preview' ? 'HTML' : 'Вигляд';
  }

  function toggle() { mode = mode === 'preview' ? 'html' : 'preview'; render(); }
  button.addEventListener('click', toggle);
  header.append(title, button);
  root.append(header, body);
  container.append(root);
  editor.on('update', render);
  render();
  return {
    setMode(nextMode) {
      if (nextMode !== 'html' && nextMode !== 'preview') return;
      mode = nextMode;
      render();
    },
    dispose() {
      editor.off('update', render);
      button.removeEventListener('click', toggle);
      root.remove();
    },
  };
}
