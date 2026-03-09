// js/pages/mapper/mapper-data-helpers.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║               MAPPER DATA - HELPERS & CONFIG                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Спільні хелпери, конфігурація аркушів та утиліти для роботи з Google Sheets.
 * Використовується всіма mapper-data-*.js модулями.
 */

import { mapperState } from './mapper-state.js';
import { callSheetsAPI } from '../../utils/utils-api-client.js';

// ═══════════════════════════════════════════════════════════════════════════
// SHEET CONFIG
// ═══════════════════════════════════════════════════════════════════════════

// Назви аркушів у Google Sheets
export const SHEETS = {
    MARKETPLACES: 'Mapper_Marketplaces',
    CATEGORIES: 'Mapper_Categories',
    CHARACTERISTICS: 'Mapper_Characteristics',
    OPTIONS: 'Mapper_Options',
    MP_CATEGORIES: 'Mapper_MP_Categories',
    MP_CHARACTERISTICS: 'Mapper_MP_Characteristics',
    MP_OPTIONS: 'Mapper_MP_Options',
    MAP_CATEGORIES: 'Mapper_Map_Categories',
    MAP_CHARACTERISTICS: 'Mapper_Map_Characteristics',
    MAP_OPTIONS: 'Mapper_Map_Options'
};

// GID для кожного аркуша (для CSV експорту)
export const SHEET_GIDS = {
    MARKETPLACES: '1967713026',
    CATEGORIES: '373282626',
    CHARACTERISTICS: '1574142272',
    OPTIONS: '1060760105',
    MP_CATEGORIES: '1018694135',
    MP_CHARACTERISTICS: '461227658',
    MP_OPTIONS: '1890025776',
    MAP_CATEGORIES: '413806813',
    MAP_CHARACTERISTICS: '733797569',
    MAP_OPTIONS: '1405967910'
};

// ═══════════════════════════════════════════════════════════════════════════
// HARD DELETE ХЕЛПЕРИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Фізично видалити рядок з Google Sheets (hard delete)
 * @param {string} sheetGidKey - Ключ у SHEET_GIDS (напр. 'CATEGORIES')
 * @param {number} rowIndex - 1-based індекс рядка в аркуші
 */
export async function hardDeleteRow(sheetGidKey, rowIndex) {
    await callSheetsAPI('batchUpdateSpreadsheet', {
        requests: [{
            deleteDimension: {
                range: {
                    sheetId: parseInt(SHEET_GIDS[sheetGidKey]),
                    dimension: 'ROWS',
                    startIndex: rowIndex - 1,
                    endIndex: rowIndex
                }
            }
        }],
        spreadsheetType: 'main'
    });
}

/**
 * Зсунути _rowIndex для всіх елементів нижче видаленого рядка
 * @param {Array} stateArray - Масив стейту (напр. mapperState.categories)
 * @param {number} deletedRowIndex - 1-based індекс видаленого рядка
 */
export function adjustRowIndices(stateArray, deletedRowIndex) {
    stateArray.forEach(item => {
        if (item._rowIndex > deletedRowIndex) item._rowIndex--;
    });
}

/**
 * Batch hard delete — видаляє кілька рядків з одного аркуша за один API call.
 * Рядки сортуються у зворотному порядку щоб індекси не зсувались між видаленнями.
 * @param {string} sheetGidKey - Ключ у SHEET_GIDS
 * @param {number[]} rowIndices - Масив 1-based індексів рядків
 */
export async function hardDeleteRowsBatch(sheetGidKey, rowIndices) {
    if (rowIndices.length === 0) return;
    const sorted = [...rowIndices].sort((a, b) => b - a);
    const requests = sorted.map(rowIndex => ({
        deleteDimension: {
            range: {
                sheetId: parseInt(SHEET_GIDS[sheetGidKey]),
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
            }
        }
    }));
    await callSheetsAPI('batchUpdateSpreadsheet', { requests, spreadsheetType: 'main' });
}

/**
 * Видалити елементи з state-масиву після batch delete та зсунути _rowIndex.
 * @param {Array} stateArray - Масив стейту
 * @param {Array} deletedItems - Масив видалених об'єктів (мають _rowIndex)
 */
