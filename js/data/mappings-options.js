// js/data/mappings-options.js

/**
 * Option mapping checks and CRUD operations.
 */

import { callSheetsAPI } from '../utils/utils-api-client.js';
import { SHEETS, hardDeleteRow, adjustRowIndices, generateId, getNextRowIndex } from './data-helpers.js';
import { getMpOptions } from './mp-data.js';
import { mappingsState } from './mappings-state.js';

export function isMpOptionMapped(mpOptionId) {
    const mpOptions = getMpOptions();
    const mpOption = mpOptions.find(o => o.id === mpOptionId);
    const externalId = mpOption?.external_id;

    const inNewTable = mappingsState.options.some(m =>
        m.mp_option_id === mpOptionId || m.mp_option_id === externalId
    );
    if (inNewTable) return true;

    if (mpOption) {
        try {
            const data = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data || '{}') : (mpOption.data || {});
            if (data.our_option_id) return true;
        } catch { /* невалідний JSON */ }
    }

    return false;
}

/**
 * Отримати всі MP опції замаплені до власної
 */
export function getMappedMpOptions(ownOptionId) {
    const mpOptions = getMpOptions();
    const result = [];
    const addedIds = new Set();

    const mappings = mappingsState.options.filter(m =>
        m.option_id === ownOptionId
    );
    mappings.forEach(mapping => {
        const mpOption = mpOptions.find(o =>
            o.id === mapping.mp_option_id || o.external_id === mapping.mp_option_id
        );
        if (mpOption && !addedIds.has(mpOption.id)) {
            result.push({ ...mpOption, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpOption.id);
        }
    });

    mpOptions.forEach(mpOption => {
        if (addedIds.has(mpOption.id)) return;
        try {
            const data = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data || '{}') : (mpOption.data || {});
            if (data.our_option_id === ownOptionId) {
                result.push({ ...mpOption, _source: 'legacy' });
                addedIds.add(mpOption.id);
            }
        } catch { /* невалідний JSON */ }
    });

    return result;
}

/**
 * Отримати маппінг для MP опції за її ID
 */
export function getOptionMappingByMpId(mpOptionId) {
    return mappingsState.options.find(m => m.mp_option_id === mpOptionId);
}

// ═══════════════════════════════════════════════════════════════════════════
// КАТЕГОРІЇ — CRUD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Створити маппінг категорії
 */

export async function createOptionMapping(ownOptionId, mpOptionId) {
    try {
        const existing = mappingsState.options.find(m =>
            m.option_id === ownOptionId && m.mp_option_id === mpOptionId
        );
        if (existing) return existing;

        const newId = generateId('map-opt', mappingsState.options);
        const timestamp = new Date().toISOString();

        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_OPTIONS}!A:D`,
            values: [[newId, ownOptionId, mpOptionId, timestamp]],
            spreadsheetType: 'main'
        });

        const newMapping = {
            id: newId,
            option_id: ownOptionId,
            mp_option_id: mpOptionId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mappingsState.options)
        };
        mappingsState.options.push(newMapping);
        return newMapping;
    } catch (error) {
        console.error('Помилка створення маппінгу опції:', error);
        throw error;
    }
}

/**
 * Видалити маппінг опції
 */
export async function deleteOptionMapping(mappingId) {
    try {
        const mapping = mappingsState.options.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_OPTIONS', rowIndex);

        const index = mappingsState.options.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mappingsState.options.splice(index, 1);
        }
        adjustRowIndices(mappingsState.options, rowIndex);
    } catch (error) {
        console.error('Помилка видалення маппінгу опції:', error);
        throw error;
    }
}

/**
 * Видалити маппінг опції за MP ID
 */
export async function deleteOptionMappingByMpId(mpOptionId) {
    const mapping = mappingsState.options.find(m => m.mp_option_id === mpOptionId);
    if (mapping) {
        await deleteOptionMapping(mapping.id);
    }
}

/**
 * Batch створення маппінгів для кількох MP опцій
 */
export async function batchCreateOptionMapping(mpOptionIds, ownOptionId) {
    const results = { success: [], failed: [] };

    for (const mpOptionId of mpOptionIds) {
        try {
            await createOptionMapping(ownOptionId, mpOptionId);
            results.success.push(mpOptionId);
        } catch (error) {
            console.error(`Помилка маппінгу ${mpOptionId}:`, error);
            results.failed.push({ id: mpOptionId, error: error.message });
        }
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMAP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Автоматичний маппінг MP характеристик за назвою
 */
