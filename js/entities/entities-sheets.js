// js/entities/entities-sheets.js
// Управління аркушами маркетплейсів в Google Sheets

import { getSheetMetadata } from './entities-data.js';
import { MAIN_SPREADSHEET_ID as SPREADSHEET_ID } from '../config/spreadsheet-config.js';

/**
 * Створити 3 аркуші для маркетплейсу
 * @param {string} marketplaceId - ID маркетплейсу (напр. 'rozetka')
 * @param {Object} columnsConfig - Конфігурація колонок
 * @param {Array<string>} columnsConfig.categories - Назви колонок для Categories
 * @param {Array<string>} columnsConfig.characteristics - Назви колонок для Characteristics
 * @param {Array<string>} columnsConfig.options - Назви колонок для Options
 */
export async function createMarketplaceSheets(marketplaceId, columnsConfig) {
    console.log(`📝 Створюємо аркуші для маркетплейсу: ${marketplaceId}`);

    try {
        const sheetNames = [
            `MP_${marketplaceId}_Categories`,
            `MP_${marketplaceId}_Characteristics`,
            `MP_${marketplaceId}_Options`
        ];

        const requests = [];

        // 1. Створити 3 аркуші
        sheetNames.forEach((sheetName, index) => {
            requests.push({
                addSheet: {
                    properties: {
                        title: sheetName,
                        gridProperties: {
                            rowCount: 1000,
                            columnCount: 20,
                            frozenRowCount: 1 // Заморозити заголовок
                        },
                        tabColor: {
                            red: 0.5,
                            green: 0.7,
                            blue: 1.0
                        }
                    }
                }
            });
        });

        // Виконати створення аркушів
        const response = await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: { requests }
        });

        console.log('✅ Аркуші створені:', sheetNames);

        // 2. Додати заголовки в кожен аркуш
        const headerRequests = [];

        // Categories headers (без додаткового local_id, вже є в columnsConfig)
        const categoriesHeaders = columnsConfig.categories || [];
        headerRequests.push({
            range: `${sheetNames[0]}!A1`,
            values: [categoriesHeaders]
        });

        // Characteristics headers
        const characteristicsHeaders = columnsConfig.characteristics || [];
        headerRequests.push({
            range: `${sheetNames[1]}!A1`,
            values: [characteristicsHeaders]
        });

        // Options headers
        const optionsHeaders = columnsConfig.options || [];
        headerRequests.push({
            range: `${sheetNames[2]}!A1`,
            values: [optionsHeaders]
        });

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: headerRequests
            }
        });

        console.log('✅ Заголовки додані');

        // 3. Форматування: зробити колонку local_id bold + захистити від редагування
        await formatMarketplaceSheets(sheetNames);

        return true;
    } catch (error) {
        console.error('❌ Помилка створення аркушів маркетплейсу:', error);
        throw error;
    }
}

/**
 * Видалити всі аркуші маркетплейсу
 */
export async function deleteMarketplaceSheets(marketplaceId) {
    console.log(`🗑️ Видаляємо аркуші маркетплейсу: ${marketplaceId}`);

    try {
        const sheetNames = [
            `MP_${marketplaceId}_Categories`,
            `MP_${marketplaceId}_Characteristics`,
            `MP_${marketplaceId}_Options`
        ];

        // Отримати метадані для знаходження sheetId
        const metadata = await getSheetMetadata();

        const requests = [];

        sheetNames.forEach(sheetName => {
            const sheet = metadata.sheets.find(s => s.properties.title === sheetName);
            if (sheet) {
                requests.push({
                    deleteSheet: {
                        sheetId: sheet.properties.sheetId
                    }
                });
            }
        });

        if (requests.length === 0) {
            console.log('ℹ️ Аркуші не знайдені');
            return false;
        }

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: { requests }
        });

        console.log(`✅ Видалено ${requests.length} аркушів`);
        return true;
    } catch (error) {
        console.error('❌ Помилка видалення аркушів:', error);
        throw error;
    }
}

/**
 * Додати колонку в аркуш маркетплейсу
 */
export async function addColumnToMarketplaceSheet(sheetName, columnName) {
    console.log(`➕ Додаємо колонку "${columnName}" в ${sheetName}`);

    try {
        // Отримати поточні заголовки
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!1:1`
        });

        const headers = response.result.values[0] || [];
        headers.push(columnName);

        // Оновити заголовки
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!1:1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [headers]
            }
        });

        console.log(`✅ Колонку додано`);
        return true;
    } catch (error) {
        console.error('❌ Помилка додавання колонки:', error);
        throw error;
    }
}

/**
 * Видалити колонку з аркуша маркетплейсу (за індексом)
 */
export async function removeColumnFromMarketplaceSheet(sheetName, columnIndex) {
    console.log(`➖ Видаляємо колонку ${columnIndex} з ${sheetName}`);

    try {
        // Отримати sheetId
        const metadata = await getSheetMetadata();
        const sheet = metadata.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) throw new Error(`Sheet ${sheetName} not found`);

        const sheetId = sheet.properties.sheetId;

        // Видалити колонку
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'COLUMNS',
                            startIndex: columnIndex,
                            endIndex: columnIndex + 1
                        }
                    }
                }]
            }
        });

        console.log(`✅ Колонку видалено`);
        return true;
    } catch (error) {
        console.error('❌ Помилка видалення колонки:', error);
        throw error;
    }
}

/**
 * Перейменувати аркуш
 */
export async function renameSheet(oldName, newName) {
    console.log(`✏️ Перейменовуємо аркуш: ${oldName} → ${newName}`);

    try {
        const metadata = await getSheetMetadata();
        const sheet = metadata.sheets.find(s => s.properties.title === oldName);
        if (!sheet) throw new Error(`Sheet ${oldName} not found`);

        const sheetId = sheet.properties.sheetId;

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            sheetId: sheetId,
                            title: newName
                        },
                        fields: 'title'
                    }
                }]
            }
        });

        console.log(`✅ Аркуш перейменовано`);
        return true;
    } catch (error) {
        console.error('❌ Помилка перейменування аркуша:', error);
        throw error;
    }
}

/**
 * Форматувати аркуші маркетплейсу (bold header, freeze first row)
 */
async function formatMarketplaceSheets(sheetNames) {
    const metadata = await getSheetMetadata();
    const requests = [];

    sheetNames.forEach(sheetName => {
        const sheet = metadata.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) return;

        const sheetId = sheet.properties.sheetId;

        // Bold для першого рядка (заголовків)
        requests.push({
            repeatCell: {
                range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1
                },
                cell: {
                    userEnteredFormat: {
                        textFormat: {
                            bold: true
                        },
                        backgroundColor: {
                            red: 0.9,
                            green: 0.9,
                            blue: 0.9
                        }
                    }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
        });
    });

    if (requests.length > 0) {
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: { requests }
        });
    }
}

/**
 * Отримати список всіх аркушів маркетплейсів
 */
export async function getMarketplaceSheets() {
    const metadata = await getSheetMetadata();
    const marketplaceSheets = metadata.sheets
        .map(s => s.properties.title)
        .filter(name => name.startsWith('MP_'));

    return marketplaceSheets;
}
