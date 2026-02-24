// js/glossary/glossary-events.js

let domCache = null;

export function getGlossaryDOM() {
    return {
        contentContainer: document.getElementById('content-main'),
        treeContainer: document.getElementById('glossary-tree-container'),
        searchInput: document.getElementById('glossary-search-input')
    };
}
