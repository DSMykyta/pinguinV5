// js/generators/generator-glossary/ggl-dom.js

let domCache = null;

export function getGlossaryDOM() {
    if (domCache) return domCache;

    domCache = {
        // --- Асайд ---
        treeContainer: document.getElementById('glossary-tree-container'), // Куди вставляти дерево
        searchInput: document.getElementById('glossary-search-input'), // Пошук в асайді
        createBtn: document.getElementById('glossary-create-btn'), // Кнопка "Створити"

        // --- Головний контент ---
        contentContainer: document.getElementById('glossary-content-container'), // Куди вставляти статті
        reloadBtn: document.getElementById('reload-section-glossary') // Кнопка оновлення даних
    };
    return domCache;
}