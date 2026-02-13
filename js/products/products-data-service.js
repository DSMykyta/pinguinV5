// js/products/products-data-service.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  PRODUCTS - DATA SERVICE                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження даних з Google Sheets для товарів:
 * - Mapper_Categories (категорії)
 * - Mapper_Characteristics (характеристики)
 * - Mapper_Options (опції для характеристик)
 * - Brands (бренди)
 */

import { MAIN_SPREADSHEET_ID } from '../config/spreadsheet-config.js';

// GID таблиць
const SHEET_GIDS = {
    categories: '373282626',
    characteristics: '1574142272',
    options: '1060760105',
    brands: '653695455'
};

// Кеш даних
const dataCache = {
    categories: null,
    characteristics: null,
    options: null,
    brands: null,
    lastFetch: {}
};

// Час життя кешу (5 хвилин)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Завантажити CSV з Google Sheets
 * @param {string} gid - GID аркуша
 * @returns {Promise<Array>} Масив об'єктів
 */
async function fetchSheetCSV(gid) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SPREADSHEET_ID}/export?format=csv&gid=${gid}`;

    const response = await fetch(csvUrl);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();

    // Перевіряємо PapaParse
    if (typeof Papa === 'undefined') {
        throw new Error('PapaParse library is not loaded');
    }

    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
    });

    return parsed.data;
}

/**
 * Перевірити чи кеш актуальний
 * @param {string} key - Ключ кешу
 * @returns {boolean}
 */
function isCacheValid(key) {
    const lastFetch = dataCache.lastFetch[key];
    if (!lastFetch) return false;
    return Date.now() - lastFetch < CACHE_TTL;
}

/**
 * Завантажити категорії
 * @param {boolean} forceRefresh - Примусове оновлення
 * @returns {Promise<Array>}
 */
export async function loadCategories(forceRefresh = false) {
    if (!forceRefresh && isCacheValid('categories') && dataCache.categories) {
        return dataCache.categories;
    }


    try {
        const rows = await fetchSheetCSV(SHEET_GIDS.categories);

        dataCache.categories = rows.map(row => ({
            id: row.id || row.local_id,
            name_ua: row.name_ua || row.name_uk,
            name_ru: row.name_ru,
            parent_id: row.parent_id || row.parent_local_id || null,
            created_at: row.created_at,
            updated_at: row.updated_at
        })).filter(cat => cat.id && cat.name_ua);

        dataCache.lastFetch.categories = Date.now();

        return dataCache.categories;
    } catch (error) {
        console.error('❌ Помилка завантаження категорій:', error);
        return dataCache.categories || [];
    }
}

/**
 * Завантажити характеристики
 * @param {boolean} forceRefresh - Примусове оновлення
 * @returns {Promise<Array>}
 */
export async function loadCharacteristics(forceRefresh = false) {
    if (!forceRefresh && isCacheValid('characteristics') && dataCache.characteristics) {
        return dataCache.characteristics;
    }


    try {
        const rows = await fetchSheetCSV(SHEET_GIDS.characteristics);

        dataCache.characteristics = rows.map(row => ({
            id: row.id || row.local_id,
            id_directory: row.id_directory,
            name_ua: row.name_ua || row.name_uk,
            name_ru: row.name_ru,
            type: row.type || row.param_type,
            unit: row.unit,
            filter_type: row.filter_type,
            is_global: row.is_global === 'TRUE' || row.is_global === true,
            category_ids: row.category_ids ? row.category_ids.split(',').map(s => s.trim()) : [],
            parent_option_id: row.parent_option_id,
            block_number: row.block_number
        })).filter(char => char.id && char.name_ua);

        dataCache.lastFetch.characteristics = Date.now();

        return dataCache.characteristics;
    } catch (error) {
        console.error('❌ Помилка завантаження характеристик:', error);
        return dataCache.characteristics || [];
    }
}

/**
 * Завантажити опції
 * @param {boolean} forceRefresh - Примусове оновлення
 * @returns {Promise<Array>}
 */
export async function loadOptions(forceRefresh = false) {
    if (!forceRefresh && isCacheValid('options') && dataCache.options) {
        return dataCache.options;
    }


    try {
        const rows = await fetchSheetCSV(SHEET_GIDS.options);

        dataCache.options = rows.map(row => ({
            id: row.id || row.local_id,
            id_directory: row.id_directory,
            characteristic_id: row.characteristic_id || row.char_local_id,
            value_ua: row.value_ua || row.name_uk,
            value_ru: row.value_ru || row.name_ru,
            sort_order: parseInt(row.sort_order) || 0,
            created_at: row.created_at
        })).filter(opt => opt.id && opt.value_ua);

        dataCache.lastFetch.options = Date.now();

        return dataCache.options;
    } catch (error) {
        console.error('❌ Помилка завантаження опцій:', error);
        return dataCache.options || [];
    }
}

/**
 * Завантажити бренди
 * @param {boolean} forceRefresh - Примусове оновлення
 * @returns {Promise<Array>}
 */
export async function loadBrands(forceRefresh = false) {
    if (!forceRefresh && isCacheValid('brands') && dataCache.brands) {
        return dataCache.brands;
    }


    try {
        const rows = await fetchSheetCSV(SHEET_GIDS.brands);

        dataCache.brands = rows.map(row => ({
            id: row.brand_id,
            name_uk: row.name_uk,
            names_alt: row.names_alt,
            country_option_id: row.country_option_id,
            brand_text: row.brand_text,
            brand_site_link: row.brand_site_link
        })).filter(brand => brand.id && brand.name_uk);

        dataCache.lastFetch.brands = Date.now();

        return dataCache.brands;
    } catch (error) {
        console.error('❌ Помилка завантаження брендів:', error);
        return dataCache.brands || [];
    }
}

/**
 * Завантажити всі дані паралельно
 * @param {boolean} forceRefresh - Примусове оновлення
 * @returns {Promise<Object>}
 */
export async function loadAllData(forceRefresh = false) {

    const [categories, characteristics, options, brands] = await Promise.all([
        loadCategories(forceRefresh),
        loadCharacteristics(forceRefresh),
        loadOptions(forceRefresh),
        loadBrands(forceRefresh)
    ]);


    return { categories, characteristics, options, brands };
}

/**
 * Отримати опції для характеристики
 * @param {string} characteristicId - ID характеристики
 * @returns {Array}
 */
export function getOptionsForCharacteristic(characteristicId) {
    if (!dataCache.options) return [];
    return dataCache.options
        .filter(opt => opt.characteristic_id === characteristicId)
        .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Отримати характеристики для категорії
 * @param {string} categoryId - ID категорії
 * @returns {Array}
 */
export function getCharacteristicsForCategory(categoryId) {
    if (!dataCache.characteristics) return [];
    return dataCache.characteristics.filter(char =>
        char.is_global || char.category_ids.includes(categoryId)
    );
}

/**
 * Отримати підкатегорії
 * @param {string} parentId - ID батьківської категорії (null для кореневих)
 * @returns {Array}
 */
export function getSubcategories(parentId = null) {
    if (!dataCache.categories) return [];
    return dataCache.categories.filter(cat =>
        parentId ? cat.parent_id === parentId : !cat.parent_id
    );
}

/**
 * Отримати дані з кешу
 */
export function getCachedData() {
    return {
        categories: dataCache.categories || [],
        characteristics: dataCache.characteristics || [],
        options: dataCache.options || [],
        brands: dataCache.brands || []
    };
}

/**
 * Очистити кеш
 */
export function clearCache() {
    dataCache.categories = null;
    dataCache.characteristics = null;
    dataCache.options = null;
    dataCache.brands = null;
    dataCache.lastFetch = {};
}

/**
 * Блоки характеристик
 *
 * Блоки 1–6: відображаються в секції "Характеристики" картки товару
 *   1 Скільки   — скільки там?     (вага, порції, капсули, розмір)
 *   2 Який      — який він?        (вид, тип, матеріал, форма, склад)
 *   3 Кому      — кому це?         (стать, вік)
 *   4 Нащо      — навіщо це?       (призначення, принцип дії, особливості)
 *   5 Звідки    — звідки це?       (країна, EAN, коди, сертифікати, гарантія)
 *   6 Куди      — куди відправляти? (вага/розміри упаковки, доставка)
 *
 * Блоки 8–9: характеристики що належать іншим секціям картки товару
 *   8 Варіант   — відноситься до варіанту (смак, колір, EAN варіанту)
 *   9 Інше      — відноситься до інших секцій
 */
export const BLOCK_NAMES = {
    1: 'Скільки там?',
    2: 'Який він?',
    3: 'Кому це?',
    4: 'Навіщо це?',
    5: 'Звідки це?',
    6: 'Куди відправляти?',
    8: 'Варіант',
    9: 'Інше'
};

/**
 * Блоки що рендеряться в секції "Характеристики"
 * Решта блоків (8, 9) належать іншим секціям картки товару
 */
export const CHARACTERISTIC_BLOCKS = [1, 2, 3, 4, 5, 6];

/**
 * Отримати характеристики згруповані по блокам
 * @param {string|null} categoryId - ID категорії (null для всіх)
 * @returns {Object} { blockNumber: { name, characteristics: [] } }
 */
export function getCharacteristicsByBlocks(categoryId = null) {
    if (!dataCache.characteristics) return {};

    const blocks = {};

    dataCache.characteristics
        .filter(char => {
            // Фільтруємо за категорією якщо вказано
            if (categoryId) {
                return char.is_global || char.category_ids.includes(categoryId);
            }
            return true;
        })
        .filter(char => !char.parent_option_id) // Тільки кореневі (не залежні)
        .forEach(char => {
            const blockNum = char.block_number || 9; // За замовчуванням - "Інше"

            if (!blocks[blockNum]) {
                blocks[blockNum] = {
                    name: BLOCK_NAMES[blockNum] || `Блок ${blockNum}`,
                    characteristics: []
                };
            }

            blocks[blockNum].characteristics.push(char);
        });

    return blocks;
}

/**
 * Отримати залежні характеристики для опції
 * @param {string} optionId - ID опції
 * @returns {Array} Масив залежних характеристик
 */
export function getDependentCharacteristics(optionId) {
    if (!dataCache.characteristics) return [];
    return dataCache.characteristics.filter(char => char.parent_option_id === optionId);
}

/**
 * Перевірити чи характеристика має залежні
 * @param {string} characteristicId - ID характеристики
 * @returns {boolean}
 */
export function hasChildCharacteristics(characteristicId) {
    if (!dataCache.characteristics || !dataCache.options) return false;

    // Отримуємо опції цієї характеристики
    const options = getOptionsForCharacteristic(characteristicId);

    // Перевіряємо чи є характеристики які залежать від цих опцій
    return options.some(opt =>
        dataCache.characteristics.some(char => char.parent_option_id === opt.id)
    );
}

/**
 * Типи полів для характеристик
 */
export const FIELD_TYPES = {
    ListValues: 'select-multiple', // Кастомний select з множинним вибором
    List: 'select-multiple',       // Кастомний select з множинним вибором
    ComboBox: 'select',            // Кастомний select з одним вибором
    Integer: 'number',             // Ціле число
    Decimal: 'number',             // Десяткове число
    TextInput: 'text',             // Текстове поле
    TextArea: 'textarea',          // Багаторядкове поле
    MultiText: 'tags',             // Множинний текст (теги)
    CheckBoxGroupValues: 'checkbox-group' // Група чекбоксів
};

/**
 * Отримати тип поля для характеристики
 * @param {Object} characteristic
 * @returns {string} Тип поля (select, text, number, textarea, etc.)
 */
export function getFieldType(characteristic) {
    return FIELD_TYPES[characteristic.type] || 'text';
}
