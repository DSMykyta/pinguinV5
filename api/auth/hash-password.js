const bcrypt = require('bcryptjs');
const { corsMiddleware } = require('../utils/cors');

/**
 * API endpoint для генерації хешу пароля
 * Використовується тільки адміністратором для створення нових користувачів
 *
 * Приклад використання:
 * GET /api/auth/hash-password?pwd=мій_пароль123
 *
 * Повертає: { hash: "$2b$12$..." }
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pwd } = req.query;

    // Валідація
    if (!pwd) {
      return res.status(400).json({
        error: 'Password is required',
        usage: 'GET /api/auth/hash-password?pwd=your_password'
      });
    }

    if (pwd.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Генерація хешу
    const saltRounds = 12;
    const hash = await bcrypt.hash(pwd, saltRounds);

    return res.status(200).json({
      success: true,
      hash,
      note: 'Copy this hash to the Users sheet in Google Sheets',
    });
  } catch (error) {
    console.error('Hash password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = corsMiddleware(handler);
