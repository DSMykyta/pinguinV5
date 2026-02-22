// js/mapper/mapper-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - DATA MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для Marketplace Mapper.
 * Використовує уніфікований api-client для всіх операцій.
 */

import { mapperState } from './mapper-state.js';
import { callSheetsAPI } from '../utils/api-client.js';
import { MAIN_SPREADSHEET_ID as SPREADSHEET_ID } from '../config/spreadsheet-config.js';

// Назви аркушів у Google Sheets
const SHEETS = {
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
const SHEET_GIDS = {
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
async function hardDeleteRow(sheetGidKey, rowIndex) {
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
function adjustRowIndices(stateArray, deletedRowIndex) {
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
async function hardDeleteRowsBatch(sheetGidKey, rowIndices) {
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
function adjustAfterBatchDelete(stateArray, deletedItems) {
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

/**
 * Завантажити всі дані для Mapper
 */
export async function loadMapperData() {

    try {
        // Завантажуємо паралельно всі необхідні дані
        await Promise.all([
            loadMarketplaces(),
            loadCategories(),
            loadCharacteristics(),
            loadOptions()
        ]);

    } catch (error) {
        console.error('❌ Помилка завантаження даних Mapper:', error);
        throw error;
    }
}

/**
 * Завантажити маркетплейси
 */
export async function loadMarketplaces() {

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MARKETPLACES}!A:G`,
            spreadsheetType: 'main'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних маркетплейсів');
            mapperState.marketplaces = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.marketplaces = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            // Нормалізація полів (алайси для різних назв колонок)
            if (!obj.id && obj.marketplace_id) obj.id = obj.marketplace_id;
            if (!obj.name && obj.display_name) obj.name = obj.display_name;
            if (!obj.slug && obj.marketplace_id) obj.slug = obj.marketplace_id;
            if (!obj.is_active && obj.state !== undefined) {
                obj.is_active = obj.state === 'TRUE' || obj.state === true || obj.state === 'true';
            }

            return obj;
        }).filter(item => item.id); // Фільтруємо порожні рядки

        return mapperState.marketplaces;
    } catch (error) {
        console.error('❌ Помилка завантаження маркетплейсів:', error);
        mapperState.marketplaces = [];
        throw error;
    }
}

/**
 * Завантажити власні категорії
 */
export async function loadCategories() {

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.CATEGORIES}!A:G`,
            spreadsheetType: 'main'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних категорій');
            mapperState.categories = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.categories = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            // Нормалізація полів (алайси для різних назв колонок)
            if (!obj.id && obj.local_id) obj.id = obj.local_id;
            if (!obj.name_ua && obj.name_uk) obj.name_ua = obj.name_uk;
            if (!obj.parent_id && obj.parent_local_id) obj.parent_id = obj.parent_local_id;

            return obj;
        }).filter(item => item.id);

        return mapperState.categories;
    } catch (error) {
        console.error('❌ Помилка завантаження категорій:', error);
        mapperState.categories = [];
        throw error;
    }
}

/**
 * Завантажити власні характеристики
 */
export async function loadCharacteristics() {

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.CHARACTERISTICS}!A:N`,
            spreadsheetType: 'main'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних характеристик');
            mapperState.characteristics = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.characteristics = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            // Нормалізація полів (алайси для різних назв колонок)
            // Підтримуємо як нові так і старі назви колонок
            if (!obj.id && obj.local_id) obj.id = obj.local_id;
            if (!obj.name_ua && obj.name_uk) obj.name_ua = obj.name_uk;
            if (!obj.type && obj.param_type) obj.type = obj.param_type;

            // Обробка обрізаних назв колонок (Google Sheets може обрізати довгі назви)
            const findTruncatedField = (prefix) => {
                const key = Object.keys(obj).find(k => k.startsWith(prefix));
                return key ? obj[key] : undefined;
            };

            if (obj.is_global === undefined || obj.is_global === '') {
                const val = findTruncatedField('is_global');
                if (val !== undefined) obj.is_global = val;
            }
            if (obj.filter_type === undefined || obj.filter_type === '') {
                const val = findTruncatedField('filter_t');
                if (val !== undefined) obj.filter_type = val;
            }
            if (obj.category_ids === undefined || obj.category_ids === '') {
                const val = findTruncatedField('category_');
                if (val !== undefined) obj.category_ids = val;
            }

            return obj;
        }).filter(item => item.id);

        return mapperState.characteristics;
    } catch (error) {
        console.error('❌ Помилка завантаження характеристик:', error);
        mapperState.characteristics = [];
        throw error;
    }
}

/**
 * Завантажити власні опції
 */
export async function loadOptions() {

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.OPTIONS}!A:H`,
            spreadsheetType: 'main'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних опцій');
            mapperState.options = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        mapperState.options = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            // Нормалізація полів (алайси для різних назв колонок)
            if (!obj.id && obj.local_id) obj.id = obj.local_id;
            if (!obj.characteristic_id && obj.char_local_id) obj.characteristic_id = obj.char_local_id;
            if (!obj.value_ua && obj.name_uk) obj.value_ua = obj.name_uk;
            if (!obj.value_ru && obj.name_ru) obj.value_ru = obj.name_ru;

            return obj;
        }).filter(item => item.id);

        return mapperState.options;
    } catch (error) {
        console.error('❌ Помилка завантаження опцій:', error);
        mapperState.options = [];
        throw error;
    }
}

