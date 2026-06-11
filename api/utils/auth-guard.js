// api/utils/auth-guard.js

// =========================================================================
// API AUTHORIZATION GUARD
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Єдина точка перевірки JWT для приватних serverless endpoint-ів.
// Приймає тільки валідний access token з Authorization: Bearer <token>.
//
// ЕКСПОРТИ:
// - requireAccessToken(req, res, options): перевіряє access JWT і ролі.
//
// ПОЛІТИКА БЕЗПЕКИ:
// - Відсутній, прострочений, підроблений або refresh token -> 401.
// - Недостатня роль -> 403.
// - Відсутній JWT_SECRET -> 500 configuration error без fallback-секрету.
// - OPTIONS не потрапляє сюди: preflight завершує corsMiddleware.
// =========================================================================

const {
  JwtConfigurationError,
  extractTokenFromHeader,
  verifyToken,
} = require('./jwt');

function requireAccessToken(req, res, options = {}) {
  const token = extractTokenFromHeader(req.headers?.authorization);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  let user;
  try {
    user = verifyToken(token);
  } catch (error) {
    if (error instanceof JwtConfigurationError) {
      console.error('JWT configuration error:', error.message);
      res.status(500).json({ error: 'Server authentication is not configured' });
      return null;
    }
    throw error;
  }

  if (!user || user.type !== 'access') {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return null;
  }

  if (options.roles && !options.roles.includes(user.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return null;
  }

  req.user = user;
  return user;
}

module.exports = {
  requireAccessToken,
};
