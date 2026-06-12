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

async function loadUsersDirectory() {
  const valueRanges = await batchGetValues([
    'Users!A2:B1000',
    'Users!G2:J1000',
  ], 'users');
  const identityRows = valueRanges[0]?.values || [];
  const profileRows = valueRanges[1]?.values || [];

  return identityRows
    .map((identityRow, index) => {
      const profileRow = profileRows[index] || [];

      return {
        id: identityRow[0] || '',
        username: identityRow[1] || '',
        display_name: profileRow[0] || identityRow[1] || '',
        avatar: profileRow[1] || '',
        status: String(profileRow[3] || 'active').trim().toLowerCase(),
      };
    })
    .filter(user => (user.id || user.username) && user.status === 'active')
    .map(({ status, ...user }) => user);
}

module.exports = {
  loadUsersDirectory,
};
