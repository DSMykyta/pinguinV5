// js/pages/mapper/mapper-data-mp.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          MAPPER DATA - MP СУТНОСТІ & МАППІНГИ (Load + Getters)          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження даних маркетплейсів (MP categories/characteristics/options)
 * та маппінгів (Map tables). Getters для MP та Map даних.
 */

import { mapperState } from './mapper-state.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import { SHEETS, deduplicateMappings } from './mapper-data-helpers.js';

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
            mapperState.mpCategories = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.mpCategories = rows.map((row, index) => {
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

        return mapperState.mpCategories;
    } catch (error) {
        console.error('❌ Помилка завантаження MP категорій:', error);
        mapperState.mpCategories = [];
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
            mapperState.mpCharacteristics = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.mpCharacteristics = rows.map((row, index) => {
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

        return mapperState.mpCharacteristics;
    } catch (error) {
        console.error('❌ Помилка завантаження MP характеристик:', error);
        mapperState.mpCharacteristics = [];
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
            mapperState.mpOptions = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.mpOptions = rows.map((row, index) => {
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

        return mapperState.mpOptions;
    } catch (error) {
        console.error('❌ Помилка завантаження MP опцій:', error);
        mapperState.mpOptions = [];
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD МАППІНГИ
// ═══════════════════════════════════════════════════════════════════════════

export async function loadMapCategories() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_CATEGORIES}!A:D`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            mapperState.mapCategories = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.mapCategories = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });
            return obj;
        }).filter(item => item.id);

        mapperState.mapCategories = await deduplicateMappings(
            'MAP_CATEGORIES',
            mapperState.mapCategories,
            m => `${m.category_id}|${m.mp_category_id}`
        );

        return mapperState.mapCategories;
    } catch (error) {
        console.error('❌ Помилка завантаження маппінгів категорій:', error);
        mapperState.mapCategories = [];
        throw error;
    }
}

export async function loadMapCharacteristics() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_CHARACTERISTICS}!A:D`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            mapperState.mapCharacteristics = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.mapCharacteristics = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });
            return obj;
        }).filter(item => item.id);

        mapperState.mapCharacteristics = await deduplicateMappings(
            'MAP_CHARACTERISTICS',
            mapperState.mapCharacteristics,
            m => `${m.characteristic_id}|${m.mp_characteristic_id}`
        );

        return mapperState.mapCharacteristics;
    } catch (error) {
        console.error('❌ Помилка завантаження маппінгів характеристик:', error);
        mapperState.mapCharacteristics = [];
        throw error;
    }
}

export async function loadMapOptions() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_OPTIONS}!A:D`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            mapperState.mapOptions = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.mapOptions = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });
            return obj;
        }).filter(item => item.id);

        mapperState.mapOptions = await deduplicateMappings(
            'MAP_OPTIONS',
            mapperState.mapOptions,
            m => `${m.option_id}|${m.mp_option_id}`
        );

        return mapperState.mapOptions;
    } catch (error) {
        console.error('❌ Помилка завантаження маппінгів опцій:', error);
        mapperState.mapOptions = [];
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════

export function getMapCategories() {
    return mapperState.mapCategories || [];
}

export function getMapCharacteristics() {
    return mapperState.mapCharacteristics || [];
}

export function getMapOptions() {
    return mapperState.mapOptions || [];
}

export function getMpCategories() {
    return mapperState.mpCategories || [];
}

export function getMpCharacteristics() {
    return mapperState.mpCharacteristics || [];
}

export function getMpOptions() {
    return mapperState.mpOptions || [];
}
