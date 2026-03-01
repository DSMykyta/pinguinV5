// js/pages/products/products-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCTS - DATA MANAGEMENT                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для товарів через backend API.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 *
 * СТРУКТУРА КОЛОНОК В GOOGLE SHEETS (Products):
 * ┌─────────┬──────────────────────┬───────────────────────────────────────┐
 * │ Колонка │ Поле                 │ Формат                                │
 * ├─────────┼──────────────────────┼───────────────────────────────────────┤
 * │ A       │ product_id           │ prod-XXXXXX                           │
 * │ B       │ name_ua              │ текст                                 │
 * │ C       │ name_ru              │ текст                                 │
 * │ D       │ brand_id             │ bran-XXXXXX                           │
 * │ E       │ line_id              │ line-XXXXXX                           │
 * │ F       │ category_id          │ cat-XXXXXX                            │
 * │ G       │ composition_ua       │ текст                                 │
 * │ H       │ composition_ru       │ текст                                 │
 * │ I       │ product_text_ua      │ HTML текст                            │
 * │ J       │ product_text_ru      │ HTML текст                            │
 * │ K       │ characteristics      │ JSON об'єкт                           │
 * │ L       │ image_url            │ URL                                   │
 * │ M       │ seo_title_ua         │ текст                                 │
 * │ N       │ seo_title_ru         │ текст                                 │
 * │ O       │ seo_description_ua   │ текст                                 │
 * │ P       │ seo_description_ru   │ текст                                 │
 * │ Q       │ seo_keywords_ua      │ текст                                 │
 * │ R       │ seo_keywords_ru      │ текст                                 │
 * │ S       │ status               │ active | draft | archived             │
 * │ T       │ created_at           │ ISO дата                              │
 * │ U       │ updated_at           │ ISO дата                              │
 * └─────────┴──────────────────────┴───────────────────────────────────────┘
 */

import { productsState } from './products-state.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import { PRODUCTS_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';
import { generateNextId } from '../../utils/common-utils.js';

const SHEET_NAME = 'Products';
const SHEET_GID = '0';

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

    const trimmed = value.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            console.warn('[products-data] JSON parse error:', e.message);
            return defaultValue;
        }
    }

    return defaultValue;
}

/**
 * Серіалізувати JSON для збереження
 * @param {*} value - Значення
 * @returns {string} JSON рядок або пустий рядок
 */
function serializeJson(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАВАНТАЖЕННЯ ДАНИХ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити всі товари через CSV export (без авторизації)
 * @returns {Promise<Array>} Масив товарів
 */
export async function loadProducts() {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${PRODUCTS_SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
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
            console.warn('⚠️ Немає даних в Products');
            productsState.products = [];
            return productsState.products;
        }

        productsState.products = rows.map((row, index) => ({
            product_id: row.product_id || '',
            name_ua: row.name_ua || '',
            name_ru: row.name_ru || '',
            brand_id: row.brand_id || '',
            line_id: row.line_id || '',
            category_id: row.category_id || '',
            composition_ua: row.composition_ua || '',
            composition_ru: row.composition_ru || '',
            product_text_ua: row.product_text_ua || '',
            product_text_ru: row.product_text_ru || '',
            characteristics: safeJsonParse(row.characteristics, {}),
            image_url: row.image_url || '',
            seo_title_ua: row.seo_title_ua || '',
            seo_title_ru: row.seo_title_ru || '',
            seo_description_ua: row.seo_description_ua || '',
            seo_description_ru: row.seo_description_ru || '',
            seo_keywords_ua: row.seo_keywords_ua || '',
            seo_keywords_ru: row.seo_keywords_ru || '',
            status: row.status || 'draft',
            created_at: row.created_at || '',
            updated_at: row.updated_at || '',
            _rowIndex: index + 2
        }));

        return productsState.products;
    } catch (error) {
        console.error('❌ Помилка завантаження товарів:', error);
        throw error;
    }
}

/**
 * Отримати товари з state
 * @returns {Array} Масив товарів
 */
export function getProducts() {
    return productsState.products || [];
}

/**
 * Знайти товар за ID
 * @param {string} productId - ID товару
 * @returns {Object|null} Товар або null
 */
