// js/pages/products/variants-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCT VARIANTS - DATA OPERATIONS                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 *
 * CRUD операції для варіантів товарів через Google Sheets API.
 *
 * СТРУКТУРА КОЛОНОК (Google Sheets - ProductVariants):
 * A: variant_id | B: product_id | C: sku | D: name_ua | E: name_ru
 * F: price | G: barcode | H: weight | I: stock
 * J: variant_chars | K: image_url | L: status | M: created_at
 */

import { productsState } from './products-state.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import { generateNextId } from '../../utils/common-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_NAME = 'ProductVariants';
const SHEET_GID = '649136452';

// ═══════════════════════════════════════════════════════════════════════════
// JSON HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function safeJsonParse(value, defaultValue = null) {
    if (!value || typeof value !== 'string') return defaultValue;
    const trimmed = value.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            return defaultValue;
        }
    }
    return defaultValue;
}

function serializeJson(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати всі варіанти
 * @returns {Array} Масив варіантів
 */
export function getProductVariants() {
    return productsState.productVariants || [];
}

/**
 * Отримати варіант за ID
 * @param {string} variantId - ID варіанту
 * @returns {Object|null} Варіант або null
 */
export function getVariantById(variantId) {
    return productsState.productVariants.find(v => v.variant_id === variantId) || null;
}

/**
 * Отримати варіанти за product_id
 * @param {string} productId - ID товару
 * @returns {Array} Масив варіантів товару
 */
export function getVariantsByProductId(productId) {
    return productsState.productVariants.filter(v => v.product_id === productId);
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити варіанти з Google Sheets
 */
export async function loadProductVariants() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEET_NAME}!A:M`,
            spreadsheetType: 'products'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            productsState.productVariants = [];
            return [];
        }

        const dataRows = result.slice(1);

        productsState.productVariants = dataRows.map((row, index) => ({
            variant_id: row[0] || '',
            product_id: row[1] || '',
            sku: row[2] || '',
            name_ua: row[3] || '',
            name_ru: row[4] || '',
            price: row[5] || '',
            barcode: row[6] || '',
            weight: row[7] || '',
            stock: row[8] || '',
            variant_chars: safeJsonParse(row[9], {}),
            image_url: row[10] || '',
            status: row[11] || 'active',
            created_at: row[12] || '',
            _rowIndex: index + 2
        }));

        return productsState.productVariants;

    } catch (error) {
        console.error('❌ Помилка завантаження варіантів:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Підготувати рядок для запису в таблицю
 * @param {Object} variant - Об'єкт варіанту
 * @returns {Array} Масив значень для рядка
 */
function prepareVariantRow(variant) {
    return [
        variant.variant_id || '',         // A: variant_id
        variant.product_id || '',         // B: product_id
        variant.sku || '',                // C: sku
        variant.name_ua || '',            // D: name_ua
        variant.name_ru || '',            // E: name_ru
        variant.price || '',              // F: price
        variant.barcode || '',            // G: barcode
        variant.weight || '',             // H: weight
        variant.stock || '',              // I: stock
        serializeJson(variant.variant_chars), // J: variant_chars (JSON)
        variant.image_url || '',          // K: image_url
        variant.status || 'active',       // L: status
        variant.created_at || ''          // M: created_at
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Додати новий варіант
 * @param {Object} variantData - Дані варіанту
 * @returns {Promise<Object>} Доданий варіант
 */
export async function addProductVariant(variantData) {
    const { pausePolling, resumePolling, notifyChange } = await import('./products-polling.js');
    pausePolling();

    try {
        const newId = generateNextId('var-', productsState.productVariants.map(v => v.variant_id));

        const newVariant = {
            variant_id: newId,
            product_id: variantData.product_id || '',
            sku: variantData.sku || '',
            name_ua: variantData.name_ua || '',
            name_ru: variantData.name_ru || '',
            price: variantData.price || '',
            barcode: variantData.barcode || '',
            weight: variantData.weight || '',
            stock: variantData.stock || '',
            variant_chars: variantData.variant_chars || {},
            image_url: variantData.image_url || '',
            status: variantData.status || 'active',
            created_at: new Date().toISOString(),
            _rowIndex: productsState.productVariants.length + 2
        };

        const newRow = prepareVariantRow(newVariant);

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:M`,
            values: [newRow],
            spreadsheetType: 'products'
        });

        productsState.productVariants.push(newVariant);
        notifyChange(newVariant.product_id);

        return newVariant;
    } catch (error) {
        console.error('❌ Помилка додавання варіанту:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Оновити варіант
 * @param {string} variantId - ID варіанту
 * @param {Object} updates - Оновлення
 * @returns {Promise<Object>} Оновлений варіант
 */
export async function updateProductVariant(variantId, updates) {
    const { pausePolling, resumePolling, notifyChange } = await import('./products-polling.js');
    pausePolling();

    try {
        const variant = productsState.productVariants.find(v => v.variant_id === variantId);
        if (!variant) {
            throw new Error(`Варіант ${variantId} не знайдено`);
        }

        const updatedVariant = {
            ...variant,
            product_id: updates.product_id !== undefined ? updates.product_id : variant.product_id,
            sku: updates.sku !== undefined ? updates.sku : variant.sku,
            name_ua: updates.name_ua !== undefined ? updates.name_ua : variant.name_ua,
            name_ru: updates.name_ru !== undefined ? updates.name_ru : variant.name_ru,
            price: updates.price !== undefined ? updates.price : variant.price,
            barcode: updates.barcode !== undefined ? updates.barcode : variant.barcode,
            weight: updates.weight !== undefined ? updates.weight : variant.weight,
            stock: updates.stock !== undefined ? updates.stock : variant.stock,
            variant_chars: updates.variant_chars !== undefined ? updates.variant_chars : variant.variant_chars,
            image_url: updates.image_url !== undefined ? updates.image_url : variant.image_url,
            status: updates.status !== undefined ? updates.status : variant.status,
        };

        const range = `${SHEET_NAME}!A${variant._rowIndex}:M${variant._rowIndex}`;
        const updatedRow = prepareVariantRow(updatedVariant);

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'products'
        });

        Object.assign(variant, updatedVariant);
        notifyChange(variant.product_id);

        return variant;
    } catch (error) {
        console.error('❌ Помилка оновлення варіанту:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити варіант
 * @param {string} variantId - ID варіанту
 * @returns {Promise<void>}
 */
export async function deleteProductVariant(variantId) {
    const { pausePolling, resumePolling, notifyChange } = await import('./products-polling.js');
    pausePolling();

    try {
        const variantIndex = productsState.productVariants.findIndex(v => v.variant_id === variantId);
        if (variantIndex === -1) {
            throw new Error(`Варіант ${variantId} не знайдено`);
        }

        const variant = productsState.productVariants[variantIndex];

        const rowIndex = variant._rowIndex;
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

        productsState.productVariants.splice(variantIndex, 1);
        productsState.productVariants.forEach(v => { if (v._rowIndex > rowIndex) v._rowIndex--; });
        notifyChange(variant.product_id);

    } catch (error) {
        console.error('❌ Помилка видалення варіанту:', error);
        throw error;
    } finally {
        resumePolling();
    }
}
