// js/banned-words/banned-words-data.js
// Робота з даними Google Sheets - НОВА ВЕРСІЯ (вибіркове завантаження)

import { bannedWordsState } from './banned-words-init.js';
import { checkTextForBannedWords as checkText, getTextFragment as getFragment } from '../utils/text-utils.js';

// Re-export text utilities for backward compatibility
export { checkText as checkTextForBannedWords, getFragment as getTextFragment };

// ID таблиць
export const TEXTS_SPREADSHEET_ID = '1qQ2ob8zsgSfE1G64SorpdbW0xYLOdPfw_cbAH23xUhM';
export const BANNED_SPREADSHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
const BANNED_SHEET_NAME = 'Banned';
const BANNED_SHEET_GID = '1742878044'; // GID для аркуша Banned

/**
 * Завантажити ТІЛЬКИ заборонені слова з таблиці Banned через CSV export
 */
export async function loadBannedWords() {
    try {
        console.log('📥 Завантаження заборонених слів...');

        const csvUrl = `https://docs.google.com/spreadsheets/d/${BANNED_SPREADSHEET_ID}/export?format=csv&gid=${BANNED_SHEET_GID}`;
        const response = await fetch(csvUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();

        // Перевіряємо чи завантажено PapaParse
        if (typeof Papa === 'undefined') {
            throw new Error('PapaParse library is not loaded');
        }

        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const rows = parsedData.data;

        if (!rows || rows.length === 0) {
            console.warn('⚠️ Таблиця Banned порожня');
            bannedWordsState.bannedWords = [];
            return;
        }

        console.log('📋 Перший рядок даних:', rows[0]);

        // Отримати заголовки та знайти індекс колонки cheaked_line
        const headers = parsedData.meta.fields || [];
        const cheakedIndex = headers.findIndex(h => h === 'cheaked_line');

        if (cheakedIndex !== -1) {
            const checkedCol = columnIndexToLetter(cheakedIndex);
            if (!bannedWordsState.sheetCheckedColumns) {
                bannedWordsState.sheetCheckedColumns = {};
            }
            bannedWordsState.sheetCheckedColumns['Banned'] = checkedCol;
            console.log(`💾 Збережено колонку cheaked_line для "Banned": ${checkedCol} (індекс ${cheakedIndex})`);
        } else {
            console.warn('⚠️ Колонка cheaked_line не знайдена в таблиці Banned');
        }

        const data = rows.map((row, index) => {
            // NEW: Додати розпарсені масиви слів
            const obj = {
                ...row,
                name_uk_array: (row.name_uk || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
                name_ru_array: (row.name_ru || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
            };

            // Додати severity якщо відсутній (за замовчуванням high)
            if (!obj.severity || !['low', 'medium', 'high'].includes(obj.severity.toLowerCase())) {
                obj.severity = 'high';
            } else {
                obj.severity = obj.severity.toLowerCase();
            }

            // Додати _rowIndex (рядок 2 = індекс 0 в data, +1 для заголовка)
            obj._rowIndex = index + 2;

            return obj;
        });

        // Фільтруємо порожні рядки
        bannedWordsState.bannedWords = data.filter(item =>
            (item.group_name_ua && item.group_name_ua.trim() !== '')
        );

        console.log(`✅ Завантажено ${bannedWordsState.bannedWords.length} заборонених слів`);

    } catch (error) {
        console.error('❌ Помилка завантаження Banned:', error);
        throw error;
    }
}

/**
 * Helper функція для виклику backend API з авторизацією
 */
async function callSheetsAPI(action, params = {}) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        throw new Error('Authorization required. Please login first.');
    }

    const response = await fetch(`${window.location.origin}/api/sheets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, ...params })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Отримати список назв аркушів з таблиці текстів
 */
export async function loadSheetNames() {
    try {
        console.log('📥 Завантаження списку аркушів...');

        const result = await callSheetsAPI('getSheetNames', { spreadsheetType: 'texts' });
        // Backend повертає [{title, sheetId, index}], витягуємо тільки title
        bannedWordsState.sheetNames = (result || []).map(sheet => sheet.title);

        console.log(`✅ Знайдено ${bannedWordsState.sheetNames.length} аркушів:`, bannedWordsState.sheetNames);

    } catch (error) {
        console.error('❌ Помилка отримання списку аркушів:', error);
        throw error;
    }
}

/**
 * Завантажити ТІЛЬКИ вибрану колонку з аркуша + ID
 * @param {string} sheetName - Назва аркуша
 * @param {string} columnName - Назва колонки (напр. 'short_descriptionUkr')
 * @returns {Array} - Масив об'єктів {id, columnValue, _rowIndex}
 */
export async function loadSheetColumn(sheetName, columnName) {
    try {
        console.log(`📥 Завантаження колонки "${columnName}" з аркуша "${sheetName}"...`);

        // Спочатку отримуємо заголовки для знаходження індексу потрібної колонки
        const headerResult = await callSheetsAPI('get', {
            range: `${sheetName}!1:1`,
            spreadsheetType: 'texts'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        const headers = Array.isArray(headerResult) && headerResult.length > 0 ? headerResult[0] : [];
        console.log('📋 Заголовки:', headers);

        // Знайти індекс ID та потрібної колонки
        const idIndex = headers.findIndex(h => h.toLowerCase() === 'id' || h.toLowerCase() === 'product_id');
        const columnIndex = headers.findIndex(h => h === columnName);

        if (idIndex === -1) {
            throw new Error('Колонка ID не знайдена в таблиці');
        }

        if (columnIndex === -1) {
            throw new Error(`Колонка "${columnName}" не знайдена в таблиці`);
        }

        console.log(`🔍 ID у колонці ${String.fromCharCode(65 + idIndex)} (індекс ${idIndex})`);
        console.log(`🔍 ${columnName} у колонці ${String.fromCharCode(65 + columnIndex)} (індекс ${columnIndex})`);

        // Конвертуємо індекси в букви колонок (A, B, C, ...)
        const idColumnLetter = columnIndexToLetter(idIndex);
        const targetColumnLetter = columnIndexToLetter(columnIndex);

        // Завантажити тільки ці дві колонки
        const range = `${sheetName}!${idColumnLetter}:${idColumnLetter},${targetColumnLetter}:${targetColumnLetter}`;
        console.log(`📥 Завантажуємо діапазон: ${range}`);

        const dataResult = await callSheetsAPI('get', {
            range: range,
            spreadsheetType: 'texts'
        });

        // Backend повертає масив напряму
        const values = dataResult;
        if (!values || values.length === 0) {
            console.warn('⚠️ Дані не знайдено');
            return [];
        }

        // Парсимо дані: перший рядок - заголовки, пропускаємо
        const data = [];
        for (let i = 1; i < values.length; i++) {
            const row = values[i];
            if (!row || row.length === 0) continue;

            const id = row[0]; // Перша колонка - ID
            const columnValue = row[1]; // Друга колонка - потрібне значення

            if (id && String(id).trim() !== '') {
                data.push({
                    id: id,
                    columnValue: columnValue || '',
                    _rowIndex: i + 1 // Номер рядка в таблиці (для оновлення статусу)
                });
            }
        }

        console.log(`✅ Завантажено ${data.length} рядків`);

        return data;

    } catch (error) {
        console.error('❌ Помилка завантаження колонки:', error);
        throw error;
    }
}

/**
 * Завантажити дані для перевірки: id, title, cheaked_line та вибрану колонку
 * @param {string} sheetName - Назва аркуша
 * @param {string} targetColumn - Колонка для перевірки (наприклад, "descriptionUkr")
 * @returns {Promise<Array>} Масив об'єктів з даними рядків
 */
export async function loadSheetDataForCheck(sheetName, targetColumn) {
    const startTime = performance.now();
    try {
        console.log(`📥 Завантаження даних для перевірки з аркуша "${sheetName}"...`);

        // Отримуємо заголовки через backend API
        const headerResult = await callSheetsAPI('get', {
            range: `${sheetName}!1:1`,
            spreadsheetType: 'texts'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        const headers = Array.isArray(headerResult) && headerResult.length > 0 ? headerResult[0] : [];
        console.log('📋 Заголовки:', headers);

        // Знайти індекси потрібних колонок
        const idIndex = headers.findIndex(h => h.toLowerCase() === 'id' || h.toLowerCase() === 'product_id');
        const titleIndex = headers.findIndex(h => h.toLowerCase().includes('title'));
        const cheakedIndex = headers.findIndex(h => h === 'cheaked_line');
        const targetIndex = headers.findIndex(h => h === targetColumn);

        if (idIndex === -1) throw new Error('Колонка ID не знайдена');
        if (cheakedIndex === -1) throw new Error('Колонка cheaked_line не знайдена');
        if (targetIndex === -1) throw new Error(`Колонка "${targetColumn}" не знайдена`);

        const hasTitle = titleIndex !== -1;
        const titleColumnName = hasTitle ? headers[titleIndex] : null;

        if (hasTitle) {
            console.log(`🔍 Знайдено колонки: id=${idIndex}, title=${titleIndex} (${titleColumnName}), cheaked_line=${cheakedIndex}, ${targetColumn}=${targetIndex}`);
        } else {
            console.log(`🔍 Знайдено колонки: id=${idIndex}, title=НЕМАЄ (буде ID+фрагмент), cheaked_line=${cheakedIndex}, ${targetColumn}=${targetIndex}`);
        }

        // Завантажити потрібні колонки через batchGet
        const idCol = columnIndexToLetter(idIndex);
        const targetCol = columnIndexToLetter(targetIndex);
        const checkedCol = columnIndexToLetter(cheakedIndex);

        // Зберегти літеру колонки cheaked_line для batch операцій
        if (!bannedWordsState.sheetCheckedColumns) {
            bannedWordsState.sheetCheckedColumns = {};
        }
        bannedWordsState.sheetCheckedColumns[sheetName] = checkedCol;
        console.log(`💾 Збережено колонку cheaked_line для "${sheetName}": ${checkedCol}`);

        const ranges = [
            `${sheetName}!${idCol}2:${idCol}`,
            `${sheetName}!${targetCol}2:${targetCol}`,
            `${sheetName}!${checkedCol}2:${checkedCol}`
        ];

        // Додати title колонку тільки якщо вона існує
        if (hasTitle) {
            const titleCol = columnIndexToLetter(titleIndex);
            ranges.splice(1, 0, `${sheetName}!${titleCol}2:${titleCol}`);
            console.log(`⏳ Завантаження 4 колонок: ${idCol}, ${titleCol}, ${targetCol}, ${checkedCol}...`);
        } else {
            console.log(`⏳ Завантаження 3 колонок: ${idCol}, ${targetCol}, ${checkedCol}...`);
        }

        const dataResult = await callSheetsAPI('batchGet', {
            ranges: ranges,
            spreadsheetType: 'texts'
        });
        console.log(`✅ Дані отримано з API`);

        // Backend повертає масив valueRanges напряму
        const valueRanges = dataResult;
        const expectedCount = hasTitle ? 4 : 3;
        if (!valueRanges || valueRanges.length !== expectedCount) {
            console.warn('⚠️ Не всі колонки завантажено');
            return [];
        }

        let idColumnData, titleColumnData, targetColumnData, checkedColumnData;

        if (hasTitle) {
            idColumnData = valueRanges[0].values || [];
            titleColumnData = valueRanges[1].values || [];
            targetColumnData = valueRanges[2].values || [];
            checkedColumnData = valueRanges[3].values || [];
        } else {
            idColumnData = valueRanges[0].values || [];
            titleColumnData = null;
            targetColumnData = valueRanges[1].values || [];
            checkedColumnData = valueRanges[2].values || [];
        }

        const rowCount = Math.max(
            idColumnData.length,
            titleColumnData ? titleColumnData.length : 0,
            targetColumnData.length,
            checkedColumnData.length
        );
        console.log(`🔄 Обробка ${rowCount} рядків...`);

        // Парсимо дані
        const data = [];
        for (let i = 0; i < rowCount; i++) {
            const id = idColumnData[i] ? idColumnData[i][0] : '';
            if (!id || String(id).trim() === '') continue;

            // Отримати title або згенерувати з ID + фрагмент тексту
            let title;
            if (titleColumnData && titleColumnData[i]) {
                title = titleColumnData[i][0] || '';
            } else {
                // Немає колонки Title - використати ID + фрагмент тексту
                const targetValue = targetColumnData[i] ? (targetColumnData[i][0] || '') : '';
                const fragment = targetValue.substring(0, 50);
                title = `${id}: ${fragment}${fragment.length === 50 ? '...' : ''}`;
            }

            data.push({
                id: String(id).trim(),
                title: title,
                cheaked_line: checkedColumnData[i] ? (checkedColumnData[i][0] || 'FALSE') : 'FALSE',
                targetValue: targetColumnData[i] ? (targetColumnData[i][0] || '') : '',
                _rowIndex: i + 2 // Номер рядка в таблиці (+2 бо рядок 1 = заголовки, індекс з 0)
            });
        }

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`✅ Завантажено ${data.length} рядків для перевірки за ${duration}с`);
        return data;

    } catch (error) {
        // Не логуємо помилки "колонка не знайдена" - це очікувана ситуація при перевірці всіх комбінацій
        if (!error.message?.includes('не знайдена')) {
            console.error('❌ Помилка завантаження даних для перевірки:', error);
        }
        throw error;
    }
}

/**
 * Конвертувати індекс колонки (0, 1, 2...) в букву (A, B, C...)
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
 * Зберегти/оновити заборонене слово в Google Sheets
 * @param {Object} wordData - Дані слова
 * @param {boolean} isEdit - Чи це редагування існуючого слова
 */
export async function saveBannedWord(wordData, isEdit) {
    try {
        console.log(`💾 ${isEdit ? 'Оновлення' : 'Створення'} заборонного слова:`, wordData);

        // Цей масив 'values' тепер точно відповідає вашій структурі з 9 колонок:
        // [local_id, group_name_ua, name_uk, name_ru, banned_type, banned_explaine, banned_hint, severity, cheaked_line]
        const values = [[
            wordData.local_id || '',          // 1. local_id
            wordData.group_name_ua || '',     // 2. group_name_ua
            wordData.name_uk || '',           // 3. name_uk
            wordData.name_ru || '',           // 4. name_ru
            wordData.banned_type || '',       // 5. banned_type
            wordData.banned_explaine || '',   // 6. banned_explaine
            wordData.banned_hint || '',       // 7. banned_hint
            wordData.severity || 'high',      // 8. severity
            wordData.cheaked_line || 'FALSE'  // 9. cheaked_line
        ]];

        if (isEdit) {
            // Знайти рядок для оновлення через backend API
            const result = await callSheetsAPI('get', {
                range: `${BANNED_SHEET_NAME}!A:A`,
                spreadsheetType: 'banned'
            });

            // Backend повертає масив напряму
            const ids = result || [];
            const rowIndex = ids.findIndex(row => row[0] === wordData.local_id) + 1;

            if (rowIndex === 0) {
                throw new Error('Заборонене слово не знайдено в таблиці');
            }

            const targetRowIndex = wordData._rowIndex ? wordData._rowIndex : rowIndex;
            const updateRange = `${BANNED_SHEET_NAME}!A${targetRowIndex}:I${targetRowIndex}`;

            await callSheetsAPI('update', {
                range: updateRange,
                values: values,
                spreadsheetType: 'banned'
            });

            console.log('✅ Заборонене слово оновлено в рядку:', targetRowIndex);

        } else {
            // Додати новий рядок
            await callSheetsAPI('append', {
                range: `${BANNED_SHEET_NAME}!A:I`,
                values: values,
                spreadsheetType: 'banned'
            });

            console.log('✅ Заборонене слово додано');
        }

    } catch (error) {
        console.error('❌ Помилка збереження:', error);
        throw error;
    }
}

/**
 * Оновити статус перевірки для продукту в Google Sheets
 * @param {string} sheetName - Назва аркуша
 * @param {string} productId - ID продукту
 * @param {string} columnName - Назва колонки (для знаходження рядка)
 * @param {string} status - Новий статус ('TRUE' або 'FALSE')
 */
export async function updateProductStatus(sheetName, productId, columnName, status) {
    try {
        console.log(`💾 Оновлення статусу для ${productId} в "${sheetName}"...`);

        // Знайти рядок продукту через backend API
        const idResult = await callSheetsAPI('get', {
            range: `${sheetName}!A:A`,
            spreadsheetType: 'texts'
        });

        // Backend повертає масив напряму
        const ids = idResult || [];
        const rowIndex = ids.findIndex(row => row[0] === productId);

        if (rowIndex === -1) {
            throw new Error(`Продукт ${productId} не знайдено в аркуші "${sheetName}"`);
        }

        // Отримати заголовки для знаходження колонки статусу
        const headerResult = await callSheetsAPI('get', {
            range: `${sheetName}!1:1`,
            spreadsheetType: 'texts'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        const headers = Array.isArray(headerResult) && headerResult.length > 0 ? headerResult[0] : [];

        // Знайти колонку статусу
        const statusColumnIndex = headers.findIndex(h =>
            h.toLowerCase() === 'status' ||
            h.toLowerCase() === 'cheaked_line' ||
            h.toLowerCase() === 'checked'
        );

        if (statusColumnIndex === -1) {
            throw new Error('Колонка статусу не знайдена в таблиці');
        }

        const statusColumnLetter = columnIndexToLetter(statusColumnIndex);
        const updateRange = `${sheetName}!${statusColumnLetter}${rowIndex + 1}`;

        await callSheetsAPI('update', {
            range: updateRange,
            values: [[status]],
            spreadsheetType: 'texts'
        });

        console.log(`✅ Статус оновлено для ${productId}: ${status}`);

    } catch (error) {
        console.error('❌ Помилка оновлення статусу:', error);
        throw error;
    }
}

// checkTextForBannedWords and getTextFragment moved to utils/text-utils.js and re-exported above

/**
 * Отримати заголовки аркуша (для динамічного завантаження полів)
 * @param {string} sheetName - Назва аркуша
 * @returns {Array<string>} - Масив назв колонок
 */
export async function getSheetHeaders(sheetName) {
    try {
        console.log(`📥 Завантаження заголовків аркуша "${sheetName}"...`);

        const result = await callSheetsAPI('get', {
            range: `${sheetName}!1:1`,
            spreadsheetType: 'texts'
        });

        // Backend повертає масив напряму
        const headers = Array.isArray(result) && result.length > 0 ? result[0] : [];

        console.log(`✅ Знайдено ${headers.length} колонок в аркуші "${sheetName}"`);

        return headers;
    } catch (error) {
        console.error(`❌ Помилка завантаження заголовків аркуша "${sheetName}":`, error);
        throw error;
    }
}

/**
 * Завантажити повні дані товару для модального вікна
 * @param {string} sheetName - Назва аркуша
 * @param {number} rowIndex - Індекс рядка (1-based, як в Google Sheets)
 * @returns {Object} - Об'єкт з повними даними товару
 */
export async function loadProductFullData(sheetName, rowIndex) {
    try {
        console.log(`📥 Завантаження повних даних товару з аркуша "${sheetName}", рядок ${rowIndex}...`);

        // Завантажити заголовки
        const headers = await getSheetHeaders(sheetName);

        // Завантажити рядок з даними
        const result = await callSheetsAPI('get', {
            range: `${sheetName}!${rowIndex}:${rowIndex}`,
            spreadsheetType: 'texts'
        });

        // Backend повертає масив напряму
        const row = Array.isArray(result) && result.length > 0 ? result[0] : [];

        if (!row || row.length === 0) {
            throw new Error(`Рядок ${rowIndex} не знайдено або порожній`);
        }

        // Створити об'єкт з даними
        const productData = {};
        headers.forEach((header, index) => {
            productData[header] = row[index] || '';
        });

        // Додати rowIndex для можливості оновлення
        productData._rowIndex = rowIndex;

        console.log('✅ Повні дані товару завантажені:', productData);

        return productData;

    } catch (error) {
        console.error(`❌ Помилка завантаження повних даних товару:`, error);
        throw error;
    }
}
