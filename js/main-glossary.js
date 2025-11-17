// js/main-glossary.js
import { initCore } from './main-core.js';
import { fetchGlossaryData } from './glossary/glossary-data.js';
import { renderGlossaryTree, initTreeToggles } from './glossary/glossary-tree.js';
import { initGlossaryArticles } from './glossary/glossary-articles.js';
import { initSearchClear } from './utils/search-clear.js';

async function initGlossary() {
    console.log('🔄 Початок ініціалізації глосарію...');

    if (!document.getElementById('glossary-content-container')) {
        console.error('❌ glossary-content-container не знайдено!');
        return;
    }

    try {
        await fetchGlossaryData();
        renderGlossaryTree();
        initTreeToggles();
        initGlossaryArticles();
        initSearchClear('glossary-search-input');

        console.log('✅ Глосарій успішно ініціалізовано.');
    } catch (error) {
        console.error('❌ Помилка при ініціалізації глосарію:', error);
    }
}

async function initializeApp() {
    try {
        console.log('Ініціалізація ядра додатка...');
        initCore();
        console.log('Додаток успішно ініціалізовано. Панелі завантажуються...');

        // Ініціалізація глосарію
        await initGlossary();
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);