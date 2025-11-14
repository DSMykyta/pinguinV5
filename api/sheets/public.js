// api/sheets/public.js

// =========================================================================
// ПУБЛІЧНИЙ API ДЛЯ ЧИТАННЯ SHEETS БЕЗ АВТОРИЗАЦІЇ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає публічний доступ до певних аркушів Google Sheets для фронтенду.
// Використовується для завантаження довідкових даних (глосарій, сутності, тощо).
//
// ЕНДПОІНТ: GET /api/sheets/public
// АВТОРИЗАЦІЯ: Не потрібна
//
// QUERY ПАРАМЕТРИ:
// - range: діапазон (формат: "SheetName!A:Z" або "SheetName!A1:B100")
// - spreadsheetType: тип таблиці ('main' | 'texts' | 'banned')
//
// ДОЗВОЛЕНІ АРКУШІ:
// - SEO, Тригери, Співставлення
// - Глосарій, Сутності, Тексти
// - Посилання, Заборонені
//
// ПРИКЛАД:
// GET /api/sheets/public?range=Глосарій!A:E&spreadsheetType=main
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { getValues } = require('../utils/google-sheets');

/**
 * Handler для публічного читання даних з Google Sheets
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.query - Query параметри
 * @param {string} req.query.range - Діапазон (формат: "Sheet!A:B")
 * @param {string} req.query.spreadsheetType - Тип таблиці
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з даними або помилкою
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { range, spreadsheetType } = req.query;

    // Валідація
    if (!range) {
      return res.status(400).json({
        error: 'Range parameter is required',
        example: '/api/sheets/public?range=SEO!A:E'
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

module.exports = corsMiddleware(handler);
