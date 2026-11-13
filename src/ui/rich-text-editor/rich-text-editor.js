/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — RICH TEXT EDITOR                                                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Purpose: One document with two *mutually exclusive* editable modes:                    ║
 * ║ ЗАЛЕЖНОСТІ: ./html.js, ./history.js, ./commands.js, ./toolbar.js, ./mode.js                         ║
 * ║ ПУБЛІЧНИЙ API: createRichTextEditor()                                                               ║
 * ║ ПРИНЦИП: WYSIWYG (contenteditable) and HTML source (textarea). Dependencies: native DOM +           ║
 * ║ independent UI adapters; zero npm dependencies. API: createRichTextEditor({content, editable,       ║
 * ║ toolbar, code, stats, onChange}). Principle: HTML source is a draft until mode switch; sanitize on  ║
 * ║ commit/export.                                                                                      ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { parseSafeHtml, serializeSafeHtml } from './html.js';
import { createEditorHistory, captureSelection, restoreSelection } from './history.js';
import { executeRichTextCommand, getEditorSelection } from './commands.js';
import { mountEditorToolbar } from './toolbar.js';
import { mountEditorModeSwitch } from './mode.js';
import { mountEditorStats } from './stats.js';
import { mountEditorPaste } from './paste.js';

let nextId = 0;

