// api/users/delete.js

// =========================================================================
// ВИДАЛЕННЯ КОРИСТУВАЧА (ТІЛЬКИ ДЛЯ ADMIN)
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Видаляє користувача з Users Database.
// Запобігає видаленню самого себе.
//
// ЕНДПОІНТ: DELETE /api/users/delete
// АВТОРИЗАЦІЯ: Потрібна (тільки admin)
//
// BODY:
// {
//   id: string (обов'язково)
// }
//
// ВІДПОВІДЬ ПРИ УСПІХУ:
// {
//   success: true,
//   message: 'User deleted successfully'
// }
//
// ОБМЕЖЕННЯ:
// - Неможливо видалити самого себе (поточного адміністратора)
// - Неможливо видалити неіснуючого користувача
//
// ПРОЦЕС:
// 1. Перевірка JWT токена та admin ролі
// 2. Валідація вхідних даних
// 3. Перевірка що не видаляємо самого себе
// 4. Пошук користувача за ID
// 5. Видалення рядка з Users Database
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { requireAdmin } = require('../utils/auth-middleware');
const { getValues, batchUpdateSpreadsheet, getSheetNames } = require('../utils/google-sheets');

/**
 * Handler для видалення користувача
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.body - Тіло запиту
 * @param {string} req.body.id - ID користувача для видалення
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом видалення або помилкою
 */
async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Перевірка авторизації та admin ролі
    const authResult = requireAdmin(req);
    if (!authResult.authorized) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { id } = req.body;

    // Валідація вхідних даних
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Перевірка що не видаляємо самого себе
    if (id === req.user.id) {
      return res.status(403).json({ error: 'Cannot delete yourself' });
    }

    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:F1000', 'users');

    // Пошук користувача за ID
    const userIndex = usersData.findIndex(row => row[0] === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Отримання sheetId для Users аркушу
    const sheets = await getSheetNames('users');
    const usersSheet = sheets.find(sheet => sheet.title === 'Users');

    if (!usersSheet) {
      return res.status(500).json({ error: 'Users sheet not found' });
    }

    // Видалення рядка через batchUpdate
    const rowNumber = userIndex + 2; // +2 (header row + 0-based index)
    await batchUpdateSpreadsheet([
      {
        deleteDimension: {
          range: {
            sheetId: usersSheet.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1, // 0-based index для API
            endIndex: rowNumber
          }
        }
      }
    ], 'users');

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      error: 'Failed to delete user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = corsMiddleware(handler);
