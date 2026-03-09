// api/auth/hash-password.js

// =========================================================================
// ГЕНЕРАЦІЯ BCRYPT ХЕШУ ПАРОЛЯ (АДМІНІСТРАТОРСЬКА УТИЛІТА)
// =========================================================================
// ⚠️ ПОПЕРЕДЖЕННЯ: ТІЛЬКИ ДЛЯ АДМІНІСТРУВАННЯ!
//
// ПРИЗНАЧЕННЯ:
// Генерує bcrypt хеш для нового пароля користувача.
// Використовується адміністратором для створення/оновлення користувачів.
//
// ЕНДПОІНТ: GET /api/auth/hash-password
// АВТОРИЗАЦІЯ: Не потрібна (!)
//
// ⚠️ ПРОБЛЕМИ БЕЗПЕКИ:
// - GET запит показує пароль в URL (видно в логах)
// - Немає перевірки авторизації
// - РЕКОМЕНДОВАНО: Використовувати тільки в development
// - TODO: Змінити на POST з авторизацією для production
//
// QUERY ПАРАМЕТРИ:
// - pwd: пароль (plaintext)
//
// ВІДПОВІДЬ:
// {
//   success: true,
//   hash: "$2b$12$...",
//   note: "Copy this hash to the Users sheet"
// }
//
// ВИКОРИСТАННЯ:
// 1. Викликати GET /api/auth/hash-password?pwd=новий_пароль
// 2. Скопіювати згенерований hash
// 3. Вставити в Google Sheets (Users!C колонка)
// =========================================================================

const bcrypt = require('bcryptjs');
const { corsMiddleware } = require('../utils/cors');

/**
 * Handler для генерації bcrypt хешу пароля
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.query - Query параметри
 * @param {string} req.query.pwd - Пароль для хешування
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з bcrypt хешем
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
