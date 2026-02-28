// js/utils/api-client.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   API CLIENT — UNIFIED DATA LAYER                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Єдина точка для всіх операцій з Google Sheets та Drive       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const API_BASE = window.location.origin;
const API_SHEETS_PROXY = `${API_BASE}/api/sheets`; // Unified endpoint

/**
 * Виконує запит до backend з автоматичним додаванням токена
 */
async function apiRequest(url, options = {}) {
  const token = window.getAuthToken?.() || localStorage.getItem('auth_token');

  if (!token) {
    throw new Error('Not authorized');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Якщо токен протермінований - перезавантажуємо сторінку
      if (response.status === 401) {
        console.error('Token expired, reloading page');
        if (typeof window.handleSignOut === 'function') {
          window.handleSignOut();
        } else {
          window.location.reload();
        }
        throw new Error('Token expired');
      }

      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

/**
 * Google Sheets API: Читання діапазону
 * Замінює: gapi.client.sheets.spreadsheets.values.get()
 */
async function sheetsGet(range, spreadsheetType = 'main') {
  const data = await apiRequest(API_SHEETS_PROXY, {
    method: 'POST',
    body: JSON.stringify({
      action: 'get',
      range,
      spreadsheetType,
    }),
  });

  // Повертаємо дані у форматі схожому на gapi response
  return {
    result: {
      values: data.data || [],
    },
    data: data.data || [],
  };
}

/**
 * Google Sheets API: Batch читання
 * Замінює: gapi.client.sheets.spreadsheets.values.batchGet()
 */
async function sheetsBatchGet(ranges, spreadsheetType = 'main') {
  const data = await apiRequest(API_SHEETS_PROXY, {
    method: 'POST',
    body: JSON.stringify({
      action: 'batchGet',
      ranges,
      spreadsheetType,
    }),
  });

  // Повертаємо у форматі gapi
  return {
    result: {
      valueRanges: data.data || [],
    },
    data: data.data || [],
  };
}

/**
 * Google Sheets API: Оновлення діапазону
 * Замінює: gapi.client.sheets.spreadsheets.values.update()
 */
async function sheetsUpdate(range, values, spreadsheetType = 'main') {
  const data = await apiRequest(API_SHEETS_PROXY, {
    method: 'POST',
    body: JSON.stringify({
      action: 'update',
      range,
      values,
      spreadsheetType,
    }),
  });

  return {
    result: data.data,
    data: data.data,
  };
}

/**
 * Google Sheets API: Додавання рядків
 * Замінює: gapi.client.sheets.spreadsheets.values.append()
 */
async function sheetsAppend(range, values, spreadsheetType = 'main') {
  const data = await apiRequest(API_SHEETS_PROXY, {
    method: 'POST',
    body: JSON.stringify({
      action: 'append',
      range,
      values,
      spreadsheetType,
    }),
  });

  return {
    result: data.data,
    data: data.data,
  };
}

/**
 * Google Sheets API: Batch оновлення
 * Замінює: gapi.client.sheets.spreadsheets.values.batchUpdate()
 */
async function sheetsBatchUpdate(updateData, spreadsheetType = 'main') {
  const data = await apiRequest(API_SHEETS_PROXY, {
    method: 'POST',
    body: JSON.stringify({
      action: 'batchUpdate',
      data: updateData,
      spreadsheetType,
    }),
  });

  return {
    result: data.data,
    data: data.data,
  };
}

/**
 * Google Sheets API: Структурні зміни (видалення рядків, форматування)
 * Замінює: gapi.client.sheets.spreadsheets.batchUpdate()
 */
async function sheetsBatchUpdateSpreadsheet(requests, spreadsheetType = 'main') {
  const data = await apiRequest(API_SHEETS_PROXY, {
    method: 'POST',
    body: JSON.stringify({
      action: 'batchUpdateSpreadsheet',
      requests,
      spreadsheetType,
    }),
  });

  return {
    result: data.data,
    data: data.data,
  };
}

/**
 * Google Sheets API: Отримання списку аркушів
 * Замінює: gapi.client.sheets.spreadsheets.get()
 */
async function sheetsGetSheetNames(spreadsheetType = 'main') {
  const data = await apiRequest(API_SHEETS_PROXY, {
    method: 'POST',
    body: JSON.stringify({
      action: 'getSheetNames',
      spreadsheetType,
    }),
  });

  return {
    result: {
      sheets: data.data.map(sheet => ({
        properties: {
          title: sheet.title,
          sheetId: sheet.sheetId,
          index: sheet.index,
        },
      })),
    },
    data: data.data,
  };
}

// ============= Утиліти =============

/**
 * Показує помилку користувачу через toast
 */
async function showError(message) {
  console.error('API Error:', message);

  try {
    const { showToast } = await import('../components/feedback/toast.js');
    showToast(message, 'error');
  } catch {
    alert(message);
  }
}

/**
 * Обробник помилок для async/await
 */
function handleApiError(error, context = '') {
  const message = error.message || 'Невідома помилка';
  console.error(`${context} error:`, error);

  if (message.includes('Not authorized') || message.includes('Token expired')) {
    showError('Сесія закінчилася. Будь ласка, увійдіть знову');
  } else if (message.includes('Access to banned words')) {
    showError('У вас немає доступу до заборонених слів');
  } else if (message.includes('Viewers can only read')) {
    showError('У вас немає прав для редагування');
  } else {
    showError(`Помилка: ${message}`);
  }

  throw error;
}

// ============= HTTP методи для REST API =============

/**
 * GET запит
 */
async function httpGet(url) {
  return apiRequest(url, { method: 'GET' });
}

/**
 * POST запит
 */
async function httpPost(url, data) {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT запит
 */
async function httpPut(url, data) {
  return apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE запит
 */
async function httpDelete(url, data) {
  return apiRequest(url, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
}

// ============= UNIFIED SHEETS API =============

/**
 * Універсальна функція для всіх операцій з Google Sheets
 * Використовується всіма модулями (keywords, brands, banned-words, glossary)
 *
 * @param {string} action - Тип операції: 'get', 'batchGet', 'update', 'append', 'batchUpdate', 'batchUpdateSpreadsheet', 'getSheetNames'
 * @param {Object} params - Параметри операції
 * @param {string} params.range - Діапазон (для get, update, append)
 * @param {Array} params.ranges - Масив діапазонів (для batchGet)
 * @param {Array} params.values - Дані для запису (для update, append)
 * @param {Array} params.data - Дані для batch оновлення (для batchUpdate)
 * @param {Array} params.requests - Запити (для batchUpdateSpreadsheet)
 * @param {string} params.spreadsheetType - Тип таблиці: 'main', 'texts', 'users' (за замовчуванням 'main')
 * @returns {Promise<any>} Результат операції
 *
 * @example
 * // Читання даних
 * const data = await callSheetsAPI('get', { range: 'Brands!A:F', spreadsheetType: 'main' });
 *
 * @example
 * // Оновлення рядка
 * await callSheetsAPI('update', {
 *   range: 'Brands!A5:F5',
 *   values: [['id', 'name', 'alt', 'country', 'text', 'link']],
 *   spreadsheetType: 'main'
 * });
 *
 * @example
 * // Додавання нового рядка
 * await callSheetsAPI('append', {
 *   range: 'Brands!A:F',
 *   values: [['new-id', 'New Brand', '', '', '', '']],
 *   spreadsheetType: 'main'
 * });
 */
async function callSheetsAPI(action, params = {}) {
  const token = window.getAuthToken?.() || localStorage.getItem('auth_token');

  if (!token) {
    throw new Error('Authorization required. Please login first.');
  }

  const response = await fetch(API_SHEETS_PROXY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action, ...params })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  const result = await response.json();
  return result.data;
}

// ============= Google Drive API =============

const API_DRIVE_UPLOAD = `${API_BASE}/api/drive/upload`;

/**
 * Завантажити логотип бренду на Google Drive (файл).
 * @param {File} file - File об'єкт з input або drag-and-drop
 * @param {string} brandName - Назва бренду для іменування файлу
 * @returns {Promise<{success: boolean, thumbnailUrl: string, fileId: string}>}
 */
async function uploadBrandLogoFile(file, brandName) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('brandName', brandName);

  const response = await fetch(API_DRIVE_UPLOAD, {
    method: 'POST',
    body: formData,
    // НЕ встановлюємо Content-Type — браузер сам додасть boundary для FormData
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

/**
 * Завантажити логотип бренду на Google Drive з URL.
 * @param {string} imageUrl - URL зображення
 * @param {string} brandName - Назва бренду для іменування файлу
 * @returns {Promise<{success: boolean, thumbnailUrl: string, fileId: string}>}
 */
async function uploadBrandLogoUrl(imageUrl, brandName) {
  const response = await fetch(API_DRIVE_UPLOAD, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: imageUrl, brandName }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

// ============= Google Drive References API =============

const API_DRIVE_REFERENCES = `${API_BASE}/api/drive/references`;

/**
 * Завантажити довідник маркетплейсу на Google Drive.
 * @param {File} file - File об'єкт (xlsx, csv, etc.)
 * @param {string} marketplaceSlug - Slug маркетплейсу (наприклад "rozetka")
 * @returns {Promise<{success: boolean, fileId: string, name: string, downloadUrl: string}>}
 */
async function uploadReferenceFile(file, marketplaceSlug) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('marketplaceSlug', marketplaceSlug);

  const response = await fetch(API_DRIVE_REFERENCES, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

/**
 * Отримати список довідників маркетплейсу з Google Drive.
 * @param {string} marketplaceSlug - Slug маркетплейсу
 * @returns {Promise<Array<{fileId: string, name: string, mimeType: string, size: string, modifiedTime: string, downloadUrl: string}>>}
 */
async function listReferenceFiles(marketplaceSlug) {
  const response = await fetch(`${API_DRIVE_REFERENCES}?marketplace=${encodeURIComponent(marketplaceSlug)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to list files');
  return data.files || [];
}

/**
 * Видалити довідник з Google Drive.
 * @param {string} fileId - ID файлу на Google Drive
 * @returns {Promise<{success: boolean}>}
 */
async function deleteReferenceFile(fileId) {
  const response = await fetch(API_DRIVE_REFERENCES, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Delete failed');
  return data;
}

// ============= Експорт =============

// ES6 модульні експорти
export {
  callSheetsAPI,
  apiRequest,
  sheetsGet,
  sheetsBatchGet,
  sheetsUpdate,
  sheetsAppend,
  sheetsBatchUpdate,
  sheetsBatchUpdateSpreadsheet,
  sheetsGetSheetNames,
  handleApiError,
  uploadBrandLogoFile,
  uploadBrandLogoUrl,
  uploadReferenceFile,
  listReferenceFiles,
  deleteReferenceFile
};

// Глобальний об'єкт для доступу до API
window.apiClient = {
  // Основна функція запитів
  request: apiRequest,

  // HTTP методи
  get: httpGet,
  post: httpPost,
  put: httpPut,
  delete: httpDelete,

  // Google Sheets API методи
  sheets: {
    get: sheetsGet,
    batchGet: sheetsBatchGet,
    update: sheetsUpdate,
    append: sheetsAppend,
    batchUpdate: sheetsBatchUpdate,
    batchUpdateSpreadsheet: sheetsBatchUpdateSpreadsheet,
    getSheetNames: sheetsGetSheetNames,
  },

  // Універсальна функція (нова)
  callSheetsAPI,

  // Google Drive API
  drive: {
    uploadBrandLogoFile,
    uploadBrandLogoUrl,
    uploadReferenceFile,
    listReferenceFiles,
    deleteReferenceFile,
  },

  // Утиліти
  showError,
  handleApiError,
};

// Альтернативні експорти для зручності (window.*)
window.callSheetsAPI = callSheetsAPI;
window.sheetsGet = sheetsGet;
window.sheetsBatchGet = sheetsBatchGet;
window.sheetsUpdate = sheetsUpdate;
window.sheetsAppend = sheetsAppend;
window.sheetsBatchUpdate = sheetsBatchUpdate;
window.sheetsBatchUpdateSpreadsheet = sheetsBatchUpdateSpreadsheet;
window.sheetsGetSheetNames = sheetsGetSheetNames;

