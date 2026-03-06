// api/drive/images.js

// =========================================================================
// DRIVE IMAGES API - СПИСОК ЗОБРАЖЕНЬ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Ендпоінт для отримання списку всіх зображень з Google Drive.
// Рекурсивно обходить всі папки починаючи з ROOT_FOLDER_ID.
//
// ЕНДПОІНТ:
// - GET /api/drive/images  -> список всіх зображень
//
// ВІДПОВІДЬ:
// { success: true, images: [{ fileId, name, mimeType, size, modifiedTime, thumbnailUrl, folder }] }
// =========================================================================

const { corsMiddleware } = require('../utils/cors');

const { google } = require('googleapis');

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

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

/**
 * Рекурсивно збирає всі зображення з папки та її підпапок.
 * @param {Object} drive - Google Drive client
 * @param {string} folderId - ID папки
 * @param {string} folderPath - Шлях до папки (для відображення)
 * @returns {Promise<Array>}
 */
async function listImagesRecursive(drive, folderId, folderPath = '') {
  const images = [];

  // Отримуємо всі файли та папки в поточній папці
  let pageToken = null;
  const allFiles = [];

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, imageMediaMetadata)',
      pageSize: 1000,
      pageToken: pageToken || undefined,
    });

    allFiles.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const folders = [];

  for (const file of allFiles) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      folders.push(file);
    } else if (file.mimeType.startsWith('image/')) {
      const width = file.imageMediaMetadata?.width;
      const height = file.imageMediaMetadata?.height;

      images.push({
        fileId: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size || '0',
        modifiedTime: file.modifiedTime,
        width: width || null,
        height: height || null,
        thumbnailUrl: `https://lh3.googleusercontent.com/d/${file.id}`,
        folder: folderPath,
      });
    }
  }

  // Рекурсивно обходимо підпапки
  const subResults = await Promise.all(
    folders.map(f => listImagesRecursive(drive, f.id, folderPath ? `${folderPath}/${f.name}` : f.name))
  );

  for (const sub of subResults) {
    images.push(...sub);
  }

  return images;
}

// =========================================================================
// MAIN HANDLER
// =========================================================================

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!ROOT_FOLDER_ID) {
      return res.status(500).json({ error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured' });
    }

    const drive = getDriveClient();
    const images = await listImagesRecursive(drive, ROOT_FOLDER_ID);

    return res.status(200).json({ success: true, images });
  } catch (error) {
    console.error('Drive images list error:', error);
    return res.status(500).json({
      error: 'Failed to list images',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = corsMiddleware(handler);

module.exports.config = {
  maxDuration: 30,
};
