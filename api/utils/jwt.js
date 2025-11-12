const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '15m'; // 15 minutes
const JWT_REFRESH_EXPIRES_IN = '30d'; // 30 days

/**
 * Генерує JWT токен для користувача
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
 * Генерує refresh токен
 */
function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Верифікує JWT токен
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Витягує токен з Authorization header
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
