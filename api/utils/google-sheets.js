// api/utils/google-sheets.js

// =========================================================================
// GOOGLE SHEETS API УТИЛІТИ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає функції для роботи з Google Sheets API v4.
// Використовує Service Account для авторизації.
//
// ЕКСПОРТОВАНІ ФУНКЦІЇ:
// ┌────────────────────────────┬──────────────────────────────┐
// │ ЧИТАННЯ                    │ ЗАПИС                        │
// ├────────────────────────────┼──────────────────────────────┤
// │ getValues(range)           │ updateValues(range, values)  │
// │ batchGetValues(ranges)     │ appendValues(range, values)  │
// │ getSheetNames()            │ batchUpdate(data)            │
// │                            │ batchUpdateSpreadsheet(req)  │
// └────────────────────────────┴──────────────────────────────┘
//
// КОНФІГУРАЦІЯ (з .env):
// - GOOGLE_SERVICE_ACCOUNT_EMAIL: email Service Account
// - GOOGLE_PRIVATE_KEY: приватний ключ (з \n замінюється на переноси)
// - SPREADSHEET_ID: ID основної таблиці (Banned, Links)
// - SPREADSHEET_ID_TEXTS: ID таблиці текстів товарів
// - SPREADSHEET_ID_USERS: ID закритої таблиці користувачів (Users Database)
//
// ТИПИ ТАБЛИЦЬ (spreadsheetType):
// - 'main': основна таблиця (SPREADSHEET_ID)
// - 'texts': таблиця текстів (SPREADSHEET_ID_TEXTS)
// - 'users': таблиця користувачів (SPREADSHEET_ID_USERS)
// - 'price': таблиця прайсу/чекліста (SPREADSHEET_ID_PRICE)
//
// ФОРМАТИ ДІАПАЗОНІВ:
// - "Sheet1!A1:B10" - конкретний діапазон
// - "Sheet1!A:B" - повні колонки
// - "Sheet1" - весь аркуш
// =========================================================================

const { google } = require('googleapis');

// Environment variables
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPREADSHEET_ID_TEXTS = process.env.SPREADSHEET_ID_TEXTS;
const SPREADSHEET_ID_USERS = process.env.SPREADSHEET_ID_USERS;
const SPREADSHEET_ID_PRICE = process.env.SPREADSHEET_ID_PRICE;

// =========================================================================
// ІНІЦІАЛІЗАЦІЯ КЛІЄНТА
// =========================================================================

/**
 * Створює авторизованого клієнта Google Sheets API
 * @returns {Object} Google Sheets API client
 */
function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Отримує ID таблиці за її типом
 * @param {string} type - Тип таблиці ('main' | 'texts' | 'users' | 'price')
 * @returns {string} ID Google Spreadsheet
 */
function getSpreadsheetId(type = 'main') {
  if (type === 'texts') {
    return SPREADSHEET_ID_TEXTS;
  }
  if (type === 'users') {
    return SPREADSHEET_ID_USERS;
  }
  if (type === 'price') {
    return SPREADSHEET_ID_PRICE;
  }
  return SPREADSHEET_ID;
}

// =========================================================================
// ОПЕРАЦІЇ ЧИТАННЯ
// =========================================================================

/**
 * Читає дані з одного діапазону
 * @param {string} range - Діапазон (формат: "Sheet!A1:B10")
 * @param {string} spreadsheetType - Тип таблиці ('main' | 'texts' | 'users')
 * @returns {Promise<Array>} Масив рядків з даними
 */
async function getValues(range, spreadsheetType = 'main') {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(spreadsheetType);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  } catch (error) {
    console.error('Error getting values:', error);
    throw error;
  }
}

/**
 * Batch отримання даних з кількох діапазонів одночасно
 * @param {Array<string>} ranges - Масив діапазонів
 * @param {string} spreadsheetType - Тип таблиці ('main' | 'texts' | 'users')
 * @returns {Promise<Array>} Масив об'єктів valueRanges
 */
async function batchGetValues(ranges, spreadsheetType = 'main') {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(spreadsheetType);

  try {
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    return response.data.valueRanges || [];
  } catch (error) {
    console.error('Error batch getting values:', error);
    throw error;
  }
}

/**
 * Оновлює дані в діапазоні
 */
async function updateValues(range, values, spreadsheetType = 'main') {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(spreadsheetType);

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating values:', error);
    throw error;
  }
}

/**
 * Додає дані в кінець таблиці
 */
async function appendValues(range, values, spreadsheetType = 'main') {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(spreadsheetType);

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    return response.data;
  } catch (error) {
    console.error('Error appending values:', error);
    throw error;
  }
}

/**
 * Batch оновлення даних
 */
async function batchUpdate(data, spreadsheetType = 'main') {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(spreadsheetType);

  try {
    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        data,
        valueInputOption: 'RAW',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error batch updating:', error);
    throw error;
  }
}

/**
 * Batch оновлення структури (видалення рядків, форматування тощо)
 */
async function batchUpdateSpreadsheet(requests, spreadsheetType = 'main') {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(spreadsheetType);

  try {
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });
    return response.data;
  } catch (error) {
    console.error('Error batch updating spreadsheet:', error);
    throw error;
  }
}

/**
 * Отримує список аркушів
 */
async function getSheetNames(spreadsheetType = 'main') {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId(spreadsheetType);

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });

    return response.data.sheets.map(sheet => ({
      title: sheet.properties.title,
      sheetId: sheet.properties.sheetId,
      index: sheet.properties.index,
    }));
  } catch (error) {
    console.error('Error getting sheet names:', error);
    throw error;
  }
}

module.exports = {
  getValues,
  batchGetValues,
  updateValues,
  appendValues,
  batchUpdate,
  batchUpdateSpreadsheet,
  getSheetNames,
};
