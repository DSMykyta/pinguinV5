// js/mapper/mapper-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - DATA MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для Marketplace Mapper.
 * Використовує уніфікований api-client для всіх операцій.
 */

import { mapperState } from './mapper-init.js';
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

/**
 * Завантажити всі дані для Mapper
 */
export async function loadMapperData() {
    console.log('📥 Завантаження даних Mapper...');

    try {
        // Завантажуємо паралельно всі необхідні дані
        await Promise.all([
            loadMarketplaces(),
            loadCategories(),
            loadCharacteristics(),
            loadOptions()
        ]);

        console.log('✅ Всі дані Mapper завантажено');
    } catch (error) {
        console.error('❌ Помилка завантаження даних Mapper:', error);
        throw error;
    }
}

/**
 * Завантажити маркетплейси
 */
export async function loadMarketplaces() {
    console.log('📥 Завантаження маркетплейсів...');

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

        console.log(`✅ Завантажено ${mapperState.marketplaces.length} маркетплейсів`);
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
    console.log('📥 Завантаження категорій...');

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.CATEGORIES}!A:F`,
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
        });

        console.log(`✅ Завантажено ${mapperState.categories.length} категорій`);
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
    console.log('📥 Завантаження характеристик...');

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.CHARACTERISTICS}!A:K`,
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
            if (obj.parent_option_id === undefined || obj.parent_option_id === '') {
                const val = findTruncatedField('parent_opt');
                if (val !== undefined) obj.parent_option_id = val;
            }

            return obj;
        });

        console.log(`✅ Завантажено ${mapperState.characteristics.length} характеристик`);
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
    console.log('📥 Завантаження опцій...');

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.OPTIONS}!A:G`,
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
        });

        console.log(`✅ Завантажено ${mapperState.options.length} опцій`);
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
        });

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
        });

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
        });

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
 * Додати нову категорію
 */
export async function addCategory(data) {
    console.log('➕ Додавання категорії:', data);

    try {
        const newId = generateId('cat', mapperState.categories);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            data.name_ua || '',
            data.name_ru || '',
            data.parent_id || '',
            timestamp,
            timestamp
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.CATEGORIES}!A:F`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newCategory = {
            _rowIndex: mapperState.categories.length + 2,
            id: newId,
            name_ua: data.name_ua || '',
            name_ru: data.name_ru || '',
            parent_id: data.parent_id || '',
            created_at: timestamp,
            updated_at: timestamp
        };

        mapperState.categories.push(newCategory);
        console.log('✅ Категорію додано:', newCategory);
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
    console.log(`📝 Оновлення категорії ${id}:`, updates);

    try {
        const category = mapperState.categories.find(c => c.id === id);
        if (!category) {
            throw new Error(`Категорію ${id} не знайдено`);
        }

        const timestamp = new Date().toISOString();
        const range = `${SHEETS.CATEGORIES}!A${category._rowIndex}:F${category._rowIndex}`;

        const updatedRow = [
            category.id,
            updates.name_ua !== undefined ? updates.name_ua : category.name_ua,
            updates.name_ru !== undefined ? updates.name_ru : category.name_ru,
            updates.parent_id !== undefined ? updates.parent_id : category.parent_id,
            category.created_at,
            timestamp
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(category, updates, { updated_at: timestamp });
        console.log('✅ Категорію оновлено:', category);
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
    console.log(`🗑️ Видалення категорії ${id}`);

    try {
        const index = mapperState.categories.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error(`Категорію ${id} не знайдено`);
        }

        const category = mapperState.categories[index];
        const range = `${SHEETS.CATEGORIES}!A${category._rowIndex}:F${category._rowIndex}`;

        await callSheetsAPI('update', {
            range: range,
            values: [['', '', '', '', '', '']],
            spreadsheetType: 'main'
        });

        mapperState.categories.splice(index, 1);
        console.log('✅ Категорію видалено');
    } catch (error) {
        console.error('❌ Помилка видалення категорії:', error);
        throw error;
    }
}

/**
 * Додати нову характеристику
 */
