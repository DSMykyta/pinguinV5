// js/data/mappings-characteristics.js

/**
 * Characteristic mapping checks and CRUD operations.
 */

import { callSheetsAPI } from '../utils/utils-api-client.js';
import { SHEETS, hardDeleteRow, adjustRowIndices, generateId, getNextRowIndex } from './data-helpers.js';
import { getMpCharacteristics } from './mp-data.js';
import { mappingsState } from './mappings-state.js';

export function isMpCharacteristicMapped(mpCharId) {
    const mpCharacteristics = getMpCharacteristics();
    const mpChar = mpCharacteristics.find(c => c.id === mpCharId);
    const externalId = mpChar?.external_id;

    const inNewTable = mappingsState.characteristics.some(m =>
        m.mp_characteristic_id === mpCharId || m.mp_characteristic_id === externalId
    );
    if (inNewTable) return true;

    if (mpChar) {
        try {
            const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data || '{}') : (mpChar.data || {});
            if (data.our_char_id) return true;
        } catch { /* невалідний JSON */ }
    }

    return false;
}

/**
 * Отримати всі MP характеристики замаплені до власної
 */
export function getMappedMpCharacteristics(ownCharId) {
    const mpCharacteristics = getMpCharacteristics();
    const result = [];
    const addedIds = new Set();

    const mappings = mappingsState.characteristics.filter(m =>
        m.characteristic_id === ownCharId
    );
    mappings.forEach(mapping => {
        const mpChar = mpCharacteristics.find(c =>
            c.id === mapping.mp_characteristic_id || c.external_id === mapping.mp_characteristic_id
        );
        if (mpChar && !addedIds.has(mpChar.id)) {
            result.push({ ...mpChar, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpChar.id);
        }
    });

    mpCharacteristics.forEach(mpChar => {
        if (addedIds.has(mpChar.id)) return;
        try {
            const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data || '{}') : (mpChar.data || {});
            if (data.our_char_id === ownCharId) {
                result.push({ ...mpChar, _source: 'legacy' });
                addedIds.add(mpChar.id);
            }
        } catch { /* невалідний JSON */ }
    });

    return result;
}

/**
 * Отримати маппінг для MP характеристики за її ID
 */
export function getCharacteristicMappingByMpId(mpCharId) {
    return mappingsState.characteristics.find(m => m.mp_characteristic_id === mpCharId);
}

// ═══════════════════════════════════════════════════════════════════════════
// ОПЦІЇ — CHECK & GET MAPPED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити чи MP опція замаплена
 */

export async function createCharacteristicMapping(ownCharId, mpCharId) {
    try {
        const existing = mappingsState.characteristics.find(m =>
            m.characteristic_id === ownCharId && m.mp_characteristic_id === mpCharId
        );
        if (existing) return existing;

        const newId = generateId('map-char', mappingsState.characteristics);
        const timestamp = new Date().toISOString();

        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_CHARACTERISTICS}!A:D`,
            values: [[newId, ownCharId, mpCharId, timestamp]],
            spreadsheetType: 'main'
        });

        const newMapping = {
            id: newId,
            characteristic_id: ownCharId,
            mp_characteristic_id: mpCharId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mappingsState.characteristics)
        };
        mappingsState.characteristics.push(newMapping);
        return newMapping;
    } catch (error) {
        console.error('Помилка створення маппінгу характеристики:', error);
        throw error;
    }
}

/**
 * Видалити маппінг характеристики
 */
export async function deleteCharacteristicMapping(mappingId) {
    try {
        const mapping = mappingsState.characteristics.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_CHARACTERISTICS', rowIndex);

        const index = mappingsState.characteristics.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mappingsState.characteristics.splice(index, 1);
        }
        adjustRowIndices(mappingsState.characteristics, rowIndex);
    } catch (error) {
        console.error('Помилка видалення маппінгу характеристики:', error);
        throw error;
    }
}

/**
 * Видалити маппінг характеристики за MP ID
 */
export async function deleteCharacteristicMappingByMpId(mpCharId) {
    const mapping = mappingsState.characteristics.find(m => m.mp_characteristic_id === mpCharId);
    if (mapping) {
        await deleteCharacteristicMapping(mapping.id);
    }
}

/**
 * Batch створення маппінгів для кількох MP характеристик
 */
export async function batchCreateCharacteristicMapping(mpCharIds, ownCharId) {
    const results = { success: [], failed: [] };

    for (const mpCharId of mpCharIds) {
        try {
            await createCharacteristicMapping(ownCharId, mpCharId);
            results.success.push(mpCharId);
        } catch (error) {
            console.error(`Помилка маппінгу ${mpCharId}:`, error);
            results.failed.push({ id: mpCharId, error: error.message });
        }
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// ОПЦІЇ — CRUD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Створити маппінг опції
 */
