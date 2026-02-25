// js/main-instruments.js
import { initCore } from './main-core.js';
import { registerAsideInitializer } from './layout/layout-main.js';
import { createHighlightEditor } from './components/editor/editor-main.js';

// Імпортуємо головні файли генераторів, щоб їхній код виконав реєстрацію
import './generators/generator-table/gt-main.js';
import './generators/generator-seo/gse-main.js'
import './generators/generator-link/gln-main.js';
import './generators/generator-translate/gtr-main.js';
import './generators/generator-image/gim-main.js';

// Редактор тексту з підсвічуванням
registerAsideInitializer('aside-highlight', () => {
    const container = document.getElementById('ghl-editor-container');
    if (!container) return;
    const editor = createHighlightEditor(container);
    if (!editor) return;
    const section = document.getElementById('section-text');
    section?.addEventListener('charm:refresh', () => editor.clear());
});

async function initializeApp() {
    try {
        await initCore();
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);