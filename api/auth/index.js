// api/auth/index.js

// =========================================================================
// AUTH API - UNIFIED ENDPOINT
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Об'єднаний ендпоінт для всіх операцій авторизації.
// Використовує HTTP методи та action параметр для роутингу.
//
// ЕНДПОІНТИ:
// - POST /api/auth { action: 'login' }  → авторизація користувача
// - POST /api/auth { action: 'logout' } → вихід користувача
// - POST /api/auth { action: 'verify' } → верифікація токена
// - GET  /api/auth/verify               → верифікація токена (legacy)
//
// СТРУКТУРА:
// Всі handler функції винесені в окремі функції для читабельності.
// Головний handler роутить запити до відповідних функцій.
// =========================================================================

const bcrypt = require('bcryptjs');
const { corsMiddleware } = require('../utils/cors');
const { generateToken, generateRefreshToken, verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { getValues, updateValues } = require('../utils/google-sheets');

// =========================================================================
// MAIN ROUTER
// =========================================================================

/**
 * Головний handler для роутингу auth API запитів
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом операції
 */
async function handler(req, res) {
  try {
    // GET /api/auth/verify (legacy support)
    if (req.method === 'GET' && req.url?.includes('/verify')) {
      return await handleVerify(req, res);
    }

    // POST requests with action routing
    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'login' || !action) {
        // POST /api/auth or POST /api/auth { action: 'login' }
        return await handleLogin(req, res);
      } else if (action === 'logout') {
        return await handleLogout(req, res);
      } else if (action === 'verify') {
        return await handleVerify(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "login", "logout", or "verify"' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: LOGIN
// =========================================================================

/**
 * Авторизація користувача
 * @returns {Promise<Object>} JSON з токенами та інформацією про користувача
 */
async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;

    // Валідація вхідних даних
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Читання користувачів з Users Database
    const usersData = await getValues('Users!A2:F1000', 'users');

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
    const userRowIndex = usersData.indexOf(userRow) + 2;
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

// =========================================================================
// HANDLER: VERIFY
// =========================================================================

/**
 * Верифікація JWT токена
 * @returns {Promise<Object>} JSON з результатом верифікації
 */
async function handleVerify(req, res) {
  try {
    // Витягуємо токен з заголовка
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        valid: false,
        error: 'No token provided'
      });
    }

    // Верифікуємо токен
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        valid: false,
        error: 'Invalid or expired token'
      });
    }

    // Повертаємо інформацію про користувача
    return res.status(200).json({
      valid: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
}

// =========================================================================
// HANDLER: LOGOUT
// =========================================================================

/**
 * Вихід користувача (фактично нічого не робить на backend)
 * @returns {Promise<Object>} JSON з підтвердженням виходу
 */
async function handleLogout(req, res) {
  try {
    // В майбутньому тут можна додати логіку для інвалідації токенів
    // (наприклад, додавання токена до blacklist в базі даних)

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = corsMiddleware(handler);
