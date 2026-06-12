// api/users/directory.js

// =========================================================================
// USERS DIRECTORY API
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає авторизованому frontend безпечний read-only каталог користувачів для
// підписів, аватарів і призначення задач без доступу до повного Users sheet.
//
// ЕНДПОІНТ:
// - GET /api/users/directory
// - Авторизація: валідний access JWT
//
// ДОЗВОЛЕНІ ПОЛЯ:
// - id, username, display_name, avatar
//
// ПОЛІТИКА БЕЗПЕКИ:
// - password hash, role, timestamps, menu та інші колонки не повертаються.
// - універсальний /api/sheets як і раніше забороняє spreadsheetType "users".
// =========================================================================

const { corsMiddleware } = require('../../server/utils/cors');
const { authenticateAccount } = require('../../server/accounts');
const { loadUsersDirectory } = require('../../server/users-directory');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!await authenticateAccount(req, res)) return;

  try {
    const users = await loadUsersDirectory();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Users directory error:', error);
    return res.status(500).json({
      error: 'Failed to load users directory',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = corsMiddleware(handler);
