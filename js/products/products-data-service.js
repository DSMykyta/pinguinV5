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

    console.log('📥 Завантаження категорій...');

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
        console.log(`✅ Завантажено ${dataCache.categories.length} категорій`);

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

    console.log('📥 Завантаження характеристик...');

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
        console.log(`✅ Завантажено ${dataCache.characteristics.length} характеристик`);

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

    console.log('📥 Завантаження опцій...');

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
        console.log(`✅ Завантажено ${dataCache.options.length} опцій`);

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

    console.log('📥 Завантаження брендів...');

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
        console.log(`✅ Завантажено ${dataCache.brands.length} брендів`);

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
    console.log('📥 Завантаження всіх даних для товарів...');

    const [categories, characteristics, options, brands] = await Promise.all([
        loadCategories(forceRefresh),
        loadCharacteristics(forceRefresh),
        loadOptions(forceRefresh),
        loadBrands(forceRefresh)
    ]);

    console.log('✅ Всі дані завантажено');

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
    console.log('🧹 Кеш даних очищено');
}
