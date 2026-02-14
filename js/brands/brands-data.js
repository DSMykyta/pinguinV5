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
 * СТРУКТУРА КОЛОНОК В GOOGLE SHEETS (Brands):
 * ┌─────────┬────────────────────┬─────────────────────────────────────────┐
 * │ Колонка │ Поле               │ Формат                                  │
 * ├─────────┼────────────────────┼─────────────────────────────────────────┤
 * │ A       │ brand_id           │ bran-XXXXXX                             │
 * │ B       │ name_uk            │ текст                                   │
 * │ C       │ names_alt          │ JSON масив: ["alt1", "alt2"]            │
 * │ D       │ country_option_id  │ текст (Польша, США, ...)                │
 * │ E       │ brand_text         │ HTML текст                              │
 * │ F       │ brand_status       │ active | inactive                       │
 * │ G       │ brand_links        │ JSON масив: [{name, url}, ...]          │
 * │ H       │ mapper_option_id   │ текст (зарезервовано для Mapper)        │
 * │ I       │ brand_logo_url     │ URL логотипу (зарезервовано)            │
 * └─────────┴────────────────────┴─────────────────────────────────────────┘
 *
 * СТРУКТУРА ДАНИХ (після парсингу):
 * {
 *   brand_id: "bran-000001",
 *   name_uk: "Optimum Nutrition",
 *   names_alt: ["ON", "Optimum"],           // Масив (парситься з JSON)
 *   country_option_id: "США",
 *   brand_text: "<p>...</p>",               // HTML опис
 *   brand_status: "active",                 // active | inactive
 *   brand_links: [                          // Масив (парситься з JSON)
 *     { name: "ua", url: "https://..." }
 *   ],
 *   mapper_option_id: "",                   // Зарезервовано для Mapper
 *   brand_logo_url: "",                     // Зарезервовано для логотипу
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
 * Парсинг brand_links - JSON масив посилань
 * @param {string} value - Значення з таблиці (JSON)
 * @returns {Array<{name: string, url: string}>} Масив посилань
 */
function parseBrandLinks(value) {
    if (!value) return [];

    // Спробувати JSON
    const parsed = safeJsonParse(value, null);
    if (Array.isArray(parsed)) return parsed;

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
        // Порядок колонок: A-I (brand_id, name_uk, names_alt, country_option_id, brand_text, brand_status, brand_links, mapper_option_id, brand_logo_url)
        brandsState.brands = rows.map((row, index) => ({
            brand_id: row.brand_id || '',
            name_uk: row.name_uk || '',
            names_alt: parseNamesAlt(row.names_alt),
            country_option_id: row.country_option_id || '',
            brand_text: row.brand_text || '',
            brand_status: row.brand_status || 'active',
            brand_links: parseBrandLinks(row.brand_links),
            mapper_option_id: row.mapper_option_id || '',
            brand_logo_url: row.brand_logo_url || '',
            _rowIndex: index + 2 // +2 бо заголовок + 1-based indexing
        }));

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
 * Порядок колонок: A-I (brand_id, name_uk, names_alt, country_option_id, brand_text, brand_status, brand_links, mapper_option_id, brand_logo_url)
 * @param {Object} brand - Об'єкт бренду
 * @returns {Array} Масив значень для рядка
 */
function prepareBrandRow(brand) {
    return [
        brand.brand_id || '',              // A: brand_id
        brand.name_uk || '',               // B: name_uk
        serializeNamesAlt(brand.names_alt),// C: names_alt (JSON)
        brand.country_option_id || '',     // D: country_option_id
        brand.brand_text || '',            // E: brand_text
        brand.brand_status || 'active',    // F: brand_status
        serializeBrandLinks(brand.brand_links), // G: brand_links (JSON)
        brand.mapper_option_id || '',      // H: mapper_option_id
        brand.brand_logo_url || ''         // I: brand_logo_url
    ];
}

/**
 * Додати новий бренд
 * @param {Object} brandData - Дані бренду
 * @returns {Promise<Object>} Доданий бренд
 */
export async function addBrand(brandData) {

    try {
        const newId = generateBrandId();

        const newBrand = {
            brand_id: newId,
            name_uk: brandData.name_uk || '',
            names_alt: Array.isArray(brandData.names_alt) ? brandData.names_alt : [],
            country_option_id: brandData.country_option_id || '',
            brand_text: brandData.brand_text || '',
            brand_status: brandData.brand_status || 'active',
            brand_links: Array.isArray(brandData.brand_links) ? brandData.brand_links : [],
            mapper_option_id: brandData.mapper_option_id || '',
            brand_logo_url: brandData.brand_logo_url || '',
            _rowIndex: brandsState.brands.length + 2
        };

        const newRow = prepareBrandRow(newBrand);

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:I`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        brandsState.brands.push(newBrand);

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
            brand_text: updates.brand_text !== undefined ? updates.brand_text : brand.brand_text,
            brand_status: updates.brand_status !== undefined ? updates.brand_status : brand.brand_status,
            brand_links: updates.brand_links !== undefined ? updates.brand_links : brand.brand_links,
            mapper_option_id: updates.mapper_option_id !== undefined ? updates.mapper_option_id : brand.mapper_option_id,
            brand_logo_url: updates.brand_logo_url !== undefined ? updates.brand_logo_url : brand.brand_logo_url,
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

    try {
        const brandIndex = brandsState.brands.findIndex(b => b.brand_id === brandId);
        if (brandIndex === -1) {
            throw new Error(`Бренд ${brandId} не знайдено`);
        }

        const brand = brandsState.brands[brandIndex];

        const rowIndex = brand._rowIndex;
        await callSheetsAPI('batchUpdateSpreadsheet', {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: parseInt(SHEET_GID),
                        dimension: 'ROWS',
                        startIndex: rowIndex - 1,
                        endIndex: rowIndex
                    }
                }
            }],
            spreadsheetType: 'main'
        });

        brandsState.brands.splice(brandIndex, 1);
        brandsState.brands.forEach(b => { if (b._rowIndex > rowIndex) b._rowIndex--; });

    } catch (error) {
        console.error('❌ Помилка видалення бренду:', error);
        throw error;
    }
}