export function createRichTextEditor({
  content = '', editable = true, toolbar = true, code = true, stats = true,
  label = 'Редактор тексту', onChange, onModeChange,
} = {}) {
  const uid = ++nextId;
  const element = document.createElement('section');
  element.className = 'pg-rich-text-editor';
  element.dataset.pgModule = 'rich-text-editor';
  element.dataset.pgMode = 'editor';

  const main = document.createElement('div');
  main.className = 'pg-rich-text-editor__main pg-code-surface';
  const header = document.createElement('div');
  header.className = 'pg-rich-text-editor__header';
  const toolsHost = document.createElement('div');
  toolsHost.className = 'pg-rich-text-editor__tools-host';
  const modeHost = document.createElement('div');
  modeHost.className = 'pg-rich-text-editor__mode-host';
  const triggerHost = document.createElement('div');
  triggerHost.className = 'pg-rich-text-editor__toolbar-toggle-host';
  if (code) header.append(modeHost);
  if (toolbar) header.append(toolsHost, triggerHost);

  const input = document.createElement('div');
  input.className = 'pg-rich-text-editor__input';
  input.id = 'pg-rich-text-editor-' + uid;
  input.contentEditable = String(Boolean(editable));
  input.setAttribute('role', 'textbox');
  input.setAttribute('aria-multiline', 'true');
  input.setAttribute('aria-label', label);
  input.setAttribute('spellcheck', 'true');
  input.append(parseSafeHtml(content));

  const source = document.createElement('textarea');
  source.className = 'pg-rich-text-editor__source pg-code-surface__input';
  source.id = input.id + '-html';
  source.setAttribute('aria-label', 'HTML-код тексту');
  source.setAttribute('spellcheck', 'false');
  source.setAttribute('autocomplete', 'off');
  source.setAttribute('autocapitalize', 'off');
  source.setAttribute('autocorrect', 'off');
  source.readOnly = !editable;
  source.hidden = true;

  const notice = document.createElement('div');
  notice.className = 'pg-rich-text-editor__notice';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.hidden = true;
  const statusHost = document.createElement('div');
  main.append(header, input, source, notice, statusHost);
  element.append(main);

  const aborter = new AbortController();
  const subscribers = new Set();
  let destroyed = false;
  let composing = false;
  let isEditable = Boolean(editable);
  let mode = 'editor';

  function sanitizeSource(value) {
    const holder = input.ownerDocument.createElement('div');
    holder.append(parseSafeHtml(value));
    return serializeSafeHtml(holder);
  }
  const getHTML = () => mode === 'html' ? sanitizeSource(source.value) : serializeSafeHtml(input);
  const getText = () => {
    if (mode === 'editor') return input.innerText?.replace(/\n$/, '') ?? input.textContent ?? '';
    const holder = input.ownerDocument.createElement('div');
    holder.append(parseSafeHtml(source.value));
    return holder.textContent ?? '';
  };
  const read = () => ({ html: getHTML(), selection: mode === 'editor' ? captureSelection(input) : null });
  function emit() {
    if (destroyed) return;
    for (const subscriber of subscribers) subscriber();
    onChange?.({ html: getHTML(), text: getText(), mode });
  }
  function apply(snapshot) {
    input.replaceChildren(parseSafeHtml(snapshot.html));
    // Undo/redo belong to the WYSIWYG history only; HTML textarea uses native undo.
    if (mode === 'editor') {
      input.focus();
      restoreSelection(input, snapshot.selection);
    }
    emit();
  }
  const history = createEditorHistory({ read, apply });

  function setMode(nextMode) {
    if (destroyed || (nextMode !== 'editor' && nextMode !== 'html') || nextMode === mode) return false;
    if (!code) return false;
    notice.hidden = true;
    notice.textContent = '';
    if (nextMode === 'html') {
      // Snapshot the rendered document once, not a second writable copy.
      source.value = serializeSafeHtml(input);
      input.hidden = true;
      source.hidden = false;
      mode = 'html';
      element.dataset.pgMode = 'html';
      source.focus();
    } else {
      // The HTML textarea owns the draft until the user returns to WYSIWYG.
      // Never inject raw HTML into contenteditable; unsafe nodes/attrs are dropped.
      const safe = sanitizeSource(source.value);
      input.replaceChildren(parseSafeHtml(safe));
      mode = 'editor';
      element.dataset.pgMode = 'editor';
      source.hidden = true;
      input.hidden = false;
      history.record();
      input.focus();
      // No silent execution of scripts/handlers from HTML mode.
      if (safe !== source.value && /<\/?[a-z][^>]*>/i.test(source.value)) {
        notice.textContent = 'HTML нормалізовано та очищено під час повернення в редактор.';
        notice.hidden = false;
      }
    }
    emit();
    onModeChange?.(mode);
    return true;
  }

  const controls = Object.freeze({
    getHTML, getText,
    getMode: () => mode,
    setMode,
    isEditable: () => isEditable && mode === 'editor',
    can: command => mode !== 'editor' ? false : command === 'undo' ? history.canUndo() : command === 'redo' ? history.canRedo() : true,
    isActive(command) {
      if (mode !== 'editor') return false;
      const range = getEditorSelection(input);
      if (!range) return false;
      const names = { bold: 'strong', italic: 'em', underline: 'u', paragraph: 'p',
        'heading-1': 'h1', heading: 'h2', 'heading-3': 'h3', quote: 'blockquote', 'bullet-list': 'ul', 'ordered-list': 'ol' };
      const node = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
      const match = node?.closest(names[command] ?? 'span');
      return Boolean(match && input.contains(match));
    },
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    execute(command) {
      if (!isEditable || destroyed || mode !== 'editor') return false;
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
    if ((event.inputType === 'historyUndo' || event.inputType === 'historyRedo') && event.cancelable) {
      event.preventDefault();
      controls.execute(event.inputType === 'historyUndo' ? 'undo' : 'redo');
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

  // Source editing is native plaintext: keep in-progress HTML and caret untouched.
  // Commit and sanitize only when returning to the rendered editor or exporting.
  source.addEventListener('input', () => { if (!destroyed) emit(); }, { signal: aborter.signal });

  const views = [mountEditorPaste({ input, isEditable: () => isEditable, onInput: handleInput })];
  if (toolbar) views.push(mountEditorToolbar({ host: toolsHost, triggerHost, controls, root: input }));
  if (code) views.push(mountEditorModeSwitch({ host: modeHost, controls, editorId: input.id, sourceId: source.id }));
  if (stats) views.push(mountEditorStats({ host: statusHost, controls }));
  if (!toolbar && !code) header.remove();

  return Object.freeze({
    element, input, source,
    getMode: () => mode, setMode,
    getHTML, getText,
    getSource: () => mode === 'html' ? source.value : serializeSafeHtml(input),
    setHTML(html) {
      if (destroyed) return;
      const safe = sanitizeSource(html);
      input.replaceChildren(parseSafeHtml(safe));
      source.value = safe;
      history.record();
      emit();
    },
    setEditable(value) {
      if (destroyed) return;
      isEditable = Boolean(value);
      input.contentEditable = String(isEditable);
      source.readOnly = !isEditable;
      emit();
    },
    focus() { (mode === 'html' ? source : input).focus(); },
    execute(command) { return controls.execute(command); },
    clear() {
      if (destroyed) return;
      source.value = '';
      input.replaceChildren();
      history.record();
      emit();
    },
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
