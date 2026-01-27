// js/brands/brands-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - DATA MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для брендів через backend API.
 * Використовує уніфікований api-client для всіх операцій.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 *
 * СТРУКТУРА ДАНИХ (після парсингу):
 * {
 *   brand_id: "bran-000001",
 *   name_uk: "Optimum Nutrition",
 *   names_alt: ["ON", "Optimum"],           // Масив (парситься з JSON)
 *   country_option_id: "США",
 *   brand_status: "active",
 *   brand_logo_url: "",
 *   brand_links: [                          // Масив (парситься з JSON)
 *     { name: "ua", url: "https://..." }
 *   ],
 *   brand_text: "<p>...</p>",
 *   mapper_option_id: "",
 *   _rowIndex: 2                            // Внутрішній індекс рядка
 * }
 */

import { brandsState } from './brands-state.js';
import { callSheetsAPI } from '../utils/api-client.js';
import { MAIN_SPREADSHEET_ID as SPREADSHEET_ID } from '../config/spreadsheet-config.js';

const SHEET_NAME = 'Brands';
const SHEET_GID = '653695455';

// ═══════════════════════════════════════════════════════════════════════════
// ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ JSON ПАРСИНГУ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Безпечний парсинг JSON
 * @param {string} value - Значення для парсингу
 * @param {*} defaultValue - Значення за замовчуванням
 * @returns {*} Розпарсене значення або default
 */
function safeJsonParse(value, defaultValue = null) {
    if (!value || typeof value !== 'string') return defaultValue;

    // Якщо виглядає як JSON (починається з [ або {)
    const trimmed = value.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            console.warn('[brands-data] JSON parse error:', e.message);
            return defaultValue;
        }
    }

    return defaultValue;
}

/**
 * Парсинг names_alt - може бути JSON масивом або текстом через кому
 * @param {string} value - Значення з таблиці
 * @returns {string[]} Масив альтернативних назв
 */
function parseNamesAlt(value) {
    if (!value) return [];

    // Спробувати JSON
    const parsed = safeJsonParse(value, null);
    if (Array.isArray(parsed)) return parsed;

    // Якщо не JSON - розділити по комі (старий формат)
    return value.split(',').map(s => s.trim()).filter(s => s);
}

/**
 * Парсинг brand_links - може бути JSON масивом або одним URL
 * @param {string} value - Значення з таблиці
 * @param {string} fallbackUrl - Старе поле brand_site_link для сумісності
 * @returns {Array<{name: string, url: string}>} Масив посилань
 */
function parseBrandLinks(value, fallbackUrl = '') {
    if (value) {
        // Спробувати JSON
        const parsed = safeJsonParse(value, null);
        if (Array.isArray(parsed)) return parsed;
    }

    // Fallback: використати старе поле brand_site_link
    if (fallbackUrl && typeof fallbackUrl === 'string' && fallbackUrl.trim()) {
        return [{ name: 'site', url: fallbackUrl.trim() }];
    }

    return [];
}

/**
 * Серіалізувати names_alt в JSON для збереження
 * @param {string[]} names - Масив назв
 * @returns {string} JSON рядок
 */
function serializeNamesAlt(names) {
    if (!Array.isArray(names) || names.length === 0) return '';
    return JSON.stringify(names);
}

/**
 * Серіалізувати brand_links в JSON для збереження
 * @param {Array<{name: string, url: string}>} links - Масив посилань
 * @returns {string} JSON рядок
 */
