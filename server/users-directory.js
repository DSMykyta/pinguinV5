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

const { getValues } = require('./utils/google-sheets');

async function loadUsersDirectory() {
  const [identityRows, profileRows] = await Promise.all([
    getValues('Users!A2:B1000', 'users'),
    getValues('Users!G2:H1000', 'users'),
  ]);

  return identityRows
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
}

module.exports = {
  loadUsersDirectory,
};
