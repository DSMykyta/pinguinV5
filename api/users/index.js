// api/users/index.js

// =========================================================================
// USERS API - UNIFIED ENDPOINT
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Об'єднаний ендпоінт для всіх операцій з користувачами.
// Використовує HTTP методи та action параметр для роутингу.
//
// АВТОРИЗАЦІЯ: Потрібна (тільки admin для всіх операцій)
//
// ЕНДПОІНТИ:
// - GET    /api/users                    → list all users
// - POST   /api/users { action: create } → create new user
// - POST   /api/users { action: reset }  → reset password
// - PUT    /api/users                    → update user
// - DELETE /api/users                    → delete user
//
// СТРУКТУРА:
// Всі handler функції винесені в окремі функції для читабельності.
// Головний handler роутить запити до відповідних функцій.
// =========================================================================

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { corsMiddleware } = require('../utils/cors');
const { requireAdmin } = require('../utils/auth-middleware');
const { getValues, appendValues, updateValues, batchUpdateSpreadsheet, getSheetNames } = require('../utils/google-sheets');

// =========================================================================
// MAIN ROUTER
// =========================================================================

/**
 * Головний handler для роутингу users API запитів
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом операції
 */
async function handler(req, res) {
  // Перевірка авторизації для всіх операцій
  const authResult = requireAdmin(req);
  if (!authResult.authorized) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  // Роутинг за HTTP методом
  try {
    if (req.method === 'GET') {
      return await handleList(req, res);
    } else if (req.method === 'POST') {
      const { action } = req.body;
      if (action === 'create') {
        return await handleCreate(req, res);
      } else if (action === 'reset-password') {
        return await handleResetPassword(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "create" or "reset-password"' });
      }
    } else if (req.method === 'PUT') {
      return await handleUpdate(req, res);
    } else if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: LIST USERS (GET)
// =========================================================================

/**
 * Отримує список всіх користувачів
 * @returns {Promise<Object>} JSON зі списком користувачів
 */
async function handleList(req, res) {
  try {
    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:F1000', 'users');

    // Перетворення в об'єкти без password_hash
    const users = usersData
      .filter(row => row[0])
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

// =========================================================================
// HANDLER: CREATE USER (POST with action=create)
// =========================================================================

/**
 * Створює нового користувача
 * @returns {Promise<Object>} JSON з даними нового користувача
 */
async function handleCreate(req, res) {
  try {
    const { username, password, role } = req.body;

    // Валідація вхідних даних
    if (!username || !password || !role) {
      return res.status(400).json({
        error: 'Username, password, and role are required'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'Username must be at least 3 characters long'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be: admin, editor, or viewer'
      });
    }

    // Читання існуючих користувачів для перевірки унікальності
    const usersData = await getValues('Users!A2:F1000', 'users');
    const existingUser = usersData.find(row => row[1] === username);

    if (existingUser) {
      return res.status(409).json({
        error: 'Username already exists'
      });
    }

    // Генерація ID та хешування пароля
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const createdAt = new Date().toISOString();

    // Додавання нового користувача в Users Database
    await appendValues('Users!A:F', [[
      id,
      username,
      passwordHash,
      role,
      createdAt,
      ''
    ]], 'users');

    return res.status(201).json({
      success: true,
      user: {
        id,
        username,
        role,
        created_at: createdAt,
        last_login: ''
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      error: 'Failed to create user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: UPDATE USER (PUT)
// =========================================================================

/**
 * Оновлює дані користувача (username та/або role)
 * @returns {Promise<Object>} JSON з оновленими даними
 */
async function handleUpdate(req, res) {
  try {
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
    const rowNumber = userIndex + 2;
    await updateValues(`Users!B${rowNumber}:D${rowNumber}`, [[
      updatedUsername,
      userRow[2], // password_hash (не змінюється)
      updatedRole
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

// =========================================================================
// HANDLER: DELETE USER (DELETE)
// =========================================================================

/**
 * Видаляє користувача з Users Database
 * @returns {Promise<Object>} JSON з результатом видалення
 */
async function handleDelete(req, res) {
  try {
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
    const rowNumber = userIndex + 2;
    await batchUpdateSpreadsheet([
      {
        deleteDimension: {
          range: {
            sheetId: usersSheet.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
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

// =========================================================================
// HANDLER: RESET PASSWORD (POST with action=reset-password)
// =========================================================================

/**
 * Скидає пароль користувача
 * @returns {Promise<Object>} JSON з результатом
 */
async function handleResetPassword(req, res) {
  try {
    const { id, newPassword } = req.body;

    // Валідація вхідних даних
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

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
    const rowNumber = userIndex + 2;
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
