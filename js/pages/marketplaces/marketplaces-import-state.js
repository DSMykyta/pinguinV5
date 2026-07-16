// js/pages/marketplaces/marketplaces-import-state.js

/**
 * Import state and marketplace adapter registry.
 */

export const PLUGIN_NAME = 'marketplaces-import';

const importAdapters = [];

export let importState = createImportState();

export function createImportState(overrides = {}) {
    return {
        file: null,
        rawData: [],
        parsedData: [],
        fileHeaders: [],
        mapping: {},
        marketplaceId: null,
        dataType: null,
        headerRow: 1,
        adapter: null,
        _adapterData: null,
        ...overrides
    };
}

/**
 * Register marketplace import adapter.
 */
export function registerImportAdapter(adapter) {
    importAdapters.push(adapter);
}

/**
 * Find adapter for marketplace.
 */
export function findAdapter(marketplace) {
    return importAdapters.find(a => a.match(marketplace)) || null;
}

export function resetImportState(overrides = {}) {
    importState = createImportState(overrides);
    return importState;
}

export function setImportState(nextState) {
    importState = nextState;
    return importState;
}

/**
 * Normalize is_global to 'TRUE' or 'FALSE'.
 */
export function normalizeIsGlobal(value) {
    if (value === true || value === 'TRUE') return 'TRUE';
    const strVal = String(value || '').toLowerCase().trim();
    const trueValues = ['true', '1', 'так', 'yes', '+', 'да'];
    return trueValues.includes(strVal) ? 'TRUE' : 'FALSE';
}
