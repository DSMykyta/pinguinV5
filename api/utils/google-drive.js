// api/utils/google-drive.js

// =========================================================================
// GOOGLE DRIVE API УТИЛІТИ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає функції для роботи з Google Drive API v3.
// Авторизація через OAuth2 refresh token (файли зберігаються на Drive користувача).
//
// ЕКСПОРТОВАНІ ФУНКЦІЇ:
// ┌────────────────────────────┬──────────────────────────────┐
// │ uploadBrandLogo            │ Завантажити логотип бренду   │
// │ deleteBrandLogo            │ Видалити логотип з Drive     │
// └────────────────────────────┴──────────────────────────────┘
//
// КОНФІГУРАЦІЯ (з .env):
// - GOOGLE_OAUTH_CLIENT_ID: OAuth2 Client ID
// - GOOGLE_OAUTH_CLIENT_SECRET: OAuth2 Client Secret
// - GOOGLE_OAUTH_REFRESH_TOKEN: OAuth2 Refresh Token
// - GOOGLE_DRIVE_BRAND_LOGOS_FOLDER_ID: ID папки brand-logos на Drive
// =========================================================================

const { google } = require('googleapis');
const { Readable } = require('stream');

// Environment variables
const BRAND_LOGOS_FOLDER_ID = process.env.GOOGLE_DRIVE_BRAND_LOGOS_FOLDER_ID;

// =========================================================================
// ІНІЦІАЛІЗАЦІЯ КЛІЄНТА
// =========================================================================

/**
 * Створює авторизованого клієнта Google Drive API v3
 * через OAuth2 refresh token (квота зараховується на акаунт користувача)
 * @returns {Object} Google Drive API client
 */
function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// =========================================================================
// ОПЕРАЦІЇ
// =========================================================================

/**
 * Завантажити логотип бренду в папку brand-logos на Google Drive.
 * Якщо файл з такою назвою вже існує — оновлює його.
 *
 * @param {Buffer} fileBuffer - Вміст файлу
 * @param {string} fileName - Ім'я файлу (наприклад "Optimum Nutrition.png")
 * @param {string} mimeType - MIME тип (image/png, image/jpeg, image/webp, image/svg+xml)
 * @returns {Promise<{fileId: string, thumbnailUrl: string}>}
 */
async function uploadBrandLogo(fileBuffer, fileName, mimeType) {
  const drive = getDriveClient();

  // Шукаємо існуючий файл з такою назвою в папці
  const escapedName = fileName.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `name='${escapedName}' and '${BRAND_LOGOS_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id, name)',
  });

  let fileId;

  if (existing.data.files && existing.data.files.length > 0) {
    // Оновлюємо існуючий файл
    fileId = existing.data.files[0].id;
    await drive.files.update({
      fileId,
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
    });
  } else {
    // Створюємо новий файл
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [BRAND_LOGOS_FOLDER_ID],
      },
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
      fields: 'id',
    });
    fileId = response.data.id;

    // Робимо файл публічним (anyone з посиланням може переглядати)
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  // Публічний URL для відображення в <img>
  const thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

  return { fileId, thumbnailUrl };
}

/**
 * Видалити логотип бренду з Google Drive
 * @param {string} fileId - ID файлу на Google Drive
 */
async function deleteBrandLogo(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

module.exports = {
  uploadBrandLogo,
  deleteBrandLogo,
};
