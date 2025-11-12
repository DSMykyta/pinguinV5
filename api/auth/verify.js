const { corsMiddleware } = require('../utils/cors');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

module.exports = corsMiddleware(handler);
