// js/common/editor/editor-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              UNIVERSAL HIGHLIGHT EDITOR COMPONENT                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Універсальний редактор тексту з підсвічуванням.
 *
 * ФУНКЦІОНАЛ:
 * - Два режими: Text (WYSIWYG) / Code (HTML)
 * - Toolbar: Bold, Italic, H1-H3, List, Case conversion
 * - Find & Replace
 * - Undo/Redo
 * - Валідація заборонених слів (опціонально)
 * - Підсвічування помилок (опціонально)
 * - Навігація по помилках (опціонально)
 * - Статистика тексту (опціонально)
 *
 * ВИКОРИСТАННЯ:
 * ```javascript
 * import { createHighlightEditor } from '../common/editor/editor-main.js';
 *
 * // З валідацією (для generator-highlight)
 * const editor = createHighlightEditor(container, {
 *     validation: true,
 *     showStats: true,
 *     placeholder: 'Введіть текст...'
 * });
 *
 * // Без валідації (для brands)
 * const editor = createHighlightEditor(container, {
 *     validation: false,
 *     showStats: false,
 *     placeholder: 'Опис бренду...'
 * });
 *
 * // API:
 * editor.getValue()          // Отримати HTML
 * editor.setValue(html)      // Встановити HTML
 * editor.getPlainText()      // Отримати plain text
 * editor.getMode()           // 'text' | 'code'
 * editor.setMode('code')     // Переключити режим
 * editor.focus()             // Фокус на редактор
 * editor.clear()             // Очистити
 * editor.destroy()           // Видалити
 * ```
 */

import { createEditorTemplate } from './editor-template.js';
import { initEditorCore } from './editor-core.js';

let instanceCounter = 0;

/**
 * Створити екземпляр редактора
 * @param {HTMLElement} container - Контейнер для редактора
 * @param {Object} options - Опції
 * @param {boolean} options.validation - Чи включити валідацію заборонених слів (default: false)
 * @param {boolean} options.showStats - Чи показувати статистику (default: false)
 * @param {boolean} options.showFindReplace - Чи показувати Find & Replace (default: false)
 * @param {string} options.placeholder - Placeholder текст
 * @param {string} options.initialValue - Початкове значення HTML
 * @param {number} options.minHeight - Мінімальна висота редактора (px)
 * @param {Function} options.onChange - Callback при зміні контенту
 * @param {Function} options.onValidate - Callback після валідації
 * @returns {Object} API редактора
 */
export function createHighlightEditor(container, options = {}) {
    if (!container || !(container instanceof HTMLElement)) {
        console.error('[Editor] Container is required');
        return null;
    }

    const instanceId = `editor-${++instanceCounter}`;

    const config = {
        validation: false,
        showStats: false,
        showFindReplace: false,
        placeholder: 'Введіть текст...',
        initialValue: '',
        minHeight: 200,
        onChange: null,
        onValidate: null,
        ...options
    };

    // Створити HTML структуру
    const html = createEditorTemplate(instanceId, config);
    container.innerHTML = html;

    // Ініціалізувати логіку
    const api = initEditorCore(instanceId, container, config);

    return api;
}

export default createHighlightEditor;
