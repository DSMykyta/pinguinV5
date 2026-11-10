/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — RICH TEXT TOOLBAR                                                                    ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Optional adapter; receives commands, never imports sibling views or Shell.             ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: mountEditorToolbar()                                                                 ║
 * ║ ПРИНЦИП: Ізольована поведінка, без зв'язків між features.                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const ITEMS = [
  { id: 'bold', label: 'Жирний — Ctrl+B', text: 'B', kind: 'mark' },
  { id: 'italic', label: 'Курсив — Ctrl+I', text: 'I', kind: 'mark' },
  { id: 'underline', label: 'Підкреслення — Ctrl+U', text: 'U', kind: 'mark' },
  { id: 'paragraph', label: 'Абзац', text: 'P', kind: 'block' },
  { id: 'heading-1', label: 'Заголовок H1', text: 'H1', kind: 'block' },
  { id: 'heading', label: 'Заголовок H2', text: 'H2', kind: 'block' },
  { id: 'heading-3', label: 'Заголовок H3', text: 'H3', kind: 'block' },
  { id: 'bullet-list', label: 'Маркований список', text: '•', kind: 'block' },
  { id: 'ordered-list', label: 'Нумерований список', text: '1.', kind: 'block' },
  { id: 'quote', label: 'Цитата', text: '❝', kind: 'block' },
  { id: 'undo', label: 'Скасувати — Ctrl+Z', text: '↶' },
  { id: 'redo', label: 'Повторити — Ctrl+Shift+Z', text: '↷' },
];

export function mountEditorToolbar({ host, controls, root }) {
  const element = document.createElement('div');
  element.className = 'pg-rich-text-editor__toolbar';
  element.setAttribute('role', 'toolbar');
  element.setAttribute('aria-label', 'Форматування тексту');
  const controller = new AbortController();
  const buttons = ITEMS.map(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-rich-text-editor__action';
    button.dataset.pgAction = item.id;
    button.title = item.label;
    button.setAttribute('aria-label', item.label);
    button.textContent = item.text;
    if (item.kind) button.setAttribute('aria-pressed', 'false');
    if (item.id === 'bold') button.classList.add('pg-rich-text-editor__action--bold');
    if (item.id === 'italic') button.classList.add('pg-rich-text-editor__action--italic');
    if (item.id === 'underline') button.classList.add('pg-rich-text-editor__action--underline');
    button.addEventListener('pointerdown', event => event.preventDefault(), { signal: controller.signal });
    button.addEventListener('click', () => controls.execute(item.id), { signal: controller.signal });
    element.append(button);
    return { button, item };
  });
  host.append(element);
  function sync() {
    for (const { button, item } of buttons) {
      button.disabled = !controls.isEditable() || ((item.id === 'undo' || item.id === 'redo') && !controls.can(item.id));
      if (item.kind) button.setAttribute('aria-pressed', String(controls.isActive(item.id)));
    }
  }
  const unsubscribe = controls.subscribe(sync);
  // Selection changes do not necessarily change the document or fire input.
  root.ownerDocument.addEventListener('selectionchange', sync, { signal: controller.signal });
  sync();
  return { dispose() { unsubscribe(); controller.abort(); element.remove(); } };
}
