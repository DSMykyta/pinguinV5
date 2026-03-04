// js/utils/google-sheets-batch.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   GOOGLE SHEETS BATCH                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Пакетні операції з Google Sheets API (batchUpdate, batchGet)            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { TEXTS_SPREADSHEET_ID, MAIN_SPREADSHEET_ID, getSpreadsheetType } from '../config/spreadsheet-config.js';

/**
 * ВИКОРИСТАННЯ:
 *
 * import { batchUpdate, batchGet } from '../utils/google-sheets-batch.js';
 *
 * // Замість 100 запитів:
 * for (let i = 0; i < 100; i++) {
 *   await updateCell(sheet, row, column, value);
 * }
 *
 * // Один пакетний запит:
 * await batchUpdate({
 *   spreadsheetId: SPREADSHEET_ID,
 *   updates: [
 *     { sheet: 'Sheet1', row: 10, column: 'G', value: 'TRUE' },
 *     { sheet: 'Sheet1', row: 11, column: 'G', value: 'TRUE' },
 *     // ... 100 оновлень
 *   ]
 * });
 */

/**
 * Конвертувати назву колонки (A, B, C, ..., AA, AB) в індекс (0, 1, 2, ...)
 * @param {string} column - Назва колонки (A, B, C, AA, etc.)
 * @returns {number} Індекс колонки (0-based)
 */
