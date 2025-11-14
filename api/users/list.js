// api/users/list.js

// =========================================================================
// СПИСОК КОРИСТУВАЧІВ (ТІЛЬКИ ДЛЯ ADMIN)
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Отримує список всіх користувачів з Users Database.
// Не повертає password_hash для безпеки.
//
// ЕНДПОІНТ: GET /api/users/list
// АВТОРИЗАЦІЯ: Потрібна (тільки admin)
//
// ВІДПОВІДЬ ПРИ УСПІХУ:
// {
//   success: true,
//   users: [
//     {
//       id: string,
//       username: string,
//       role: 'admin' | 'editor' | 'viewer',
//       created_at: string (ISO timestamp),
//       last_login: string (ISO timestamp)
//     },
//     ...
//   ]
// }
//
// ПРОЦЕС:
// 1. Перевірка JWT токена та admin ролі
// 2. Читання всіх користувачів з Users Database
// 3. Фільтрація password_hash (не повертається клієнту)
// 4. Повернення списку користувачів
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { requireAdmin } = require('../utils/auth-middleware');
const { getValues } = require('../utils/google-sheets');

/**
 * Handler для отримання списку користувачів
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON зі списком користувачів або помилкою
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Перевірка авторизації та admin ролі
    const authResult = requireAdmin(req);
    if (!authResult.authorized) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:F1000', 'users'); // A=id, B=username, C=password_hash, D=role, E=created_at, F=last_login

    // Перетворення в об'єкти без password_hash
    const users = usersData
      .filter(row => row[0]) // Фільтруємо пусті рядки
      .map(row => ({
        id: row[0] || '',
        username: row[1] || '',
        // НЕ повертаємо password_hash для безпеки
        role: row[3] || 'viewer',
        created_at: row[4] || '',
        last_login: row[5] || ''
      }));

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Users list error:', error);
    return res.status(500).json({
      error: 'Failed to fetch users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = corsMiddleware(handler);
