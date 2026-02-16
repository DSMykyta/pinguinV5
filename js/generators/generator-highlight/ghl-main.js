// js/generators/generator-highlight/ghl-main.js

/**
 * Highlight Generator — ініціалізація секції
 * Створює редактор з конфігу 'ghl' + reload кнопка
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { createHighlightEditor } from '../../common/editor/editor-main.js';
import { getEditorOptions } from '../../common/editor/editor-configs.js';

registerPanelInitializer('aside-highlight', async () => {
    const container = document.getElementById('ghl-editor-container');
    if (!container) return;

    const editor = createHighlightEditor(container, getEditorOptions('ghl'));
    if (!editor) return;

    // Reload кнопка
    const reloadBtn = document.getElementById('reload-section-highlight');
    reloadBtn?.addEventListener('click', () => {
        const icon = reloadBtn.querySelector('span');
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('is-spinning');
        editor.clear();
        setTimeout(() => {
            reloadBtn.disabled = false;
            reloadBtn.style.color = '';
            icon?.classList.remove('is-spinning');
        }, 300);
    });
});
