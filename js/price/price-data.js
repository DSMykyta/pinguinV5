// js/price/price-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - DATA MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для прайсу/чекліста.
 * Використовує уніфікований api-client для всіх операцій.
 */

import { priceState } from './price-init.js';
import { callSheetsAPI } from '../utils/api-client.js';
import { PRICE_SPREADSHEET_ID } from '../config/spreadsheet-config.js';

const PRICE_SHEET_NAME = 'Price';
const PRICE_START_ROW = 7; // Імпорт XLSX починається з рядка 7

/**
 * Завантажити дані прайсу з Google Sheets
 */
export async function loadPriceData() {
    try {
        console.log('📥 Завантаження даних прайсу...');

        // Завантажуємо дані починаючи з рядка 7
        const result = await callSheetsAPI('get', {
            range: `${PRICE_SHEET_NAME}!A${PRICE_START_ROW}:P`,
            spreadsheetType: 'price'
        });

        const rows = result || [];

        if (rows.length === 0) {
            console.warn('⚠️ Прайс порожній');
            priceState.priceItems = [];
            priceState.reserveNames = [];
            return;
        }

        // Перший рядок - заголовки (рядок 7)
        const headers = rows[0];
        console.log('📋 Заголовки прайсу:', headers);

        // Парсимо дані
        const data = [];
        const reserveSet = new Set();

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const item = {};
            headers.forEach((header, index) => {
                item[header] = row[index] || '';
            });

            // Додати _rowIndex для оновлення
            item._rowIndex = PRICE_START_ROW + i;

            // Збираємо унікальні резерви
            if (item.reserve && item.reserve.trim() !== '') {
                reserveSet.add(item.reserve.trim());
            }

            // Пропускаємо порожні рядки (без code)
            if (item.code && item.code.trim() !== '') {
                data.push(item);
            }
        }

        priceState.priceItems = data;
        priceState.filteredItems = [...data];
        priceState.reserveNames = Array.from(reserveSet).sort();

        console.log(`✅ Завантажено ${data.length} товарів, ${priceState.reserveNames.length} резервів`);

    } catch (error) {
        console.error('❌ Помилка завантаження прайсу:', error);
        throw error;
    }
}

/**
 * Оновити статус товару (status/check/payment)
 * @param {string} code - Унікальний код товару
 * @param {string} field - Поле для оновлення (status/check/payment)
 * @param {string} value - Нове значення (TRUE/FALSE)
 */
export async function updateItemStatus(code, field, value) {
    try {
        console.log(`💾 Оновлення ${field} для ${code}: ${value}`);

        // Знаходимо товар в state
        const item = priceState.priceItems.find(i => i.code === code);
        if (!item) {
            throw new Error(`Товар з кодом ${code} не знайдено`);
        }

        // Визначаємо колонку для оновлення
        const columnMap = {
            'status': 'J',      // Колонка J = status
            'status_date': 'K', // Колонка K = status_date
            'check': 'L',       // Колонка L = check
            'check_date': 'M',  // Колонка M = check_date
            'payment': 'N',     // Колонка N = payment
            'payment_date': 'O' // Колонка O = payment_date
        };

        const dateField = `${field}_date`;
        const columnLetter = columnMap[field];
        const dateColumnLetter = columnMap[dateField];

        if (!columnLetter) {
            throw new Error(`Невідоме поле: ${field}`);
        }

        // Готуємо дані для оновлення
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const updates = [
            {
                range: `${PRICE_SHEET_NAME}!${columnLetter}${item._rowIndex}`,
                values: [[value]]
            }
        ];

        // Додаємо дату якщо value = TRUE
        if (value === 'TRUE' && dateColumnLetter) {
            updates.push({
                range: `${PRICE_SHEET_NAME}!${dateColumnLetter}${item._rowIndex}`,
                values: [[currentDate]]
            });
        }

        // Batch update
        await callSheetsAPI('batchUpdate', {
            data: updates,
            spreadsheetType: 'price'
        });

        // Оновлюємо локальний state
        item[field] = value;
        if (value === 'TRUE') {
            item[dateField] = currentDate;
        }

        console.log(`✅ ${field} оновлено для ${code}`);

        return { success: true };

    } catch (error) {
        console.error('❌ Помилка оновлення статусу:', error);
        throw error;
    }
}

