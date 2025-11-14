/**
 * API Client для роботи з backend
 * Замінює прямі виклики до gapi.client.sheets
 */

const API_BASE = window.location.origin;
const API_SHEETS_PROXY = `${API_BASE}/api/sheets`; // Unified endpoint

/**
 * Виконує запит до backend з автоматичним додаванням токена
 */
async function apiRequest(url, options = {}) {
  const token = window.getAuthToken?.();

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
 * Показує помилку користувачу (можна використовувати існуючий toast)
 */
function showError(message) {
  console.error('API Error:', message);

  // Якщо є система тостів - використовуємо її
  if (typeof window.showToast === 'function') {
    window.showToast(message, 'error');
  } else {
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

// ============= Експорт =============

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

  // Утиліти
  showError,
  handleApiError,
};

// Альтернативні експорти для зручності
window.sheetsGet = sheetsGet;
window.sheetsBatchGet = sheetsBatchGet;
window.sheetsUpdate = sheetsUpdate;
window.sheetsAppend = sheetsAppend;
window.sheetsBatchUpdate = sheetsBatchUpdate;
window.sheetsBatchUpdateSpreadsheet = sheetsBatchUpdateSpreadsheet;
window.sheetsGetSheetNames = sheetsGetSheetNames;

console.log('API Client initialized');