function serializeBrandLinks(links) {
    if (!Array.isArray(links) || links.length === 0) return '';
    return JSON.stringify(links);
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАВАНТАЖЕННЯ ДАНИХ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити всі бренди через CSV export (без авторизації)
 * @returns {Promise<Array>} Масив брендів
 */
export async function loadBrands() {
    console.log('📥 Завантаження брендів з Google Sheets...');

    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
        const response = await fetch(csvUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();

        if (typeof Papa === 'undefined') {
            throw new Error('PapaParse library is not loaded');
        }

        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const rows = parsedData.data;

        if (!rows || rows.length === 0) {
            console.warn('⚠️ Немає даних в Brands');
            brandsState.brands = [];
            return brandsState.brands;
        }

        // Трансформувати дані
        brandsState.brands = rows.map((row, index) => ({
            brand_id: row.brand_id || '',
            name_uk: row.name_uk || '',
            names_alt: parseNamesAlt(row.names_alt),
            country_option_id: row.country_option_id || '',
            brand_status: row.brand_status || 'active',
            brand_logo_url: row.brand_logo_url || '',
            brand_links: parseBrandLinks(row.brand_links, row.brand_site_link),
            brand_text: row.brand_text || '',
            mapper_option_id: row.mapper_option_id || '',
            _rowIndex: index + 2 // +2 бо заголовок + 1-based indexing
        }));

        console.log(`✅ Завантажено ${brandsState.brands.length} брендів`);
        return brandsState.brands;
    } catch (error) {
        console.error('❌ Помилка завантаження брендів:', error);
        throw error;
    }
}

/**
 * Отримати бренди з state
 * @returns {Array} Масив брендів
 */
export function getBrands() {
    return brandsState.brands || [];
}

/**
 * Знайти бренд за ID
 * @param {string} brandId - ID бренду
 * @returns {Object|null} Бренд або null
 */
export function getBrandById(brandId) {
    return brandsState.brands.find(b => b.brand_id === brandId) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD ОПЕРАЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Генерувати новий ID для бренду
 * @returns {string} Новий ID у форматі bran-XXXXXX (6 цифр)
 */
function generateBrandId() {
    let maxNum = 0;

    brandsState.brands.forEach(brand => {
        if (brand.brand_id && brand.brand_id.startsWith('bran-')) {
            const num = parseInt(brand.brand_id.replace('bran-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    const newNum = maxNum + 1;
    return `bran-${String(newNum).padStart(6, '0')}`;
}

/**
 * Підготувати рядок для збереження в Google Sheets
 * @param {Object} brand - Об'єкт бренду
 * @returns {Array} Масив значень для рядка
 */
function prepareBrandRow(brand) {
    return [
        brand.brand_id || '',
        brand.name_uk || '',
        serializeNamesAlt(brand.names_alt),
        brand.country_option_id || '',
        brand.brand_status || 'active',
        brand.brand_logo_url || '',
        serializeBrandLinks(brand.brand_links),
        brand.brand_text || '',
        brand.mapper_option_id || ''
    ];
}

/**
 * Додати новий бренд
 * @param {Object} brandData - Дані бренду
 * @returns {Promise<Object>} Доданий бренд
 */
export async function addBrand(brandData) {
    console.log('➕ Додавання нового бренду:', brandData);

    try {
        const newId = generateBrandId();

        const newBrand = {
            brand_id: newId,
            name_uk: brandData.name_uk || '',
            names_alt: Array.isArray(brandData.names_alt) ? brandData.names_alt : [],
            country_option_id: brandData.country_option_id || '',
            brand_status: brandData.brand_status || 'active',
            brand_logo_url: brandData.brand_logo_url || '',
            brand_links: Array.isArray(brandData.brand_links) ? brandData.brand_links : [],
            brand_text: brandData.brand_text || '',
            mapper_option_id: brandData.mapper_option_id || '',
            _rowIndex: brandsState.brands.length + 2
        };

        const newRow = prepareBrandRow(newBrand);

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:I`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        brandsState.brands.push(newBrand);

        console.log('✅ Бренд додано:', newBrand);
        return newBrand;
    } catch (error) {
        console.error('❌ Помилка додавання бренду:', error);
        throw error;
    }
}

/**
 * Оновити бренд
 * @param {string} brandId - ID бренду
 * @param {Object} updates - Оновлення
 * @returns {Promise<Object>} Оновлений бренд
 */
export async function updateBrand(brandId, updates) {
    console.log(`📝 Оновлення бренду ${brandId}:`, updates);

    try {
        const brand = brandsState.brands.find(b => b.brand_id === brandId);
        if (!brand) {
            throw new Error(`Бренд ${brandId} не знайдено`);
        }

        // Оновити локальний об'єкт
        const updatedBrand = {
            ...brand,
            name_uk: updates.name_uk !== undefined ? updates.name_uk : brand.name_uk,
            names_alt: updates.names_alt !== undefined ? updates.names_alt : brand.names_alt,
            country_option_id: updates.country_option_id !== undefined ? updates.country_option_id : brand.country_option_id,
            brand_status: updates.brand_status !== undefined ? updates.brand_status : brand.brand_status,
            brand_logo_url: updates.brand_logo_url !== undefined ? updates.brand_logo_url : brand.brand_logo_url,
            brand_links: updates.brand_links !== undefined ? updates.brand_links : brand.brand_links,
            brand_text: updates.brand_text !== undefined ? updates.brand_text : brand.brand_text,
            mapper_option_id: updates.mapper_option_id !== undefined ? updates.mapper_option_id : brand.mapper_option_id,
        };

        const range = `${SHEET_NAME}!A${brand._rowIndex}:I${brand._rowIndex}`;
        const updatedRow = prepareBrandRow(updatedBrand);

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        // Оновити state
        Object.assign(brand, updatedBrand);

        console.log('✅ Бренд оновлено:', brand);
        return brand;
    } catch (error) {
        console.error('❌ Помилка оновлення бренду:', error);
        throw error;
    }
}

/**
 * Видалити бренд
 * @param {string} brandId - ID бренду
 * @returns {Promise<void>}
 */
export async function deleteBrand(brandId) {
    console.log(`🗑️ Видалення бренду ${brandId}`);

    try {
        const brandIndex = brandsState.brands.findIndex(b => b.brand_id === brandId);
        if (brandIndex === -1) {
            throw new Error(`Бренд ${brandId} не знайдено`);
        }

        const brand = brandsState.brands[brandIndex];

        const range = `${SHEET_NAME}!A${brand._rowIndex}:I${brand._rowIndex}`;
        await callSheetsAPI('update', {
            range: range,
            values: [['', '', '', '', '', '', '', '', '']],
            spreadsheetType: 'main'
        });

        brandsState.brands.splice(brandIndex, 1);

        console.log('✅ Бренд видалено');
    } catch (error) {
        console.error('❌ Помилка видалення бренду:', error);
        throw error;
    }
}
