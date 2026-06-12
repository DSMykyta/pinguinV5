// api/public/data.js

// =========================================================================
// ПУБЛІЧНИЙ API ДЛЯ ЧИТАННЯ ДАНИХ БЕЗ АВТОРИЗАЦІЇ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає публічний доступ до певних аркушів Google Sheets без JWT токена.
// Використовується для завантаження заборонених слів та посилань на клієнті.
//
// ЕНДПОІНТ: GET /api/public/data
// АВТОРИЗАЦІЯ: Не потрібна
//
// QUERY ПАРАМЕТРИ:
// - sheet: назва аркуша (Banned або Links)
// - range: діапазон комірок (наприклад A1:Z1000)
//
// ДОЗВОЛЕНІ АРКУШІ:
// - Banned: заборонені слова та фрази
// - Links: посилання на зовнішні ресурси
//
// ПРИКЛАД ВИКОРИСТАННЯ:
// GET /api/public/data?sheet=Banned&range=A1:Z1000
// =========================================================================

const { corsMiddleware } = require('../../server/utils/cors');
const { getValues } = require('../../server/utils/google-sheets');
const {
  PUBLIC_DATA_SHEETS,
  isExactAllowedSheet,
} = require('../../server/utils/sheet-security');

/**
 * Handler для публічного читання даних з Google Sheets
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.query - Query параметри
 * @param {string} req.query.sheet - Назва аркуша
 * @param {string} req.query.range - Діапазон комірок
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з даними або помилкою
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sheet, range } = req.query;

    // Валідація обов'язкових параметрів
    if (!sheet || !range) {
      return res.status(400).json({
        error: 'Missing parameters',
        usage: 'GET /api/public/data?sheet=Banned&range=A1:Z1000'
      });
    }

    const isAllowed = isExactAllowedSheet(sheet, PUBLIC_DATA_SHEETS);

    if (!isAllowed) {
      return res.status(403).json({
        error: 'Access denied to this sheet',
        allowedSheets: Array.from(PUBLIC_DATA_SHEETS)
      });
    }

    // Формуємо повний діапазон
    const fullRange = `${sheet}!${range}`;

    // Читаємо дані
    const values = await getValues(fullRange, 'main');

    return res.status(200).json({
      success: true,
      data: values,
      sheet,
      range,
    });
  } catch (error) {
    console.error('Public data API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = corsMiddleware(handler);
