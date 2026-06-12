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
// ЕНДПОІНТ: POST /api/auth/hash-password
// АВТОРИЗАЦІЯ: Валідний access JWT з роллю admin
//
// BODY:
// - password або pwd: пароль (plaintext)
//
// ВІДПОВІДЬ:
// {
//   success: true,
//   hash: "$2b$12$...",
//   note: "Copy this hash to the Users sheet"
// }
//
// ВИКОРИСТАННЯ:
// 1. Викликати POST /api/auth/hash-password з JSON body та admin JWT
// 2. Скопіювати згенерований hash
// 3. Вставити в Google Sheets (Users!C колонка)
// =========================================================================

const bcrypt = require('bcryptjs');
const { corsMiddleware } = require('../../server/utils/cors');
const {
  AccountError,
  authenticateAccount,
  validatePassword,
} = require('../../server/accounts');
const { CAPABILITIES } = require('../../server/access-policy');

/**
 * Handler для генерації bcrypt хешу пароля
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.body - JSON body
 * @param {string} req.body.password - Пароль для хешування
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з bcrypt хешем
 */
async function handler(req, res) {
  if (!await authenticateAccount(req, res, { capability: CAPABILITIES.ACCOUNTS_MANAGE })) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pwd = req.body?.password || req.body?.pwd;

    // Валідація
    if (!pwd) {
      return res.status(400).json({
        error: 'Password is required',
        usage: 'POST /api/auth/hash-password with JSON body { "password": "your_password" }'
      });
    }

    validatePassword(pwd);

    // Генерація хешу
    const saltRounds = 12;
    const hash = await bcrypt.hash(pwd, saltRounds);

    return res.status(200).json({
      success: true,
      hash,
      note: 'Copy this hash to the Users sheet in Google Sheets',
    });
  } catch (error) {
    if (error instanceof AccountError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Hash password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = corsMiddleware(handler);
