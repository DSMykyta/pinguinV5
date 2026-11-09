/**
 * PINGUIN NEXT — RICH TEXT EDITOR GALLERY
 * Purpose: The editor preview lives only in the Text workspace, not in Shell.
 * Dependencies: Shared rich-text UI. Public API: createRichTextEditorDemo.
 */
import { createRichTextEditor } from '../../ui/rich-text-editor/rich-text-editor.js';

export function createRichTextEditorDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-rich-text-editor-demo';
  const heading = document.createElement('h3');
  heading.className = 'pg-tools-rich-text-editor-demo__heading';
  heading.textContent = 'Текстовий редактор';
  const description = document.createElement('p');
  description.className = 'pg-tools-rich-text-editor-demo__hint';
  description.textContent = 'Форматуйте текст ліворуч — праворуч одразу оновлюється дзеркальний перегляд. Кнопка HTML показує безпечний код.';
  const host = document.createElement('div');
  host.className = 'pg-tools-rich-text-editor-demo__workspace';
  element.append(heading, description, host);
  const editor = createRichTextEditor(host, {
    content: '<h2>Опис товару</h2><p>Виділіть фрагмент і спробуйте <strong>жирний</strong>, <em>курсив</em>, списки або скасування.</p>',
    toolbar: true, mirror: true, stats: true,
  });
  return { element, destroy() { editor.destroy(); element.remove(); } };
}
