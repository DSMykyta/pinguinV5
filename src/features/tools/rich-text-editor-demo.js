/**
 * PINGUIN NEXT — RICH TEXT EDITOR DEMO
 * Only the Text workspace knows this preview; no Shell coupling.
 */
import { createRichTextEditor } from '../../ui/rich-text-editor/rich-text-editor.js';

export function createRichTextEditorDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-rich-text-editor-demo';
  const heading = document.createElement('h3');
  heading.className = 'pg-tools-rich-text-editor-demo__heading';
  heading.textContent = 'Текстовий редактор';
  const hint = document.createElement('p');
  hint.className = 'pg-tools-rich-text-editor-demo__hint';
  hint.textContent = 'Вводьте й форматуйте текст ліворуч. Праворуч — синхронний перегляд або HTML-код.';
  const editor = createRichTextEditor({
    content: '<h2>Опис товару</h2><p>Виділіть текст і натисніть <strong>Жирний</strong> або <em>Курсив</em>, спробуйте списки й скасування змін.</p>',
  });
  element.append(heading, hint, editor.element);
  return {
    element,
    destroy() { editor.destroy(); element.remove(); },
  };
}