export function getProductById(productId) {
    return productsState.products.find(p => p.product_id === productId) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD ОПЕРАЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Підготувати рядок для збереження в Google Sheets
 * Порядок колонок: A-U
 * @param {Object} product - Об'єкт товару
 * @returns {Array} Масив значень для рядка
 */
function prepareProductRow(product) {
    return [
        product.product_id || '',              // A: product_id
        product.name_ua || '',                 // B: name_ua
        product.name_ru || '',                 // C: name_ru
        product.brand_id || '',                // D: brand_id
        product.line_id || '',                 // E: line_id
        product.category_id || '',             // F: category_id
        product.composition_ua || '',          // G: composition_ua
        product.composition_ru || '',          // H: composition_ru
        product.product_text_ua || '',         // I: product_text_ua
        product.product_text_ru || '',         // J: product_text_ru
        serializeJson(product.characteristics),// K: characteristics (JSON)
        product.image_url || '',               // L: image_url
        product.seo_title_ua || '',            // M: seo_title_ua
        product.seo_title_ru || '',            // N: seo_title_ru
        product.seo_description_ua || '',      // O: seo_description_ua
        product.seo_description_ru || '',      // P: seo_description_ru
        product.seo_keywords_ua || '',         // Q: seo_keywords_ua
        product.seo_keywords_ru || '',         // R: seo_keywords_ru
        product.status || 'draft',             // S: status
        product.created_at || '',              // T: created_at
        product.updated_at || ''               // U: updated_at
    ];
}

/**
 * Додати новий товар
 * @param {Object} productData - Дані товару
 * @returns {Promise<Object>} Доданий товар
 */
export async function addProduct(productData) {
    const { pausePolling, resumePolling, notifyChange } = await import('./products-polling.js');
    pausePolling();

    try {
        const newId = generateNextId('prod-', productsState.products.map(p => p.product_id));
        const now = new Date().toISOString();

        const newProduct = {
            product_id: newId,
            name_ua: productData.name_ua || '',
            name_ru: productData.name_ru || '',
            brand_id: productData.brand_id || '',
            line_id: productData.line_id || '',
            category_id: productData.category_id || '',
            composition_ua: productData.composition_ua || '',
            composition_ru: productData.composition_ru || '',
            product_text_ua: productData.product_text_ua || '',
            product_text_ru: productData.product_text_ru || '',
            characteristics: productData.characteristics || {},
            image_url: productData.image_url || '',
            seo_title_ua: productData.seo_title_ua || '',
            seo_title_ru: productData.seo_title_ru || '',
            seo_description_ua: productData.seo_description_ua || '',
            seo_description_ru: productData.seo_description_ru || '',
            seo_keywords_ua: productData.seo_keywords_ua || '',
            seo_keywords_ru: productData.seo_keywords_ru || '',
            status: productData.status || 'draft',
            created_at: now,
            updated_at: now,
            _rowIndex: productsState.products.length + 2
        };

        const newRow = prepareProductRow(newProduct);

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:U`,
            values: [newRow],
            spreadsheetType: 'products'
        });

        productsState.products.push(newProduct);
        notifyChange(newId);

        return newProduct;
    } catch (error) {
        console.error('❌ Помилка додавання товару:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Оновити товар
 * @param {string} productId - ID товару
 * @param {Object} updates - Оновлення
 * @returns {Promise<Object>} Оновлений товар
 */
export async function updateProduct(productId, updates) {
    const { pausePolling, resumePolling, notifyChange } = await import('./products-polling.js');
    pausePolling();

    try {
        const product = productsState.products.find(p => p.product_id === productId);
        if (!product) {
            throw new Error(`Товар ${productId} не знайдено`);
        }

        const updatedProduct = {
            ...product,
            name_ua: updates.name_ua !== undefined ? updates.name_ua : product.name_ua,
            name_ru: updates.name_ru !== undefined ? updates.name_ru : product.name_ru,
            brand_id: updates.brand_id !== undefined ? updates.brand_id : product.brand_id,
            line_id: updates.line_id !== undefined ? updates.line_id : product.line_id,
            category_id: updates.category_id !== undefined ? updates.category_id : product.category_id,
            composition_ua: updates.composition_ua !== undefined ? updates.composition_ua : product.composition_ua,
            composition_ru: updates.composition_ru !== undefined ? updates.composition_ru : product.composition_ru,
            product_text_ua: updates.product_text_ua !== undefined ? updates.product_text_ua : product.product_text_ua,
            product_text_ru: updates.product_text_ru !== undefined ? updates.product_text_ru : product.product_text_ru,
            characteristics: updates.characteristics !== undefined ? updates.characteristics : product.characteristics,
            image_url: updates.image_url !== undefined ? updates.image_url : product.image_url,
            seo_title_ua: updates.seo_title_ua !== undefined ? updates.seo_title_ua : product.seo_title_ua,
            seo_title_ru: updates.seo_title_ru !== undefined ? updates.seo_title_ru : product.seo_title_ru,
            seo_description_ua: updates.seo_description_ua !== undefined ? updates.seo_description_ua : product.seo_description_ua,
            seo_description_ru: updates.seo_description_ru !== undefined ? updates.seo_description_ru : product.seo_description_ru,
            seo_keywords_ua: updates.seo_keywords_ua !== undefined ? updates.seo_keywords_ua : product.seo_keywords_ua,
            seo_keywords_ru: updates.seo_keywords_ru !== undefined ? updates.seo_keywords_ru : product.seo_keywords_ru,
            status: updates.status !== undefined ? updates.status : product.status,
            updated_at: new Date().toISOString(),
        };

        const range = `${SHEET_NAME}!A${product._rowIndex}:U${product._rowIndex}`;
        const updatedRow = prepareProductRow(updatedProduct);

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'products'
        });

        Object.assign(product, updatedProduct);
        notifyChange(productId);

        return product;
    } catch (error) {
        console.error('❌ Помилка оновлення товару:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити товар
 * @param {string} productId - ID товару
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
    const { pausePolling, resumePolling, notifyDelete } = await import('./products-polling.js');
    pausePolling();

    try {
        const productIndex = productsState.products.findIndex(p => p.product_id === productId);
        if (productIndex === -1) {
            throw new Error(`Товар ${productId} не знайдено`);
        }

        const product = productsState.products[productIndex];

        const rowIndex = product._rowIndex;
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
            spreadsheetType: 'products'
        });

        productsState.products.splice(productIndex, 1);
        productsState.products.forEach(p => { if (p._rowIndex > rowIndex) p._rowIndex--; });
        notifyDelete(productId);

    } catch (error) {
        console.error('❌ Помилка видалення товару:', error);
        throw error;
    } finally {
        resumePolling();
    }
}
