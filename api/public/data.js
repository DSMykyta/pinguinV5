const { corsMiddleware } = require('../utils/cors');
const { getValues } = require('../utils/google-sheets');

/**
 * Публічний API для завантаження даних БЕЗ авторизації
 * Дозволяє читати тільки певні аркуші (заборонені слова, посилання, SEO)
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sheet, range } = req.query;

    // Валідація
    if (!sheet || !range) {
      return res.status(400).json({
        error: 'Missing parameters',
        usage: 'GET /api/public/data?sheet=Banned&range=A1:Z1000'
      });
    }

    // Білий список дозволених аркушів (БЕЗ авторизації)
    const allowedSheets = [
      'Banned',           // Заборонені слова
      'Links',            // Посилання на сайти
      'SEO_Keywords',     // SEO ключові слова
      'SEO_Data',         // SEO дані
    ];

    // Перевіряємо чи аркуш в білому списку
    const isAllowed = allowedSheets.some(allowed => sheet.startsWith(allowed));

    if (!isAllowed) {
      return res.status(403).json({
        error: 'Access denied to this sheet',
        allowedSheets
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
