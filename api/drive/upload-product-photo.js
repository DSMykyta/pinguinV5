// api/drive/upload-product-photo.js

// =========================================================================
// DRIVE UPLOAD API - PRODUCT PHOTOS
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Ендпоінт для завантаження фото товарів на Google Drive.
// Всі зображення конвертуються в WebP через sharp.
//
// ЕНДПОІНТ:
// - POST /api/drive/upload-product-photo
//
// РЕЖИМ:
// multipart/form-data
//   - field "file" — файл зображення
//   - field "brandId" — ID бренду (row number)
//   - field "productId" — ID товару (row number)
//   - field "photoIndex" — індекс фото (1-10)
//
// СТРУКТУРА НА DRIVE:
// pinguin-v5/товари/{brandId}/{productId}/{productId}_{index}.webp
// =========================================================================

const { corsMiddleware } = require('../_utils/cors');
const { uploadProductPhoto } = require('../_utils/google-drive');
const sharp = require('sharp');

const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
  'image/avif', 'image/gif', 'image/tiff',
];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

/**
 * Нормалізація назви (fallback для wizard, де немає ID).
 */
function normalizeName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '');
}

/**
 * Конвертує зображення в WebP
 */
async function convertToWebP(buffer) {
  return sharp(buffer)
    .webp({ quality: 85 })
    .toBuffer();
}

// =========================================================================
// MAIN HANDLER
// =========================================================================

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        error: 'Only multipart/form-data is supported',
      });
    }

    return await handleFileUpload(req, res);
  } catch (error) {
    console.error('Product photo upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// =========================================================================
// HANDLER: FILE UPLOAD
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
    let brandId = '';
    let productId = '';
    let brandName = '';
    let productName = '';
    let photoIndex = '1';
    let fileTooLarge = false;

    bb.on('field', (name, val) => {
      if (name === 'brandId') brandId = val;
      if (name === 'productId') productId = val;
      if (name === 'brandName') brandName = val;
      if (name === 'productName') productName = val;
      if (name === 'photoIndex') photoIndex = val;
    });

    bb.on('file', (name, stream, info) => {
      mimeType = info.mimeType;

      if (!ALLOWED_TYPES.includes(mimeType)) {
        stream.resume();
        resolve(res.status(400).json({
          error: `Непідтримуваний формат: ${mimeType}`,
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

      // Пріоритет: ID > name. ID = унікальні папки без дублікатів.
      const folderBrand = brandId || normalizeName(brandName);
      const folderProduct = productId || normalizeName(productName);

      if (!folderBrand || !folderProduct) {
        resolve(res.status(400).json({ error: 'brandId/brandName та productId/productName є обов\'язковими' }));
        return;
      }

      try {
        const webpBuffer = await convertToWebP(fileBuffer);

        const index = parseInt(photoIndex) || 1;

        const folderPath = `товари/${folderBrand}/${folderProduct}`;
        const fileName = `${folderProduct}_${index}.webp`;

        const result = await uploadProductPhoto(webpBuffer, fileName, 'image/webp', folderPath);

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

module.exports = corsMiddleware(handler);

module.exports.config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};
