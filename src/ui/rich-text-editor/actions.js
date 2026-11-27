/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FORMAT AND CLIPBOARD ACTIONS
 * ╠════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Незалежна поведінка текстового редактора.
 * ║ ЗАЛЕЖНОСТІ: ../menu/menu.js; injected editor controls
 * ║ ПУБЛІЧНИЙ API: mountEditorActions()
 * ║ ПРИНЦИП: Один власник стану, без залежності від Shell або features.
 * ╚════════════════════════════════════════════════════════════════════╝
 */

import { createMenu } from '../menu/menu.js';

/** Reuses the shared popup, keeps selection before its trigger takes focus. */
export function mountEditorActions({ element, input, source, host, controls, serializeEditorSelection }) {
  const doc = input.ownerDocument;
  const signalOwner = new AbortController();
  const signal = signalOwner.signal;
  const active = () => controls.getMode() === 'editor' ? input : source;
  let saved = null;
  let disposed = false;
  function capture() {
    if (active() === source) {
      const start = source.selectionStart, end = source.selectionEnd;
      return { source: true, start, end, raw: source.value.slice(start, end) };
    }
    const s = doc.getSelection();
    if (!s?.rangeCount || !input.contains(s.anchorNode) || !input.contains(s.focusNode)) return null;
    const range = s.getRangeAt(0).cloneRange();
    return { range, html: range.collapsed ? null : serializeEditorSelection(input, range) };
  }
  function restore(s) {
    const target = active();
    target.focus({ preventScroll: true });
    if (s?.source && target === source) source.setSelectionRange(s.start, s.end);
    else if (s?.range && target === input && input.contains(s.range.startContainer) && input.contains(s.range.endContainer)) {
      const selection = doc.getSelection();
      selection.removeAllRanges();
      selection.addRange(s.range);
    }
  }
  function valueFor(format, s) {
    if (s?.source && s.raw) {
      if (format === controls.getFormat() || format === 'text') return format === 'text'
        ? controls.getCopyValue('text', { html: controls.sourceToHtml(s.raw) }) : s.raw;
      return controls.getCopyValue(format, { html: controls.sourceToHtml(s.raw) });
    }
    return controls.getCopyValue(format, s?.html ? s : null);
  }
  async function copy(format, selection = capture()) {
    try {
      const value = valueFor(format, selection);
      if (!value) return false;
      await doc.defaultView.navigator.clipboard.writeText(value);
      if (!disposed) controls.notify('Скопійовано як ' + controls.formatName(format));
      return true;
    } catch {
      if (!disposed) controls.notify('Не вдалося скопіювати: перевірте доступ до буфера обміну.', 'error');
      return false;
    }
  }
  async function paste(selection) {
    if (!controls.canEdit()) return;
    const before = controls.getHTML();
    const mode = controls.getMode();
    try {
      const value = await doc.defaultView.navigator.clipboard.readText();
      if (disposed || !value || before !== controls.getHTML() || mode !== controls.getMode()) return;
      restore(selection);
      const target = active();
      if (target === source) {
        source.setRangeText(value, source.selectionStart, source.selectionEnd, 'end');
        source.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        const data = new DataTransfer();
        data.setData('text/plain', value);
        input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }
    } catch {
      if (!disposed) controls.notify('Доступ до буфера обміну обмежено. Використайте Ctrl+V.', 'warning');
    }
  }
  async function cut(selection) {
    if (!controls.canEdit() || !(selection?.html || selection?.raw)) return;
    const before = controls.getHTML();
    const mode = controls.getMode();
    if (!await copy(controls.getFormat(), selection) || disposed || before !== controls.getHTML() || mode !== controls.getMode()) return;
    restore(selection);
    if (active() === source && selection.source) {
      source.setRangeText('', selection.start, selection.end, 'start');
      source.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (selection.range && active() === input) {
      selection.range.deleteContents();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  const formats = [
    { value: 'html', label: 'HTML' },
    { value: 'markdown', label: 'Markdown' },
  ];
  const footer = createMenu({
    label: 'Формат документа', align: 'end',
    items: formats.map(f => ({ ...f, type: 'check', checked: f.value === controls.getFormat() })), 
    onSelect(value) { restore(saved); controls.setFormat(value); sync(); },
  });
  footer.element.classList.add('pg-rich-text-editor__format-menu');
  footer.trigger.classList.replace('pg-button--outline', 'pg-button--quiet');
  footer.trigger.addEventListener('pointerdown', () => { saved = capture(); }, { signal });
  footer.trigger.addEventListener('keydown', () => { saved = capture(); }, { signal });
  host.append(footer.element);
  const context = createMenu({
    label: 'Дії з текстом',
    items: [
      { value: 'cut', label: 'Вирізати' },
      { value: 'copy', label: 'Копіювати' },
      { value: 'paste', label: 'Вставити' },
      { value: 'text', label: 'Копіювати як текст · Ctrl+Alt+C' },
      { value: 'html', label: 'Копіювати як HTML · Ctrl+Alt+H' },
      { value: 'markdown', label: 'Копіювати як Markdown · Ctrl+Alt+M' },
      { label: 'Перетворити на', items: formats.map(f => ({ ...f, value: 'convert-' + f.value })) },
    ],
    onSelect(value) {
      const selection = saved;
      restore(selection);
      if (value === 'cut') void cut(selection);
      else if (value === 'paste') void paste(selection);
      else if (value.startsWith('convert-')) controls.setFormat(value.slice(8));
      else void copy(value === 'copy' ? controls.getFormat() : value, selection);
    },
  });
  context.trigger.hidden = true;
  context.element.classList.add('pg-rich-text-editor__context-menu');
  element.append(context.element);
  function showContext(event) {
    event.preventDefault();
    saved = capture();
    const rect = active().getBoundingClientRect();
    const keyboard = event.clientX === 0 && event.clientY === 0;
    context.openAt(keyboard ? rect.left + 12 : event.clientX,
      keyboard ? rect.top + 12 : event.clientY, active());
  }
  for (const target of [input, source]) {
    target.addEventListener('contextmenu', showContext, { signal });
    if (target === source) target.addEventListener('copy', () => {
      if (source.selectionStart !== source.selectionEnd) controls.notify('Скопійовано як ' + controls.formatName(controls.getFormat()));
    }, { signal });
    target.addEventListener('keydown', event => {
      if (event.isComposing || !event.ctrlKey || !event.altKey || event.shiftKey || event.metaKey || event.getModifierState('AltGraph')) return;
      const format = { KeyC: 'text', KeyH: 'html', KeyM: 'markdown' }[event.code];
      if (!format) return;
      event.preventDefault();
      void copy(format);
    }, { signal });
  }
  const sync = () => {
    const format = controls.getFormat();
    footer.trigger.textContent = controls.formatName(format) + ' ▾';
    footer.trigger.setAttribute('aria-label', 'Формат документа: ' + controls.formatName(format));
    footer.trigger.disabled = !controls.canEdit();
    for (const node of footer.element.querySelectorAll('[role=menuitemcheckbox]')) {
      node.setAttribute('aria-checked', String(node.dataset.pgValue === format));
    }
  };
  const unsubscribe = controls.subscribe(sync);
  sync();
  return { dispose() { disposed = true; unsubscribe(); signalOwner.abort(); context.destroy(); footer.destroy(); } };
}
