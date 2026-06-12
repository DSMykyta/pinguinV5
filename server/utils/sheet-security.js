// server/utils/sheet-security.js

// =========================================================================
// GOOGLE SHEETS ACCESS POLICY
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Централізована перевірка дозволених spreadsheetType, назв аркушів і
// структурних операцій перед викликом Google Sheets API.
//
// ЕКСПОРТИ:
// - extractSheetName(range): безпечно дістає точну назву аркуша з A1 range.
// - isExactAllowedSheet(name, set): точна whitelist-перевірка.
// - validateUniversalSheetsRequest(body): політика універсального endpoint.
//
// ПОЛІТИКА БЕЗПЕКИ:
// - spreadsheetType "users" заборонений через /api/sheets.
// - Невідомі spreadsheetType не падають назад на "main".
// - tasks має доступ лише до аркуша Tasks.
// - Публічні whitelist-и працюють тільки за точною назвою.
// =========================================================================

const PUBLIC_SHEETS = new Set([
  'SEO',
  'Тригери',
  'Співставлення',
  'Глосарій',
  'Сутності',
  'Тексти',
  'Посилання',
  'Заборонені',
]);

const PUBLIC_DATA_SHEETS = new Set([
  'Banned',
  'Links',
  'Mapper_MP_Categories',
]);

const UNIVERSAL_SPREADSHEET_TYPES = new Set([
  'main',
  'texts',
  'price',
  'products',
  'tasks',
  'banned',
]);

const TASKS_SHEET_NAME = 'Tasks';
const TASKS_SHEET_ID = Number(process.env.SPREADSHEET_TASKS_SHEET_ID || 2095262750);

function extractSheetName(range) {
  if (typeof range !== 'string') return null;

  const value = range.trim();
  if (!value) return null;

  if (value.startsWith("'")) {
    let name = '';

    for (let index = 1; index < value.length; index += 1) {
      const char = value[index];

      if (char === "'" && value[index + 1] === "'") {
        name += "'";
        index += 1;
        continue;
      }

      if (char === "'" && value[index + 1] === '!') {
        return name;
      }

      name += char;
    }

    return null;
  }

  const separator = value.indexOf('!');
  return separator === -1 ? value : value.slice(0, separator).trim();
}

function isExactAllowedSheet(sheetName, allowedSheets) {
  return typeof sheetName === 'string' && allowedSheets.has(sheetName);
}

function validateUniversalSheetsRequest(body = {}) {
  const spreadsheetType = body.spreadsheetType || 'main';

  if (spreadsheetType === 'users') {
    return { allowed: false, status: 403, error: 'Access to users spreadsheet is forbidden' };
  }

  if (!UNIVERSAL_SPREADSHEET_TYPES.has(spreadsheetType)) {
    return { allowed: false, status: 403, error: 'Spreadsheet type is not allowed' };
  }

  if (spreadsheetType !== 'tasks') {
    return { allowed: true, spreadsheetType };
  }

  return validateTasksRequest(body);
}

function validateTasksRequest(body) {
  const { action } = body;

  if (action === 'getSheetNames') {
    return { allowed: false, status: 403, error: 'Listing sheets is forbidden for tasks spreadsheet' };
  }

  if (action === 'batchUpdateSpreadsheet') {
    const requests = Array.isArray(body.requests) ? body.requests : [];
    const allowed = requests.length > 0 && requests.every(isAllowedTasksStructuralRequest);

    return allowed
      ? { allowed: true, spreadsheetType: 'tasks' }
      : { allowed: false, status: 403, error: 'Structural request is not allowed for tasks spreadsheet' };
  }

  const ranges = getRequestRanges(body);
  const allowed = ranges.length > 0
    && ranges.every(range => extractSheetName(range) === TASKS_SHEET_NAME);

  return allowed
    ? { allowed: true, spreadsheetType: 'tasks' }
    : { allowed: false, status: 403, error: 'Only the Tasks sheet is allowed for tasks spreadsheet' };
}

function getRequestRanges(body) {
  switch (body.action) {
    case 'get':
    case 'update':
    case 'append':
      return body.range ? [body.range] : [];
    case 'batchGet':
      return Array.isArray(body.ranges) ? body.ranges : [];
    case 'batchUpdate':
      return Array.isArray(body.data)
        ? body.data.map(item => item?.range)
        : [];
    default:
      return [];
  }
}

function isAllowedTasksStructuralRequest(request) {
  const range = request?.deleteDimension?.range;

  return Boolean(
    range
    && Number(range.sheetId) === TASKS_SHEET_ID
    && range.dimension === 'ROWS'
    && Number.isInteger(range.startIndex)
    && Number.isInteger(range.endIndex)
    && range.startIndex >= 0
    && range.endIndex > range.startIndex
  );
}

module.exports = {
  PUBLIC_DATA_SHEETS,
  PUBLIC_SHEETS,
  TASKS_SHEET_ID,
  extractSheetName,
  isExactAllowedSheet,
  validateUniversalSheetsRequest,
};