/**
 * Оновити артикул товару
 * @param {string} code - Унікальний код товару
 * @param {string} article - Новий артикул
 */
export async function updateItemArticle(code, article) {
    try {
        console.log(`💾 Оновлення артикулу для ${code}: ${article}`);

        const item = priceState.priceItems.find(i => i.code === code);
        if (!item) {
            throw new Error(`Товар з кодом ${code} не знайдено`);
        }

        // Артикул в колонці B
        await callSheetsAPI('update', {
            range: `${PRICE_SHEET_NAME}!B${item._rowIndex}`,
            values: [[article]],
            spreadsheetType: 'price'
        });

        // Оновлюємо локальний state
        item.article = article;

        console.log(`✅ Артикул оновлено для ${code}`);

    } catch (error) {
        console.error('❌ Помилка оновлення артикулу:', error);
        throw error;
    }
}

/**
 * Зарезервувати товар
 * @param {string} code - Унікальний код товару
 * @param {string} reserveName - Ім'я користувача (display_name)
 */
export async function reserveItem(code, reserveName) {
    try {
        console.log(`💾 Резервування ${code} для ${reserveName}`);

        const item = priceState.priceItems.find(i => i.code === code);
        if (!item) {
            throw new Error(`Товар з кодом ${code} не знайдено`);
        }

        // Reserve в колонці I
        await callSheetsAPI('update', {
            range: `${PRICE_SHEET_NAME}!I${item._rowIndex}`,
            values: [[reserveName]],
            spreadsheetType: 'price'
        });

        // Оновлюємо локальний state
        item.reserve = reserveName;

        // Додаємо в список резервів якщо новий
        if (!priceState.reserveNames.includes(reserveName)) {
            priceState.reserveNames.push(reserveName);
            priceState.reserveNames.sort();
        }

        console.log(`✅ Товар ${code} зарезервовано для ${reserveName}`);

    } catch (error) {
        console.error('❌ Помилка резервування:', error);
        throw error;
    }
}

/**
 * Імпортувати дані з XLSX у Google Sheets
 * @param {Array} data - Масив об'єктів з даними
 */
export async function importDataToSheet(data) {
    try {
        console.log(`📤 Імпорт ${data.length} рядків у Google Sheets...`);

        // Конвертуємо об'єкти в масив масивів
        const values = data.map(item => [
            item.code || '',
            item.article || '',
            item.brand || '',
            item.category || '',
            item.name || '',
            item.packaging || '',
            item.flavor || '',
            item.shiping_date || '',
            item.reserve || '',
            item.status || 'FALSE',
            item.status_date || '',
            item.check || 'FALSE',
            item.check_date || '',
            item.payment || 'FALSE',
            item.payment_date || '',
            new Date().toISOString().split('T')[0] // update_date
        ]);

        // Додаємо заголовки як перший рядок
        const headers = [
            'code', 'article', 'brand', 'category', 'name', 'packaging',
            'flavor', 'shiping_date', 'reserve', 'status', 'status_date',
            'check', 'check_date', 'payment', 'payment_date', 'update_date'
        ];

        // Очищаємо існуючі дані (починаючи з рядка 7)
        // та записуємо нові
        const allValues = [headers, ...values];

        await callSheetsAPI('update', {
            range: `${PRICE_SHEET_NAME}!A${PRICE_START_ROW}`,
            values: allValues,
            spreadsheetType: 'price'
        });

        console.log(`✅ Імпортовано ${data.length} рядків`);

        // Перезавантажуємо дані
        await loadPriceData();

    } catch (error) {
        console.error('❌ Помилка імпорту:', error);
        throw error;
    }
}

/**
 * Отримати відфільтровані дані за резервом
 * @param {string} reserveFilter - Фільтр резерву ('all' або ім'я)
 */
export function filterByReserve(reserveFilter) {
    priceState.currentReserveFilter = reserveFilter;

    if (reserveFilter === 'all') {
        priceState.filteredItems = [...priceState.priceItems];
    } else {
        priceState.filteredItems = priceState.priceItems.filter(
            item => item.reserve === reserveFilter
        );
    }

    return priceState.filteredItems;
}

// Експорт для window
window.loadPriceData = loadPriceData;
