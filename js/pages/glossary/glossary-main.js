// js/glossary/glossary-main.js

import { fetchGlossaryData } from './glossary-data.js';
import { renderGlossaryTree, initTreeToggles } from './glossary-tree.js';
import { initGlossaryArticles } from './glossary-articles.js';
import { initGlossaryModals } from './glossary-modals.js';
import { initGlossarySearch } from './glossary-search.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ — ЛЕГО система
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './glossary-tree.js',
    './glossary-articles.js',
    './glossary-modals.js',
    './glossary-search.js',
];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init();
        } else if (result.status === 'rejected') {
            console.warn(`[Glossary] ${PLUGINS[index]} — не завантажено`);
        }
    });
}

export async function initGlossaryPage() {

    // 0. Завантажуємо плагіни (ЛЕГО)
    await loadPlugins();

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
    initGlossarySearch();

}
