// js/pages/products/groups-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCT GROUPS - DATA OPERATIONS                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 *
 * CRUD операції для груп товарів через Google Sheets API.
 * Група = набір пов'язаних товарів (різна вага, дозування тощо).
 *
 * СТРУКТУРА КОЛОНОК (Google Sheets - ProductGroups):  A:C (3 колонки)
 * A: group_id | B: product_type | C: product_ids (JSON масив)
 */

import { productsState } from './products-state.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import { generateNextId } from '../../utils/common-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_NAME = 'ProductGroups';
const SHEET_GID = '1873654597';

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати всі групи
 * @returns {Array} Масив груп
 */
export function getProductGroups() {
    return productsState.productGroups || [];
}

/**
 * Отримати групу за ID
 * @param {string} groupId - ID групи
 * @returns {Object|null} Група або null
 */
export function getGroupById(groupId) {
    return (productsState.productGroups || []).find(g => g.group_id === groupId) || null;
}

/**
 * Знайти групу, до якої належить товар
 * @param {string} productId - ID товару
 * @returns {Object|null} Група або null
 */
export function getGroupByProductId(productId) {
    return (productsState.productGroups || []).find(g =>
        g.product_ids.includes(productId)
    ) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити групи з Google Sheets
 */
export async function loadProductGroups() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEET_NAME}!A:C`,
            spreadsheetType: 'products'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            productsState.productGroups = [];
            return [];
        }

        const dataRows = result.slice(1);

        productsState.productGroups = dataRows.map((row, index) => ({
            group_id: row[0] || '',
            product_type: row[1] || 'label',
            product_ids: safeJsonParse(row[2], []),
            _rowIndex: index + 2
        }));

        return productsState.productGroups;

    } catch (error) {
        console.error('❌ Помилка завантаження груп:', error);
        throw error;
    }
}

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

// ═══════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Додати нову групу
 * @param {Array<string>} productIds - Масив ID товарів
 * @returns {Promise<Object>} Додана група
 */
export async function addProductGroup(productType, productIds) {
    const { pausePolling, resumePolling } = await import('./products-polling.js');
    pausePolling();

    try {
        const newId = generateNextId('grp-', (productsState.productGroups || []).map(g => g.group_id));

        const newGroup = {
            group_id: newId,
            product_type: productType || 'label',
            product_ids: productIds || [],
            _rowIndex: (productsState.productGroups || []).length + 2
        };

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:C`,
            values: [[newGroup.group_id, newGroup.product_type, JSON.stringify(newGroup.product_ids)]],
            spreadsheetType: 'products'
        });

        if (!productsState.productGroups) productsState.productGroups = [];
        productsState.productGroups.push(newGroup);

        return newGroup;
    } catch (error) {
        console.error('❌ Помилка додавання групи:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Оновити групу (змінити список товарів)
 * @param {string} groupId - ID групи
 * @param {Array<string>} productIds - Новий масив ID товарів
 * @returns {Promise<Object>} Оновлена група
 */
export async function updateProductGroup(groupId, productType, productIds) {
    const { pausePolling, resumePolling } = await import('./products-polling.js');
    pausePolling();

    try {
        const group = (productsState.productGroups || []).find(g => g.group_id === groupId);
        if (!group) {
            throw new Error(`Групу ${groupId} не знайдено`);
        }

        const range = `${SHEET_NAME}!A${group._rowIndex}:C${group._rowIndex}`;

        await callSheetsAPI('update', {
            range: range,
            values: [[group.group_id, productType, JSON.stringify(productIds)]],
            spreadsheetType: 'products'
        });

        group.product_type = productType;
        group.product_ids = productIds;

        return group;
    } catch (error) {
        console.error('❌ Помилка оновлення групи:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити групу
 * @param {string} groupId - ID групи
 * @returns {Promise<void>}
 */
export async function deleteProductGroup(groupId) {
    const { pausePolling, resumePolling } = await import('./products-polling.js');
    pausePolling();

    try {
        const groupIndex = (productsState.productGroups || []).findIndex(g => g.group_id === groupId);
        if (groupIndex === -1) {
            throw new Error(`Групу ${groupId} не знайдено`);
        }

        const group = productsState.productGroups[groupIndex];
        const rowIndex = group._rowIndex;

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

        productsState.productGroups.splice(groupIndex, 1);
        productsState.productGroups.forEach(g => { if (g._rowIndex > rowIndex) g._rowIndex--; });

    } catch (error) {
        console.error('❌ Помилка видалення групи:', error);
        throw error;
    } finally {
        resumePolling();
    }
}
