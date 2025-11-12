const { google } = require('googleapis');

// Environment variables
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SPREADSHEET_ID_TEXTS = process.env.SPREADSHEET_ID_TEXTS;

/**
 * Створює авторизованого клієнта Google Sheets
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
 */
function getSpreadsheetId(type = 'main') {
  if (type === 'texts') {
    return SPREADSHEET_ID_TEXTS;
  }
  return SPREADSHEET_ID;
}

/**
 * Читає дані з діапазону
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
 * Batch отримання даних з кількох діапазонів
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
