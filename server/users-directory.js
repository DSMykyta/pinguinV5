// server/users-directory.js

// =========================================================================
// USERS DIRECTORY DATA SERVICE
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Формує безпечний read-only каталог користувачів для приватного auth API.
// Читає тільки дозволені колонки, не завантажуючи password hash або role.
//
// ДОЗВОЛЕНІ ПОЛЯ:
// - id, username, display_name, avatar
// =========================================================================

const { batchGetValues } = require('./utils/google-sheets');
const { isKnownRole } = require('./access-policy');

async function loadUsersDirectory() {
  const valueRanges = await batchGetValues([
    'Users!A2:B1000',
    'Users!D2:D1000',
    'Users!G2:H1000',
    'Users!O2:O1000',
  ], 'users');
  const identityRows = valueRanges[0]?.values || [];
  const roleRows = valueRanges[1]?.values || [];
  const profileRows = valueRanges[2]?.values || [];
  const statusRows = valueRanges[3]?.values || [];

  return identityRows
    .map((identityRow, index) => {
      const profileRow = profileRows[index] || [];

      return {
        id: identityRow[0] || '',
        username: identityRow[1] || '',
        display_name: profileRow[0] || identityRow[1] || '',
        avatar: profileRow[1] || '',
        role: String(roleRows[index]?.[0] || '').trim().toLowerCase(),
        status: String(statusRows[index]?.[0] || 'active').trim().toLowerCase(),
      };
    })
    .filter(user => (
      (user.id || user.username)
      && user.status === 'active'
      && isKnownRole(user.role)
    ))
    .map(({ role, status, ...user }) => user);
}

module.exports = {
  loadUsersDirectory,
};
