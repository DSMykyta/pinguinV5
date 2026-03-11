// js/data/entities-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            SHARED DATA — ВЛАСНІ СУТНОСТІ (Load + CRUD)                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Спільний data layer для категорій, характеристик, опцій.
 * Імпортується з будь-якої сторінки: entities, products, brands, marketplaces.
 * Внутрішній стан — module-level масиви.
 */

import { callSheetsAPI } from '../utils/utils-api-client.js';
import {
    SHEETS,
    hardDeleteRow,
    adjustRowIndices,
    generateId,
    getNextRowIndex,
    toSheetsBool
} from './data-helpers.js';

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ═══════════════════════════════════════════════════════════════════════════

let _categories = [];
let _characteristics = [];
let _options = [];

// ═══════════════════════════════════════════════════════════════════════════
// LOAD ALL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити всі власні сутності
 */
export async function loadAllEntities() {
    try {
        await Promise.allSettled([
            loadCategories(),
            loadCharacteristics(),
            loadOptions()
        ]);
    } catch (error) {
        console.error('Помилка завантаження сутностей:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export async function loadCategories() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.CATEGORIES}!A:G`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('Немає даних категорій');
            _categories = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        _categories = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            if (!obj.id && obj.local_id) obj.id = obj.local_id;
            if (!obj.name_ua && obj.name_uk) obj.name_ua = obj.name_uk;
            if (!obj.parent_id && obj.parent_local_id) obj.parent_id = obj.parent_local_id;

            return obj;
        }).filter(item => item.id);

        return _categories;
    } catch (error) {
        console.error('Помилка завантаження категорій:', error);
        _categories = [];
        throw error;
    }
}

export async function addCategory(data) {
    try {
        const newId = generateId('cat', _categories);
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
            _rowIndex: getNextRowIndex(_categories),
            id: newId,
            name_ua: data.name_ua || '',
            name_ru: data.name_ru || '',
            parent_id: data.parent_id || '',
            grouping: toSheetsBool(data.grouping),
            created_at: timestamp,
            updated_at: timestamp
        };

        _categories.push(newCategory);
        return newCategory;
    } catch (error) {
        console.error('Помилка додавання категорії:', error);
        throw error;
    }
}

export async function updateCategory(id, updates) {
    try {
        const category = _categories.find(c => c.id === id);
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
        console.error('Помилка оновлення категорії:', error);
        throw error;
    }
}

export async function deleteCategory(id) {
    try {
        const index = _categories.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error(`Категорію ${id} не знайдено`);
        }

        const category = _categories[index];
        const rowIndex = category._rowIndex;

        await hardDeleteRow('CATEGORIES', rowIndex);
        _categories.splice(index, 1);
        adjustRowIndices(_categories, rowIndex);
    } catch (error) {
        console.error('Помилка видалення категорії:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARACTERISTICS
// ═══════════════════════════════════════════════════════════════════════════

export async function loadCharacteristics() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.CHARACTERISTICS}!A:N`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('Немає даних характеристик');
            _characteristics = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        _characteristics = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            if (!obj.id && obj.local_id) obj.id = obj.local_id;
            if (!obj.name_ua && obj.name_uk) obj.name_ua = obj.name_uk;
            if (!obj.type && obj.param_type) obj.type = obj.param_type;

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

        return _characteristics;
    } catch (error) {
        console.error('Помилка завантаження характеристик:', error);
        _characteristics = [];
        throw error;
    }
}

export async function addCharacteristic(data) {
    try {
        const newId = generateId('char', _characteristics);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            '',
            data.name_ua || '',
            data.name_ru || '',
            data.type || 'TextInput',
            data.unit || '',
            data.filter_type || 'disable',
            toSheetsBool(data.is_global),
            data.category_ids || '',
            data.block_number || '',
            data.sort_order || '',
            data.col_size || '',
            data.hint || '',
            timestamp
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.CHARACTERISTICS}!A:N`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newCharacteristic = {
            _rowIndex: getNextRowIndex(_characteristics),
            id: newId,
            name_ua: data.name_ua || '',
            name_ru: data.name_ru || '',
            type: data.type || 'TextInput',
            unit: data.unit || '',
            filter_type: data.filter_type || 'disable',
            is_global: toSheetsBool(data.is_global),
            category_ids: data.category_ids || '',
            block_number: data.block_number || '',
            sort_order: data.sort_order || '',
            col_size: data.col_size || '',
            hint: data.hint || '',
            created_at: timestamp
        };

        _characteristics.push(newCharacteristic);
        return newCharacteristic;
    } catch (error) {
        console.error('Помилка додавання характеристики:', error);
        throw error;
    }
}

