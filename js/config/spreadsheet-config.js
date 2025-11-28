// js/config/spreadsheet-config.js
// Централізована конфігурація Google Spreadsheet IDs

/**
 * ID основної таблиці (сутності, бренди, заборонені слова, ключові слова)
 * Google Sheet: PinguinV5 Main Database
 */
export const MAIN_SPREADSHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';

/**
 * ID таблиці з текстами товарів (для перевірки заборонених слів)
 * Google Sheet: Texts Database
 */
export const TEXTS_SPREADSHEET_ID = '1qQ2ob8zsgSfE1G64SorpdbW0xYLOdPfw_cbAH23xUhM';

/**
 * Аліаси для зворотної сумісності
 */
export const SPREADSHEET_ID = MAIN_SPREADSHEET_ID;
export const BANNED_SPREADSHEET_ID = MAIN_SPREADSHEET_ID;

/**
 * Визначити тип таблиці на основі spreadsheetId
 * @param {string} spreadsheetId - ID таблиці
 * @returns {'main' | 'texts'} Тип таблиці
 */
export function getSpreadsheetType(spreadsheetId) {
    if (spreadsheetId === TEXTS_SPREADSHEET_ID) {
        return 'texts';
    }
    return 'main';
}