/**
 * Завантажити маппінги для категорій
 */
export async function loadMapCategories() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_CATEGORIES}!A:D`,
            spreadsheetType: 'main'
        });

        // Backend повертає масив напряму
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

        return mapperState.mapCategories;
    } catch (error) {
        console.error('❌ Помилка завантаження маппінгів категорій:', error);
        mapperState.mapCategories = [];
        throw error;
    }
}

/**
 * Завантажити маппінги для характеристик
 */
export async function loadMapCharacteristics() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_CHARACTERISTICS}!A:D`,
            spreadsheetType: 'main'
        });

        // Backend повертає масив напряму
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

        return mapperState.mapCharacteristics;
    } catch (error) {
        console.error('❌ Помилка завантаження маппінгів характеристик:', error);
        mapperState.mapCharacteristics = [];
        throw error;
    }
}

/**
 * Завантажити маппінги для опцій
 */
export async function loadMapOptions() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MAP_OPTIONS}!A:D`,
            spreadsheetType: 'main'
        });

        // Backend повертає масив напряму
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

        return mapperState.mapOptions;
    } catch (error) {
        console.error('❌ Помилка завантаження маппінгів опцій:', error);
        mapperState.mapOptions = [];
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD ОПЕРАЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обчислити _rowIndex для нового запису (після append)
 * Враховує "дірки" від видалених рядків у Google Sheets
 */
function getNextRowIndex(items) {
    if (items.length === 0) return 2; // Перший рядок даних (після заголовка)
    return Math.max(...items.map(i => i._rowIndex || 0)) + 1;
}

/**
 * Генерувати новий ID
 */
function generateId(prefix, items) {
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
function toSheetsBool(value) {
    if (value === true || value === 'true' || value === 'TRUE') return 'TRUE';
    return 'FALSE';
}

/**
 * Додати нову категорію
 */
export async function addCategory(data) {

    try {
        const newId = generateId('cat', mapperState.categories);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            data.name_ua || '',
            data.name_ru || '',
            data.parent_id || '',
            toSheetsBool(data.grouping),
            timestamp,
            timestamp
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.CATEGORIES}!A:G`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newCategory = {
            _rowIndex: getNextRowIndex(mapperState.categories),
            id: newId,
            name_ua: data.name_ua || '',
            name_ru: data.name_ru || '',
            parent_id: data.parent_id || '',
            grouping: toSheetsBool(data.grouping),
            created_at: timestamp,
            updated_at: timestamp
        };

        mapperState.categories.push(newCategory);
        return newCategory;
    } catch (error) {
        console.error('❌ Помилка додавання категорії:', error);
        throw error;
    }
}

/**
 * Оновити категорію
 */
export async function updateCategory(id, updates) {

    try {
        const category = mapperState.categories.find(c => c.id === id);
        if (!category) {
            throw new Error(`Категорію ${id} не знайдено`);
        }

        const timestamp = new Date().toISOString();
        const range = `${SHEETS.CATEGORIES}!A${category._rowIndex}:G${category._rowIndex}`;

        const updatedRow = [
            category.id,
            updates.name_ua !== undefined ? updates.name_ua : category.name_ua,
            updates.name_ru !== undefined ? updates.name_ru : category.name_ru,
            updates.parent_id !== undefined ? updates.parent_id : category.parent_id,
            toSheetsBool(updates.grouping !== undefined ? updates.grouping : category.grouping),
            category.created_at,
            timestamp
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(category, updates, { updated_at: timestamp });
        return category;
    } catch (error) {
        console.error('❌ Помилка оновлення категорії:', error);
        throw error;
    }
}

/**
 * Видалити категорію
 */
export async function deleteCategory(id) {

    try {
        const index = mapperState.categories.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error(`Категорію ${id} не знайдено`);
        }

        const category = mapperState.categories[index];
        const rowIndex = category._rowIndex;

        await hardDeleteRow('CATEGORIES', rowIndex);
        mapperState.categories.splice(index, 1);
        adjustRowIndices(mapperState.categories, rowIndex);
    } catch (error) {
        console.error('❌ Помилка видалення категорії:', error);
        throw error;
    }
}

/**
 * Додати нову характеристику
 */
