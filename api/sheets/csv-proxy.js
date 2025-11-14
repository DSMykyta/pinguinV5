// api/sheets/csv-proxy.js

// =========================================================================
// CORS ПРОКСІ ДЛЯ CSV ЕКСПОРТУ З GOOGLE SHEETS
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Проксі для завантаження CSV файлів з Google Sheets без CORS помилок.
// Вирішує проблему Same-Origin Policy при прямих запитах до Google Sheets.
//
// ЕНДПОІНТ: GET /api/sheets/csv-proxy
// АВТОРИЗАЦІЯ: Не потрібна
//
// QUERY ПАРАМЕТРИ:
// - gid: Google Sheet ID (номер конкретного аркуша)
//
// ПРОЦЕС:
// 1. Отримує gid з query параметрів
// 2. Формує URL для CSV export
// 3. Робить fetch до Google Sheets
// 4. Повертає CSV як text/csv з правильними CORS headers
//
// ПРИКЛАД:
// GET /api/sheets/csv-proxy?gid=1742878044
// =========================================================================

const { corsMiddleware } = require('../utils/cors');

/**
 * Handler для проксі CSV експорту з Google Sheets
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.query - Query параметри
 * @param {string} req.query.gid - Google Sheet ID (аркуш)
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<string>} CSV текст або JSON помилка
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gid } = req.query;

    if (!gid) {
      return res.status(400).json({
        error: 'GID parameter is required',
        example: '/api/sheets/csv-proxy?gid=653695455'
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
