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
 * СТРУКТУРА КОЛОНОК В GOOGLE SHEETS (Products):  A:AO (41 колонка)
 * ┌─────────┬──────────────────────────┬───────────────────────────────────┐
 * │ Колонка │ Поле                     │ Формат                            │
 * ├─────────┼──────────────────────────┼───────────────────────────────────┤
 * │ A       │ product_id               │ prod-XXXXXX                       │
 * │ B       │ article                  │ текст (артикул товару)            │
 * │ C       │ brand_id                 │ bran-XXXXXX                       │
 * │ D       │ line_id                  │ line-XXXXXX                       │
 * │ E       │ category_id              │ cat-XXXXXX                        │
 * │ F       │ text_before_ua           │ текст (категорія/перед назвою)    │
 * │ G       │ text_before_ru           │ текст                             │
 * │ H       │ name_ua                  │ текст (назва товару)              │
 * │ I       │ name_ru                  │ текст                             │
 * │ J       │ label_ua                 │ текст (ознака товару)             │
 * │ K       │ label_ru                 │ текст                             │
 * │ L       │ detail_ua                │ текст (деталь товару)             │
 * │ M       │ detail_ru                │ текст                             │
 * │ N       │ variation_ua             │ текст (варіація товару)           │
 * │ O       │ variation_ru             │ текст                             │
 * │ P       │ text_after_ua            │ текст (після назви)               │
 * │ Q       │ text_after_ru            │ текст                             │
 * │ R       │ generated_short_ua       │ авто (коротка назва)              │
 * │ S       │ generated_short_ru       │ авто                              │
 * │ T       │ generated_full_ua        │ авто (повна назва)                │
 * │ U       │ generated_full_ru        │ авто                              │
 * │ V       │ url                      │ авто slug (з короткої назви)      │
 * │ W       │ composition_code_ua      │ HTML текст (код складу)           │
 * │ X       │ composition_code_ru      │ HTML текст                        │
 * │ Y       │ composition_notes_ua     │ HTML текст (1 порція, br-only)    │
 * │ Z       │ composition_notes_ru     │ HTML текст                        │
 * │ AA      │ product_text_ua          │ HTML текст                        │
 * │ AB      │ product_text_ru          │ HTML текст                        │
 * │ AC      │ characteristics          │ JSON об'єкт                       │
 * │ AD      │ image_url                │ URL / JSON масив                  │
 * │ AE      │ seo_title_ua             │ текст                             │
 * │ AF      │ seo_title_ru             │ текст                             │
 * │ AG      │ seo_description_ua       │ текст                             │
 * │ AH      │ seo_description_ru       │ текст                             │
 * │ AI      │ seo_keywords_ua          │ текст                             │
 * │ AJ      │ seo_keywords_ru          │ текст                             │
 * │ AK      │ status                   │ active | draft | archived         │
 * │ AL      │ created_at               │ ISO дата                          │
 * │ AM      │ updated_at               │ ISO дата                          │
 * │ AN      │ created_by               │ email (хто створив)               │
 * │ AO      │ updated_by               │ email (хто оновив)                │
 * └─────────┴──────────────────────────┴───────────────────────────────────┘
 */

