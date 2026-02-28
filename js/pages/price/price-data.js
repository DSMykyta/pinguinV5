// js/pages/price/price-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - DATA MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для прайсу/чекліста.
 * Використовує уніфікований api-client для всіх операцій.
 */

import { priceState } from './price-state.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import { PRICE_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';
import { formatDate } from '../../utils/common-utils.js';

const PRICE_SHEET_NAME = 'Price';
const PRICE_START_ROW = 1; // Рядок 1 = заголовки, рядок 2+ = дані

// Кеш для індексів колонок (заповнюється при першому завантаженні)
let columnIndices = null;

/**
 * Конвертувати індекс колонки в букву (0=A, 1=B, ...)
 */
function columnIndexToLetter(index) {
    let letter = '';
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}

/**
 * Завантажити дані прайсу з Google Sheets
 * Динамічно визначає колонки по заголовках
 */
export async function loadPriceData() {
    try {

        // Завантажуємо всі дані починаючи з рядка 7
        const result = await callSheetsAPI('get', {
            range: `${PRICE_SHEET_NAME}!A${PRICE_START_ROW}:Z`,
            spreadsheetType: 'price'
        });

        const rows = result || [];

        if (rows.length === 0) {
            console.warn('⚠️ Прайс порожній, використовуємо стандартний порядок колонок');
            // Стандартний порядок колонок якщо таблиця порожня
            columnIndices = {
                'code': 0, 'article': 1, 'brand': 2, 'category': 3,
                'name': 4, 'packaging': 5, 'flavor': 6, 'shiping_date': 7,
                'reserve': 8, 'status': 9, 'status_date': 10, 'check': 11,
                'check_date': 12, 'payment': 13, 'payment_date': 14, 'update_date': 15
            };
            priceState.priceItems = [];
            priceState.reserveNames = [];
            return;
        }

        // Перший рядок - заголовки
        const headers = rows[0];

        // Створюємо мапу індексів колонок
        columnIndices = {};
        headers.forEach((header, index) => {
            if (header) {
                columnIndices[header.toLowerCase()] = index;
            }
        });

        // Парсимо дані
        const data = [];
        const reserveSet = new Set();

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            // Динамічно отримуємо значення по назві колонки
            const getValue = (colName) => {
                const idx = columnIndices[colName.toLowerCase()];
                return idx !== undefined ? (row[idx] || '') : '';
            };

            const code = getValue('code').toString().trim();
            if (!code) continue; // Пропускаємо порожні рядки

            const item = {
                code: code,
                article: getValue('article'),
                brand: getValue('brand'),
                category: getValue('category'),
                name: getValue('name'),
                packaging: getValue('packaging'),
                flavor: getValue('flavor'),
                shiping_date: getValue('shiping_date'),
                reserve: getValue('reserve'),
                status: getValue('status') || 'FALSE',
                status_date: getValue('status_date'),
                check: getValue('check') || 'FALSE',
                check_date: getValue('check_date'),
                payment: getValue('payment') || 'FALSE',
                payment_date: getValue('payment_date'),
                update_date: getValue('update_date'),
                _rowIndex: PRICE_START_ROW + i
            };

            // Збираємо унікальні резерви
            if (item.reserve && item.reserve.trim() !== '') {
                reserveSet.add(item.reserve.trim());
            }

            data.push(item);
        }

        priceState.priceItems = data;
        priceState.filteredItems = [...data];
        priceState.reserveNames = Array.from(reserveSet).sort();


    } catch (error) {
        console.error('❌ Помилка завантаження прайсу:', error);
        throw error;
    }
}

/**
 * Отримати букву колонки по назві
 */
export function getColumnLetter(columnName) {
    if (!columnIndices) return null;
    const idx = columnIndices[columnName.toLowerCase()];
    return idx !== undefined ? columnIndexToLetter(idx) : null;
}

/**
 * Оновити статус товару (status/check/payment)
 * @param {string} code - Унікальний код товару
 * @param {string} field - Поле для оновлення (status/check/payment)
 * @param {string} value - Нове значення (TRUE/FALSE)
 */