export function adjustAfterBatchDelete(stateArray, deletedItems) {
    const sortedRows = deletedItems
        .map(item => item._rowIndex)
        .filter(Boolean)
        .sort((a, b) => b - a);
    for (const rowIndex of sortedRows) {
        const idx = stateArray.findIndex(item => item._rowIndex === rowIndex);
        if (idx !== -1) stateArray.splice(idx, 1);
        adjustRowIndices(stateArray, rowIndex);
    }
}

/**
 * Дедуплікація маппінгів — знаходить дублі за ключовими полями,
 * видаляє зайві з Google Sheets і повертає чистий масив.
 * Залишає найстаріший запис (найменший _rowIndex).
 * @param {string} sheetGidKey - Ключ у SHEET_GIDS (напр. 'MAP_CATEGORIES')
 * @param {Array} items - Масив маппінгів
 * @param {Function} keyFn - Функція що повертає унікальний ключ для елемента
 * @returns {Array} Масив без дублів
 */
export async function deduplicateMappings(sheetGidKey, items, keyFn) {
    const seen = new Map();
    const duplicates = [];

    for (const item of items) {
        const key = keyFn(item);
        if (seen.has(key)) {
            duplicates.push(item);
        } else {
            seen.set(key, item);
        }
    }

    if (duplicates.length === 0) return items;

    console.warn(`🧹 Знайдено ${duplicates.length} дублів у ${sheetGidKey}, видаляю...`);

    // Видалити з Google Sheets
    const rowIndices = duplicates.map(d => d._rowIndex).filter(Boolean);
    if (rowIndices.length > 0) {
        try {
            await hardDeleteRowsBatch(sheetGidKey, rowIndices);
        } catch (error) {
            console.error(`❌ Помилка видалення дублів з ${sheetGidKey}:`, error);
        }
    }

    // Повернути чистий масив з перерахованими _rowIndex
    const clean = [...seen.values()];
    clean.sort((a, b) => (a._rowIndex || 0) - (b._rowIndex || 0));
    clean.forEach((item, i) => { item._rowIndex = i + 2; });
    return clean;
}

/**
 * Каскадне видалення всіх MP сутностей маркетплейсу
 * (mp_categories, mp_characteristics, mp_options).
 * Маппінги видаляються окремо ДО виклику цієї функції.
 * @param {string} marketplaceId
 */
export async function deleteAllMpDataForMarketplace(marketplaceId) {
    const mpOpts = mapperState.mpOptions.filter(o => o.marketplace_id === marketplaceId);
    const mpChars = mapperState.mpCharacteristics.filter(c => c.marketplace_id === marketplaceId);
    const mpCats = mapperState.mpCategories.filter(c => c.marketplace_id === marketplaceId);

    await hardDeleteRowsBatch('MP_OPTIONS', mpOpts.map(o => o._rowIndex).filter(Boolean));
    await hardDeleteRowsBatch('MP_CHARACTERISTICS', mpChars.map(c => c._rowIndex).filter(Boolean));
    await hardDeleteRowsBatch('MP_CATEGORIES', mpCats.map(c => c._rowIndex).filter(Boolean));

    adjustAfterBatchDelete(mapperState.mpOptions, mpOpts);
    adjustAfterBatchDelete(mapperState.mpCharacteristics, mpChars);
    adjustAfterBatchDelete(mapperState.mpCategories, mpCats);
}

// ═══════════════════════════════════════════════════════════════════════════
// ID & UTILITY ХЕЛПЕРИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обчислити _rowIndex для нового запису (після append)
 * Враховує "дірки" від видалених рядків у Google Sheets
 */
export function getNextRowIndex(items) {
    if (items.length === 0) return 2; // Перший рядок даних (після заголовка)
    return Math.max(...items.map(i => i._rowIndex || 0)) + 1;
}

/**
 * Генерувати новий ID
 */
export function generateId(prefix, items) {
    let maxNum = 0;

    items.forEach(item => {
        if (item.id && item.id.startsWith(`${prefix}-`)) {
            const num = parseInt(item.id.replace(`${prefix}-`, ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    const newNum = maxNum + 1;
    return `${prefix}-${String(newNum).padStart(6, '0')}`;
}

/**
 * Нормалізувати boolean для Google Sheets (завжди uppercase)
 */
export function toSheetsBool(value) {
    if (value === true || value === 'true' || value === 'TRUE') return 'TRUE';
    return 'FALSE';
}
