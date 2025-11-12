const { corsMiddleware } = require('../utils/cors');
const { getValues } = require('../utils/google-sheets');

/**
 * Публічний API endpoint для отримання даних з Google Sheets
 * БЕЗ авторизації - для даних що не потребують логіну
 *
 * GET /api/sheets/public?range=Sheet!A:B
 * GET /api/sheets/public?range=Sheet!A:B&spreadsheetType=texts
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