export async function addCharacteristic(data) {

    try {
        const newId = generateId('char', mapperState.characteristics);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            '', // id_directory - пусте для локально створених
            data.name_ua || '',
            data.name_ru || '',
            data.type || 'TextInput',
            data.unit || '',
            data.filter_type || 'disable',
            toSheetsBool(data.is_global),
            data.category_ids || '',
            data.block_number || '',
            timestamp,
            data.sort_order || '',
            data.col_size || '',
            data.hint || ''
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.CHARACTERISTICS}!A:N`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newCharacteristic = {
            _rowIndex: getNextRowIndex(mapperState.characteristics),
            id: newId,
            name_ua: data.name_ua || '',
            name_ru: data.name_ru || '',
            type: data.type || 'TextInput',
            unit: data.unit || '',
            filter_type: data.filter_type || 'disable',
            is_global: toSheetsBool(data.is_global),
            category_ids: data.category_ids || '',
            block_number: data.block_number || '',
            created_at: timestamp,
            sort_order: data.sort_order || '',
            col_size: data.col_size || '',
            hint: data.hint || ''
        };

        mapperState.characteristics.push(newCharacteristic);
        return newCharacteristic;
    } catch (error) {
        console.error('❌ Помилка додавання характеристики:', error);
        throw error;
    }
}

/**
 * Оновити характеристику
 */
export async function updateCharacteristic(id, updates) {

    try {
        const characteristic = mapperState.characteristics.find(c => c.id === id);
        if (!characteristic) {
            throw new Error(`Характеристику ${id} не знайдено`);
        }

        const timestamp = new Date().toISOString();
        const range = `${SHEETS.CHARACTERISTICS}!A${characteristic._rowIndex}:N${characteristic._rowIndex}`;

        const updatedRow = [
            characteristic.id,
            characteristic.id_directory || '', // зберігаємо існуючий id_directory
            updates.name_ua !== undefined ? updates.name_ua : characteristic.name_ua,
            updates.name_ru !== undefined ? updates.name_ru : characteristic.name_ru,
            updates.type !== undefined ? updates.type : characteristic.type,
            updates.unit !== undefined ? updates.unit : characteristic.unit,
            updates.filter_type !== undefined ? updates.filter_type : characteristic.filter_type,
            toSheetsBool(updates.is_global !== undefined ? updates.is_global : characteristic.is_global),
            updates.category_ids !== undefined ? updates.category_ids : characteristic.category_ids,
            updates.block_number !== undefined ? updates.block_number : (characteristic.block_number || ''),
            timestamp,
            updates.sort_order !== undefined ? updates.sort_order : (characteristic.sort_order || ''),
            updates.col_size !== undefined ? updates.col_size : (characteristic.col_size || ''),
            updates.hint !== undefined ? updates.hint : (characteristic.hint || '')
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(characteristic, updates, { updated_at: timestamp });
        return characteristic;
    } catch (error) {
        console.error('❌ Помилка оновлення характеристики:', error);
        throw error;
    }
}

/**
 * Видалити характеристику
 */
export async function deleteCharacteristic(id) {

    try {
        const index = mapperState.characteristics.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error(`Характеристику ${id} не знайдено`);
        }

        const characteristic = mapperState.characteristics[index];
        const rowIndex = characteristic._rowIndex;

        await hardDeleteRow('CHARACTERISTICS', rowIndex);
        mapperState.characteristics.splice(index, 1);
        adjustRowIndices(mapperState.characteristics, rowIndex);
    } catch (error) {
        console.error('❌ Помилка видалення характеристики:', error);
        throw error;
    }
}

/**
 * Додати нову опцію
 */
export async function addOption(data) {

    try {
        const newId = generateId('opt', mapperState.options);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            '', // id_directory - пусте для локально створених
            data.characteristic_id || '',
            data.value_ua || '',
            data.value_ru || '',
            data.sort_order || '0',
            data.parent_option_id || '',
            timestamp
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.OPTIONS}!A:H`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newOption = {
            _rowIndex: getNextRowIndex(mapperState.options),
            id: newId,
            characteristic_id: data.characteristic_id || '',
            value_ua: data.value_ua || '',
            value_ru: data.value_ru || '',
            sort_order: data.sort_order || '0',
            parent_option_id: data.parent_option_id || '',
            created_at: timestamp
        };

        mapperState.options.push(newOption);
        return newOption;
    } catch (error) {
        console.error('❌ Помилка додавання опції:', error);
        throw error;
    }
}

/**
 * Оновити опцію
 */
