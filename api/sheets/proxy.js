// api/sheets/proxy.js

// =========================================================================
// ПРОКСІ ДЛЯ ОПЕРАЦІЙ З GOOGLE SHEETS (З АВТОРИЗАЦІЄЮ)
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Універсальний проксі для всіх операцій з Google Sheets API.
// Підтримує контроль доступу на основі ролей (admin/editor/viewer).
//
// ЕНДПОІНТ: POST /api/sheets/proxy
// АВТОРИЗАЦІЯ: Bearer token (обов'язково)
//
// ПІДТРИМУВАНІ ОПЕРАЦІЇ (action):
// - get: читання одного діапазону
// - batchGet: пакетне читання декількох діапазонів
// - update: оновлення комірок
// - append: додавання нових рядків
// - batchUpdate: пакетне оновлення декількох діапазонів
// - batchUpdateSpreadsheet: структурні зміни (форматування, розміри)
// - getSheetNames: отримання списку всіх аркушів
//
// РОЛІ ТА ПРАВА:
// ┌─────────┬──────────┬────────────┬─────────┐
// │ Роль    │ Читання  │ Запис      │ Banned  │
// ├─────────┼──────────┼────────────┼─────────┤
// │ viewer  │ ✓        │ ✗          │ ✗       │
// │ editor  │ ✓        │ ✓          │ ✗       │
// │ admin   │ ✓        │ ✓          │ ✓       │
// └─────────┴──────────┴────────────┴─────────┘
//
// ПРИКЛАД ЗАПИТУ:
// POST /api/sheets/proxy
// Headers: { Authorization: 'Bearer <token>' }
// Body: { action: 'get', range: 'Sheet1!A1:B10', spreadsheetType: 'main' }
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const {
  getValues,
  batchGetValues,
  updateValues,
  appendValues,
  batchUpdate,
  batchUpdateSpreadsheet,
  getSheetNames,
} = require('../utils/google-sheets');

// =========================================================================
// ПЕРЕВІРКА ПРАВ ДОСТУПУ
// =========================================================================

/**
 * Перевіряє права доступу користувача для конкретної операції
 * @param {string} userRole - Роль користувача ('admin' | 'editor' | 'viewer')
 * @param {string} action - Тип операції ('get', 'update', 'batchUpdate', etc.)
 * @param {string} range - Діапазон комірок (опціонально)
 * @returns {Object} { allowed: boolean, error?: string }
 */
function checkPermissions(userRole, action, range) {
  // Viewer може тільки читати
  if (userRole === 'viewer') {
    const readOnlyActions = ['get', 'batchGet', 'getSheetNames'];
    if (!readOnlyActions.includes(action)) {
      return { allowed: false, error: 'Viewers can only read data' };
    }
  }

  // Editor не має доступу до заборонених слів (тільки admin)
  if (userRole === 'editor') {
    // Перевіряємо чи це не аркуш Banned
    if (range && (range.includes('Banned') || range.includes('banned'))) {
      return { allowed: false, error: 'Access to banned words is restricted to admins only' };
    }

    // Перевіряємо для batchGet та batchUpdate
    if (action === 'batchGet' || action === 'batchUpdate') {
      // Якщо це масив діапазонів/даних, перевіряємо кожен
      // Це буде перевірено на рівні виконання
    }
  }

  return { allowed: true };
}

// =========================================================================
// ГОЛОВНИЙ HANDLER
// =========================================================================

/**
 * Handler для проксі запитів до Google Sheets API
 * @param {Object} req - Express request об'єкт
 * @param {Object} req.headers - HTTP заголовки
 * @param {string} req.headers.authorization - Bearer токен
 * @param {Object} req.body - Тіло запиту
 * @param {string} req.body.action - Тип операції
 * @param {string} req.body.range - Діапазон (для get/update/append)
 * @param {Array} req.body.ranges - Масив діапазонів (для batchGet)
 * @param {Array} req.body.values - Дані для запису
 * @param {Array} req.body.data - Масив оновлень (для batchUpdate)
 * @param {Array} req.body.requests - Запити (для batchUpdateSpreadsheet)
 * @param {string} req.body.spreadsheetType - Тип таблиці ('main' | 'texts' | 'banned')
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом операції
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Перевірка авторизації
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { action, range, ranges, values, data, requests, spreadsheetType } = req.body;

    // Валідація action
    const validActions = [
      'get',
      'batchGet',
      'update',
      'append',
      'batchUpdate',
      'batchUpdateSpreadsheet',
      'getSheetNames',
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Перевірка прав доступу
    const permissionCheck = checkPermissions(decoded.role, action, range);
    if (!permissionCheck.allowed) {
      return res.status(403).json({ error: permissionCheck.error });
    }

    // Виконання операції
    let result;

    switch (action) {
      case 'get':
        if (!range) {
          return res.status(400).json({ error: 'Range is required for get action' });
        }
        result = await getValues(range, spreadsheetType);
        break;

      case 'batchGet':
        if (!ranges || !Array.isArray(ranges)) {
          return res.status(400).json({ error: 'Ranges array is required for batchGet action' });
        }
        // Додаткова перевірка для editor
        if (decoded.role === 'editor') {
          const hasBannedRange = ranges.some(r => r.includes('Banned') || r.includes('banned'));
          if (hasBannedRange) {
            return res.status(403).json({ error: 'Access to banned words is restricted to admins only' });
          }
        }
        result = await batchGetValues(ranges, spreadsheetType);
        break;

      case 'update':
        if (!range || !values) {
          return res.status(400).json({ error: 'Range and values are required for update action' });
        }
        result = await updateValues(range, values, spreadsheetType);
        break;

      case 'append':
        if (!range || !values) {
          return res.status(400).json({ error: 'Range and values are required for append action' });
        }
        result = await appendValues(range, values, spreadsheetType);
        break;

      case 'batchUpdate':
        if (!data || !Array.isArray(data)) {
          return res.status(400).json({ error: 'Data array is required for batchUpdate action' });
        }
        // Додаткова перевірка для editor
        if (decoded.role === 'editor') {
          const hasBannedRange = data.some(item =>
            item.range && (item.range.includes('Banned') || item.range.includes('banned'))
          );
          if (hasBannedRange) {
            return res.status(403).json({ error: 'Access to banned words is restricted to admins only' });
          }
        }
        result = await batchUpdate(data, spreadsheetType);
        break;

      case 'batchUpdateSpreadsheet':
        if (!requests || !Array.isArray(requests)) {
          return res.status(400).json({ error: 'Requests array is required for batchUpdateSpreadsheet action' });
        }
        result = await batchUpdateSpreadsheet(requests, spreadsheetType);
        break;

      case 'getSheetNames':
        result = await getSheetNames(spreadsheetType);
        break;

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Sheets proxy error:', error);

    // Повертаємо більш детальну помилку в development
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message,
        stack: error.stack,
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = corsMiddleware(handler);
