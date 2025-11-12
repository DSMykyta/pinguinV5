const { corsMiddleware } = require('../utils/cors');

/**
 * API endpoint для виходу
 * На клієнті просто видаляємо токен з localStorage
 * Цей endpoint може бути використаний для додаткової логіки (наприклад, blacklist токенів)
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // В майбутньому тут можна додати логіку для інвалідації токенів
    // (наприклад, додавання токена до blacklist в базі даних)

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = corsMiddleware(handler);