export async function updateOption(id, updates) {

    try {
        const option = mapperState.options.find(o => o.id === id);
        if (!option) {
            throw new Error(`Опцію ${id} не знайдено`);
        }

        const range = `${SHEETS.OPTIONS}!A${option._rowIndex}:H${option._rowIndex}`;

        const updatedRow = [
            option.id,
            option.id_directory || '', // зберігаємо існуючий id_directory
            updates.characteristic_id !== undefined ? updates.characteristic_id : option.characteristic_id,
            updates.value_ua !== undefined ? updates.value_ua : option.value_ua,
            updates.value_ru !== undefined ? updates.value_ru : option.value_ru,
            updates.sort_order !== undefined ? updates.sort_order : option.sort_order,
            updates.parent_option_id !== undefined ? updates.parent_option_id : (option.parent_option_id || ''),
            option.created_at
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(option, updates);
        return option;
    } catch (error) {
        console.error('❌ Помилка оновлення опції:', error);
        throw error;
    }
}

/**
 * Видалити опцію
 */
export async function deleteOption(id) {

    try {
        const index = mapperState.options.findIndex(o => o.id === id);
        if (index === -1) {
            throw new Error(`Опцію ${id} не знайдено`);
        }

        const option = mapperState.options[index];
        const rowIndex = option._rowIndex;

        await hardDeleteRow('OPTIONS', rowIndex);
        mapperState.options.splice(index, 1);
        adjustRowIndices(mapperState.options, rowIndex);
    } catch (error) {
        console.error('❌ Помилка видалення опції:', error);
        throw error;
    }
}

/**
 * Додати новий маркетплейс
 */
export async function addMarketplace(data) {

    try {
        const newId = generateId('mp', mapperState.marketplaces);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            data.name || '',
            data.slug || '',
            toSheetsBool(data.is_active),
            data.field_schema || '{}',
            data.column_mapping || '{}',
            timestamp
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.MARKETPLACES}!A:G`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newMarketplace = {
            _rowIndex: getNextRowIndex(mapperState.marketplaces),
            id: newId,
            name: data.name || '',
            slug: data.slug || '',
            is_active: toSheetsBool(data.is_active),
            field_schema: data.field_schema || '{}',
            column_mapping: data.column_mapping || '{}',
            created_at: timestamp
        };

        mapperState.marketplaces.push(newMarketplace);
        return newMarketplace;
    } catch (error) {
        console.error('❌ Помилка додавання маркетплейсу:', error);
        throw error;
    }
}

/**
 * Оновити маркетплейс
 */
export async function updateMarketplace(id, updates) {

    try {
        const marketplace = mapperState.marketplaces.find(m => m.id === id);
        if (!marketplace) {
            throw new Error(`Маркетплейс ${id} не знайдено`);
        }

        const range = `${SHEETS.MARKETPLACES}!A${marketplace._rowIndex}:G${marketplace._rowIndex}`;

        const updatedRow = [
            marketplace.id,
            updates.name !== undefined ? updates.name : marketplace.name,
            updates.slug !== undefined ? updates.slug : marketplace.slug,
            toSheetsBool(updates.is_active !== undefined ? updates.is_active : marketplace.is_active),
            updates.field_schema !== undefined ? updates.field_schema : marketplace.field_schema,
            updates.column_mapping !== undefined ? updates.column_mapping : marketplace.column_mapping,
            marketplace.created_at
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(marketplace, updates);
        return marketplace;
    } catch (error) {
        console.error('❌ Помилка оновлення маркетплейсу:', error);
        throw error;
    }
}

/**
 * Видалити маркетплейс
 */
export async function deleteMarketplace(id) {

    try {
        const index = mapperState.marketplaces.findIndex(m => m.id === id);
        if (index === -1) {
            throw new Error(`Маркетплейс ${id} не знайдено`);
        }

        const marketplace = mapperState.marketplaces[index];
        const rowIndex = marketplace._rowIndex;

        await hardDeleteRow('MARKETPLACES', rowIndex);
        mapperState.marketplaces.splice(index, 1);
        adjustRowIndices(mapperState.marketplaces, rowIndex);
    } catch (error) {
        console.error('❌ Помилка видалення маркетплейсу:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════

export function getMarketplaces() {
    return mapperState.marketplaces || [];
}

export function getCategories() {
    return mapperState.categories || [];
}

export function getCharacteristics() {
    return mapperState.characteristics || [];
}

export function getOptions() {
    return mapperState.options || [];
}

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

// ═══════════════════════════════════════════════════════════════════════════
// ЗАЛЕЖНОСТІ (для каскадних попереджень при видаленні)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Порахувати залежності категорії
 */
export function getCategoryDependencies(categoryId) {
    const mappings = mapperState.mapCategories.filter(m => m.category_id === categoryId);
    const characteristics = mapperState.characteristics.filter(c => {
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });
    return { mappings: mappings.length, characteristics: characteristics.length };
}

/**
 * Порахувати залежності характеристики
 */
export function getCharacteristicDependencies(characteristicId) {
    const mappings = mapperState.mapCharacteristics.filter(m => m.characteristic_id === characteristicId);
    const options = mapperState.options.filter(o => o.characteristic_id === characteristicId);
    return { mappings: mappings.length, options: options.length };
}

/**
 * Порахувати залежності опції
 */
export function getOptionDependencies(optionId) {
    const mappings = mapperState.mapOptions.filter(m => m.option_id === optionId);
    const children = mapperState.options.filter(o => o.parent_option_id === optionId);
    return { mappings: mappings.length, children: children.length };
}

/**
 * Порахувати залежності маркетплейсу
 */
export function getMarketplaceDependencies(marketplaceId) {
    const cats = mapperState.mpCategories.filter(c => c.marketplace_id === marketplaceId);
    const chars = mapperState.mpCharacteristics.filter(c => c.marketplace_id === marketplaceId);
    const opts = mapperState.mpOptions.filter(o => o.marketplace_id === marketplaceId);

    const catMappings = mapperState.mapCategories.filter(m =>
        cats.some(c => c.id === m.mp_category_id || c.external_id === m.mp_category_id)
    );
    const charMappings = mapperState.mapCharacteristics.filter(m =>
        chars.some(c => c.id === m.mp_characteristic_id || c.external_id === m.mp_characteristic_id)
    );
    const optMappings = mapperState.mapOptions.filter(m =>
        opts.some(o => o.id === m.mp_option_id || o.external_id === m.mp_option_id)
    );

    return {
        mpCategories: cats.length,
        mpCharacteristics: chars.length,
        mpOptions: opts.length,
        catMappings: catMappings.length,
        charMappings: charMappings.length,
        optMappings: optMappings.length,
        totalMappings: catMappings.length + charMappings.length + optMappings.length
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАВАНТАЖЕННЯ ДАНИХ МАРКЕТПЛЕЙСІВ (MP)
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

/**
 * Завантажити категорії маркетплейсу
 * Структура: id | marketplace_id | external_id | source | data | created_at | updated_at
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

            // Зберігаємо оригінальний ID з таблиці
            const originalId = obj.id;

            // Парсимо JSON поле data
            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    // Зберігаємо JSON id для пошуку батьків (parentId посилається на нього)
                    if (parsedData.id !== undefined) {
                        obj._jsonId = String(parsedData.id);
                    }
                    Object.assign(obj, parsedData);
                    // Відновлюємо оригінальний ID (щоб не перезаписався з JSON)
                    obj.id = originalId;
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                    obj.data = null;
                }
            }

            normalizeMpLoadedData(obj, 'categories');
            return obj;
        }).filter(item => item.id && item.id !== 'id'); // Фільтруємо порожні та заголовкові рядки

        return mapperState.mpCategories;
    } catch (error) {
        console.error('❌ Помилка завантаження MP категорій:', error);
        mapperState.mpCategories = [];
        throw error;
    }
}

/**
 * Завантажити характеристики маркетплейсу
 * Структура: id | marketplace_id | external_id | source | data | created_at | updated_at
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

            // Зберігаємо оригінальний ID з таблиці
            const originalId = obj.id;

            // Парсимо JSON поле data
            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    Object.assign(obj, parsedData);
                    // Відновлюємо оригінальний ID (щоб не перезаписався з JSON)
                    obj.id = originalId;
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                    obj.data = null;
                }
            }

            normalizeMpLoadedData(obj, 'characteristics');
            return obj;
        }).filter(item => item.id && item.id !== 'id'); // Фільтруємо порожні та заголовкові рядки

        return mapperState.mpCharacteristics;
    } catch (error) {
        console.error('❌ Помилка завантаження MP характеристик:', error);
        mapperState.mpCharacteristics = [];
        throw error;
    }
}

/**
 * Завантажити опції маркетплейсу
 * Структура: id | marketplace_id | external_id | source | data | created_at | updated_at
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

            // Зберігаємо оригінальний ID з таблиці
            const originalId = obj.id;

            // Парсимо JSON поле data
            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    Object.assign(obj, parsedData);
                    // Відновлюємо оригінальний ID (щоб не перезаписався з JSON)
                    obj.id = originalId;
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                    obj.data = null;
                }
            }

            normalizeMpLoadedData(obj, 'options');
            return obj;
        }).filter(item => item.id && item.id !== 'id'); // Фільтруємо порожні та заголовкові рядки

        return mapperState.mpOptions;
    } catch (error) {
        console.error('❌ Помилка завантаження MP опцій:', error);
        mapperState.mpOptions = [];
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// МАППІНГ (ПРИВ'ЯЗКА MP ДАНИХ ДО ВЛАСНИХ) - CRUD для окремих таблиць
// ═══════════════════════════════════════════════════════════════════════════

// -------------------------
// КАТЕГОРІЇ
// -------------------------

/**
 * Перевірити чи MP категорія замаплена
 * @param {string} mpCatId - ID MP категорії
 */
export function isMpCategoryMapped(mpCatId) {
    // Знайти MP категорію щоб отримати external_id
    const mpCat = mapperState.mpCategories.find(c => c.id === mpCatId);
    const externalId = mpCat?.external_id;

    // Перевірити в таблиці маппінгів (по id або external_id)
    const inMappingTable = mapperState.mapCategories.some(m =>
        m.mp_category_id === mpCatId || m.mp_category_id === externalId
    );
    if (inMappingTable) return true;

    // Перевірити в старому JSON форматі (data.our_category_id)
    if (mpCat) {
        try {
            const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
            if (data.our_category_id) return true;
        } catch { /* невалідний JSON — ігноруємо */ }
    }

    return false;
}

/**
 * Отримати всі MP категорії, які замаплені на власну категорію
 * @param {string} ownCatId - ID власної категорії
 */
export function getMappedMpCategories(ownCatId) {
    const result = [];
    const addedIds = new Set();

    // 1. З таблиці маппінгів
    const mappings = mapperState.mapCategories.filter(m =>
        m.category_id === ownCatId
    );
    mappings.forEach(mapping => {
        // Шукаємо по id або external_id
        const mpCat = mapperState.mpCategories.find(c =>
            c.id === mapping.mp_category_id || c.external_id === mapping.mp_category_id
        );
        if (mpCat && !addedIds.has(mpCat.id)) {
            result.push({ ...mpCat, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpCat.id);
        }
    });

    // 2. Зі старого JSON формату (data.our_category_id)
    mapperState.mpCategories.forEach(mpCat => {
        if (addedIds.has(mpCat.id)) return;
        try {
            const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
            if (data.our_category_id === ownCatId) {
                result.push({ ...mpCat, _source: 'legacy' });
                addedIds.add(mpCat.id);
            }
        } catch { /* невалідний JSON — ігноруємо */ }
    });

    return result;
}

/**
 * Створити маппінг категорії
 * @param {string} ownCatId - ID власної категорії
 * @param {string} mpCatId - ID MP категорії
 */
export async function createCategoryMapping(ownCatId, mpCatId) {

    try {
        // Перевірити чи вже існує
        const existing = mapperState.mapCategories.find(m =>
            m.category_id === ownCatId && m.mp_category_id === mpCatId
        );
        if (existing) {
            return existing;
        }

        // Генерувати ID
        const newId = generateId('map-cat', mapperState.mapCategories);
        const timestamp = new Date().toISOString();

        // Додати рядок в таблицю
        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_CATEGORIES}!A:D`,
            values: [[newId, ownCatId, mpCatId, timestamp]],
            spreadsheetType: 'main'
        });

        // Оновити локальний стан
        const newMapping = {
            id: newId,
            category_id: ownCatId,
            mp_category_id: mpCatId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mapperState.mapCategories)
        };
        mapperState.mapCategories.push(newMapping);

        return newMapping;
    } catch (error) {
        console.error('❌ Помилка створення маппінгу категорії:', error);
        throw error;
    }
}

