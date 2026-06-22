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
import './generators/generator-seo/gse-main.js'
import './generators/generator-link/gln-main.js';
import './generators/generator-translate/gtr-main.js';
import './generators/generator-image/gim-main.js';
import './generators/generator-ai-magic/aim-main.js';

registerAsideInitializer('aside-highlight', () => {
    initAsideFab('fab-highlight-aside', {});
});

async function initializeApp() {
    try {
        await initCore();
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
    document.querySelectorAll('[editor]').forEach(container => createHighlightEditor(container));
}

document.addEventListener('DOMContentLoaded', initializeApp);
