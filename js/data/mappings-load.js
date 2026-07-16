// js/data/mappings-load.js

/**
 * Load mapping sheets into shared mapping state.
 */

import { callSheetsAPI } from '../utils/utils-api-client.js';
import { SHEETS, deduplicateMappings } from './data-helpers.js';
import { mappingsState } from './mappings-state.js';

export async function loadMapCategories() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_CATEGORIES}!A:D`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            mappingsState.categories = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mappingsState.categories = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });
            return obj;
        }).filter(item => item.id);

        mappingsState.categories = await deduplicateMappings(
            'MAP_CATEGORIES',
            mappingsState.categories,
            m => `${m.category_id}|${m.mp_category_id}`
        );

        return mappingsState.categories;
    } catch (error) {
        console.error('Помилка завантаження маппінгів категорій:', error);
        mappingsState.categories = [];
        throw error;
    }
}

/**
 * Завантажити маппінги характеристик
 */
export async function loadMapCharacteristics() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_CHARACTERISTICS}!A:D`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            mappingsState.characteristics = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mappingsState.characteristics = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });
            return obj;
        }).filter(item => item.id);

        mappingsState.characteristics = await deduplicateMappings(
            'MAP_CHARACTERISTICS',
            mappingsState.characteristics,
            m => `${m.characteristic_id}|${m.mp_characteristic_id}`
        );

        return mappingsState.characteristics;
    } catch (error) {
        console.error('Помилка завантаження маппінгів характеристик:', error);
        mappingsState.characteristics = [];
        throw error;
    }
}

/**
 * Завантажити маппінги опцій
 */
export async function loadMapOptions() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_OPTIONS}!A:D`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            mappingsState.options = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mappingsState.options = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });
            return obj;
        }).filter(item => item.id);

        mappingsState.options = await deduplicateMappings(
            'MAP_OPTIONS',
            mappingsState.options,
            m => `${m.option_id}|${m.mp_option_id}`
        );

        return mappingsState.options;
    } catch (error) {
        console.error('Помилка завантаження маппінгів опцій:', error);
        mappingsState.options = [];
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати всі маппінги категорій
 */