/**
 * Видалити маппінг категорії
 * @param {string} mappingId - ID маппінгу
 */
export async function deleteCategoryMapping(mappingId) {

    try {
        const mapping = mapperState.mapCategories.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_CATEGORIES', rowIndex);

        // Видалити з локального стану
        const index = mapperState.mapCategories.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mapperState.mapCategories.splice(index, 1);
        }
        adjustRowIndices(mapperState.mapCategories, rowIndex);

    } catch (error) {
        console.error('❌ Помилка видалення маппінгу категорії:', error);
        throw error;
    }
}

/**
 * Видалити маппінг категорії по ID MP категорії
 * @param {string} mpCatId - ID MP категорії
 */
export async function deleteCategoryMappingByMpId(mpCatId) {
    const mapping = mapperState.mapCategories.find(m => m.mp_category_id === mpCatId);
    if (mapping) {
        await deleteCategoryMapping(mapping.id);
    }
}

/**
 * Batch створення маппінгів для кількох MP категорій
 * @param {Array<string>} mpCatIds - Масив ID MP категорій
 * @param {string} ownCatId - ID власної категорії
 */
export async function batchCreateCategoryMapping(mpCatIds, ownCatId) {

    const results = {
        success: [],
        failed: []
    };

    for (const mpCatId of mpCatIds) {
        try {
            await createCategoryMapping(ownCatId, mpCatId);
            results.success.push(mpCatId);
        } catch (error) {
            console.error(`❌ Помилка маппінгу ${mpCatId}:`, error);
            results.failed.push({ id: mpCatId, error: error.message });
        }
    }

    return results;
}

