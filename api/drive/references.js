// api/drive/references.js

// =========================================================================
// DRIVE REFERENCES API - ДОВІДНИКИ МАРКЕТПЛЕЙСІВ
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Ендпоінт для роботи з файлами довідників маркетплейсів на Google Drive.
// Файли зберігаються в структурі: довідники/{marketplace_slug}/filename.xlsx
//
// ЕНДПОІНТИ:
// - POST   /api/drive/references             → завантажити файл (multipart: file + marketplaceSlug)
// - GET    /api/drive/references?marketplace= → список файлів маркетплейсу
// - DELETE /api/drive/references              → видалити файл (JSON: { fileId })
//
// ОБМЕЖЕННЯ:
// - Формати: xlsx, xls, csv, json, txt, pdf
// - Розмір: до 10 MB
// =========================================================================

const { corsMiddleware } = require('../utils/cors');
const { uploadFile, listFiles, deleteFile } = require('../utils/google-drive');

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                          // .xls
  'text/csv',                                                          // .csv
  'application/json',                                                  // .json
  'text/plain',                                                        // .txt
  'application/pdf',                                                   // .pdf
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// =========================================================================
// UTILS
// =========================================================================

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

// =========================================================================
// MAIN HANDLER
// =========================================================================

async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      return await handleUpload(req, res);
    } else if (req.method === 'GET') {
      return await handleList(req, res);
    } else if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Drive references error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// =========================================================================
// HANDLER: UPLOAD (POST multipart/form-data)
// =========================================================================

async function handleUpload(req, res) {
  const busboy = require('busboy');

  return new Promise((resolve) => {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_SIZE },
    });

    let fileBuffer = null;
    let originalName = '';
    let mimeType = '';
    let marketplaceSlug = '';
    let fileTooLarge = false;

    bb.on('field', (name, val) => {
      if (name === 'marketplaceSlug') marketplaceSlug = val;
    });

    bb.on('file', (name, stream, info) => {
      originalName = info.filename || 'file';
      mimeType = info.mimeType;

      if (!ALLOWED_TYPES.includes(mimeType)) {
        stream.resume();
        resolve(res.status(400).json({
          error: `Непідтримуваний формат: ${mimeType}. Дозволені: xlsx, xls, csv, json, txt, pdf`,
        }));
        return;
      }

      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('limit', () => { fileTooLarge = true; });
      stream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on('finish', async () => {
      if (fileTooLarge) {
        resolve(res.status(400).json({ error: 'Файл занадто великий. Максимум 10 MB' }));
        return;
      }
      if (!fileBuffer) {
        resolve(res.status(400).json({ error: 'Файл не надано' }));
        return;
      }
      if (!marketplaceSlug) {
        resolve(res.status(400).json({ error: 'marketplaceSlug є обов\'язковим полем' }));
        return;
      }

      try {
        const result = await uploadFile(fileBuffer, originalName, mimeType, marketplaceSlug);
        resolve(res.status(200).json({
          success: true,
          fileId: result.fileId,
          name: result.name,
          downloadUrl: result.downloadUrl,
        }));
      } catch (error) {
        console.error('Upload reference failed:', error);
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
// HANDLER: LIST (GET ?marketplace=slug)
// =========================================================================

async function handleList(req, res) {
  const { marketplace } = req.query;

  if (!marketplace) {
    return res.status(400).json({
      error: 'marketplace parameter is required',
      example: '/api/drive/references?marketplace=rozetka',
    });
  }

  const files = await listFiles(marketplace);
  return res.status(200).json({ success: true, files });
}

// =========================================================================
// HANDLER: DELETE (DELETE with JSON body { fileId })
// =========================================================================

async function handleDelete(req, res) {
  const body = await parseJsonBody(req);
  const { fileId } = body;

  if (!fileId) {
    return res.status(400).json({ error: 'fileId є обов\'язковим полем' });
  }

  await deleteFile(fileId);
  return res.status(200).json({ success: true });
}

module.exports = corsMiddleware(handler);

module.exports.config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};
