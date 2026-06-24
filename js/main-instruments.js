// js/main-instruments.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAIN — INSTRUMENTS                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Точка входу сторінки інструментів (редактор + генератори)    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import { createHighlightEditor } from './components/editor/editor-main.js';
import { initAsideFab } from './components/fab-menu.js';
import { registerAsideInitializer } from './layout/layout-main.js';

// Імпортуємо головні файли генераторів, щоб їхній код виконав реєстрацію
import './generators/generator-table/gt-main.js';
import './generators/generator-translate/gtr-main.js';
import './generators/generator-image/gim-main.js';

registerAsideInitializer('aside-highlight', () => {
    initAsideFab('fab-highlight-aside', {});
    document.querySelectorAll('#section-text [editor]').forEach(container => {
        createHighlightEditor(container);
    });
});

async function initializeApp() {
    try {
        await initCore();
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