// -------------------------
// ХАРАКТЕРИСТИКИ
// -------------------------

/**
 * Створити маппінг характеристики
 * @param {string} ownCharId - ID власної характеристики
 * @param {string} mpCharId - ID MP характеристики
 */
export async function createCharacteristicMapping(ownCharId, mpCharId) {

    try {
        // Перевірити чи вже існує
        const existing = mapperState.mapCharacteristics.find(m =>
            m.characteristic_id === ownCharId && m.mp_characteristic_id === mpCharId
        );
        if (existing) {
            return existing;
        }

        // Генерувати ID
        const newId = generateId('map-char', mapperState.mapCharacteristics);
        const timestamp = new Date().toISOString();

        // Додати рядок в таблицю
        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_CHARACTERISTICS}!A:D`,
            values: [[newId, ownCharId, mpCharId, timestamp]],
            spreadsheetType: 'main'
        });

        // Оновити локальний стан
        const newMapping = {
            id: newId,
            characteristic_id: ownCharId,
            mp_characteristic_id: mpCharId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mapperState.mapCharacteristics)
        };
        mapperState.mapCharacteristics.push(newMapping);

        return newMapping;
    } catch (error) {
        console.error('❌ Помилка створення маппінгу:', error);
        throw error;
    }
}

/**
 * Видалити маппінг характеристики
 * @param {string} mappingId - ID маппінгу
 */
export async function deleteCharacteristicMapping(mappingId) {

    try {
        const mapping = mapperState.mapCharacteristics.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_CHARACTERISTICS', rowIndex);

        // Видалити з локального стану
        const index = mapperState.mapCharacteristics.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mapperState.mapCharacteristics.splice(index, 1);
        }
        adjustRowIndices(mapperState.mapCharacteristics, rowIndex);

    } catch (error) {
        console.error('❌ Помилка видалення маппінгу:', error);
        throw error;
    }
}

/**
 * Видалити маппінг характеристики за MP ID
 * @param {string} mpCharId - ID MP характеристики
 */
export async function deleteCharacteristicMappingByMpId(mpCharId) {
    const mapping = mapperState.mapCharacteristics.find(m => m.mp_characteristic_id === mpCharId);
    if (mapping) {
        await deleteCharacteristicMapping(mapping.id);
    }
}

/**
 * Отримати всі MP характеристики замаплені до власної
 * @param {string} ownCharId - ID власної характеристики
 */
export function getMappedMpCharacteristics(ownCharId) {
    const result = [];
    const addedIds = new Set();

    // 1. З нової таблиці маппінгів
    const mappings = mapperState.mapCharacteristics.filter(m =>
        m.characteristic_id === ownCharId
    );
    mappings.forEach(mapping => {
        // Шукаємо по id або external_id
        const mpChar = mapperState.mpCharacteristics.find(c =>
            c.id === mapping.mp_characteristic_id || c.external_id === mapping.mp_characteristic_id
        );
        if (mpChar && !addedIds.has(mpChar.id)) {
            result.push({ ...mpChar, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpChar.id);
        }
    });

    // 2. Зі старого JSON формату (data.our_char_id)
    mapperState.mpCharacteristics.forEach(mpChar => {
        if (addedIds.has(mpChar.id)) return;
        try {
            const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data || '{}') : (mpChar.data || {});
            if (data.our_char_id === ownCharId) {
                result.push({ ...mpChar, _source: 'legacy' });
                addedIds.add(mpChar.id);
            }
        } catch { /* невалідний JSON — ігноруємо */ }
    });

    return result;
}

/**
 * Перевірити чи MP характеристика замаплена
 * @param {string} mpCharId - ID MP характеристики
 */
export function isMpCharacteristicMapped(mpCharId) {
    // Знайти MP характеристику щоб отримати external_id
    const mpChar = mapperState.mpCharacteristics.find(c => c.id === mpCharId);
    const externalId = mpChar?.external_id;

    // Перевірити в новій таблиці маппінгів (по id або external_id)
    const inNewTable = mapperState.mapCharacteristics.some(m =>
        m.mp_characteristic_id === mpCharId || m.mp_characteristic_id === externalId
    );
    if (inNewTable) return true;

    // Перевірити в старому JSON форматі (data.our_char_id)
    if (mpChar) {
        try {
            const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data || '{}') : (mpChar.data || {});
            if (data.our_char_id) return true;
        } catch { /* невалідний JSON — ігноруємо */ }
    }

    return false;
}

/**
 * Отримати маппінг для MP характеристики
 * @param {string} mpCharId - ID MP характеристики
 */
export function getCharacteristicMappingByMpId(mpCharId) {
    return mapperState.mapCharacteristics.find(m => m.mp_characteristic_id === mpCharId);
}

// -------------------------
// ОПЦІЇ
// -------------------------

/**
 * Створити маппінг опції
 * @param {string} ownOptionId - ID власної опції
 * @param {string} mpOptionId - ID MP опції
 */
export async function createOptionMapping(ownOptionId, mpOptionId) {

    try {
        // Перевірити чи вже існує
        const existing = mapperState.mapOptions.find(m =>
            m.option_id === ownOptionId && m.mp_option_id === mpOptionId
        );
        if (existing) {
            return existing;
        }

        // Генерувати ID
        const newId = generateId('map-opt', mapperState.mapOptions);
        const timestamp = new Date().toISOString();

        // Додати рядок в таблицю
        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_OPTIONS}!A:D`,
            values: [[newId, ownOptionId, mpOptionId, timestamp]],
            spreadsheetType: 'main'
        });

        // Оновити локальний стан
        const newMapping = {
            id: newId,
            option_id: ownOptionId,
            mp_option_id: mpOptionId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mapperState.mapOptions)
        };
        mapperState.mapOptions.push(newMapping);

        return newMapping;
    } catch (error) {
        console.error('❌ Помилка створення маппінгу опції:', error);
        throw error;
    }
}

