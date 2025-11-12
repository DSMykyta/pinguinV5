const { corsMiddleware } = require('../utils/cors');

/**
 * CORS proxy для Google Sheets CSV export
 * Дозволяє завантажувати CSV без CORS помилок
 *
 * GET /api/sheets/csv-proxy?gid=123456
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
