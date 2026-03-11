// js/data/mp-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          SHARED DATA — MP СУТНОСТІ (Load + Getters)                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження та зберігання даних маркетплейсів (MP categories/characteristics/options).
 * Власний внутрішній стан — не залежить від mapper-state.
 */

import { callSheetsAPI } from '../utils/utils-api-client.js';
import { SHEETS, hardDeleteRowsBatch, adjustAfterBatchDelete } from './data-helpers.js';

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ═══════════════════════════════════════════════════════════════════════════

let _mpCategories = [];
let _mpCharacteristics = [];
let _mpOptions = [];

// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZE HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Нормалізація українських ключів Rozetka при завантаженні (backwards compatibility)
 * Працює in-memory — не змінює дані в таблиці
 */
function normalizeMpLoadedData(obj, entityType) {
    const ukKeyMap = {
        'Тип параметра': 'type',
        'Тип фільтра': 'filter_type',
        'Одиниця вимірювання': 'unit',
        'Одиниця виміру': 'unit',
        'Наскрізниий параметр': 'is_global',
        'Наскрізний параметр': 'is_global',
        'ID параметра': null,
        'Назва параметра': null,
        'ID значення': null,
        'Назва значення': null,
    };
    for (const [ukKey, enKey] of Object.entries(ukKeyMap)) {
        if (!(ukKey in obj)) continue;
        if (enKey && !(enKey in obj)) {
            obj[enKey] = obj[ukKey];
        }
        delete obj[ukKey];
    }
    // Нормалізуємо is_global: Так → TRUE
    if (obj.is_global !== undefined && obj.is_global !== 'TRUE' && obj.is_global !== 'FALSE') {
        const strVal = String(obj.is_global).toLowerCase().trim();
        obj.is_global = ['true', '1', 'так', 'yes', '+', 'да'].includes(strVal) ? 'TRUE' : 'FALSE';
    }
    // Опції не мають полів характеристики
    if (entityType === 'options') {
        delete obj.type;
        delete obj.filter_type;
        delete obj.unit;
        delete obj.is_global;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD MP СУТНОСТІ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити категорії маркетплейсу
 */
export async function loadMpCategories() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MP_CATEGORIES}!A:H`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних MP категорій');
            _mpCategories = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        _mpCategories = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            const originalId = obj.id;

            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    if (parsedData.id !== undefined) {
                        obj._jsonId = String(parsedData.id);
                    }
                    Object.assign(obj, parsedData);
                    obj.id = originalId;
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                    obj.data = null;
                }
            }

            normalizeMpLoadedData(obj, 'categories');
            return obj;
        }).filter(item => item.id && item.id !== 'id');

        return _mpCategories;
    } catch (error) {
        console.error('❌ Помилка завантаження MP категорій:', error);
        _mpCategories = [];
        throw error;
    }
}

/**
 * Завантажити характеристики маркетплейсу
 */
export async function loadMpCharacteristics() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MP_CHARACTERISTICS}!A:G`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних MP характеристик');
            _mpCharacteristics = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        _mpCharacteristics = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            const originalId = obj.id;

            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    Object.assign(obj, parsedData);
                    obj.id = originalId;
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                    obj.data = null;
                }
            }

            normalizeMpLoadedData(obj, 'characteristics');
            return obj;
        }).filter(item => item.id && item.id !== 'id');

        return _mpCharacteristics;
    } catch (error) {
        console.error('❌ Помилка завантаження MP характеристик:', error);
        _mpCharacteristics = [];
        throw error;
    }
}

/**
 * Завантажити опції маркетплейсу
 */
export async function loadMpOptions() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MP_OPTIONS}!A:G`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних MP опцій');
            _mpOptions = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        _mpOptions = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            const originalId = obj.id;

            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    Object.assign(obj, parsedData);
                    obj.id = originalId;
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                    obj.data = null;
                }
            }

            normalizeMpLoadedData(obj, 'options');
            return obj;
        }).filter(item => item.id && item.id !== 'id');

        return _mpOptions;
    } catch (error) {
        console.error('❌ Помилка завантаження MP опцій:', error);
        _mpOptions = [];
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════

export function getMpCategories() {
    return _mpCategories;
}

export function getMpCharacteristics() {
    return _mpCharacteristics;
}

export function getMpOptions() {
    return _mpOptions;
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE ALL MP DATA FOR MARKETPLACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Видалити всі MP дані (categories, characteristics, options) для конкретного маркетплейсу
 * @param {string} marketplaceId - ID маркетплейсу
 */
export async function deleteAllMpDataForMarketplace(marketplaceId) {
    const mpOpts = _mpOptions.filter(o => o.marketplace_id === marketplaceId);
    const mpChars = _mpCharacteristics.filter(c => c.marketplace_id === marketplaceId);
    const mpCats = _mpCategories.filter(c => c.marketplace_id === marketplaceId);

    await hardDeleteRowsBatch('MP_OPTIONS', mpOpts.map(o => o._rowIndex).filter(Boolean));
    await hardDeleteRowsBatch('MP_CHARACTERISTICS', mpChars.map(c => c._rowIndex).filter(Boolean));
    await hardDeleteRowsBatch('MP_CATEGORIES', mpCats.map(c => c._rowIndex).filter(Boolean));

    adjustAfterBatchDelete(_mpOptions, mpOpts);
    adjustAfterBatchDelete(_mpCharacteristics, mpChars);
    adjustAfterBatchDelete(_mpCategories, mpCats);
}
