// api/auth/logout.js

// =========================================================================
// ВИХІД КОРИСТУВАЧА (LOGOUT)
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Endpoint для виходу користувача з системи.
// Наразі просто повертає success, видалення токена відбувається на клієнті.
//
// ЕНДПОІНТ: POST /api/auth/logout
// АВТОРИЗАЦІЯ: Не потрібна (токен видаляється на клієнті)
//
// ВІДПОВІДЬ:
// {
//   success: true,
//   message: 'Logged out successfully'
// }
//
// ПРИМІТКА:
// В майбутньому тут можна додати:
// - Blacklist токенів в базі даних
// - Інвалідацію refresh token
// - Логування виходу користувача
// =========================================================================

const { corsMiddleware } = require('../utils/cors');

/**
 * Handler для виходу користувача
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з підтвердженням виходу
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
