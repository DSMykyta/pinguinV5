// api/users/reset-password.js

// =========================================================================
// СКИДАННЯ ПАРОЛЯ КОРИСТУВАЧА (ТІЛЬКИ ДЛЯ ADMIN)
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Скидає пароль користувача та оновлює password_hash в Users Database.
// Автоматично хешує новий пароль за допомогою bcrypt.
//
// ЕНДПОІНТ: POST /api/users/reset-password
// АВТОРИЗАЦІЯ: Потрібна (тільки admin)
//
// BODY:
// {
//   id: string (обов'язково),
//   newPassword: string (обов'язково, мінімум 6 символів)
// }
//
// ВІДПОВІДЬ ПРИ УСПІХУ:
// {
//   success: true,
//   message: 'Password reset successfully'
// }
//
// ПРОЦЕС:
// 1. Перевірка JWT токена та admin ролі
// 2. Валідація вхідних даних
// 3. Пошук користувача за ID
// 4. Хешування нового пароля (bcrypt, 12 rounds)
// 5. Оновлення password_hash в Users Database
// =========================================================================

const bcrypt = require('bcryptjs');
const { corsMiddleware } = require('../utils/cors');
const { requireAdmin } = require('../utils/auth-middleware');
const { getValues, updateValues } = require('../utils/google-sheets');

/**
 * Handler для скидання пароля користувача
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.body - Тіло запиту
 * @param {string} req.body.id - ID користувача
 * @param {string} req.body.newPassword - Новий пароль (plaintext)
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом або помилкою
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Перевірка авторизації та admin ролі
    const authResult = requireAdmin(req);
    if (!authResult.authorized) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id, newPassword } = req.body;

    // Валідація вхідних даних
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Валідація password
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:F1000', 'users');

    // Пошук користувача за ID
    const userIndex = usersData.findIndex(row => row[0] === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Хешування нового пароля
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Оновлення password_hash в Users Database
    const rowNumber = userIndex + 2; // +2 (header row + 0-based index)
    await updateValues(`Users!C${rowNumber}`, [[newPasswordHash]], 'users');

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      error: 'Failed to reset password',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = corsMiddleware(handler);