function columnToIndex(column) {
    let index = 0;
    for (let i = 0; i < column.length; i++) {
        index = index * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
}

/**
 * Конвертувати індекс колонки в назву (0 → A, 1 → B, 25 → Z, 26 → AA)
 * @param {number} index - Індекс колонки (0-based)
 * @returns {string} Назва колонки
 */
function indexToColumn(index) {
    let column = '';
    while (index >= 0) {
        column = String.fromCharCode((index % 26) + 'A'.charCodeAt(0)) + column;
        index = Math.floor(index / 26) - 1;
    }
    return column;
}

/**
 * Пакетне оновлення комірок в Google Sheets
 *
 * @param {Object} config - Конфігурація
 * @param {string} config.spreadsheetId - ID таблиці
 * @param {Array} config.updates - Масив оновлень
 * @param {string} config.updates[].sheet - Назва аркуша
 * @param {number} config.updates[].row - Номер рядка (1-based)
 * @param {string|number} config.updates[].column - Назва або індекс колонки
 * @param {*} config.updates[].value - Нове значення
 * @param {boolean} [config.raw=true] - Використовувати RAW input (без формул)
 * @returns {Promise<Object>} Результат операції
 *
 * @example
 * await batchUpdate({
 *   spreadsheetId: '1ABC...',
 *   updates: [
 *     { sheet: 'Products', row: 10, column: 'G', value: 'TRUE' },
 *     { sheet: 'Products', row: 11, column: 'G', value: 'TRUE' },
 *     { sheet: 'Products', row: 12, column: 7, value: 'FALSE' }
 *   ]
 * });
 */
export async function batchUpdate(config) {
    const { spreadsheetId, updates, raw = true } = config;

    if (!spreadsheetId) {
        throw new Error('spreadsheetId is required');
    }

    if (!updates || updates.length === 0) {
        console.warn('⚠️ No updates provided to batchUpdate');
        return { updatedCells: 0 };
    }

    try {

        // Визначити тип таблиці
        const spreadsheetType = getSpreadsheetType(spreadsheetId);

        // Перетворити оновлення в формат Google Sheets API
        const data = updates.map(update => {
            const { sheet, row, column, value } = update;

            // Конвертувати колонку в індекс якщо це строка
            const colIndex = typeof column === 'string' ? columnToIndex(column) : column;
            const colLetter = typeof column === 'string' ? column : indexToColumn(column);

            // Формат: Sheet1!A1 або Sheet1!G10
            const range = `${sheet}!${colLetter}${row}`;

            return {
                range,
                values: [[value]]
            };
        });


        // Перевірити наявність API client
        if (!window.apiClient || !window.apiClient.sheets || !window.apiClient.sheets.batchUpdate) {
            throw new Error('API Client не ініціалізовано. Переконайтеся, що api-client.js завантажений.');
        }

        // Викликати Batch Update API через backend proxy
        const response = await window.apiClient.sheets.batchUpdate(data, spreadsheetType);

        // response.data містить result від backend
        const result = response.data || response;
        const updatedCells = result.totalUpdatedCells || updates.length;


        return {
            updatedCells,
            updatedRanges: result.responses?.length || data.length,
            response: result
        };

    } catch (error) {
        console.error('❌ Batch update error:', error);
        if (error.result && error.result.error) {
            console.error('📋 Деталі помилки:', error.result.error);
        }
        throw new Error(`Batch update failed: ${error.message}`);
    }
}

/**
 * Пакетне читання даних з Google Sheets
 *
 * @param {Object} config - Конфігурація
 * @param {string} config.spreadsheetId - ID таблиці
 * @param {Array<string>} config.ranges - Масив діапазонів для читання
 * @param {string} [config.majorDimension='ROWS'] - Орієнтація даних (ROWS або COLUMNS)
 * @returns {Promise<Array>} Масив результатів для кожного діапазону
 *
 * @example
 * const data = await batchGet({
 *   spreadsheetId: '1ABC...',
 *   ranges: [
 *     'Sheet1!A1:Z100',
 *     'Sheet2!A1:Z100',
 *     'Products!A1:G1000'
 *   ]
 * });
 *
 * // data[0] = дані з Sheet1!A1:Z100
 * // data[1] = дані з Sheet2!A1:Z100
 * // data[2] = дані з Products!A1:G1000
 */
export async function batchGet(config) {
    const { spreadsheetId, ranges, majorDimension = 'ROWS' } = config;

    if (!spreadsheetId) {
        throw new Error('spreadsheetId is required');
    }

    if (!ranges || ranges.length === 0) {
        console.warn('⚠️ No ranges provided to batchGet');
        return [];
    }

    try {

        // Визначити тип таблиці
        const spreadsheetType = getSpreadsheetType(spreadsheetId);

        // Перевірити наявність API client
        if (!window.apiClient || !window.apiClient.sheets || !window.apiClient.sheets.batchGet) {
            throw new Error('API Client не ініціалізовано. Переконайтеся, що api-client.js завантажений.');
        }

        // Викликати Batch Get API через backend proxy
        const response = await window.apiClient.sheets.batchGet(ranges, spreadsheetType);

        // response.data містить масив valueRanges
        const valueRanges = response.data || response.result?.valueRanges || [];


        // Повернути дані для кожного діапазону
        return valueRanges.map((vr, index) => ({
            range: ranges[index],
            values: vr.values || [],
            rowCount: vr.values?.length || 0,
            columnCount: vr.values?.[0]?.length || 0
        }));

    } catch (error) {
        console.error('❌ Batch get error:', error);
        throw new Error(`Batch get failed: ${error.message}`);
    }
}

/**
 * Пакетне очищення комірок
 *
 * @param {Object} config - Конфігурація
 * @param {string} config.spreadsheetId - ID таблиці
 * @param {Array<string>} config.ranges - Масив діапазонів для очищення
 * @returns {Promise<Object>} Результат операції
 *
 * @example
 * await batchClear({
 *   spreadsheetId: '1ABC...',
 *   ranges: ['Sheet1!A1:Z100', 'Sheet2!A1:A100']
 * });
 */
export async function batchClear(config) {
    const { spreadsheetId, ranges } = config;

    if (!spreadsheetId) {
        throw new Error('spreadsheetId is required');
    }

    if (!ranges || ranges.length === 0) {
        console.warn('⚠️ No ranges provided to batchClear');
        return { clearedRanges: 0 };
    }

    try {

        // Визначити тип таблиці
        const spreadsheetType = getSpreadsheetType(spreadsheetId);

        // Очищення = batchUpdate з порожніми значеннями
        const data = ranges.map(range => ({
            range,
            values: [['']]  // Порожнє значення
        }));

        // Перевірити наявність API client
        if (!window.apiClient || !window.apiClient.sheets || !window.apiClient.sheets.batchUpdate) {
            throw new Error('API Client не ініціалізовано. Переконайтеся, що api-client.js завантажений.');
        }

        // Викликати Batch Update з порожніми значеннями
        const response = await window.apiClient.sheets.batchUpdate(data, spreadsheetType);

        const result = response.data || response;
        const clearedRanges = ranges.length;


        return {
            clearedRanges,
            response: result
        };

    } catch (error) {
        console.error('❌ Batch clear error:', error);
        throw new Error(`Batch clear failed: ${error.message}`);
    }
}

/**
 * Розбити великий масив оновлень на пакети
 * (Google Sheets API має ліміт ~100-500 запитів на batch)
 *
 * @param {Array} updates - Масив оновлень
 * @param {number} [batchSize=100] - Розмір пакету
 * @returns {Array<Array>} Масив пакетів
 */
export function chunkUpdates(updates, batchSize = 100) {
    const chunks = [];
    for (let i = 0; i < updates.length; i += batchSize) {
        chunks.push(updates.slice(i, i + batchSize));
    }
    return chunks;
}

/**
 * Пакетне оновлення з автоматичним розбиттям на частини
 *
 * @param {Object} config - Конфігурація (як batchUpdate)
 * @param {number} [config.chunkSize=100] - Розмір пакету
 * @param {Function} [config.onProgress] - Callback прогресу (current, total)
 * @returns {Promise<Object>} Результат операції
 *
 * @example
 * await batchUpdateChunked({
 *   spreadsheetId: '1ABC...',
 *   updates: [...1000 оновлень...],
 *   chunkSize: 100,
 *   onProgress: (current, total) => {
 *     console.log(`Прогрес: ${current}/${total}`);
 *   }
 * });
 */
export async function batchUpdateChunked(config) {
    const { spreadsheetId, updates, chunkSize = 100, onProgress, raw = true } = config;

    if (!updates || updates.length === 0) {
        return { updatedCells: 0 };
    }

    // Розбити на частини
    const chunks = chunkUpdates(updates, chunkSize);

    let totalUpdatedCells = 0;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        if (onProgress) {
            onProgress(i + 1, chunks.length);
        }

        const result = await batchUpdate({
            spreadsheetId,
            updates: chunk,
            raw
        });

        totalUpdatedCells += result.updatedCells;
    }


    return {
        updatedCells: totalUpdatedCells,
        chunks: chunks.length
    };
}

/**
 * Утиліта: отримати ID таблиці з URL
 *
 * @param {string} url - URL Google Sheets
 * @returns {string|null} ID таблиці
 *
 * @example
 * const id = getSpreadsheetIdFromUrl(
 *   'https://docs.google.com/spreadsheets/d/1ABC.../edit'
 * );
 * // → '1ABC...'
 */
export function getSpreadsheetIdFromUrl(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}
