// api/utils/google-drive.js

// =========================================================================
// GOOGLE DRIVE API УТИЛІТИ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Надає функції для роботи з Google Drive API v3.
// Авторизація через OAuth2 refresh token (файли зберігаються на Drive користувача).
//
// СТРУКТУРА НА DRIVE:
// pinguin-v5/              ← GOOGLE_DRIVE_ROOT_FOLDER_ID
//   ├── brand-logos/       ← створюється автоматично
//   └── довідники/         ← довідники маркетплейсів
//       ├── rozetka/
//       ├── epicentr/
//       └── ...
//
// ЕКСПОРТОВАНІ ФУНКЦІЇ:
// ┌────────────────────────────┬──────────────────────────────┐
// │ uploadBrandLogo            │ Завантажити логотип бренду   │
// │ deleteBrandLogo            │ Видалити логотип з Drive     │
// │ uploadFile                 │ Завантажити файл у підпапку  │
// │ listFiles                  │ Список файлів у підпапці     │
// │ deleteFile                 │ Видалити файл з Drive        │
// └────────────────────────────┴──────────────────────────────┘
//
// КОНФІГУРАЦІЯ (з .env):
// - GOOGLE_OAUTH_CLIENT_ID: OAuth2 Client ID
// - GOOGLE_OAUTH_CLIENT_SECRET: OAuth2 Client Secret
// - GOOGLE_OAUTH_REFRESH_TOKEN: OAuth2 Refresh Token
// - GOOGLE_DRIVE_ROOT_FOLDER_ID: ID кореневої папки (pinguin-v5)
// =========================================================================

const { google } = require('googleapis');
const { Readable } = require('stream');

// Environment variables
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// Кеш ID підпапок (щоб не шукати кожен раз)
const folderCache = {};

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
// ПІДПАПКИ
// =========================================================================

/**
 * Знайти або створити підпапку в кореневій папці.
 * Результат кешується на час життя serverless function.
 *
 * @param {Object} drive - Google Drive client
 * @param {string} folderName - Назва підпапки (наприклад "brand-logos")
 * @returns {Promise<string>} ID підпапки
 */
async function getOrCreateSubfolder(drive, folderName) {
  if (folderCache[folderName]) return folderCache[folderName];

  // Шукаємо існуючу підпапку
  const res = await drive.files.list({
    q: `name='${folderName}' and '${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (res.data.files && res.data.files.length > 0) {
    folderCache[folderName] = res.data.files[0].id;
    return folderCache[folderName];
  }

  // Створюємо нову підпапку
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [ROOT_FOLDER_ID],
    },
    fields: 'id',
  });

  folderCache[folderName] = folder.data.id;
  return folderCache[folderName];
}

// =========================================================================
// ОПЕРАЦІЇ
// =========================================================================

/**
 * Завантажити логотип бренду в підпапку brand-logos на Google Drive.
 * Якщо файл з такою назвою вже існує — оновлює його.
 *
 * @param {Buffer} fileBuffer - Вміст файлу
 * @param {string} fileName - Ім'я файлу (наприклад "Optimum Nutrition.png")
 * @param {string} mimeType - MIME тип (image/png, image/jpeg, image/webp, image/svg+xml)
 * @returns {Promise<{fileId: string, thumbnailUrl: string}>}
 */
async function uploadBrandLogo(fileBuffer, fileName, mimeType) {
  const drive = getDriveClient();
  const folderId = await getOrCreateSubfolder(drive, 'brand-logos');

  // Шукаємо існуючий файл з такою назвою в папці
  const escapedName = fileName.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `name='${escapedName}' and '${folderId}' in parents and trashed=false`,
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
        parents: [folderId],
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

// =========================================================================
// ДОВІДНИКИ (REFERENCE FILES)
// =========================================================================

/**
 * Знайти або створити вкладену підпапку (parent → child).
 * Кешує результат на час життя serverless function.
 *
 * @param {Object} drive - Google Drive client
 * @param {string} parentId - ID батьківської папки
 * @param {string} folderName - Назва підпапки
 * @returns {Promise<string>} ID підпапки
 */
async function getOrCreateNestedFolder(drive, parentId, folderName) {
  const cacheKey = `${parentId}/${folderName}`;
  if (folderCache[cacheKey]) return folderCache[cacheKey];

  const escapedName = folderName.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name='${escapedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (res.data.files && res.data.files.length > 0) {
    folderCache[cacheKey] = res.data.files[0].id;
    return folderCache[cacheKey];
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  folderCache[cacheKey] = folder.data.id;
  return folderCache[cacheKey];
}

/**
 * Завантажити файл у вкладену підпапку довідники/{slug}/.
 * Якщо файл з такою назвою вже існує — замінює його.
 *
 * @param {Buffer} fileBuffer - Вміст файлу
 * @param {string} fileName - Ім'я файлу (наприклад "category_report_274390.xlsx")
 * @param {string} mimeType - MIME тип
 * @param {string} marketplaceSlug - Slug маркетплейсу (наприклад "rozetka")
 * @returns {Promise<{fileId: string, name: string, downloadUrl: string}>}
 */
async function uploadFile(fileBuffer, fileName, mimeType, marketplaceSlug) {
  const drive = getDriveClient();

  // довідники/ → довідники/{slug}/
  const referencesId = await getOrCreateSubfolder(drive, 'довідники');
  const mpFolderId = await getOrCreateNestedFolder(drive, referencesId, marketplaceSlug);

  // Шукаємо існуючий файл з такою назвою
  const escapedName = fileName.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `name='${escapedName}' and '${mpFolderId}' in parents and trashed=false`,
    fields: 'files(id)',
  });

  let fileId;

  if (existing.data.files && existing.data.files.length > 0) {
    // Оновлюємо існуючий
    fileId = existing.data.files[0].id;
    await drive.files.update({
      fileId,
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
    });
  } else {
    // Створюємо новий
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [mpFolderId],
      },
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
      fields: 'id',
    });
    fileId = response.data.id;

    // Робимо публічним для скачування
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return { fileId, name: fileName, downloadUrl };
}

/**
 * Список файлів у підпапці довідники/{slug}/.
 *
 * @param {string} marketplaceSlug - Slug маркетплейсу
 * @returns {Promise<Array<{fileId: string, name: string, mimeType: string, size: string, modifiedTime: string, downloadUrl: string}>>}
 */
async function listFiles(marketplaceSlug) {
  const drive = getDriveClient();

  // Знаходимо папку довідники/
  const referencesId = await getOrCreateSubfolder(drive, 'довідники');

  // Шукаємо підпапку маркетплейсу (не створюємо якщо немає)
  const escapedSlug = marketplaceSlug.replace(/'/g, "\\'");
  const folderRes = await drive.files.list({
    q: `name='${escapedSlug}' and '${referencesId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (!folderRes.data.files || folderRes.data.files.length === 0) {
    return []; // Папки немає — файлів немає
  }

  const mpFolderId = folderRes.data.files[0].id;

  // Список файлів у папці
  const res = await drive.files.list({
    q: `'${mpFolderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
    fields: 'files(id, name, mimeType, size, modifiedTime)',
    orderBy: 'modifiedTime desc',
  });

  return (res.data.files || []).map(f => ({
    fileId: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size || '0',
    modifiedTime: f.modifiedTime,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
  }));
}

/**
 * Видалити файл з Google Drive
 * @param {string} fileId - ID файлу
 */
async function deleteFile(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

module.exports = {
  uploadBrandLogo,
  deleteBrandLogo,
  uploadFile,
  listFiles,
  deleteFile,
};