export async function updateItemStatus(code, field, value) {
    try {

        // Знаходимо товар в state
        const item = priceState.priceItems.find(i => i.code === code);
        if (!item) {
            throw new Error(`Товар з кодом ${code} не знайдено`);
        }

        // Динамічно визначаємо колонку
        const columnLetter = getColumnLetter(field);
        const dateField = `${field}_date`;
        const dateColumnLetter = getColumnLetter(dateField);

        if (!columnLetter) {
            throw new Error(`Колонка "${field}" не знайдена в таблиці`);
        }

        // Готуємо дані для оновлення
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const updates = [
            {
                range: `${PRICE_SHEET_NAME}!${columnLetter}${item._rowIndex}`,
                values: [[value]]
            }
        ];

        // Додаємо дату якщо value = TRUE і колонка дати існує
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
        if (value === 'TRUE' && dateColumnLetter) {
            item[dateField] = currentDate;
        }


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

        const item = priceState.priceItems.find(i => i.code === code);
        if (!item) {
            throw new Error(`Товар з кодом ${code} не знайдено`);
        }

        // Динамічно визначаємо колонку article
        const columnLetter = getColumnLetter('article');
        if (!columnLetter) {
            throw new Error('Колонка "article" не знайдена в таблиці');
        }

        await callSheetsAPI('update', {
            range: `${PRICE_SHEET_NAME}!${columnLetter}${item._rowIndex}`,
            values: [[article]],
            spreadsheetType: 'price'
        });

        // Оновлюємо локальний state
        item.article = article;


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

        const item = priceState.priceItems.find(i => i.code === code);
        if (!item) {
            throw new Error(`Товар з кодом ${code} не знайдено`);
        }

        // Динамічно визначаємо колонку reserve
        const columnLetter = getColumnLetter('reserve');
        if (!columnLetter) {
            throw new Error('Колонка "reserve" не знайдена в таблиці');
        }

        await callSheetsAPI('update', {
            range: `${PRICE_SHEET_NAME}!${columnLetter}${item._rowIndex}`,
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


    } catch (error) {
        console.error('❌ Помилка резервування:', error);
        throw error;
    }
}

/**
 * Імпортувати дані з XLSX у Google Sheets
 * - Якщо code є в імпорті і в таблиці → оновити поля з XLSX
 * - Якщо code є в імпорті, немає в таблиці → додати новий
 * - Якщо code є в таблиці, немає в імпорті → позначити shiping_date = "ненаявно"
 * @param {Array} importedData - Масив об'єктів з даними з XLSX
 */
export async function importDataToSheet(importedData) {
    try {

        // 1. Завантажити існуючі дані
        await loadPriceData();
        const existingItems = priceState.priceItems;

        // 2. Створити мапи
        const existingMap = new Map();
        existingItems.forEach(item => {
            existingMap.set(item.code, item);
        });

        const importedCodes = new Set(importedData.map(item => item.code));

        // 3. Підготувати оновлення
        const updates = [];      // Існуючі записи, які є в імпорті
        const newItems = [];     // Нові записи
        const unavailable = [];  // Записи, яких немає в імпорті → "ненаявно"

        const currentDate = formatDate(new Date()); // дд.мм.рр

        // Обробка імпортованих даних
        for (const imported of importedData) {
            const existing = existingMap.get(imported.code);

            if (existing) {
                // Оновлюємо тільки поля з XLSX, зберігаємо інші
                // Якщо товар повернувся в імпорт - він більше не "ненаявно"
                const newShipDate = imported.shiping_date ||
                    (existing.shiping_date === 'ненаявно' ? '' : existing.shiping_date);

                const updatedItem = {
                    ...existing,
                    article: imported.article || existing.article,
                    brand: imported.brand || existing.brand,
                    category: imported.category || existing.category,
                    name: imported.name || existing.name,
                    packaging: imported.packaging || existing.packaging,
                    flavor: imported.flavor || existing.flavor,
                    shiping_date: newShipDate,
                    update_date: currentDate
                };
                updates.push(updatedItem);
            } else {
                // Новий запис
                newItems.push({
                    code: imported.code,
                    article: imported.article || '',
                    brand: imported.brand || '',
                    category: imported.category || '',
                    name: imported.name || '',
                    packaging: imported.packaging || '',
                    flavor: imported.flavor || '',
                    shiping_date: imported.shiping_date || '',
                    reserve: '',
                    status: 'FALSE',
                    status_date: '',
                    check: 'FALSE',
                    check_date: '',
                    payment: 'FALSE',
                    payment_date: '',
                    update_date: currentDate
                });
            }
        }

        // Знайти записи, яких немає в імпорті → позначити "ненаявно"
        for (const existing of existingItems) {
            if (!importedCodes.has(existing.code) && existing.shiping_date !== 'ненаявно') {
                unavailable.push({
                    ...existing,
                    shiping_date: 'ненаявно',
                    update_date: currentDate
                });
            }
        }


        // 4. Batch update існуючих записів
        if (updates.length > 0) {
            const batchData = [];
            for (const item of updates) {
                // Оновлюємо тільки змінені колонки (article, brand, category, name, packaging, flavor, shiping_date, update_date)
                const colArticle = getColumnLetter('article');
                const colBrand = getColumnLetter('brand');
                const colCategory = getColumnLetter('category');
                const colName = getColumnLetter('name');
                const colPackaging = getColumnLetter('packaging');
                const colFlavor = getColumnLetter('flavor');
                const colShipDate = getColumnLetter('shiping_date');
                const colUpdateDate = getColumnLetter('update_date');

                if (colArticle) batchData.push({ range: `${PRICE_SHEET_NAME}!${colArticle}${item._rowIndex}`, values: [[item.article]] });
                if (colBrand) batchData.push({ range: `${PRICE_SHEET_NAME}!${colBrand}${item._rowIndex}`, values: [[item.brand]] });
                if (colCategory) batchData.push({ range: `${PRICE_SHEET_NAME}!${colCategory}${item._rowIndex}`, values: [[item.category]] });
                if (colName) batchData.push({ range: `${PRICE_SHEET_NAME}!${colName}${item._rowIndex}`, values: [[item.name]] });
                if (colPackaging) batchData.push({ range: `${PRICE_SHEET_NAME}!${colPackaging}${item._rowIndex}`, values: [[item.packaging]] });
                if (colFlavor) batchData.push({ range: `${PRICE_SHEET_NAME}!${colFlavor}${item._rowIndex}`, values: [[item.flavor]] });
                if (colShipDate) batchData.push({ range: `${PRICE_SHEET_NAME}!${colShipDate}${item._rowIndex}`, values: [[item.shiping_date]] });
                if (colUpdateDate) batchData.push({ range: `${PRICE_SHEET_NAME}!${colUpdateDate}${item._rowIndex}`, values: [[item.update_date]] });
            }

            if (batchData.length > 0) {
                await callSheetsAPI('batchUpdate', {
                    data: batchData,
                    spreadsheetType: 'price'
                });
            }
        }

        // 5. Додати нові записи
        if (newItems.length > 0) {

            // Якщо таблиця була порожня - спочатку додаємо заголовки
            if (existingItems.length === 0) {
                const headers = ['code', 'article', 'brand', 'category', 'name', 'packaging', 'flavor', 'shiping_date', 'reserve', 'status', 'status_date', 'check', 'check_date', 'payment', 'payment_date', 'update_date'];
                await callSheetsAPI('update', {
                    range: `${PRICE_SHEET_NAME}!A${PRICE_START_ROW}`,
                    values: [headers],
                    spreadsheetType: 'price'
                });
            }

            const newRows = newItems.map(item => [
                item.code,
                item.article,
                item.brand,
                item.category,
                item.name,
                item.packaging,
                item.flavor,
                item.shiping_date,
                item.reserve,
                item.status,
                item.status_date,
                item.check,
                item.check_date,
                item.payment,
                item.payment_date,
                item.update_date
            ]);

            await callSheetsAPI('append', {
                range: `${PRICE_SHEET_NAME}!A${PRICE_START_ROW}`,
                values: newRows,
                spreadsheetType: 'price'
            });
        }

        // 6. Позначити "ненаявно" для записів яких немає в імпорті
        if (unavailable.length > 0) {
            const unavailBatch = [];
            const colShipDate = getColumnLetter('shiping_date');
            const colUpdateDate = getColumnLetter('update_date');

            for (const item of unavailable) {
                if (colShipDate) {
                    unavailBatch.push({
                        range: `${PRICE_SHEET_NAME}!${colShipDate}${item._rowIndex}`,
                        values: [['ненаявно']]
                    });
                }
                if (colUpdateDate) {
                    unavailBatch.push({
                        range: `${PRICE_SHEET_NAME}!${colUpdateDate}${item._rowIndex}`,
                        values: [[item.update_date]]
                    });
                }
            }

            if (unavailBatch.length > 0) {
                await callSheetsAPI('batchUpdate', {
                    data: unavailBatch,
                    spreadsheetType: 'price'
                });
            }
        }

        // 7. Перезавантажити дані
        await loadPriceData();

        return {
            updated: updates.length,
            added: newItems.length,
            unavailable: unavailable.length
        };

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
    // Default to 'all' if not specified
    reserveFilter = reserveFilter || 'all';
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

/**
 * Оновити кілька полів товару одночасно
 * @param {string} code - Унікальний код товару
 * @param {Object} fields - Об'єкт з полями для оновлення {fieldName: value}
 */
export async function updateItemFields(code, fields) {
    try {

        const item = priceState.priceItems.find(i => i.code === code);
        if (!item) {
            throw new Error(`Товар з кодом ${code} не знайдено`);
        }

        const batchData = [];
        const currentDate = formatDate(new Date());

        for (const [fieldName, value] of Object.entries(fields)) {
            const columnLetter = getColumnLetter(fieldName);
            if (columnLetter) {
                batchData.push({
                    range: `${PRICE_SHEET_NAME}!${columnLetter}${item._rowIndex}`,
                    values: [[value]]
                });
                // Оновлюємо локальний state
                item[fieldName] = value;
            }
        }

        // Додаємо update_date
        const updateDateCol = getColumnLetter('update_date');
        if (updateDateCol) {
            batchData.push({
                range: `${PRICE_SHEET_NAME}!${updateDateCol}${item._rowIndex}`,
                values: [[currentDate]]
            });
            item.update_date = currentDate;
        }

        if (batchData.length > 0) {
            await callSheetsAPI('batchUpdate', {
                data: batchData,
                spreadsheetType: 'price'
            });
        }


    } catch (error) {
        console.error('❌ Помилка оновлення полів:', error);
        throw error;
    }
}

/**
 * Завантажити дані користувачів для аватарів
 * @returns {Object} Мапа display_name -> avatar
 */
export async function loadUsersData() {
    try {

        // Пробуємо різні назви аркушів
        const sheetNames = ['Users', 'Sheet1', 'Лист1', 'Аркуш1', 'users'];
        let result = null;
        let foundSheet = null;

        for (const sheetName of sheetNames) {
            try {
                result = await callSheetsAPI('get', {
                    range: `${sheetName}!A1:H`,
                    spreadsheetType: 'users'
                });
                if (result && result.length > 0) {
                    foundSheet = sheetName;
                    break;
                }
            } catch (e) {
            }
        }

        if (!foundSheet) {
            console.error('❌ Жоден аркуш не знайдено в таблиці users!');
            return {};
        }


        const rows = result || [];
        if (rows.length <= 1) {
            console.warn('⚠️ Таблиця користувачів порожня');
            return {};
        }

        // Перший рядок - заголовки (trim для видалення пробілів!)
        const headers = rows[0];
        const displayNameIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'display_name');
        const avatarIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'avatar');

        if (displayNameIdx === -1 || avatarIdx === -1) {
            console.warn('⚠️ Не знайдено колонки display_name або avatar');
            return {};
        }

        const usersMap = {};
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const displayName = row[displayNameIdx]?.trim();
            const avatar = row[avatarIdx]?.trim();

            if (displayName && avatar) {
                // Зберігаємо з оригінальним ключем та lowercase для пошуку
                usersMap[displayName] = avatar;
                usersMap[displayName.toLowerCase()] = avatar;
            }
        }

        priceState.usersMap = usersMap;

        return usersMap;

    } catch (error) {
        console.error('❌ Помилка завантаження користувачів:', error);
        return {};
    }
}

// Експорт для window
window.loadPriceData = loadPriceData;
