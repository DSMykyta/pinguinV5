// api/utils/jwt.js

// =========================================================================
// JWT УТИЛІТИ ДЛЯ АВТОРИЗАЦІЇ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає функції для роботи з JSON Web Tokens (JWT).
// Використовується для генерації та верифікації токенів доступу.
//
// ЕКСПОРТОВАНІ ФУНКЦІЇ:
// - generateToken(user): генерує access token (8 годин)
// - generateRefreshToken(user): генерує refresh token (30 днів)
// - verifyToken(token): верифікує та декодує токен
// - extractTokenFromHeader(authHeader): витягує токен з Bearer header
//
// КОНФІГУРАЦІЯ:
// - JWT_SECRET: секретний ключ (з process.env.JWT_SECRET)
// - ACCESS TOKEN: expires in 8 hours
// - REFRESH TOKEN: expires in 30 days
//
// PAYLOAD СТРУКТУРА:
// Access token: { id, username, role, type: 'access' }
// Refresh token: { id, username, type: 'refresh' }
// =========================================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '8h'; // 8 hours
const JWT_REFRESH_EXPIRES_IN = '30d'; // 30 days

// =========================================================================
// ГЕНЕРАЦІЯ ТОКЕНІВ
// =========================================================================

/**
 * Генерує JWT access token для користувача
 * @param {Object} user - Об'єкт користувача
 * @param {string} user.id - ID користувача
 * @param {string} user.username - Ім'я користувача
 * @param {string} user.role - Роль ('admin' | 'editor' | 'viewer')
 * @returns {string} JWT токен (expires in 8h)
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Генерує JWT refresh token для оновлення сесії
 * @param {Object} user - Об'єкт користувача
 * @param {string} user.id - ID користувача
 * @param {string} user.username - Ім'я користувача
 * @returns {string} JWT refresh токен (expires in 30d)
 */
function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

// =========================================================================
// ВЕРИФІКАЦІЯ ТА ВИТЯГУВАННЯ ТОКЕНІВ
// =========================================================================

/**
 * Верифікує та декодує JWT токен
 * @param {string} token - JWT токен для верифікації
 * @returns {Object|null} Декодований payload або null якщо невалідний
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Витягує токен з Authorization header (формат: "Bearer <token>")
 * @param {string} authHeader - Значення Authorization header
 * @returns {string|null} JWT токен або null якщо формат невірний
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromHeader
};
