// js/generators/generator-highlight/ghl-main.js

/**
 * Highlight Generator — ініціалізація секції
 * Створює редактор з чармів на контейнері.
 * Слухає charm:refresh на секції (кнопка створюється charm-refresh.js).
 */

import { registerAsideInitializer } from '../../aside/aside-main.js';
import { createHighlightEditor } from '../../common/editor/editor-main.js';

registerAsideInitializer('aside-highlight', async () => {
    const container = document.getElementById('ghl-editor-container');
    if (!container) return;

    const editor = createHighlightEditor(container);
    if (!editor) return;

    // charm:refresh — очищення редактора
    const section = document.getElementById('section-text');
    section?.addEventListener('charm:refresh', () => editor.clear());
});
