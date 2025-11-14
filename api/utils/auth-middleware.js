// api/utils/auth-middleware.js

// =========================================================================
// AUTH MIDDLEWARE ДЛЯ ЗАХИСТУ API ЕНДПОІНТІВ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Перевіряє JWT токен та права доступу користувача.
// Використовується для захисту адміністративних ендпоінтів.
//
// ЕКСПОРТОВАНІ ФУНКЦІЇ:
// - requireAuth: перевіряє наявність валідного JWT токена
// - requireAdmin: перевіряє що користувач має роль 'admin'
// - requireRole: перевіряє що користувач має одну з дозволених ролей
//
// ВИКОРИСТАННЯ:
// const { requireAdmin } = require('../utils/auth-middleware');
// async function handler(req, res) {
//   const authResult = requireAdmin(req);
//   if (!authResult.authorized) {
//     return res.status(authResult.status).json({ error: authResult.error });
//   }
//   // Тепер req.user містить { id, username, role }
//   ...
// }
// =========================================================================

const { verifyToken, extractTokenFromHeader } = require('./jwt');

// =========================================================================
// MIDDLEWARE ФУНКЦІЇ
// =========================================================================

/**
 * Перевіряє наявність та валідність JWT токена
 * Додає decoded user до req.user
 * @param {Object} req - Express request об'єкт
 * @returns {Object} { authorized: boolean, status: number, error?: string, user?: Object }
 */
function requireAuth(req) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return {
      authorized: false,
      status: 401,
      error: 'No token provided'
    };
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return {
      authorized: false,
      status: 401,
      error: 'Invalid or expired token'
    };
  }

  // Перевірка типу токена (має бути access token)
  if (decoded.type !== 'access') {
    return {
      authorized: false,
      status: 401,
      error: 'Invalid token type. Use access token.'
    };
  }

  // Додати користувача до request
  req.user = {
    id: decoded.id,
    username: decoded.username,
    role: decoded.role
  };

  return {
    authorized: true,
    user: req.user
  };
}

/**
 * Перевіряє що користувач має роль 'admin'
 * @param {Object} req - Express request об'єкт
 * @returns {Object} { authorized: boolean, status: number, error?: string, user?: Object }
 */
function requireAdmin(req) {
  // Спочатку перевірити авторизацію
  const authResult = requireAuth(req);

  if (!authResult.authorized) {
    return authResult;
  }

  // Перевірити роль
  if (req.user.role !== 'admin') {
    return {
      authorized: false,
      status: 403,
      error: 'Access denied. Admin role required.'
    };
  }

  return {
    authorized: true,
    user: req.user
  };
}

/**
 * Перевіряє що користувач має одну з дозволених ролей
 * @param {Object} req - Express request об'єкт
 * @param {Array<string>} allowedRoles - Масив дозволених ролей ['admin', 'editor']
 * @returns {Object} { authorized: boolean, status: number, error?: string, user?: Object }
 */
function requireRole(req, allowedRoles) {
  // Спочатку перевірити авторизацію
  const authResult = requireAuth(req);

  if (!authResult.authorized) {
    return authResult;
  }

  // Перевірити роль
  if (!allowedRoles.includes(req.user.role)) {
    return {
      authorized: false,
      status: 403,
      error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
    };
  }

  return {
    authorized: true,
    user: req.user
  };
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireRole
};
