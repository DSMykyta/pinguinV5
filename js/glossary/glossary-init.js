// js/glossary/glossary-init.js

import { fetchGlossaryData } from './glossary-data.js';
import { renderGlossaryTree, initTreeToggles } from './glossary-tree.js';
import { initGlossaryArticles } from './glossary-articles.js';
import { initSearchClear } from '../utils/search-clear.js';
import { initGlossaryModals } from './glossary-modals.js';

export async function initGlossaryPage() {
    console.log('Ініціалізація сторінки глосарію...');

    // 1. Завантажуємо дані
    await fetchGlossaryData();

    // 2. Рендеримо дерево в асайді
    renderGlossaryTree();
    initTreeToggles();

    // 3. Рендеримо статті в основному контенті
    initGlossaryArticles();

    // 4. Ініціалізація модалів
    initGlossaryModals();

    // 5. Ініціалізація пошуку
    initSearchClear('glossary-search-input');

    console.log('Глосарій успішно ініціалізовано.');
}
