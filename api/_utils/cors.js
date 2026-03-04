// api/utils/cors.js

// =========================================================================
// CORS УТИЛІТИ ДЛЯ API
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає функції для обробки CORS (Cross-Origin Resource Sharing).
// Дозволяє frontend додатку робити запити до API з різних доменів.
//
// ЕКСПОРТОВАНІ ФУНКЦІЇ:
// - setCorsHeaders(res): додає CORS заголовки до відповіді
// - handleCors(req, res, handler): обробляє CORS + preflight OPTIONS
// - corsMiddleware(handler): middleware для автоматичної обробки CORS
//
// CORS ПОЛІТИКА:
// - Origin: * (дозволено всі домени)
// - Methods: GET, POST, PUT, DELETE, OPTIONS
// - Headers: Content-Type, Authorization
// - Max-Age: 86400 (24 години для preflight кешування)
// =========================================================================

/**
 * Додає CORS headers до відповіді
 * @param {Object} res - Express response об'єкт
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Обробляє preflight запит OPTIONS та додає CORS headers
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @param {Function} handler - Функція handler для обробки запиту
 * @returns {Promise<any>} Результат виконання handler або пусту відповідь для OPTIONS
 */
function handleCors(req, res, handler) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return handler(req, res);
}

/**
 * Middleware для автоматичної обробки CORS
 * Обгортає handler функцію для додавання CORS підтримки
 * @param {Function} handler - API handler функція
 * @returns {Function} Обгорнута функція з CORS підтримкою
 */
function corsMiddleware(handler) {
  return (req, res) => handleCors(req, res, handler);
}

module.exports = {
  setCorsHeaders,
  handleCors,
  corsMiddleware,
};
