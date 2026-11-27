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
import { mountEditorStats, getEditorDocumentText } from './stats.js';
import { mountEditorPaste } from './paste.js';
import { mountEditorCopy, serializeEditorSelection } from './copy.js';
import { markdownToHtml, htmlToMarkdown } from './markdown.js';
import { mountEditorActions } from './actions.js';

let nextId = 0;

export function createRichTextEditor({
  content = '', editable = true, toolbar = true, code = true, stats = true,
  label = 'Редактор тексту', layout = 'auto', format: initialFormat = 'html', headerNote = '', onChange, onModeChange, onNotify,
} = {}) {
  if (!['html', 'markdown'].includes(initialFormat)) throw new TypeError('Unknown document format');
  if (!['auto', 'contained'].includes(layout)) throw new TypeError('Unknown editor layout');
  const uid = ++nextId;
  const element = document.createElement('section');
  element.className = 'pg-rich-text-editor';
  element.dataset.pgModule = 'rich-text-editor';
  element.dataset.pgMode = 'editor';
  element.dataset.pgFormat = initialFormat;
  element.dataset.pgLayout = layout;

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
  // Keep the disclosure directly beside the mode switch; actions reveal to its right.
  if (toolbar) header.append(triggerHost, toolsHost);
  // Optional passive metadata; no language or feature logic in the editor.
  const noteText = String(headerNote ?? '').trim();
  if (noteText) {
    const headerLabel = document.createElement('span');
    headerLabel.className = 'pg-rich-text-editor__header-note';
    headerLabel.textContent = noteText;
    header.append(headerLabel);
  }

  const input = document.createElement('div');
  input.className = 'pg-rich-text-editor__input pg-scrollbar';
  input.id = 'pg-rich-text-editor-' + uid;
  input.contentEditable = String(Boolean(editable));
  input.setAttribute('role', 'textbox');
  input.setAttribute('aria-multiline', 'true');
  input.setAttribute('aria-label', label);
  input.setAttribute('spellcheck', 'true');
  input.append(parseSafeHtml(initialFormat === 'markdown' ? markdownToHtml(content) : content));

  const source = document.createElement('textarea');
  source.className = 'pg-rich-text-editor__source pg-code-surface__input pg-scrollbar';
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
  statusHost.className = 'pg-rich-text-editor__stats-host';
  main.append(header, input, source, notice, statusHost);
  element.append(main);

  const aborter = new AbortController();
  const subscribers = new Set();
  let destroyed = false;
  let composing = false;
  let isEditable = Boolean(editable);
  let mode = 'editor';
  let format = initialFormat;
  let markdownCache = initialFormat === 'markdown' ? { html: serializeSafeHtml(input), value: String(content) } : null;
  const sourceHtml = value => format === 'markdown' ? markdownToHtml(value) : sanitizeSource(value);
  const asSource = html => format === 'markdown'
    ? (markdownCache?.html === html ? markdownCache.value : htmlToMarkdown(html)) : html;
  function updateFormat(next) {
    format = next;
    element.dataset.pgFormat = next;
    source.setAttribute('aria-label', next === 'markdown' ? 'Markdown-код тексту' : 'HTML-код тексту');
  }
  updateFormat(format);
  function notify(message, type = 'success') { onNotify?.(message, type); }
  const formatName = f => f === 'markdown' ? 'Markdown' : f === 'html' ? 'HTML' : 'текст';

  // Native field-sizing matches the self-growing contenteditable field.
  // Only browsers without it need a small textarea height fallback.
  const nativeSourceSizing = layout === 'contained' ||
    (typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content'));
  function resizeSource() {
    if (destroyed || source.hidden || nativeSourceSizing) return;
    source.style.height = 'auto';
    source.style.height = source.scrollHeight + 'px';
  }
  let lastSourceWidth = 0;
  const sourceSizeObserver = !nativeSourceSizing && typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(([entry]) => {
        const width = entry?.contentRect.width;
        if (width !== lastSourceWidth) {
          lastSourceWidth = width;
          resizeSource();
        }
      })
    : null;
  sourceSizeObserver?.observe(main);

  function sanitizeSource(value) {
    const holder = input.ownerDocument.createElement('div');
    holder.append(parseSafeHtml(value));
    return serializeSafeHtml(holder);
  }
  const getHTML = () => mode !== 'editor' ? sourceHtml(source.value) : serializeSafeHtml(input);
  const getSource = () => mode !== 'editor' ? source.value : asSource(getHTML());
  const getText = () => {
    if (mode === 'editor') return getEditorDocumentText(input);
    const holder = input.ownerDocument.createElement('div');
    holder.append(parseSafeHtml(getHTML()));
    return getEditorDocumentText(holder);
  };
  const read = () => ({ html: getHTML(), format, markdown: format === 'markdown' ? getSource() : null,
    selection: mode === 'editor' ? captureSelection(input) : null });
  function emit() {
    if (destroyed) return;
    for (const subscriber of subscribers) subscriber();
    onChange?.({ html: getHTML(), text: getText(), mode, format });
  }
  function apply(snapshot) {
    updateFormat(snapshot.format ?? 'html');
    markdownCache = snapshot.markdown === null || snapshot.markdown === undefined ? null : { html: snapshot.html, value: snapshot.markdown };
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
    if (destroyed || !['editor', 'html', 'markdown'].includes(nextMode) || nextMode === mode || !code) return false;
    if (nextMode !== 'editor' && nextMode !== format) {
      if (!setFormat(nextMode)) return false;
      if (mode !== 'editor') return true;
    }
    notice.hidden = true;
    notice.textContent = '';
    if (nextMode !== 'editor') {
      // Snapshot the rendered document once, not a second writable copy.
      source.value = asSource(serializeSafeHtml(input));
      input.hidden = true;
      source.hidden = false;
      mode = format;
      element.dataset.pgMode = mode;
      resizeSource();
      source.focus();
    } else {
      // The HTML textarea owns the draft until the user returns to WYSIWYG.
      // Never inject raw HTML into contenteditable; unsafe nodes/attrs are dropped.
      const safe = getHTML();
      if (format === 'markdown') markdownCache = { html: safe, value: source.value };
      input.replaceChildren(parseSafeHtml(safe));
      mode = 'editor';
      element.dataset.pgMode = 'editor';
      source.hidden = true;
      input.hidden = false;
      history.record();
      input.focus();
      // No silent execution of scripts/handlers from HTML mode.
      if (format === 'html' && safe !== source.value && /<\/?[a-z][^>]*>/i.test(source.value)) {
        notice.textContent = 'HTML нормалізовано та очищено під час повернення в редактор.';
        notice.hidden = false;
      }
    }
    emit();
    onModeChange?.(mode);
    return true;
  }

  function setFormat(next) {
    if (destroyed || !code || !isEditable || !['html', 'markdown'].includes(next) || next === format) return false;
    const html = getHTML();
    // Commit the current source to the single semantic document before converting.
    if (format === 'markdown') markdownCache = { html, value: getSource() };
    if (mode !== 'editor') input.replaceChildren(parseSafeHtml(html));
    updateFormat(next);
    if (mode !== 'editor') {
      mode = format;
      element.dataset.pgMode = mode;
      source.value = asSource(html);
      resizeSource();
      source.focus();
      onModeChange?.(mode);
    }
    history.record();
    emit();
    notify('Перетворено на ' + formatName(next));
    return true;
  }
  function getCopyValue(target, selection) {
    const html = selection?.html ?? getHTML();
    if (target === 'html') return html;
    if (target === 'markdown') return selection ? htmlToMarkdown(html) : (format === 'markdown' ? getSource() : htmlToMarkdown(html));
    const holder = input.ownerDocument.createElement('div');
    holder.append(parseSafeHtml(html));
    return getEditorDocumentText(holder);
  }
  const controls = Object.freeze({
    getHTML, getText, getSource, getCopyValue, notify, formatName, sourceToHtml: sourceHtml,
    getFormat: () => format, setFormat,
    canEdit: () => isEditable,
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
  source.addEventListener('input', () => { if (!destroyed) { resizeSource(); emit(); } }, { signal: aborter.signal });

  const views = [
    mountEditorPaste({ input, isEditable: () => isEditable, onInput: handleInput,
      onFormat: next => { if (code && next !== format) updateFormat(next); },
      onMarkdown: value => { if (code) markdownCache = { html: serializeSafeHtml(input), value }; },
    }),
    mountEditorCopy({ input, getFormat: () => format, notify: f => notify('Скопійовано як ' + formatName(f)) }),
  ];
  if (toolbar) views.push(mountEditorToolbar({ host: toolsHost, triggerHost, controls, root: input }));
  if (code) views.push(mountEditorModeSwitch({ host: modeHost, controls, editorId: input.id, sourceId: source.id }));
  if (stats) views.push(mountEditorStats({ host: statusHost, controls }));
  if (code) views.push(mountEditorActions({ element, input, source, host: statusHost, controls, serializeEditorSelection }));
  if (!toolbar && !code && !noteText) header.remove();

  return Object.freeze({
    element, input, source,
    getMode: () => mode, setMode,
    getHTML, getText, getSource,
    getFormat: () => format, setFormat,
    setHTML(html) {
      if (destroyed) return;
      const safe = sanitizeSource(html);
      input.replaceChildren(parseSafeHtml(safe));
      markdownCache = null;
      source.value = asSource(safe);
      resizeSource();
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
    focus() { (mode !== 'editor' ? source : input).focus(); },
    execute(command) { return controls.execute(command); },
    clear() {
      if (destroyed) return;
      source.value = '';
      markdownCache = null;
      resizeSource();
      input.replaceChildren();
      history.record();
      emit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      aborter.abort();
      sourceSizeObserver?.disconnect();
      for (const view of views) view.dispose();
      subscribers.clear();
      element.remove();
    },
  });
}