export async function updateCharacteristic(id, updates) {
    try {
        const characteristic = _characteristics.find(c => c.id === id);
        if (!characteristic) {
            throw new Error(`Характеристику ${id} не знайдено`);
        }

        const timestamp = new Date().toISOString();
        const range = `${SHEETS.CHARACTERISTICS}!A${characteristic._rowIndex}:N${characteristic._rowIndex}`;

        const updatedRow = [
            characteristic.id,
            characteristic.id_directory || '',
            updates.name_ua !== undefined ? updates.name_ua : characteristic.name_ua,
            updates.name_ru !== undefined ? updates.name_ru : characteristic.name_ru,
            updates.type !== undefined ? updates.type : characteristic.type,
            updates.unit !== undefined ? updates.unit : characteristic.unit,
            updates.filter_type !== undefined ? updates.filter_type : characteristic.filter_type,
            toSheetsBool(updates.is_global !== undefined ? updates.is_global : characteristic.is_global),
            updates.category_ids !== undefined ? updates.category_ids : characteristic.category_ids,
            updates.block_number !== undefined ? updates.block_number : (characteristic.block_number || ''),
            updates.sort_order !== undefined ? updates.sort_order : (characteristic.sort_order || ''),
            updates.col_size !== undefined ? updates.col_size : (characteristic.col_size || ''),
            updates.hint !== undefined ? updates.hint : (characteristic.hint || ''),
            timestamp
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(characteristic, updates, { updated_at: timestamp });
        return characteristic;
    } catch (error) {
        console.error('Помилка оновлення характеристики:', error);
        throw error;
    }
}

export async function deleteCharacteristic(id) {
    try {
        const index = _characteristics.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error(`Характеристику ${id} не знайдено`);
        }

        const characteristic = _characteristics[index];
        const rowIndex = characteristic._rowIndex;

        await hardDeleteRow('CHARACTERISTICS', rowIndex);
        _characteristics.splice(index, 1);
        adjustRowIndices(_characteristics, rowIndex);
    } catch (error) {
        console.error('Помилка видалення характеристики:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function loadOptions() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.OPTIONS}!A:H`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('Немає даних опцій');
            _options = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        _options = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            if (!obj.id && obj.local_id) obj.id = obj.local_id;
            if (!obj.characteristic_id && obj.char_local_id) obj.characteristic_id = obj.char_local_id;
            if (!obj.value_ua && obj.name_uk) obj.value_ua = obj.name_uk;
            if (!obj.value_ru && obj.name_ru) obj.value_ru = obj.name_ru;

            return obj;
        }).filter(item => item.id);

        return _options;
    } catch (error) {
        console.error('Помилка завантаження опцій:', error);
        _options = [];
        throw error;
    }
}

export async function addOption(data) {
    try {
        const newId = generateId('opt', _options);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            '',
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
            _rowIndex: getNextRowIndex(_options),
            id: newId,
            characteristic_id: data.characteristic_id || '',
            value_ua: data.value_ua || '',
            value_ru: data.value_ru || '',
            sort_order: data.sort_order || '0',
            parent_option_id: data.parent_option_id || '',
            created_at: timestamp
        };

        _options.push(newOption);
        return newOption;
    } catch (error) {
        console.error('Помилка додавання опції:', error);
        throw error;
    }
}

export async function updateOption(id, updates) {
    try {
        const option = _options.find(o => o.id === id);
        if (!option) {
            throw new Error(`Опцію ${id} не знайдено`);
        }

        const range = `${SHEETS.OPTIONS}!A${option._rowIndex}:H${option._rowIndex}`;

        const updatedRow = [
            option.id,
            option.id_directory || '',
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
        console.error('Помилка оновлення опції:', error);
        throw error;
    }
}

export async function deleteOption(id) {
    try {
        const index = _options.findIndex(o => o.id === id);
        if (index === -1) {
            throw new Error(`Опцію ${id} не знайдено`);
        }

        const option = _options[index];
        const rowIndex = option._rowIndex;

        await hardDeleteRow('OPTIONS', rowIndex);
        _options.splice(index, 1);
        adjustRowIndices(_options, rowIndex);
    } catch (error) {
        console.error('Помилка видалення опції:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════

export function getCategories() {
    return _categories;
}

export function getCharacteristics() {
    return _characteristics;
}

export function getOptions() {
    return _options;
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАЛЕЖНОСТІ (для каскадних попереджень при видаленні)
// Використовує lazy import щоб уникнути циклічних залежностей з mappings-data
// ═══════════════════════════════════════════════════════════════════════════

let _mappingsModule = null;
async function getMappingsModule() {
    if (!_mappingsModule) _mappingsModule = await import('./mappings-data.js');
    return _mappingsModule;
}

export function getCategoryDependencies(categoryId, mapCategories) {
    const mappings = (mapCategories || []).filter(m => m.category_id === categoryId);
    const characteristics = _characteristics.filter(c => {
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });
    return { mappings: mappings.length, characteristics: characteristics.length };
}

export function getCharacteristicDependencies(characteristicId, mapCharacteristics) {
    const mappings = (mapCharacteristics || []).filter(m => m.characteristic_id === characteristicId);
    const options = _options.filter(o => o.characteristic_id === characteristicId);
    return { mappings: mappings.length, options: options.length };
}

export function getOptionDependencies(optionId, mapOptions) {
    const mappings = (mapOptions || []).filter(m => m.option_id === optionId);
    const children = _options.filter(o => o.parent_option_id === optionId);
    return { mappings: mappings.length, children: children.length };
}
