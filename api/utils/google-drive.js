// api/utils/google-drive.js

// =========================================================================
// GOOGLE DRIVE API УТИЛІТИ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає функції для роботи з Google Drive API v3.
// Використовує той же Service Account що і google-sheets.js,
// але зі скоупом drive.file (доступ тільки до файлів створених додатком).
//
// ЕКСПОРТОВАНІ ФУНКЦІЇ:
// ┌────────────────────────────┬──────────────────────────────┐
// │ uploadBrandLogo            │ Завантажити логотип бренду   │
// │ deleteBrandLogo            │ Видалити логотип з Drive     │
// └────────────────────────────┴──────────────────────────────┘
//
// КОНФІГУРАЦІЯ (з .env):
// - GOOGLE_SERVICE_ACCOUNT_EMAIL: email Service Account
// - GOOGLE_PRIVATE_KEY: приватний ключ
// - GOOGLE_DRIVE_BRAND_LOGOS_FOLDER_ID: ID папки brand-logos на Shared Drive
// =========================================================================

const { google } = require('googleapis');
const { Readable } = require('stream');

// Environment variables
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const BRAND_LOGOS_FOLDER_ID = process.env.GOOGLE_DRIVE_BRAND_LOGOS_FOLDER_ID;

// =========================================================================
// ІНІЦІАЛІЗАЦІЯ КЛІЄНТА
// =========================================================================

/**
 * Створює авторизованого клієнта Google Drive API v3
 * @returns {Object} Google Drive API client
 */
function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
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
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
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
      supportsAllDrives: true,
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
      supportsAllDrives: true,
    });
    fileId = response.data.id;

    // Робимо файл публічним (anyone з посиланням може переглядати)
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
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
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

module.exports = {
  uploadBrandLogo,
  deleteBrandLogo,
};
