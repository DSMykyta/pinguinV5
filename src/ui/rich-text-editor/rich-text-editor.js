/**
 * PINGUIN NEXT — RICH TEXT EDITOR
 * Purpose: Self-contained WYSIWYG, optional mirror, toolbar and stats.
 * Dependencies: native DOM + sibling UI units only; no npm install required.
 * API: createRichTextEditor({ content, editable, toolbar, mirror, stats, onChange }).
 * Principle: one editable state per instance; all projections are read-only.
 */
import { parseSafeHtml, serializeSafeHtml } from './html.js';
import { createEditorHistory, captureSelection, restoreSelection } from './history.js';
import { executeRichTextCommand, getEditorSelection } from './commands.js';
import { mountEditorToolbar } from './toolbar.js';
import { mountEditorMirror } from './mirror.js';
import { mountEditorStats } from './stats.js';

let nextId = 0;

export function createRichTextEditor({
  content = '', editable = true, toolbar = true, mirror = true,
  stats = true, label = 'Редактор тексту', onChange,
} = {}) {
  const element = document.createElement('section');
  element.className = 'pg-rich-text-editor';
  element.dataset.pgModule = 'rich-text-editor';
  if (mirror) element.classList.add('pg-rich-text-editor--split');
  const main = document.createElement('div');
  main.className = 'pg-rich-text-editor__main';
  const toolsHost = document.createElement('div');
  const input = document.createElement('div');
  input.className = 'pg-rich-text-editor__input';
  input.contentEditable = String(Boolean(editable));
  input.setAttribute('role', 'textbox');
  input.setAttribute('aria-multiline', 'true');
  input.setAttribute('aria-label', label);
  input.setAttribute('spellcheck', 'true');
  input.id = 'pg-rich-text-editor-' + (++nextId);
  input.append(parseSafeHtml(content));
  const statusHost = document.createElement('div');
  main.append(toolsHost, input, statusHost);
  element.append(main);
  const sideHost = document.createElement('div');
  sideHost.className = 'pg-rich-text-editor__side';
  if (mirror) element.append(sideHost);

  const aborter = new AbortController();
  const subscribers = new Set();
  let destroyed = false;
  let composing = false;
  let isEditable = Boolean(editable);
  const getHTML = () => serializeSafeHtml(input);
  const getText = () => input.innerText?.replace(/\n$/, '') ?? input.textContent ?? '';
  const read = () => ({ html: getHTML(), selection: captureSelection(input) });
  function apply(snapshot) {
    input.replaceChildren(parseSafeHtml(snapshot.html));
    input.focus();
    restoreSelection(input, snapshot.selection);
    emit();
  }
  const history = createEditorHistory({ read, apply });
  function emit() {
    if (destroyed) return;
    for (const subscriber of subscribers) subscriber();
    onChange?.({ html: getHTML(), text: getText() });
  }
  const controls = Object.freeze({
    getHTML,
    getText,
    isEditable: () => isEditable,
    can: command => command === 'undo' ? history.canUndo() : command === 'redo' ? history.canRedo() : true,
    isActive(command) {
      const range = getEditorSelection(input);
      if (!range) return false;
      const names = { bold: 'strong', italic: 'em', underline: 'u', paragraph: 'p',
        heading: 'h2', quote: 'blockquote', 'bullet-list': 'ul', 'ordered-list': 'ol' };
      const node = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
      const match = node?.closest(names[command] ?? 'span');
      return Boolean(match && input.contains(match));
    },
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    execute(command) {
      if (!isEditable || destroyed) return false;
      if (command === 'undo') return history.undo();
      if (command === 'redo') return history.redo();
      const changed = executeRichTextCommand(input, command);
      if (changed) { history.record(); emit(); input.focus(); }
      return changed;
    },
  });

  function handleInput() {
    if (composing) return;
    history.record();
    emit();
  }
  input.addEventListener('input', handleInput, { signal: aborter.signal });
  input.addEventListener('compositionstart', () => { composing = true; }, { signal: aborter.signal });
  input.addEventListener('compositionend', () => { composing = false; handleInput(); }, { signal: aborter.signal });
  input.addEventListener('beforeinput', event => {
    if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
      if (event.cancelable) {
        event.preventDefault();
        controls.execute(event.inputType === 'historyUndo' ? 'undo' : 'redo');
      }
    }
  }, { signal: aborter.signal });
  input.addEventListener('keydown', event => {
    const accelerator = (event.ctrlKey || event.metaKey) && !event.altKey;
    if (!accelerator || event.isComposing) return;
    const key = event.key.toLowerCase();
    const action = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'u' ? 'underline'
      : key === 'z' ? (event.shiftKey ? 'redo' : 'undo') : key === 'y' ? 'redo' : null;
    if (!action) return;
    event.preventDefault();
    controls.execute(action);
  }, { signal: aborter.signal });

  function insertFragment(fragment) {
    const selection = input.ownerDocument.getSelection();
    const range = getEditorSelection(input);
    if (!range) { input.append(fragment); return; }
    range.deleteContents();
    const last = fragment.lastChild;
    range.insertNode(fragment);
    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  input.addEventListener('paste', event => {
    if (!isEditable) return;
    event.preventDefault();
    const html = event.clipboardData?.getData('text/html');
    const plain = event.clipboardData?.getData('text/plain');
    if (html) insertFragment(parseSafeHtml(html));
    else if (plain) {
      const fragment = document.createDocumentFragment();
      plain.replace(/\r\n?/g, '\n').split('\n').forEach((part, index) => {
        if (index) fragment.append(document.createElement('br'));
        fragment.append(document.createTextNode(part));
      });
      insertFragment(fragment);
    }
    handleInput();
  }, { signal: aborter.signal });
  // Block HTML drops; browsers otherwise inject rich markup outside the paste handler.
  input.addEventListener('drop', event => event.preventDefault(), { signal: aborter.signal });

  const views = [];
  if (toolbar) views.push(mountEditorToolbar({ host: toolsHost, controls, root: input }));
  let mirrorView;
  if (mirror) { mirrorView = mountEditorMirror({ host: sideHost, controls }); views.push(mirrorView); }
  if (stats) views.push(mountEditorStats({ host: statusHost, controls }));
  return Object.freeze({
    element, input,
    getHTML, getText,
    setHTML(html) {
      input.replaceChildren(parseSafeHtml(html));
      history.record();
      emit();
    },
    setEditable(value) {
      isEditable = Boolean(value);
      input.contentEditable = String(isEditable);
      emit();
    },
    setMirrorMode(mode) { mirrorView?.setMode(mode); },
    focus() { input.focus(); },
    execute(command) { return controls.execute(command); },
    clear() { input.replaceChildren(); history.record(); emit(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      aborter.abort();
      for (const view of views) view.dispose();
      subscribers.clear();
      element.remove();
    },
  });
}