import { productsState } from './products-state.js';
import { callSheetsAPI } from '../../utils/utils-api-client.js';
import { PRODUCTS_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';
import { generateNextId } from '../../utils/utils-id.js';
import { safeJsonParse } from '../../utils/utils-json.js';

const SHEET_NAME = 'Products';
const SHEET_GID = '0';

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
            article: row.article || '',
            brand_id: row.brand_id || '',
            line_id: row.line_id || '',
            category_id: row.category_id || '',
            text_before_ua: row.text_before_ua || '',
            text_before_ru: row.text_before_ru || '',
            name_ua: row.name_ua || '',
            name_ru: row.name_ru || '',
            label_ua: row.label_ua || '',
            label_ru: row.label_ru || '',
            detail_ua: row.detail_ua || '',
            detail_ru: row.detail_ru || '',
            variation_ua: row.variation_ua || '',
            variation_ru: row.variation_ru || '',
            text_after_ua: row.text_after_ua || '',
            text_after_ru: row.text_after_ru || '',
            generated_short_ua: row.generated_short_ua || '',
            generated_short_ru: row.generated_short_ru || '',
            generated_full_ua: row.generated_full_ua || '',
            generated_full_ru: row.generated_full_ru || '',
            url: row.url || '',
            composition_code_ua: row.composition_code_ua || '',
            composition_code_ru: row.composition_code_ru || '',
            composition_notes_ua: row.composition_notes_ua || '',
            composition_notes_ru: row.composition_notes_ru || '',
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
            created_by: row.created_by || '',
            updated_by: row.updated_by || '',
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
 * Порядок колонок: A:AO (41 колонка)
 * @param {Object} product - Об'єкт товару
 * @returns {Array} Масив значень для рядка
 */
function prepareProductRow(product) {
    return [
        product.product_id || '',              // A: product_id
        product.article || '',                 // B: article
        product.brand_id || '',                // C: brand_id
        product.line_id || '',                 // D: line_id
        product.category_id || '',             // E: category_id
        product.text_before_ua || '',          // F: text_before_ua
        product.text_before_ru || '',          // G: text_before_ru
        product.name_ua || '',                 // H: name_ua
        product.name_ru || '',                 // I: name_ru
        product.label_ua || '',                // J: label_ua
        product.label_ru || '',                // K: label_ru
        product.detail_ua || '',               // L: detail_ua
        product.detail_ru || '',               // M: detail_ru
        product.variation_ua || '',            // N: variation_ua
        product.variation_ru || '',            // O: variation_ru
        product.text_after_ua || '',           // P: text_after_ua
        product.text_after_ru || '',           // Q: text_after_ru
        product.generated_short_ua || '',      // R: generated_short_ua
        product.generated_short_ru || '',      // S: generated_short_ru
        product.generated_full_ua || '',       // T: generated_full_ua
        product.generated_full_ru || '',       // U: generated_full_ru
        product.url || '',                      // V: url (slug)
        product.composition_code_ua || '',      // W: composition_code_ua
        product.composition_code_ru || '',      // X: composition_code_ru
        product.composition_notes_ua || '',     // Y: composition_notes_ua
        product.composition_notes_ru || '',     // Z: composition_notes_ru
        product.product_text_ua || '',          // AA: product_text_ua
        product.product_text_ru || '',          // AB: product_text_ru
        serializeJson(product.characteristics), // AC: characteristics (JSON)
        product.image_url || '',                // AD: image_url
        product.seo_title_ua || '',             // AE: seo_title_ua
        product.seo_title_ru || '',             // AF: seo_title_ru
        product.seo_description_ua || '',       // AG: seo_description_ua
        product.seo_description_ru || '',       // AH: seo_description_ru
        product.seo_keywords_ua || '',          // AI: seo_keywords_ua
        product.seo_keywords_ru || '',          // AJ: seo_keywords_ru
        product.status || 'draft',              // AK: status
        product.created_at || '',               // AL: created_at
        product.updated_at || '',               // AM: updated_at
        product.created_by || '',               // AN: created_by
        product.updated_by || '',               // AO: updated_by
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
            article: productData.article || '',
            brand_id: productData.brand_id || '',
            line_id: productData.line_id || '',
            category_id: productData.category_id || '',
            text_before_ua: productData.text_before_ua || '',
            text_before_ru: productData.text_before_ru || '',
            name_ua: productData.name_ua || '',
            name_ru: productData.name_ru || '',
            label_ua: productData.label_ua || '',
            label_ru: productData.label_ru || '',
            detail_ua: productData.detail_ua || '',
            detail_ru: productData.detail_ru || '',
            variation_ua: productData.variation_ua || '',
            variation_ru: productData.variation_ru || '',
            text_after_ua: productData.text_after_ua || '',
            text_after_ru: productData.text_after_ru || '',
            generated_short_ua: productData.generated_short_ua || '',
            generated_short_ru: productData.generated_short_ru || '',
            generated_full_ua: productData.generated_full_ua || '',
            generated_full_ru: productData.generated_full_ru || '',
            url: productData.url || '',
            composition_code_ua: productData.composition_code_ua || '',
            composition_code_ru: productData.composition_code_ru || '',
            composition_notes_ua: productData.composition_notes_ua || '',
            composition_notes_ru: productData.composition_notes_ru || '',
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
            created_by: window.currentUser?.username || '',
            updated_by: window.currentUser?.username || '',
            _rowIndex: productsState.products.length + 2
        };

        const newRow = prepareProductRow(newProduct);

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:AO`,
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

        const u = (key) => updates[key] !== undefined ? updates[key] : product[key];

        const updatedProduct = {
            ...product,
            article: u('article'),
            brand_id: u('brand_id'),
            line_id: u('line_id'),
            category_id: u('category_id'),
            text_before_ua: u('text_before_ua'),
            text_before_ru: u('text_before_ru'),
            name_ua: u('name_ua'),
            name_ru: u('name_ru'),
            label_ua: u('label_ua'),
            label_ru: u('label_ru'),
            detail_ua: u('detail_ua'),
            detail_ru: u('detail_ru'),
            variation_ua: u('variation_ua'),
            variation_ru: u('variation_ru'),
            text_after_ua: u('text_after_ua'),
            text_after_ru: u('text_after_ru'),
            generated_short_ua: u('generated_short_ua'),
            generated_short_ru: u('generated_short_ru'),
            generated_full_ua: u('generated_full_ua'),
            generated_full_ru: u('generated_full_ru'),
            url: product.url || u('url'),
            composition_code_ua: u('composition_code_ua'),
            composition_code_ru: u('composition_code_ru'),
            composition_notes_ua: u('composition_notes_ua'),
            composition_notes_ru: u('composition_notes_ru'),
            product_text_ua: u('product_text_ua'),
            product_text_ru: u('product_text_ru'),
            characteristics: u('characteristics'),
            image_url: u('image_url'),
            seo_title_ua: u('seo_title_ua'),
            seo_title_ru: u('seo_title_ru'),
            seo_description_ua: u('seo_description_ua'),
            seo_description_ru: u('seo_description_ru'),
            seo_keywords_ua: u('seo_keywords_ua'),
            seo_keywords_ru: u('seo_keywords_ru'),
            status: u('status'),
            updated_at: new Date().toISOString(),
            created_by: product.created_by || '',
            updated_by: window.currentUser?.username || '',
        };

        const range = `${SHEET_NAME}!A${product._rowIndex}:AO${product._rowIndex}`;
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
