// api/drive/upload.js

// =========================================================================
// DRIVE UPLOAD API - BRAND LOGOS
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Ендпоінт для завантаження логотипів брендів на Google Drive.
//
// ЕНДПОІНТ:
// - POST /api/drive/upload
//
// РЕЖИМИ:
// 1. multipart/form-data → завантаження файлу (drag-and-drop, file input)
//    - field "file" — файл зображення
//    - field "brandName" — назва бренду для іменування файлу
//
// 2. application/json → завантаження з URL
//    - { url: "https://...", brandName: "..." }
//
// ОБМЕЖЕННЯ:
// - Формати: PNG, JPG, WebP, SVG
// - Розмір: до 4 MB
// - Ім'я файлу на Drive: "{brandName}.{ext}"
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { uploadBrandLogo } = require('../utils/google-drive');

// Дозволені MIME типи (оголошено тут щоб config був внизу після module.exports)

// Дозволені MIME типи
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

// Розширення за MIME типом
const EXT_MAP = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

// =========================================================================
// MAIN HANDLER
// =========================================================================

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      return await handleFileUpload(req, res);
    } else if (contentType.includes('application/json')) {
      return await handleUrlUpload(req, res);
    } else {
      return res.status(400).json({
        error: 'Unsupported content type. Use multipart/form-data or application/json',
      });
    }
  } catch (error) {
    console.error('Drive upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// =========================================================================
// HANDLER: FILE UPLOAD (multipart/form-data)
// =========================================================================

async function handleFileUpload(req, res) {
  const busboy = require('busboy');

  return new Promise((resolve) => {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_SIZE },
    });

    let fileBuffer = null;
    let mimeType = '';
    let brandName = '';
    let fileTooLarge = false;

    bb.on('field', (name, val) => {
      if (name === 'brandName') brandName = val;
    });

    bb.on('file', (name, stream, info) => {
      mimeType = info.mimeType;

      // Валідація MIME типу
      if (!ALLOWED_TYPES.includes(mimeType)) {
        stream.resume();
        resolve(res.status(400).json({
          error: `Непідтримуваний формат: ${mimeType}. Дозволені: PNG, JPG, WebP, SVG`,
        }));
        return;
      }

      const chunks = [];

      stream.on('data', (chunk) => chunks.push(chunk));

      stream.on('limit', () => {
        fileTooLarge = true;
      });

      stream.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on('finish', async () => {
      if (fileTooLarge) {
        resolve(res.status(400).json({ error: 'Файл занадто великий. Максимум 4 MB' }));
        return;
      }

      if (!fileBuffer) {
        resolve(res.status(400).json({ error: 'Файл не надано' }));
        return;
      }

      if (!brandName) {
        resolve(res.status(400).json({ error: 'brandName є обов\'язковим полем' }));
        return;
      }

      try {
        const ext = EXT_MAP[mimeType] || '.png';
        const driveName = `${brandName}${ext}`;

        const result = await uploadBrandLogo(fileBuffer, driveName, mimeType);
        resolve(res.status(200).json({
          success: true,
          thumbnailUrl: result.thumbnailUrl,
          fileId: result.fileId,
        }));
      } catch (error) {
        console.error('Upload to Drive failed:', error);
        resolve(res.status(500).json({ error: 'Помилка завантаження на Google Drive' }));
      }
    });

    bb.on('error', (err) => {
      console.error('Busboy error:', err);
      resolve(res.status(500).json({ error: 'Помилка обробки файлу' }));
    });

    req.pipe(bb);
  });
}

// =========================================================================
// HANDLER: URL UPLOAD (application/json)
// =========================================================================

async function handleUrlUpload(req, res) {
  const body = await parseJsonBody(req);
  const { url, brandName } = body;

  if (!url) {
    return res.status(400).json({ error: 'url є обов\'язковим полем' });
  }
  if (!brandName) {
    return res.status(400).json({ error: 'brandName є обов\'язковим полем' });
  }

  // Завантажити зображення з URL
  const response = await fetch(url);
  if (!response.ok) {
    return res.status(400).json({
      error: `Не вдалося завантажити зображення з URL: ${response.status}`,
    });
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const mimeType = contentType.split(';')[0].trim();

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return res.status(400).json({
      error: `URL повернув непідтримуваний тип: ${mimeType}. Дозволені: PNG, JPG, WebP, SVG`,
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  if (fileBuffer.length > MAX_SIZE) {
    return res.status(400).json({ error: 'Зображення занадто велике. Максимум 4 MB' });
  }

  const ext = EXT_MAP[mimeType] || '.png';
  const driveName = `${brandName}${ext}`;

  const result = await uploadBrandLogo(fileBuffer, driveName, mimeType);
  return res.status(200).json({
    success: true,
    thumbnailUrl: result.thumbnailUrl,
    fileId: result.fileId,
  });
}

// =========================================================================
// UTILS
// =========================================================================

/**
 * Парсинг JSON body з raw request (бо bodyParser вимкнено)
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

module.exports = corsMiddleware(handler);

// Vercel конфігурація:
// - bodyParser: false — потрібно для multipart/form-data
// - maxDuration: 30 — завантаження на Drive може зайняти час (авторизація + upload + permissions)
module.exports.config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};
