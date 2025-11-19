// js/glossary/glossary-events.js

let domCache = null;

export function getGlossaryDOM() {
    return {
        contentContainer: document.getElementById('glossary-articles-container'),
        treeContainer: document.getElementById('glossary-tree-container'),
        searchInput: document.getElementById('glossary-search-input')
    };
}
