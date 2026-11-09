/**
 * PINGUIN NEXT — RICH TEXT EDITOR COMPOSITION ROOT
 * Purpose: Isolated WYSIWYG + optional mirror, toolbar and statistics.
 * Dependencies: Own engine and optional views. Public API: createRichTextEditor.
 * Principle: Each view gets the editor contract, never imports a sibling view.
 */
import { createEditorEngine } from './engine.js';
import { sanitizeEditorHtml } from './sanitize.js';
import { mountToolbar } from './toolbar.js';
import { mountMirror } from './mirror.js';
import { mountStats } from './stats.js';

export function createRichTextEditor(host, options = {}) {
  if (!(host instanceof HTMLElement)) throw new TypeError('Editor host must be an HTMLElement');
  const config = { editable: true, toolbar: true, mirror: true, stats: true, ...options };
  const element = document.createElement('section');
  element.className = 'pg-rich-text-editor';
  element.dataset.pgModule = 'rich-text-editor';

  const main = document.createElement('div');
  main.className = 'pg-rich-text-editor__main';
  const toolbarSlot = document.createElement('div');
  const surface = document.createElement('div');
  surface.className = 'pg-rich-text-editor__surface';
  const statsSlot = document.createElement('div');
  main.append(toolbarSlot, surface, statsSlot);
  element.append(main);

  const mirrorSlot = document.createElement('div');
  mirrorSlot.className = 'pg-rich-text-editor__side';
  if (config.mirror) {
    element.classList.add('pg-rich-text-editor--split');
    element.append(mirrorSlot);
  }

  host.append(element);
  let editor;
  try {
    editor = createEditorEngine({ element: surface, ...config });
  } catch (error) {
    element.remove();
    throw error;
  }

  const mounted = [];
  const views = [
    ['toolbar', config.toolbar, () => mountToolbar({ container: toolbarSlot, editor })],
    ['mirror', config.mirror, () => mountMirror({ container: mirrorSlot, editor })],
    ['stats', config.stats, () => mountStats({ container: statsSlot, editor })],
  ];
  for (const [name, enabled, install] of views) {
    if (!enabled) continue;
    try { mounted.push(install()); }
    catch (error) { console.error('[rich-text-editor:' + name + ']', error); }
  }

  let destroyed = false;
  return Object.freeze({
    element,
    getJSON: () => editor.getJSON(),
    getHTML: () => sanitizeEditorHtml(editor.getHTML()),
    getText: () => editor.getText(),
    setContent(content, { emitUpdate = true } = {}) {
      const normalized = typeof content === 'string' ? sanitizeEditorHtml(content) : content;
      editor.commands.setContent(normalized, { emitUpdate });
    },
    setEditable(value) { editor.setEditable(Boolean(value)); },
    focus() { editor.commands.focus(); },
    clear() { editor.commands.clearContent(); },
    on(eventName, callback) {
      editor.on(eventName, callback);
      return () => editor.off(eventName, callback);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const view of mounted) {
        try { view?.dispose?.(); } catch (error) { console.error('[rich-text-editor:dispose]', error); }
      }
      editor.destroy();
      element.remove();
    },
  });
}
