// js/data/mappings-state.js

/**
 * Shared in-memory state for marketplace mappings.
 */

export const mappingsState = {
    categories: [],
    characteristics: [],
    options: []
};

export function getMapCategories() {
    return mappingsState.categories;
}

export function getMapCharacteristics() {
    return mappingsState.characteristics;
}

export function getMapOptions() {
    return mappingsState.options;
}

export function setMapCategories(data) {
    mappingsState.categories = data;
}

export function setMapCharacteristics(data) {
    mappingsState.characteristics = data;
}

export function setMapOptions(data) {
    mappingsState.options = data;
}
