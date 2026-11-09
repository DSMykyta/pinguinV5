/**
 * PINGUIN NEXT — RICH TEXT TOOLBAR
 * Optional view; knows only the editor interface. Returns dispose().
 */
const ACTIONS = [
  { id: 'bold', label: 'Жирний (Ctrl+B)', glyph: 'B', run: e => e.chain().focus().toggleBold().run(), active: e => e.isActive('bold') },
  { id: 'italic', label: 'Курсив (Ctrl+I)', glyph: 'I', run: e => e.chain().focus().toggleItalic().run(), active: e => e.isActive('italic') },
  { id: 'underline', label: 'Підкреслення', glyph: 'U', run: e => e.chain().focus().toggleUnderline().run(), active: e => e.isActive('underline') },
  { id: 'heading', label: 'Заголовок', glyph: 'H2', run: e => e.chain().focus().toggleHeading({ level: 2 }).run(), active: e => e.isActive('heading', { level: 2 }) },
  { id: 'bullet', label: 'Маркований список', glyph: '≡', run: e => e.chain().focus().toggleBulletList().run(), active: e => e.isActive('bulletList') },
  { id: 'ordered', label: 'Нумерований список', glyph: '1.', run: e => e.chain().focus().toggleOrderedList().run(), active: e => e.isActive('orderedList') },
  { id: 'quote', label: 'Цитата', glyph: '❝', run: e => e.chain().focus().toggleBlockquote().run(), active: e => e.isActive('blockquote') },
  { id: 'undo', label: 'Скасувати (Ctrl+Z)', glyph: '↶', run: e => e.chain().focus().undo().run(), can: e => e.can().undo() },
  { id: 'redo', label: 'Повторити (Ctrl+Shift+Z)', glyph: '↷', run: e => e.chain().focus().redo().run(), can: e => e.can().redo() },
];

export function mountToolbar({ container, editor }) {
  const toolbar = document.createElement('div');
  toolbar.className = 'pg-rich-text-editor__toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Форматування тексту');
  const controller = new AbortController();
  const buttons = ACTIONS.map(action => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-rich-text-editor__tool';
    button.dataset.pgAction = action.id;
    button.textContent = action.glyph;
    button.setAttribute('aria-label', action.label);
    button.title = action.label;
    if (action.active) button.setAttribute('aria-pressed', 'false');
    button.addEventListener('pointerdown', event => event.preventDefault(), { signal: controller.signal });
    button.addEventListener('click', () => { if (editor.isEditable) action.run(editor); }, { signal: controller.signal });
    toolbar.append(button);
    return { action, button };
  });
  const sync = () => buttons.forEach(({ action, button }) => {
    button.disabled = !editor.isEditable || (action.can ? !action.can(editor) : false);
    if (action.active) button.setAttribute('aria-pressed', String(Boolean(action.active(editor))));
  });
  container.append(toolbar);
  editor.on('selectionUpdate', sync);
  editor.on('transaction', sync);
  sync();
  return {
    dispose() {
      controller.abort();
      editor.off('selectionUpdate', sync);
      editor.off('transaction', sync);
      toolbar.remove();
    },
  };
}
