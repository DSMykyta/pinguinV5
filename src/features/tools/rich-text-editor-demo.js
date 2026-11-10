/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — RICH TEXT EDITOR DEMO                                                                ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Only the Text workspace knows about this editor; no Shell dependencies.                ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/rich-text-editor/rich-text-editor.js                                           ║
 * ║ ПУБЛІЧНИЙ API: createRichTextEditorDemo()                                                           ║
 * ║ ПРИНЦИП: Лише приклад; оформлення спільних компонентів не дублюється.                               ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
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
  hint.textContent = '«Редактор» — візуальне форматування. «HTML» — редагування коду цього самого документа. Зміни застосовуються при поверненні в редактор.';
  const editor = createRichTextEditor({
    content: '<h2>Опис товару</h2><p>Виділіть текст і натисніть <strong>Жирний</strong> або <em>Курсив</em>, спробуйте списки й скасування змін.</p>',
  });
  element.append(heading, hint, editor.element);
  return { element, destroy() { editor.destroy(); element.remove(); } };
}
