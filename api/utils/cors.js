/**
 * Додає CORS headers до відповіді
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Обробляє preflight запит OPTIONS
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
 */
function corsMiddleware(handler) {
  return (req, res) => handleCors(req, res, handler);
}

module.exports = {
  setCorsHeaders,
  handleCors,
  corsMiddleware,
};
