// js/pages/mapper/mapper-data-own.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            MAPPER DATA - ВЛАСНІ СУТНОСТІ (Load + CRUD)                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження, CRUD операції, getters та залежності для власних сутностей:
 * categories, characteristics, options, marketplaces.
 */

import { mapperState } from './mapper-state.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import {
    SHEETS,
    hardDeleteRow,
    adjustRowIndices,
    generateId,
    getNextRowIndex,
    toSheetsBool
} from './mapper-data-helpers.js';

// ═══════════════════════════════════════════════════════════════════════════
// LOAD ALL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити всі дані для Mapper
 */
export async function loadMapperData() {
    try {
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

// ═══════════════════════════════════════════════════════════════════════════
// MARKETPLACES
// ═══════════════════════════════════════════════════════════════════════════

export async function loadMarketplaces() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MARKETPLACES}!A:G`,
            spreadsheetType: 'main'
        });

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

            if (!obj.id && obj.marketplace_id) obj.id = obj.marketplace_id;
            if (!obj.name && obj.display_name) obj.name = obj.display_name;
            if (!obj.slug && obj.marketplace_id) obj.slug = obj.marketplace_id;
            if (!obj.is_active && obj.state !== undefined) {
                obj.is_active = obj.state === 'TRUE' || obj.state === true || obj.state === 'true';
            }

            return obj;
        }).filter(item => item.id);

        return mapperState.marketplaces;
    } catch (error) {
        console.error('❌ Помилка завантаження маркетплейсів:', error);
        mapperState.marketplaces = [];
        throw error;
    }
}

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
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export async function loadCategories() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.CATEGORIES}!A:G`,
            spreadsheetType: 'main'
        });

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

        return mapperState.characteristics;
    } catch (error) {
        console.error('❌ Помилка завантаження характеристик:', error);
        mapperState.characteristics = [];
        throw error;
    }
}

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
            characteristic.id_directory || '',
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

export async function updateOption(id, updates) {
    try {
        const option = mapperState.options.find(o => o.id === id);
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
        console.error('❌ Помилка оновлення опції:', error);
        throw error;
    }
}

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

// ═══════════════════════════════════════════════════════════════════════════
// ЗАЛЕЖНОСТІ (для каскадних попереджень при видаленні)
// ═══════════════════════════════════════════════════════════════════════════

export function getCategoryDependencies(categoryId) {
    const mappings = mapperState.mapCategories.filter(m => m.category_id === categoryId);
    const characteristics = mapperState.characteristics.filter(c => {
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });
    return { mappings: mappings.length, characteristics: characteristics.length };
}

export function getCharacteristicDependencies(characteristicId) {
    const mappings = mapperState.mapCharacteristics.filter(m => m.characteristic_id === characteristicId);
    const options = mapperState.options.filter(o => o.characteristic_id === characteristicId);
    return { mappings: mappings.length, options: options.length };
}

export function getOptionDependencies(optionId) {
    const mappings = mapperState.mapOptions.filter(m => m.option_id === optionId);
    const children = mapperState.options.filter(o => o.parent_option_id === optionId);
    return { mappings: mappings.length, children: children.length };
}

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
