// api/users/update.js

// =========================================================================
// ОНОВЛЕННЯ КОРИСТУВАЧА (ТІЛЬКИ ДЛЯ ADMIN)
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Оновлює дані користувача в Users Database.
// Дозволяє змінити username та/або role.
//
// ЕНДПОІНТ: PUT /api/users/update
// АВТОРИЗАЦІЯ: Потрібна (тільки admin)
//
// BODY:
// {
//   id: string (обов'язково),
//   username: string (опціонально),
//   role: 'admin' | 'editor' | 'viewer' (опціонально)
// }
//
// ВІДПОВІДЬ ПРИ УСПІХУ:
// {
//   success: true,
//   user: {
//     id: string,
//     username: string,
//     role: string
//   }
// }
//
// ПРОЦЕС:
// 1. Перевірка JWT токена та admin ролі
// 2. Валідація вхідних даних
// 3. Пошук користувача за ID
// 4. Перевірка унікальності username (якщо змінюється)
// 5. Оновлення даних в Users Database
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { requireAdmin } = require('../utils/auth-middleware');
const { getValues, updateValues } = require('../utils/google-sheets');

/**
 * Handler для оновлення користувача
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.body - Тіло запиту
 * @param {string} req.body.id - ID користувача
 * @param {string} req.body.username - Нове ім'я (опціонально)
 * @param {string} req.body.role - Нова роль (опціонально)
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з оновленими даними або помилкою
 */
async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Перевірка авторизації та admin ролі
    const authResult = requireAdmin(req);
    if (!authResult.authorized) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id, username, role } = req.body;

    // Валідація вхідних даних
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!username && !role) {
      return res.status(400).json({ error: 'At least username or role must be provided' });
    }

    // Валідація role (якщо передано)
    if (role) {
      const validRoles = ['admin', 'editor', 'viewer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role. Must be: admin, editor, or viewer'
        });
      }
    }

    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:F1000', 'users');

    // Пошук користувача за ID
    const userIndex = usersData.findIndex(row => row[0] === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRow = usersData[userIndex];

    // Перевірка унікальності username (якщо змінюється)
    if (username && username !== userRow[1]) {
      const existingUser = usersData.find(row => row[1] === username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
    }

    // Підготовка оновлених даних
    const updatedUsername = username || userRow[1];
    const updatedRole = role || userRow[3];

    // Оновлення в Users Database
    const rowNumber = userIndex + 2; // +2 (header row + 0-based index)
    await updateValues(`Users!B${rowNumber}:D${rowNumber}`, [[
      updatedUsername,  // B: username
      userRow[2],       // C: password_hash (не змінюється)
      updatedRole       // D: role
    ]], 'users');

    return res.status(200).json({
      success: true,
      user: {
        id,
        username: updatedUsername,
        role: updatedRole
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      error: 'Failed to update user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = corsMiddleware(handler);
