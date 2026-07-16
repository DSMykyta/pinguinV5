// js/data/mappings-categories.js

/**
 * Category mapping checks and CRUD operations.
 */

import { callSheetsAPI } from '../utils/utils-api-client.js';
import { SHEETS, hardDeleteRow, adjustRowIndices, generateId, getNextRowIndex } from './data-helpers.js';
import { getMpCategories } from './mp-data.js';
import { mappingsState } from './mappings-state.js';

export function isMpCategoryMapped(mpCatId) {
    const mpCategories = getMpCategories();
    const mpCat = mpCategories.find(c => c.id === mpCatId);
    const externalId = mpCat?.external_id;

    const inMappingTable = mappingsState.categories.some(m =>
        m.mp_category_id === mpCatId || m.mp_category_id === externalId
    );
    if (inMappingTable) return true;

    if (mpCat) {
        try {
            const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
            if (data.our_category_id) return true;
        } catch { /* невалідний JSON */ }
    }

    return false;
}

/**
 * Отримати всі MP категорії, які замаплені на власну категорію
 */
export function getMappedMpCategories(ownCatId) {
    const mpCategories = getMpCategories();
    const result = [];
    const addedIds = new Set();

    const mappings = mappingsState.categories.filter(m =>
        m.category_id === ownCatId
    );
    mappings.forEach(mapping => {
        const mpCat = mpCategories.find(c =>
            c.id === mapping.mp_category_id || c.external_id === mapping.mp_category_id
        );
        if (mpCat && !addedIds.has(mpCat.id)) {
            result.push({ ...mpCat, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpCat.id);
        }
    });

    mpCategories.forEach(mpCat => {
        if (addedIds.has(mpCat.id)) return;
        try {
            const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
            if (data.our_category_id === ownCatId) {
                result.push({ ...mpCat, _source: 'legacy' });
                addedIds.add(mpCat.id);
            }
        } catch { /* невалідний JSON */ }
    });

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// ХАРАКТЕРИСТИКИ — CHECK & GET MAPPED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити чи MP характеристика замаплена
 */

export async function createCategoryMapping(ownCatId, mpCatId) {
    try {
        const existing = mappingsState.categories.find(m =>
            m.category_id === ownCatId && m.mp_category_id === mpCatId
        );
        if (existing) return existing;

        const newId = generateId('map-cat', mappingsState.categories);
        const timestamp = new Date().toISOString();

        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_CATEGORIES}!A:D`,
            values: [[newId, ownCatId, mpCatId, timestamp]],
            spreadsheetType: 'main'
        });

        const newMapping = {
            id: newId,
            category_id: ownCatId,
            mp_category_id: mpCatId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mappingsState.categories)
        };
        mappingsState.categories.push(newMapping);
        return newMapping;
    } catch (error) {
        console.error('Помилка створення маппінгу категорії:', error);
        throw error;
    }
}

/**
 * Видалити маппінг категорії
 */
export async function deleteCategoryMapping(mappingId) {
    try {
        const mapping = mappingsState.categories.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_CATEGORIES', rowIndex);

        const index = mappingsState.categories.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mappingsState.categories.splice(index, 1);
        }
        adjustRowIndices(mappingsState.categories, rowIndex);
    } catch (error) {
        console.error('Помилка видалення маппінгу категорії:', error);
        throw error;
    }
}

/**
 * Видалити маппінг категорії по ID MP категорії
 */
export async function deleteCategoryMappingByMpId(mpCatId) {
    const mapping = mappingsState.categories.find(m => m.mp_category_id === mpCatId);
    if (mapping) {
        await deleteCategoryMapping(mapping.id);
    }
}

/**
 * Batch створення маппінгів для кількох MP категорій
 */
export async function batchCreateCategoryMapping(mpCatIds, ownCatId) {
    const results = { success: [], failed: [] };

    for (const mpCatId of mpCatIds) {
        try {
            await createCategoryMapping(ownCatId, mpCatId);
            results.success.push(mpCatId);
        } catch (error) {
            console.error(`Помилка маппінгу ${mpCatId}:`, error);
            results.failed.push({ id: mpCatId, error: error.message });
        }
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// ХАРАКТЕРИСТИКИ — CRUD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Створити маппінг характеристики
 */
