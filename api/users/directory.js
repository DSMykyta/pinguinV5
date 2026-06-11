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

const { corsMiddleware } = require('../utils/cors');
const { requireAccessToken } = require('../utils/auth-guard');
const { getValues } = require('../utils/google-sheets');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAccessToken(req, res)) return;

  try {
    const [identityRows, profileRows] = await Promise.all([
      getValues('Users!A2:B1000', 'users'),
      getValues('Users!G2:H1000', 'users'),
    ]);

    const users = identityRows
      .map((identityRow, index) => {
        const profileRow = profileRows[index] || [];

        return {
          id: identityRow[0] || '',
          username: identityRow[1] || '',
          display_name: profileRow[0] || identityRow[1] || '',
          avatar: profileRow[1] || '',
        };
      })
      .filter(user => user.id || user.username);

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
