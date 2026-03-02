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
 * СТРУКТУРА КОЛОНОК (Google Sheets - ProductVariants):  A:U (21 колонка)
 * A: variant_id | B: product_id | C: sku | D: name_ua | E: name_ru
 * F: spec_ua | G: spec_ru
 * H: generated_short_ua | I: generated_short_ru
 * J: generated_full_ua | K: generated_full_ru
 * L: price | M: barcode | N: weight | O: stock
 * P: variant_chars | Q: image_url
 * R: composition_notes_ua | S: composition_notes_ru
 * T: status | U: created_at
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
            range: `${SHEET_NAME}!A:U`,
            spreadsheetType: 'products'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            productsState.productVariants = [];
            return [];
        }

        const dataRows = result.slice(1);

        productsState.productVariants = dataRows.map((row, index) => ({
            variant_id: row[0] || '',       // A
            product_id: row[1] || '',       // B
            sku: row[2] || '',              // C
            name_ua: row[3] || '',          // D
            name_ru: row[4] || '',          // E
            spec_ua: row[5] || '',          // F
            spec_ru: row[6] || '',          // G
            generated_short_ua: row[7] || '', // H
            generated_short_ru: row[8] || '', // I
            generated_full_ua: row[9] || '',  // J
            generated_full_ru: row[10] || '', // K
            price: row[11] || '',           // L
            barcode: row[12] || '',         // M
            weight: row[13] || '',          // N
            stock: row[14] || '',           // O
            variant_chars: safeJsonParse(row[15], {}), // P
            image_url: row[16] || '',       // Q
            composition_notes_ua: row[17] || '', // R
            composition_notes_ru: row[18] || '', // S
            status: row[19] || 'active',    // T
            created_at: row[20] || '',      // U
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
        variant.variant_id || '',             // A: variant_id
        variant.product_id || '',             // B: product_id
        variant.sku || '',                    // C: sku
        variant.name_ua || '',                // D: name_ua
        variant.name_ru || '',                // E: name_ru
        variant.spec_ua || '',                // F: spec_ua
        variant.spec_ru || '',                // G: spec_ru
        variant.generated_short_ua || '',     // H: generated_short_ua
        variant.generated_short_ru || '',     // I: generated_short_ru
        variant.generated_full_ua || '',      // J: generated_full_ua
        variant.generated_full_ru || '',      // K: generated_full_ru
        variant.price || '',                  // L: price
        variant.barcode || '',                // M: barcode
        variant.weight || '',                 // N: weight
        variant.stock || '',                  // O: stock
        serializeJson(variant.variant_chars), // P: variant_chars (JSON)
        variant.image_url || '',              // Q: image_url
        variant.composition_notes_ua || '',   // R: composition_notes_ua
        variant.composition_notes_ru || '',   // S: composition_notes_ru
        variant.status || 'active',           // T: status
        variant.created_at || '',             // U: created_at
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
            spec_ua: variantData.spec_ua || '',
            spec_ru: variantData.spec_ru || '',
            generated_short_ua: variantData.generated_short_ua || '',
            generated_short_ru: variantData.generated_short_ru || '',
            generated_full_ua: variantData.generated_full_ua || '',
            generated_full_ru: variantData.generated_full_ru || '',
            price: variantData.price || '',
            barcode: variantData.barcode || '',
            weight: variantData.weight || '',
            stock: variantData.stock || '',
            variant_chars: variantData.variant_chars || {},
            image_url: variantData.image_url || '',
            composition_notes_ua: variantData.composition_notes_ua || '',
            composition_notes_ru: variantData.composition_notes_ru || '',
            status: variantData.status || 'active',
            created_at: new Date().toISOString(),
            _rowIndex: productsState.productVariants.length + 2
        };

        const newRow = prepareVariantRow(newVariant);

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:U`,
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

        const u = (key) => updates[key] !== undefined ? updates[key] : variant[key];

        const updatedVariant = {
            ...variant,
            product_id: u('product_id'),
            sku: u('sku'),
            name_ua: u('name_ua'),
            name_ru: u('name_ru'),
            spec_ua: u('spec_ua'),
            spec_ru: u('spec_ru'),
            generated_short_ua: u('generated_short_ua'),
            generated_short_ru: u('generated_short_ru'),
            generated_full_ua: u('generated_full_ua'),
            generated_full_ru: u('generated_full_ru'),
            price: u('price'),
            barcode: u('barcode'),
            weight: u('weight'),
            stock: u('stock'),
            variant_chars: u('variant_chars'),
            image_url: u('image_url'),
            composition_notes_ua: u('composition_notes_ua'),
            composition_notes_ru: u('composition_notes_ru'),
            status: u('status'),
        };

        const range = `${SHEET_NAME}!A${variant._rowIndex}:U${variant._rowIndex}`;
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
