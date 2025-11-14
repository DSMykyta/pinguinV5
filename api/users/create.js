// api/users/create.js

// =========================================================================
// СТВОРЕННЯ НОВОГО КОРИСТУВАЧА (ТІЛЬКИ ДЛЯ ADMIN)
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Створює нового користувача в Users Database.
// Автоматично хешує пароль за допомогою bcrypt.
//
// ЕНДПОІНТ: POST /api/users/create
// АВТОРИЗАЦІЯ: Потрібна (тільки admin)
//
// BODY:
// {
//   username: string (обов'язково, унікальне),
//   password: string (обов'язково, мінімум 6 символів),
//   role: 'admin' | 'editor' | 'viewer' (обов'язково)
// }
//
// ВІДПОВІДЬ ПРИ УСПІХУ:
// {
//   success: true,
//   user: {
//     id: string,
//     username: string,
//     role: string,
//     created_at: string (ISO timestamp)
//   }
// }
//
// ПРОЦЕС:
// 1. Перевірка JWT токена та admin ролі
// 2. Валідація вхідних даних
// 3. Перевірка унікальності username
// 4. Хешування пароля (bcrypt, 12 rounds)
// 5. Генерація UUID для нового користувача
// 6. Додавання в Users Database
// =========================================================================

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { corsMiddleware } = require('../utils/cors');
const { requireAdmin } = require('../utils/auth-middleware');
const { getValues, appendValues } = require('../utils/google-sheets');

/**
 * Handler для створення нового користувача
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.body - Тіло запиту
 * @param {string} req.body.username - Ім'я користувача
 * @param {string} req.body.password - Пароль (plaintext)
 * @param {string} req.body.role - Роль ('admin' | 'editor' | 'viewer')
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з даними нового користувача або помилкою
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

    const { username, password, role } = req.body;

    // Валідація вхідних даних
    if (!username || !password || !role) {
      return res.status(400).json({
        error: 'Username, password, and role are required'
      });
    }

    // Валідація username
    if (username.length < 3) {
      return res.status(400).json({
        error: 'Username must be at least 3 characters long'
      });
    }

    // Валідація password
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Валідація role
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
      id,              // A: id
      username,        // B: username
      passwordHash,    // C: password_hash
      role,            // D: role
      createdAt,       // E: created_at
      ''               // F: last_login (пусте при створенні)
    ]], 'users');

    // Повернення даних нового користувача (без password_hash)
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

module.exports = corsMiddleware(handler);