/**
 * Видалити маппінг опції
 * @param {string} mappingId - ID маппінгу
 */
export async function deleteOptionMapping(mappingId) {

    try {
        const mapping = mapperState.mapOptions.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_OPTIONS', rowIndex);

        // Видалити з локального стану
        const index = mapperState.mapOptions.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mapperState.mapOptions.splice(index, 1);
        }
        adjustRowIndices(mapperState.mapOptions, rowIndex);

    } catch (error) {
        console.error('❌ Помилка видалення маппінгу опції:', error);
        throw error;
    }
}

/**
 * Видалити маппінг опції за MP ID
 * @param {string} mpOptionId - ID MP опції
 */
export async function deleteOptionMappingByMpId(mpOptionId) {
    const mapping = mapperState.mapOptions.find(m => m.mp_option_id === mpOptionId);
    if (mapping) {
        await deleteOptionMapping(mapping.id);
    }
}

/**
 * Отримати всі MP опції замаплені до власної
 * @param {string} ownOptionId - ID власної опції
 */
export function getMappedMpOptions(ownOptionId) {
    const result = [];
    const addedIds = new Set();

    // 1. З нової таблиці маппінгів
    const mappings = mapperState.mapOptions.filter(m =>
        m.option_id === ownOptionId
    );
    mappings.forEach(mapping => {
        // Шукаємо по id або external_id
        const mpOption = mapperState.mpOptions.find(o =>
            o.id === mapping.mp_option_id || o.external_id === mapping.mp_option_id
        );
        if (mpOption && !addedIds.has(mpOption.id)) {
            result.push({ ...mpOption, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpOption.id);
        }
    });

    // 2. Зі старого JSON формату (data.our_option_id)
    mapperState.mpOptions.forEach(mpOption => {
        if (addedIds.has(mpOption.id)) return;
        try {
            const data = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data || '{}') : (mpOption.data || {});
            if (data.our_option_id === ownOptionId) {
                result.push({ ...mpOption, _source: 'legacy' });
                addedIds.add(mpOption.id);
            }
        } catch { /* невалідний JSON — ігноруємо */ }
    });

    return result;
}

/**
 * Перевірити чи MP опція замаплена
 * @param {string} mpOptionId - ID MP опції
 */
