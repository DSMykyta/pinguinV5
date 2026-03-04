// api/sheets/index.js

// =========================================================================
// SHEETS API - UNIFIED ENDPOINT
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Об'єднаний ендпоінт для всіх операцій з Google Sheets.
// ВСІ операції доступні БЕЗ авторизації.
//
// ЕНДПОІНТИ:
// - POST /api/sheets                       → всі операції з Google Sheets (БЕЗ авторизації)
// - GET  /api/sheets?type=public&range=... → публічне читання даних
// - GET  /api/sheets?type=csv&gid=...      → CSV export
//
// СТРУКТУРА:
// Всі handler функції винесені в окремі функції для читабельності.
// Головний handler роутить запити до відповідних функцій.
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const {
  getValues,
  batchGetValues,
  updateValues,
  appendValues,
  batchUpdate,
  batchUpdateSpreadsheet,
  getSheetNames,
} = require('../utils/google-sheets');

// =========================================================================
// MAIN ROUTER
// =========================================================================

/**
 * Головний handler для роутингу sheets API запитів
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом операції
 */
async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // POST /api/sheets → захищений proxy
      return await handleProxy(req, res);
    } else if (req.method === 'GET') {
      const { type } = req.query;

      if (type === 'public') {
        // GET /api/sheets?type=public&range=...
        return await handlePublic(req, res);
      } else if (type === 'csv') {
        // GET /api/sheets?type=csv&gid=...
        return await handleCsvProxy(req, res);
      } else {
        return res.status(400).json({
          error: 'Invalid type parameter. Use "public" or "csv"',
          examples: [
            '/api/sheets?type=public&range=SEO!A:E',
            '/api/sheets?type=csv&gid=1742878044'
          ]
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Sheets API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: PROXY (Authenticated operations)
// =========================================================================

/**
 * Proxy для операцій з Google Sheets API (БЕЗ авторизації)
 * @returns {Promise<Object>} JSON з результатом операції
 */
async function handleProxy(req, res) {
  try {
    const { action, range, ranges, values, data, requests, spreadsheetType } = req.body;

    // Валідація action
    const validActions = [
      'get',
      'batchGet',
      'update',
      'append',
      'batchUpdate',
      'batchUpdateSpreadsheet',
      'getSheetNames',
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Виконання операції
    let result;

    switch (action) {
      case 'get':
        if (!range) {
          return res.status(400).json({ error: 'Range is required for get action' });
        }
        result = await getValues(range, spreadsheetType);
        break;

      case 'batchGet':
        if (!ranges || !Array.isArray(ranges)) {
          return res.status(400).json({ error: 'Ranges array is required for batchGet action' });
        }
        result = await batchGetValues(ranges, spreadsheetType);
        break;

      case 'update':
        if (!range || !values) {
          return res.status(400).json({ error: 'Range and values are required for update action' });
        }
        result = await updateValues(range, values, spreadsheetType);
        break;

      case 'append':
        if (!range || !values) {
          return res.status(400).json({ error: 'Range and values are required for append action' });
        }
        result = await appendValues(range, values, spreadsheetType);
        break;

      case 'batchUpdate':
        if (!data || !Array.isArray(data)) {
          return res.status(400).json({ error: 'Data array is required for batchUpdate action' });
        }
        result = await batchUpdate(data, spreadsheetType);
        break;

      case 'batchUpdateSpreadsheet':
        if (!requests || !Array.isArray(requests)) {
          return res.status(400).json({ error: 'Requests array is required for batchUpdateSpreadsheet action' });
        }
        result = await batchUpdateSpreadsheet(requests, spreadsheetType);
        break;

      case 'getSheetNames':
        result = await getSheetNames(spreadsheetType);
        break;

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Sheets proxy error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: PUBLIC (No authentication)
// =========================================================================

/**
 * Публічний доступ до певних аркушів без авторизації
 * @returns {Promise<Object>} JSON з даними
 */
async function handlePublic(req, res) {
  try {
    const { range, spreadsheetType } = req.query;

    // Валідація
    if (!range) {
      return res.status(400).json({
        error: 'Range parameter is required',
        example: '/api/sheets?type=public&range=SEO!A:E'
      });
    }

    // Обмеження доступу тільки до певних аркушів (для безпеки)
    const allowedSheets = [
      'SEO',
      'Тригери',
      'Співставлення',
      'Глосарій',
      'Сутності',
      'Тексти',
      'Посилання',
      'Заборонені'
    ];

    // Перевіряємо чи range починається з дозволеного аркушу
    const sheetName = range.split('!')[0];
    const isAllowed = allowedSheets.some(allowed =>
      sheetName === allowed || sheetName.includes(allowed)
    );

    if (!isAllowed) {
      return res.status(403).json({
        error: 'Access to this sheet is restricted',
        allowedSheets
      });
    }

    // Отримуємо дані
    const result = await getValues(range, spreadsheetType);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Public sheets API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: CSV PROXY (No authentication)
// =========================================================================

/**
 * Проксі для завантаження CSV файлів з Google Sheets
 * @returns {Promise<string>} CSV текст
 */
async function handleCsvProxy(req, res) {
  try {
    const { gid } = req.query;

    if (!gid) {
      return res.status(400).json({
        error: 'GID parameter is required',
        example: '/api/sheets?type=csv&gid=653695455'
      });
    }

    // Використовуємо SPREADSHEET_ID з environment variables
    const spreadsheetId = process.env.SPREADSHEET_ID || '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    console.log('Fetching CSV from:', csvUrl);

    // Робимо запит до Google Sheets
    const response = await fetch(csvUrl);

    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}`);
    }

    const csvText = await response.text();

    // Повертаємо CSV як текст
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(csvText);
  } catch (error) {
    console.error('CSV proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch CSV',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = corsMiddleware(handler);
