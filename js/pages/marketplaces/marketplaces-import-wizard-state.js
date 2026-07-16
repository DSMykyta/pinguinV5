// js/pages/marketplaces/marketplaces-import-wizard-state.js

/**
 * Import-as-own wizard state.
 */

export const PLUGIN_NAME = 'marketplaces-import-wizard';

export const wizardState = {
    step: 1,                    // 1: Вибір MP, 2: TreeSelect, 3: Preview, 4: Import
    selectedMp: null,           // { id, name, slug }

    // Дані з MP
    mpData: {
        categories: [],         // MP категорії
        characteristics: [],    // MP характеристики
        options: []             // MP опції
    },

    // Вибрані елементи
    selection: {
        categories: new Set(),      // ID вибраних категорій
        characteristics: new Set()  // ID вибраних характеристик
    },

    // Expanded nodes в дереві
    expandedNodes: new Set(),

    // Статистика для preview
    stats: {
        categories: 0,
        characteristics: 0,
        options: 0
    }
};

export function resetWizardState() {
    wizardState.step = 1;
    wizardState.selectedMp = null;
    wizardState.mpData = { categories: [], characteristics: [], options: [] };
    wizardState.selection = { categories: new Set(), characteristics: new Set() };
    wizardState.expandedNodes = new Set();
    wizardState.stats = { categories: 0, characteristics: 0, options: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI WIZARD
// ═══════════════════════════════════════════════════════════════════════════