export async function addCharacteristic(data) {
    console.log('➕ Додавання характеристики:', data);

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
            data.is_global === true || data.is_global === 'true' ? 'true' : 'false',
            data.category_ids || '',
            data.parent_option_id || '',
            timestamp
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.CHARACTERISTICS}!A:K`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newCharacteristic = {
            _rowIndex: mapperState.characteristics.length + 2,
            id: newId,
            name_ua: data.name_ua || '',
            name_ru: data.name_ru || '',
            type: data.type || 'TextInput',
            unit: data.unit || '',
            filter_type: data.filter_type || 'disable',
            is_global: data.is_global === true || data.is_global === 'true' ? 'true' : 'false',
            category_ids: data.category_ids || '',
            parent_option_id: data.parent_option_id || '',
            created_at: timestamp
        };

        mapperState.characteristics.push(newCharacteristic);
        console.log('✅ Характеристику додано:', newCharacteristic);
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
    console.log(`📝 Оновлення характеристики ${id}:`, updates);

    try {
        const characteristic = mapperState.characteristics.find(c => c.id === id);
        if (!characteristic) {
            throw new Error(`Характеристику ${id} не знайдено`);
        }

        const timestamp = new Date().toISOString();
        const range = `${SHEETS.CHARACTERISTICS}!A${characteristic._rowIndex}:K${characteristic._rowIndex}`;

        const updatedRow = [
            characteristic.id,
            characteristic.id_directory || '', // зберігаємо існуючий id_directory
            updates.name_ua !== undefined ? updates.name_ua : characteristic.name_ua,
            updates.name_ru !== undefined ? updates.name_ru : characteristic.name_ru,
            updates.type !== undefined ? updates.type : characteristic.type,
            updates.unit !== undefined ? updates.unit : characteristic.unit,
            updates.filter_type !== undefined ? updates.filter_type : characteristic.filter_type,
            updates.is_global !== undefined ? (updates.is_global === true || updates.is_global === 'true' ? 'true' : 'false') : characteristic.is_global,
            updates.category_ids !== undefined ? updates.category_ids : characteristic.category_ids,
            updates.parent_option_id !== undefined ? updates.parent_option_id : characteristic.parent_option_id,
            timestamp
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(characteristic, updates, { updated_at: timestamp });
        console.log('✅ Характеристику оновлено:', characteristic);
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
    console.log(`🗑️ Видалення характеристики ${id}`);

    try {
        const index = mapperState.characteristics.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error(`Характеристику ${id} не знайдено`);
        }

        const characteristic = mapperState.characteristics[index];
        const range = `${SHEETS.CHARACTERISTICS}!A${characteristic._rowIndex}:K${characteristic._rowIndex}`;

        await callSheetsAPI('update', {
            range: range,
            values: [['', '', '', '', '', '', '', '', '', '', '']],
            spreadsheetType: 'main'
        });

        mapperState.characteristics.splice(index, 1);
        console.log('✅ Характеристику видалено');
    } catch (error) {
        console.error('❌ Помилка видалення характеристики:', error);
        throw error;
    }
}

/**
 * Додати нову опцію
 */
export async function addOption(data) {
    console.log('➕ Додавання опції:', data);

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
            timestamp
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.OPTIONS}!A:G`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newOption = {
            _rowIndex: mapperState.options.length + 2,
            id: newId,
            characteristic_id: data.characteristic_id || '',
            value_ua: data.value_ua || '',
            value_ru: data.value_ru || '',
            sort_order: data.sort_order || '0',
            created_at: timestamp
        };

        mapperState.options.push(newOption);
        console.log('✅ Опцію додано:', newOption);
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
    console.log(`📝 Оновлення опції ${id}:`, updates);

    try {
        const option = mapperState.options.find(o => o.id === id);
        if (!option) {
            throw new Error(`Опцію ${id} не знайдено`);
        }

        const range = `${SHEETS.OPTIONS}!A${option._rowIndex}:G${option._rowIndex}`;

        const updatedRow = [
            option.id,
            option.id_directory || '', // зберігаємо існуючий id_directory
            updates.characteristic_id !== undefined ? updates.characteristic_id : option.characteristic_id,
            updates.value_ua !== undefined ? updates.value_ua : option.value_ua,
            updates.value_ru !== undefined ? updates.value_ru : option.value_ru,
            updates.sort_order !== undefined ? updates.sort_order : option.sort_order,
            option.created_at
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(option, updates);
        console.log('✅ Опцію оновлено:', option);
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
    console.log(`🗑️ Видалення опції ${id}`);

    try {
        const index = mapperState.options.findIndex(o => o.id === id);
        if (index === -1) {
            throw new Error(`Опцію ${id} не знайдено`);
        }

        const option = mapperState.options[index];
        const range = `${SHEETS.OPTIONS}!A${option._rowIndex}:G${option._rowIndex}`;

        await callSheetsAPI('update', {
            range: range,
            values: [['', '', '', '', '', '', '']],
            spreadsheetType: 'main'
        });

        mapperState.options.splice(index, 1);
        console.log('✅ Опцію видалено');
    } catch (error) {
        console.error('❌ Помилка видалення опції:', error);
        throw error;
    }
}

/**
 * Додати новий маркетплейс
 */
export async function addMarketplace(data) {
    console.log('➕ Додавання маркетплейсу:', data);

    try {
        const newId = generateId('mp', mapperState.marketplaces);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            data.name || '',
            data.slug || '',
            data.is_active === true || data.is_active === 'true' ? 'true' : 'false',
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
            _rowIndex: mapperState.marketplaces.length + 2,
            id: newId,
            name: data.name || '',
            slug: data.slug || '',
            is_active: data.is_active === true || data.is_active === 'true' ? 'true' : 'false',
            field_schema: data.field_schema || '{}',
            column_mapping: data.column_mapping || '{}',
            created_at: timestamp
        };

        mapperState.marketplaces.push(newMarketplace);
        console.log('✅ Маркетплейс додано:', newMarketplace);
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
    console.log(`📝 Оновлення маркетплейсу ${id}:`, updates);

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
            updates.is_active !== undefined ? (updates.is_active === true || updates.is_active === 'true' ? 'true' : 'false') : marketplace.is_active,
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
        console.log('✅ Маркетплейс оновлено:', marketplace);
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
    console.log(`🗑️ Видалення маркетплейсу ${id}`);

    try {
        const index = mapperState.marketplaces.findIndex(m => m.id === id);
        if (index === -1) {
            throw new Error(`Маркетплейс ${id} не знайдено`);
        }

        const marketplace = mapperState.marketplaces[index];
        const range = `${SHEETS.MARKETPLACES}!A${marketplace._rowIndex}:G${marketplace._rowIndex}`;

        await callSheetsAPI('update', {
            range: range,
            values: [['', '', '', '', '', '', '']],
            spreadsheetType: 'main'
        });

        mapperState.marketplaces.splice(index, 1);
        console.log('✅ Маркетплейс видалено');
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
// ЗАВАНТАЖЕННЯ ДАНИХ МАРКЕТПЛЕЙСІВ (MP)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити категорії маркетплейсу
 * Структура: id | marketplace_id | external_id | source | data | created_at | updated_at
 */
export async function loadMpCategories() {
    console.log('📥 Завантаження MP категорій...');

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MP_CATEGORIES}!A:G`,
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

            // Парсимо JSON поле data
            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    Object.assign(obj, parsedData);
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                }
            }

            return obj;
        }).filter(item => item.id); // Фільтруємо порожні рядки

        console.log(`✅ Завантажено ${mapperState.mpCategories.length} MP категорій`);
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
    console.log('📥 Завантаження MP характеристик...');

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

            // Парсимо JSON поле data
            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    Object.assign(obj, parsedData);
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                }
            }

            return obj;
        }).filter(item => item.id); // Фільтруємо порожні рядки

        console.log(`✅ Завантажено ${mapperState.mpCharacteristics.length} MP характеристик`);
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
    console.log('📥 Завантаження MP опцій...');

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

            // Парсимо JSON поле data
            if (obj.data) {
                try {
                    const parsedData = JSON.parse(obj.data);
                    Object.assign(obj, parsedData);
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для ${obj.id}:`, e);
                }
            }

            return obj;
        }).filter(item => item.id); // Фільтруємо порожні рядки

        console.log(`✅ Завантажено ${mapperState.mpOptions.length} MP опцій`);
        return mapperState.mpOptions;
    } catch (error) {
        console.error('❌ Помилка завантаження MP опцій:', error);
        mapperState.mpOptions = [];
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// МАППІНГ (ПРИВ'ЯЗКА MP ДАНИХ ДО ВЛАСНИХ)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Оновити маппінг для MP характеристики
 * @param {string} mpCharId - ID MP характеристики
 * @param {string} ownCharId - ID власної характеристики (або '' для видалення маппінгу)
 */
export async function updateMpCharacteristicMapping(mpCharId, ownCharId) {
    console.log(`🔗 Оновлення маппінгу MP характеристики ${mpCharId} -> ${ownCharId || '(видалено)'}`);

    try {
        const mpChar = mapperState.mpCharacteristics.find(c => c.id === mpCharId);
        if (!mpChar) {
            throw new Error(`MP характеристику ${mpCharId} не знайдено`);
        }

        // Парсимо поточний data
        let currentData = {};
        if (mpChar.data) {
            try {
                currentData = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data) : mpChar.data;
            } catch (e) {
                currentData = {};
            }
        }

        // Оновлюємо our_char_id
        currentData.our_char_id = ownCharId || '';

        const timestamp = new Date().toISOString();
        const newDataJson = JSON.stringify(currentData);

        // Оновлюємо рядок в таблиці
        const range = `${SHEETS.MP_CHARACTERISTICS}!A${mpChar._rowIndex}:G${mpChar._rowIndex}`;
        const updatedRow = [
            mpChar.id,
            mpChar.marketplace_id,
            mpChar.external_id,
            mpChar.source || '',
            newDataJson,
            mpChar.created_at || '',
            timestamp
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        // Оновлюємо локальний стан
        mpChar.data = newDataJson;
        mpChar.our_char_id = ownCharId || '';
        mpChar.updated_at = timestamp;
        Object.assign(mpChar, currentData);

        console.log(`✅ Маппінг MP характеристики оновлено`);
        return mpChar;
    } catch (error) {
        console.error('❌ Помилка оновлення маппінгу MP характеристики:', error);
        throw error;
    }
}

/**
 * Оновити маппінг для MP опції
 * @param {string} mpOptionId - ID MP опції
 * @param {string} ownOptionId - ID власної опції (або '' для видалення маппінгу)
 */
export async function updateMpOptionMapping(mpOptionId, ownOptionId) {
    console.log(`🔗 Оновлення маппінгу MP опції ${mpOptionId} -> ${ownOptionId || '(видалено)'}`);

    try {
        const mpOption = mapperState.mpOptions.find(o => o.id === mpOptionId);
        if (!mpOption) {
            throw new Error(`MP опцію ${mpOptionId} не знайдено`);
        }

        // Парсимо поточний data
        let currentData = {};
        if (mpOption.data) {
            try {
                currentData = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data) : mpOption.data;
            } catch (e) {
                currentData = {};
            }
        }

        // Оновлюємо our_option_id
        currentData.our_option_id = ownOptionId || '';

        const timestamp = new Date().toISOString();
        const newDataJson = JSON.stringify(currentData);

        // Оновлюємо рядок в таблиці
        const range = `${SHEETS.MP_OPTIONS}!A${mpOption._rowIndex}:G${mpOption._rowIndex}`;
        const updatedRow = [
            mpOption.id,
            mpOption.marketplace_id,
            mpOption.external_id,
            mpOption.source || '',
            newDataJson,
            mpOption.created_at || '',
            timestamp
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        // Оновлюємо локальний стан
        mpOption.data = newDataJson;
        mpOption.our_option_id = ownOptionId || '';
        mpOption.updated_at = timestamp;
        Object.assign(mpOption, currentData);

        console.log(`✅ Маппінг MP опції оновлено`);
        return mpOption;
    } catch (error) {
        console.error('❌ Помилка оновлення маппінгу MP опції:', error);
        throw error;
    }
}

/**
 * Batch оновлення маппінгу для кількох MP характеристик
 * @param {Array<string>} mpCharIds - Масив ID MP характеристик
 * @param {string} ownCharId - ID власної характеристики
 */
export async function batchUpdateMpCharacteristicMapping(mpCharIds, ownCharId) {
    console.log(`🔗 Batch маппінг ${mpCharIds.length} MP характеристик -> ${ownCharId}`);

    const results = {
        success: [],
        failed: []
    };

    for (const mpCharId of mpCharIds) {
        try {
            await updateMpCharacteristicMapping(mpCharId, ownCharId);
            results.success.push(mpCharId);
        } catch (error) {
            console.error(`❌ Помилка маппінгу ${mpCharId}:`, error);
            results.failed.push({ id: mpCharId, error: error.message });
        }
    }

    console.log(`✅ Batch маппінг завершено: ${results.success.length} успішно, ${results.failed.length} помилок`);
    return results;
}

/**
 * Batch оновлення маппінгу для кількох MP опцій
 * @param {Array<string>} mpOptionIds - Масив ID MP опцій
 * @param {string} ownOptionId - ID власної опції
 */
export async function batchUpdateMpOptionMapping(mpOptionIds, ownOptionId) {
    console.log(`🔗 Batch маппінг ${mpOptionIds.length} MP опцій -> ${ownOptionId}`);

    const results = {
        success: [],
        failed: []
    };

    for (const mpOptionId of mpOptionIds) {
        try {
            await updateMpOptionMapping(mpOptionId, ownOptionId);
            results.success.push(mpOptionId);
        } catch (error) {
            console.error(`❌ Помилка маппінгу ${mpOptionId}:`, error);
            results.failed.push({ id: mpOptionId, error: error.message });
        }
    }

    console.log(`✅ Batch маппінг завершено: ${results.success.length} успішно, ${results.failed.length} помилок`);
    return results;
}

/**
 * Автоматичний маппінг MP характеристик за назвою
 * @param {Array<string>} mpCharIds - Масив ID MP характеристик для автомаппінгу
 */
export async function autoMapCharacteristics(mpCharIds) {
    console.log(`🤖 Авто-маппінг ${mpCharIds.length} MP характеристик...`);

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
                await updateMpCharacteristicMapping(mpCharId, ownChar.id);
                results.mapped.push({ mpId: mpCharId, ownId: ownChar.id, name: mpName });
            } else {
                results.notFound.push({ id: mpCharId, name: mpName });
            }
        } catch (error) {
            console.error(`❌ Помилка автомаппінгу ${mpCharId}:`, error);
            results.failed.push({ id: mpCharId, error: error.message });
        }
    }

    console.log(`✅ Авто-маппінг завершено: ${results.mapped.length} замаплено, ${results.notFound.length} не знайдено, ${results.failed.length} помилок`);
    return results;
}

/**
 * Автоматичний маппінг MP опцій за назвою
 * @param {Array<string>} mpOptionIds - Масив ID MP опцій для автомаппінгу
 */
export async function autoMapOptions(mpOptionIds) {
    console.log(`🤖 Авто-маппінг ${mpOptionIds.length} MP опцій...`);

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
                await updateMpOptionMapping(mpOptionId, ownOption.id);
                results.mapped.push({ mpId: mpOptionId, ownId: ownOption.id, name: mpName });
            } else {
                results.notFound.push({ id: mpOptionId, name: mpName });
            }
        } catch (error) {
            console.error(`❌ Помилка автомаппінгу ${mpOptionId}:`, error);
            results.failed.push({ id: mpOptionId, error: error.message });
        }
    }

    console.log(`✅ Авто-маппінг завершено: ${results.mapped.length} замаплено, ${results.notFound.length} не знайдено, ${results.failed.length} помилок`);
    return results;
}
