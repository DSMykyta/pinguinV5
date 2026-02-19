// js/generators/generator-highlight/ghl-main.js

/**
 * Highlight Generator — ініціалізація секції
 * Створює редактор з конфігу 'ghl'.
 * Слухає charm:refresh на секції (кнопка створюється charm-refresh.js).
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { createHighlightEditor } from '../../common/editor/editor-main.js';
import { getEditorOptions } from '../../common/editor/editor-configs.js';

registerPanelInitializer('aside-highlight', async () => {
    const container = document.getElementById('ghl-editor-container');
    if (!container) return;

    const editor = createHighlightEditor(container, getEditorOptions('ghl'));
    if (!editor) return;

    // charm:refresh — очищення редактора
    const section = document.getElementById('section-text');
    section?.addEventListener('charm:refresh', () => editor.clear());
});
