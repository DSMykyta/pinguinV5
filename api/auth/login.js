// api/auth/login.js

// =========================================================================
// АВТОРИЗАЦІЯ КОРИСТУВАЧА (LOGIN)
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Перевіряє credentials користувача та генерує JWT токени для доступу.
// Користувачі зберігаються в закритій Users Database таблиці.
//
// ЕНДПОІНТ: POST /api/auth/login
// АВТОРИЗАЦІЯ: Не потрібна
//
// BODY:
// {
//   username: string,
//   password: string
// }
//
// ВІДПОВІДЬ ПРИ УСПІХУ:
// {
//   success: true,
//   token: string (JWT access token, expires in 8 hours),
//   refreshToken: string (JWT refresh token, expires in 30 days),
//   user: {
//     id: string,
//     username: string,
//     role: 'admin' | 'editor' | 'viewer'
//   }
// }
//
// ПРОЦЕС:
// 1. Читання користувачів з Users Database (Users!A2:F1000)
// 2. Перевірка існування користувача
// 3. Порівняння bcrypt хешу пароля
// 4. Генерація JWT токенів
// 5. Оновлення last_login timestamp в Users Database
// =========================================================================

const bcrypt = require('bcryptjs');
const { corsMiddleware } = require('../utils/cors');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { getValues, updateValues } = require('../utils/google-sheets');

/**
 * Handler для авторизації користувача
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.body - Тіло запиту
 * @param {string} req.body.username - Ім'я користувача
 * @param {string} req.body.password - Пароль (plaintext)
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з токенами та інформацією про користувача
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Валідація вхідних даних
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Читання користувачів з Users Database (закритої таблиці)
    const usersData = await getValues('Users!A2:F1000', 'users'); // A=id, B=username, C=password_hash, D=role, E=created_at, F=last_login

    // Пошук користувача
    const userRow = usersData.find(row => row[1] === username);

    if (!userRow) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const [id, storedUsername, passwordHash, role, createdAt] = userRow;

    // Перевірка пароля
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Генерація токенів
    const user = { id, username: storedUsername, role };
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Оновлення last_login в Users Database
    const userRowIndex = usersData.indexOf(userRow) + 2; // +2 because header row and 0-based index
    const now = new Date().toISOString();
    await updateValues(`Users!F${userRowIndex}`, [[now]], 'users');

    // Повернення токенів та інформації про користувача
    return res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id,
        username: storedUsername,
        role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = corsMiddleware(handler);
