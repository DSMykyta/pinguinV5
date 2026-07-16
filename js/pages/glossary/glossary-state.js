// js/pages/glossary/glossary-state.js
/*
 * ============================================================================
 * GLOSSARY STATE
 * ============================================================================
 * Core module state for glossary data, tree and id lookup.
 * Data loaders write here; render/search modules read from here.
 * ============================================================================
 */

export const glossaryState = {
    data: [],
    tree: {},
    map: {},
};

export function getGlossaryData() {
    return glossaryState.data;
}

export function getGlossaryTree() {
    return glossaryState.tree;
}

export function getGlossaryMap() {
    return glossaryState.map;
}

export function setGlossaryState({ data = [], tree = {}, map = {} } = {}) {
    glossaryState.data = data;
    glossaryState.tree = tree;
    glossaryState.map = map;
}

export function resetGlossaryState() {
    setGlossaryState();
}
