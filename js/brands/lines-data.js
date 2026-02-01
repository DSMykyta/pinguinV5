// js/brands/lines-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRAND LINES - DATA OPERATIONS                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 *
 * CRUD операції для лінійок брендів через Google Sheets API.
 *
 * СТРУКТУРА КОЛОНОК (Google Sheets - BrandLines):
 * A: line_id | B: brand_id | C: name_uk | D: line_logo_url
 */

import { brandsState } from './brands-state.js';
import { callSheetsAPI } from '../utils/api-client.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_NAME = 'BrandLines';
const SHEET_GID = '1150452478';

// ═══════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати всі лінійки
 * @returns {Array} Масив лінійок
 */
export function getBrandLines() {
    return brandsState.brandLines || [];
}

/**
 * Отримати лінійку за ID
 * @param {string} lineId - ID лінійки
 * @returns {Object|null} Лінійка або null
 */
export function getBrandLineById(lineId) {
    return brandsState.brandLines.find(l => l.line_id === lineId) || null;
}

/**
 * Отримати лінійки за brand_id
 * @param {string} brandId - ID бренду
 * @returns {Array} Масив лінійок бренду
 */
export function getBrandLinesByBrandId(brandId) {
    return brandsState.brandLines.filter(l => l.brand_id === brandId);
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити лінійки з Google Sheets
 */
export async function loadBrandLines() {

    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEET_NAME}!A:D`,
            spreadsheetType: 'main'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        if (!result || !Array.isArray(result) || result.length <= 1) {
            brandsState.brandLines = [];
            return [];
        }

        // Пропустити заголовок, парсити дані
        const headers = result[0];
        const dataRows = result.slice(1);

        brandsState.brandLines = dataRows.map((row, index) => ({
            line_id: row[0] || '',
            brand_id: row[1] || '',
            name_uk: row[2] || '',
            line_logo_url: row[3] || '',
            _rowIndex: index + 2
        }));

        return brandsState.brandLines;

    } catch (error) {
        console.error('❌ Помилка завантаження лінійок:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Генерувати новий ID для лінійки
 * @returns {string} Новий ID у форматі line-XXXXXX
 */
function generateLineId() {
    let maxNum = 0;

    brandsState.brandLines.forEach(line => {
        if (line.line_id && line.line_id.startsWith('line-')) {
            const num = parseInt(line.line_id.replace('line-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    const newNum = maxNum + 1;
    return `line-${String(newNum).padStart(6, '0')}`;
}

/**
 * Підготувати рядок для запису в таблицю
 * @param {Object} line - Об'єкт лінійки
 * @returns {Array} Масив значень для рядка
 */
function prepareLineRow(line) {
    return [
        line.line_id || '',           // A: line_id
        line.brand_id || '',          // B: brand_id
        line.name_uk || '',           // C: name_uk
        line.line_logo_url || ''      // D: line_logo_url
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Додати нову лінійку
 * @param {Object} lineData - Дані лінійки
 * @returns {Promise<Object>} Додана лінійка
 */
export async function addBrandLine(lineData) {

    try {
        const newId = generateLineId();

        const newLine = {
            line_id: newId,
            brand_id: lineData.brand_id || '',
            name_uk: lineData.name_uk || '',
            line_logo_url: lineData.line_logo_url || '',
            _rowIndex: brandsState.brandLines.length + 2
        };

        const newRow = prepareLineRow(newLine);

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:D`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        brandsState.brandLines.push(newLine);

        return newLine;
    } catch (error) {
        console.error('❌ Помилка додавання лінійки:', error);
        throw error;
    }
}

/**
 * Оновити лінійку
 * @param {string} lineId - ID лінійки
 * @param {Object} updates - Оновлення
 * @returns {Promise<Object>} Оновлена лінійка
 */
export async function updateBrandLine(lineId, updates) {

    try {
        const line = brandsState.brandLines.find(l => l.line_id === lineId);
        if (!line) {
            throw new Error(`Лінійка ${lineId} не знайдена`);
        }

        // Оновити локальний об'єкт
        const updatedLine = {
            ...line,
            brand_id: updates.brand_id !== undefined ? updates.brand_id : line.brand_id,
            name_uk: updates.name_uk !== undefined ? updates.name_uk : line.name_uk,
            line_logo_url: updates.line_logo_url !== undefined ? updates.line_logo_url : line.line_logo_url,
        };

        const range = `${SHEET_NAME}!A${line._rowIndex}:D${line._rowIndex}`;
        const updatedRow = prepareLineRow(updatedLine);

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        // Оновити state
        Object.assign(line, updatedLine);

        return line;
    } catch (error) {
        console.error('❌ Помилка оновлення лінійки:', error);
        throw error;
    }
}

/**
 * Видалити лінійку
 * @param {string} lineId - ID лінійки
 * @returns {Promise<void>}
 */
export async function deleteBrandLine(lineId) {

    try {
        const lineIndex = brandsState.brandLines.findIndex(l => l.line_id === lineId);
        if (lineIndex === -1) {
            throw new Error(`Лінійка ${lineId} не знайдена`);
        }

        const line = brandsState.brandLines[lineIndex];

        const range = `${SHEET_NAME}!A${line._rowIndex}:D${line._rowIndex}`;
        await callSheetsAPI('update', {
            range: range,
            values: [['', '', '', '']],
            spreadsheetType: 'main'
        });

        brandsState.brandLines.splice(lineIndex, 1);

    } catch (error) {
        console.error('❌ Помилка видалення лінійки:', error);
        throw error;
    }
}
