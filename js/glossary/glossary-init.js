// js/glossary/glossary-init.js

import { registerPanelInitializer } from '../panel/panel-right.js';
import { fetchGlossaryData } from './glossary-data.js';
import { renderGlossaryTree, initTreeToggles } from './glossary-tree.js';
import { initGlossaryArticles } from './glossary-articles.js';
import { initSearchClear } from '../utils/search-clear.js';

async function initGlossaryGenerator() {
    if (!document.getElementById('glossary-content-container')) return;

    await fetchGlossaryData();
    renderGlossaryTree();
    initTreeToggles();
    initGlossaryArticles();

    // Ініціалізація кнопки очищення пошуку
    initSearchClear('glossary-search-input');

    console.log('Глосарій успішно ініціалізовано.');
}

