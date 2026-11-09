/**
 * PINGUIN NEXT — RICH TEXT MIRROR
 * Optional read-only projection. No mutations of the editable document.
 */
import { parseSafeHtml } from './html.js';

export function mountEditorMirror({ host, controls }) {
  const root = document.createElement('section');
  root.className = 'pg-rich-text-editor__mirror';
  root.setAttribute('aria-label', 'Дзеркальний перегляд');
  const bar = document.createElement('div');
  bar.className = 'pg-rich-text-editor__mirror-bar';
  const title = document.createElement('span');
  title.className = 'pg-rich-text-editor__mirror-label';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'pg-rich-text-editor__mode';
  toggle.setAttribute('aria-label', 'Перемкнути вигляд і HTML-код');
  const display = document.createElement('div');
  display.className = 'pg-rich-text-editor__mirror-content';
  let mode = 'preview';
  function render() {
    const html = controls.getHTML();
    title.textContent = mode === 'preview' ? 'Перегляд тексту' : 'HTML-код';
    toggle.textContent = mode === 'preview' ? 'HTML' : 'Вигляд';
    if (mode === 'html') {
      const source = document.createElement('pre');
      source.className = 'pg-rich-text-editor__code';
      source.textContent = html;
      display.replaceChildren(source);
      return;
    }
    const formatted = document.createElement('div');
    formatted.className = 'pg-rich-text-editor__formatted';
    formatted.append(parseSafeHtml(html));
    display.replaceChildren(formatted);
  }
  function onToggle() { mode = mode === 'preview' ? 'html' : 'preview'; render(); }
  toggle.addEventListener('click', onToggle);
  bar.append(title, toggle);
  root.append(bar, display);
  host.append(root);
  const unsubscribe = controls.subscribe(render);
  render();
  return {
    setMode(value) { if (value === 'html' || value === 'preview') { mode = value; render(); } },
    dispose() { unsubscribe(); toggle.removeEventListener('click', onToggle); root.remove(); },
  };
}