export function isMpOptionMapped(mpOptionId) {
    // Знайти MP опцію щоб отримати external_id
    const mpOption = mapperState.mpOptions.find(o => o.id === mpOptionId);
    const externalId = mpOption?.external_id;

    // Перевірити в новій таблиці маппінгів (по id або external_id)
    const inNewTable = mapperState.mapOptions.some(m =>
        m.mp_option_id === mpOptionId || m.mp_option_id === externalId
    );
    if (inNewTable) return true;

    // Перевірити в старому JSON форматі (data.our_option_id)
    if (mpOption) {
        try {
            const data = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data || '{}') : (mpOption.data || {});
            if (data.our_option_id) return true;
        } catch { /* невалідний JSON — ігноруємо */ }
    }

    return false;
}

/**
 * Отримати маппінг для MP опції
 * @param {string} mpOptionId - ID MP опції
 */
export function getOptionMappingByMpId(mpOptionId) {
    return mapperState.mapOptions.find(m => m.mp_option_id === mpOptionId);
}

/**
 * Batch створення маппінгів для кількох MP характеристик
 * @param {Array<string>} mpCharIds - Масив ID MP характеристик
 * @param {string} ownCharId - ID власної характеристики
 */
export async function batchCreateCharacteristicMapping(mpCharIds, ownCharId) {

    const results = {
        success: [],
        failed: []
    };

    for (const mpCharId of mpCharIds) {
        try {
            await createCharacteristicMapping(ownCharId, mpCharId);
            results.success.push(mpCharId);
        } catch (error) {
            console.error(`❌ Помилка маппінгу ${mpCharId}:`, error);
            results.failed.push({ id: mpCharId, error: error.message });
        }
    }

    return results;
}

/**
 * Batch створення маппінгів для кількох MP опцій
 * @param {Array<string>} mpOptionIds - Масив ID MP опцій
 * @param {string} ownOptionId - ID власної опції
 */
export async function batchCreateOptionMapping(mpOptionIds, ownOptionId) {

    const results = {
        success: [],
        failed: []
    };

    for (const mpOptionId of mpOptionIds) {
        try {
            await createOptionMapping(ownOptionId, mpOptionId);
            results.success.push(mpOptionId);
        } catch (error) {
            console.error(`❌ Помилка маппінгу ${mpOptionId}:`, error);
            results.failed.push({ id: mpOptionId, error: error.message });
        }
    }

    return results;
}

/**
 * Автоматичний маппінг MP характеристик за назвою
 * @param {Array<string>} mpCharIds - Масив ID MP характеристик для автомаппінгу
 */
export async function autoMapCharacteristics(mpCharIds) {

    const results = {
        mapped: [],
        notFound: [],
        failed: []
    };

    const ownCharacteristics = getCharacteristics();

    for (const mpCharId of mpCharIds) {
        try {
            const mpChar = mapperState.mpCharacteristics.find(c => c.id === mpCharId);
            if (!mpChar) {
                results.failed.push({ id: mpCharId, error: 'MP характеристику не знайдено' });
                continue;
            }

            // Отримуємо назву MP характеристики
            const mpData = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data) : (mpChar.data || {});
            const mpName = (mpData.name || '').toLowerCase().trim();

            if (!mpName) {
                results.notFound.push({ id: mpCharId, name: '(пусто)' });
                continue;
            }

            // Шукаємо власну характеристику з такою ж назвою
            const ownChar = ownCharacteristics.find(c => {
                const ownName = (c.name_ua || '').toLowerCase().trim();
                return ownName === mpName;
            });

            if (ownChar) {
                await createCharacteristicMapping(ownChar.id, mpCharId);
                results.mapped.push({ mpId: mpCharId, ownId: ownChar.id, name: mpName });
            } else {
                results.notFound.push({ id: mpCharId, name: mpName });
            }
        } catch (error) {
            console.error(`❌ Помилка автомаппінгу ${mpCharId}:`, error);
            results.failed.push({ id: mpCharId, error: error.message });
        }
    }

    return results;
}

/**
 * Автоматичний маппінг MP опцій за назвою
 * @param {Array<string>} mpOptionIds - Масив ID MP опцій для автомаппінгу
 */
export async function autoMapOptions(mpOptionIds) {

    const results = {
        mapped: [],
        notFound: [],
        failed: []
    };

    const ownOptions = getOptions();

    for (const mpOptionId of mpOptionIds) {
        try {
            const mpOption = mapperState.mpOptions.find(o => o.id === mpOptionId);
            if (!mpOption) {
                results.failed.push({ id: mpOptionId, error: 'MP опцію не знайдено' });
                continue;
            }

            // Отримуємо назву MP опції
            const mpData = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data) : (mpOption.data || {});
            const mpName = (mpData.name || '').toLowerCase().trim();

            if (!mpName) {
                results.notFound.push({ id: mpOptionId, name: '(пусто)' });
                continue;
            }

            // Шукаємо власну опцію з такою ж назвою
            const ownOption = ownOptions.find(o => {
                const ownName = (o.value_ua || '').toLowerCase().trim();
                return ownName === mpName;
            });

            if (ownOption) {
                await createOptionMapping(ownOption.id, mpOptionId);
                results.mapped.push({ mpId: mpOptionId, ownId: ownOption.id, name: mpName });
            } else {
                results.notFound.push({ id: mpOptionId, name: mpName });
            }
        } catch (error) {
            console.error(`❌ Помилка автомаппінгу ${mpOptionId}:`, error);
            results.failed.push({ id: mpOptionId, error: error.message });
        }
    }

    return results;
}
