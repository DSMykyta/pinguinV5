# 📊 МАНУАЛ: РОБОТА З GOOGLE SHEETS ТАБЛИЦЯМИ

> **Версія:** 1.0
> **Дата:** 2025-01-16
> **Проєкт:** PinguinV5

---

## 📑 ЗМІСТ

1. [Архітектура](#архітектура)
2. [Конфігурація](#конфігурація)
3. [Frontend API](#frontend-api)
4. [Backend API](#backend-api)
5. [Banned Words - Приклади](#banned-words---приклади)
6. [Entities - Приклади](#entities---приклади)
7. [Утиліти](#утиліти)
8. [Best Practices](#best-practices)

---

## 🏗️ АРХІТЕКТУРА

### Структура шарів

```
┌─────────────────────────────────────────────────────────┐
│           FRONTEND (Client-side)                        │
│  js/utils/api-client.js                                │
│  js/utils/google-sheets-batch.js                       │
│  js/banned-words/*.js                                  │
│  js/entities/*.js                                      │
├─────────────────────────────────────────────────────────┤
│           BACKEND (Node.js API Layer)                   │
│  /api/sheets/index.js                                  │
│  /api/utils/google-sheets.js                           │
├─────────────────────────────────────────────────────────┤
│      GOOGLE SHEETS API V4                              │
│  Service Account Authentication                        │
└─────────────────────────────────────────────────────────┘
```

### Три таблиці в системі

| Тип | Spreadsheet ID | Призначення |
|-----|---------------|-------------|
| `main` | `1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk` | Заборонені слова, сутності |
| `texts` | `1qQ2ob8zsgSfE1G64SorpdbW0xYLOdPfw_cbAH23xUhM` | Тексти товарів |
| `users` | `1XE9C6eByiQOoJ_3WNewlMO4QjUpSR-eXI-M6eDn20ls` | База користувачів |

---

## ⚙️ КОНФІГУРАЦІЯ

### Backend Environment Variables

```env
# .env файл
GOOGLE_SERVICE_ACCOUNT_EMAIL=pinguin-v5-backend@spatial-vision-473814-d7.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

SPREADSHEET_ID=1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk
SPREADSHEET_ID_TEXTS=1qQ2ob8zsgSfE1G64SorpdbW0xYLOdPfw_cbAH23xUhM
SPREADSHEET_ID_USERS=1XE9C6eByiQOoJ_3WNewlMO4QjUpSR-eXI-M6eDn20ls

JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
```

### Frontend Constants

```javascript
// js/banned-words/banned-words-init.js
const TEXTS_SPREADSHEET_ID = '1qQ2ob8zsgSfE1G64SorpdbW0xYLOdPfw_cbAH23xUhM';
const BANNED_SPREADSHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
const BANNED_SHEET_GID = '1742878044';

// js/entities/entities-data.js
const SPREADSHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
```

---

## 🎯 FRONTEND API

### Global API Client

**Файл:** `js/utils/api-client.js`

```javascript
// Доступний глобально як window.apiClient
window.apiClient = {
  // HTTP методи
  get: (url, options) => httpGet(url, options),
  post: (url, data, options) => httpPost(url, data, options),
  put: (url, data, options) => httpPut(url, data, options),
  delete: (url, options) => httpDelete(url, options),

  // Google Sheets методи
  sheets: {
    get: (range, spreadsheetType) => sheetsGet(range, spreadsheetType),
    batchGet: (ranges, spreadsheetType) => sheetsBatchGet(ranges, spreadsheetType),
    update: (range, values, spreadsheetType) => sheetsUpdate(range, values, spreadsheetType),
    append: (range, values, spreadsheetType) => sheetsAppend(range, values, spreadsheetType),
    batchUpdate: (data, spreadsheetType) => sheetsBatchUpdate(data, spreadsheetType),
    batchUpdateSpreadsheet: (requests, spreadsheetType) => sheetsBatchUpdateSpreadsheet(requests, spreadsheetType),
    getSheetNames: (spreadsheetType) => sheetsGetSheetNames(spreadsheetType),
  }
};
```

### Основні операції

#### 1. Отримати діапазон

```javascript
// Завантажити заголовки
const result = await window.apiClient.sheets.get(
  'Products!1:1',
  'texts'
);

// result.values = [["id", "title", "descriptionUkr", ...]]
```

#### 2. Batch Get (кілька діапазонів одночасно)

```javascript
const ranges = [
  'Products!A2:A',      // ID колонка
  'Products!B2:B',      // Назва
  'Products!G2:G'       // Статус перевірки
];

const result = await window.apiClient.sheets.batchGet(ranges, 'texts');

// result.valueRanges = [
//   { range: 'Products!A2:A', values: [["1"], ["2"], ...] },
//   { range: 'Products!B2:B', values: [["Товар 1"], ["Товар 2"], ...] },
//   { range: 'Products!G2:G', values: [["FALSE"], ["TRUE"], ...] }
// ]
```

#### 3. Оновити комірки

```javascript
// Одна комірка
await window.apiClient.sheets.update(
  'Products!G10',
  [['TRUE']],
  'texts'
);

// Кілька комірок в одному діапазоні
await window.apiClient.sheets.update(
  'Products!A2:C2',
  [["ID", "Назва", "Опис"]],
  'main'
);
```

#### 4. Batch Update (масові оновлення)

```javascript
const data = [
  { range: 'Products!G10', values: [['TRUE']] },
  { range: 'Products!G11', values: [['TRUE']] },
  { range: 'Products!G12', values: [['FALSE']] }
];

await window.apiClient.sheets.batchUpdate(data, 'texts');
```

#### 5. Додати рядки в кінець

```javascript
const values = [
  ["Новий ID", "Нова назва", "Опис"],
  ["ID 2", "Назва 2", "Опис 2"]
];

await window.apiClient.sheets.append(
  'Products!A:C',
  values,
  'texts'
);
```

#### 6. Отримати список аркушів

```javascript
const sheetNames = await window.apiClient.sheets.getSheetNames('texts');
// ["Products", "Categories", "Brands", ...]
```

---

## 🔧 BACKEND API

### Unified Endpoint

**URL:** `POST /api/sheets`

**Авторизація:** Bearer Token в header `Authorization`

### Параметри запиту

```javascript
{
  action: string,           // 'get' | 'batchGet' | 'update' | 'append' | 'batchUpdate' | 'batchUpdateSpreadsheet' | 'getSheetNames'
  range?: string,           // Для 'get', 'update', 'append'
  ranges?: string[],        // Для 'batchGet'
  values?: any[][],         // Для 'update', 'append'
  data?: object[],          // Для 'batchUpdate'
  requests?: object[],      // Для 'batchUpdateSpreadsheet'
  spreadsheetType?: string  // 'main' | 'texts' | 'users' (default: 'main')
}
```

### Приклади Backend запитів

```javascript
// GET діапазону
fetch('/api/sheets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'get',
    range: 'Sheet!A:B',
    spreadsheetType: 'texts'
  })
});

// Batch Get
fetch('/api/sheets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'batchGet',
    ranges: ['Sheet1!A:A', 'Sheet1!B:B'],
    spreadsheetType: 'main'
  })
});

// Batch Update
fetch('/api/sheets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'batchUpdate',
    data: [
      { range: 'Sheet!A1', values: [['value1']] },
      { range: 'Sheet!A2', values: [['value2']] }
    ],
    spreadsheetType: 'texts'
  })
});
```

---

## 🚫 BANNED WORDS - ПРИКЛАДИ

### Структура даних

```javascript
{
  local_id: "1",
  group_name_ua: "Медичні терміни",
  name_uk: "лікує, лікування, профілактика",     // CSV рядок
  name_ru: "лечит, лечение, профилактика",       // CSV рядок
  banned_type: "medical",
  banned_explaine: "Заборонено законом",
  banned_hint: "Використовуйте 'підтримує здоров'я'",
  severity: "high",
  cheaked_line: "FALSE",
  name_uk_array: ["лікує", "лікування", "профілактика"],  // Розпарсено
  name_ru_array: ["лечит", "лечение", "профилактика"],    // Розпарсено
  _rowIndex: 2                                    // Рядок в таблиці
}
```

### Приклад 1: Завантажити заборонені слова (CSV)

**Файл:** `js/banned-words/banned-words-data.js`

```javascript
import Papa from 'papaparse';

const BANNED_SPREADSHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
const BANNED_SHEET_GID = '1742878044';

export async function loadBannedWords() {
  try {
    // CSV Export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${BANNED_SPREADSHEET_ID}/export?format=csv&gid=${BANNED_SHEET_GID}`;

    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csvText = await response.text();

    // Парсинг CSV
    const parsedData = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parsedData.errors.length > 0) {
      console.error('CSV parsing errors:', parsedData.errors);
    }

    // Обробка даних
    bannedWordsState.bannedWords = parsedData.data.map((row, index) => {
      // Розпарсити CSV рядки в масиви
      const name_uk_array = (row.name_uk || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const name_ru_array = (row.name_ru || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      return {
        ...row,
        name_uk_array,
        name_ru_array,
        _rowIndex: index + 2  // +2 бо рядок 1 - заголовки, рядок 2 - перший запис
      };
    });

    console.log(`✅ Завантажено ${bannedWordsState.bannedWords.length} заборонених слів`);

  } catch (error) {
    console.error('❌ Помилка завантаження заборонених слів:', error);
    throw error;
  }
}
```

### Приклад 2: Завантажити дані товарів для перевірки

**Файл:** `js/banned-words/banned-words-data.js`

```javascript
export async function loadSheetDataForCheck(sheetName, targetColumn) {
  try {
    // 1. Завантажити заголовки
    const headerResult = await window.apiClient.sheets.get(
      `${sheetName}!1:1`,
      'texts'
    );

    if (!headerResult.values || headerResult.values.length === 0) {
      throw new Error('Заголовки не знайдено');
    }

    const headers = headerResult.values[0];

    // 2. Знайти індекси потрібних колонок
    const idIndex = headers.findIndex(h => h?.toLowerCase() === 'id');
    const titleIndex = headers.findIndex(h => h?.toLowerCase() === 'title');
    const targetIndex = headers.findIndex(h => h === targetColumn);
    const checkedIndex = headers.findIndex(h => h?.toLowerCase() === 'cheaked_line');

    if (idIndex === -1 || titleIndex === -1 || targetIndex === -1) {
      throw new Error('Не знайдено обов\'язкові колонки');
    }

    // 3. Конвертувати індекси в літери колонок
    const idCol = columnIndexToLetter(idIndex);
    const titleCol = columnIndexToLetter(titleIndex);
    const targetCol = columnIndexToLetter(targetIndex);
    const checkedCol = checkedIndex !== -1 ? columnIndexToLetter(checkedIndex) : null;

    // 4. Batch завантажити потрібні колонки
    const ranges = [
      `${sheetName}!${idCol}2:${idCol}`,
      `${sheetName}!${titleCol}2:${titleCol}`,
      `${sheetName}!${targetCol}2:${targetCol}`
    ];

    if (checkedCol) {
      ranges.push(`${sheetName}!${checkedCol}2:${checkedCol}`);
    }

    const dataResult = await window.apiClient.sheets.batchGet(ranges, 'texts');

    const ids = dataResult.valueRanges[0].values || [];
    const titles = dataResult.valueRanges[1].values || [];
    const targetValues = dataResult.valueRanges[2].values || [];
    const checkedValues = checkedCol ? (dataResult.valueRanges[3].values || []) : [];

    // 5. Об'єднати дані
    const maxLength = Math.max(ids.length, titles.length, targetValues.length);
    const items = [];

    for (let i = 0; i < maxLength; i++) {
      const id = ids[i]?.[0] || '';
      const title = titles[i]?.[0] || '';
      const targetValue = targetValues[i]?.[0] || '';
      const cheaked_line = checkedCol ? (checkedValues[i]?.[0] || 'FALSE') : 'FALSE';

      // Пропустити порожні рядки
      if (!id && !title && !targetValue) continue;

      items.push({
        id,
        title,
        targetValue,
        cheaked_line,
        _rowIndex: i + 2  // +2 бо рядок 1 - заголовки
      });
    }

    console.log(`✅ Завантажено ${items.length} товарів з аркушу "${sheetName}"`);
    return items;

  } catch (error) {
    console.error('❌ Помилка завантаження даних:', error);
    throw error;
  }
}

// Утиліта конвертації індекса в літеру колонки
function columnIndexToLetter(index) {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}
```

### Приклад 3: Batch оновлення статусу перевірки

**Файл:** `js/banned-words/banned-words-batch.js`

```javascript
import { batchUpdate } from '../utils/google-sheets-batch.js';

export async function batchMarkChecked(selectedIds, tabId, sheetName, columnLetter) {
  try {
    // 1. Отримати товари які треба оновити
    const itemsToUpdate = bannedWordsState.currentTabData[tabId]
      .filter(item => selectedIds.includes(item.id));

    if (itemsToUpdate.length === 0) {
      console.warn('Нічого оновлювати');
      return;
    }

    // 2. Сформувати масив оновлень
    const updates = itemsToUpdate.map(item => ({
      sheet: sheetName,
      row: item._rowIndex,
      column: columnLetter,
      value: 'TRUE'
    }));

    // 3. Виконати batch update
    await batchUpdate({
      spreadsheetId: TEXTS_SPREADSHEET_ID,
      updates,
      chunkSize: 100  // Розбити на пакети по 100
    });

    console.log(`✅ Оновлено ${updates.length} товарів`);

    // 4. Оновити локальний стан
    itemsToUpdate.forEach(item => {
      item.cheaked_line = 'TRUE';
    });

  } catch (error) {
    console.error('❌ Помилка batch оновлення:', error);
    throw error;
  }
}
```

---

## 🏷️ ENTITIES - ПРИКЛАДИ

### Структура таблиці

```
Spreadsheet: 1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk

Аркуші:
├── Categories
├── Characteristics
├── Options
├── Brands
├── Marketplaces
├── MP_Columns_Meta
├── MP_rozetka_Categories
├── MP_rozetka_Characteristics
└── MP_rozetka_Options
```

### Приклад 1: Завантажити всі сутності

**Файл:** `js/entities/entities-data.js`

```javascript
const SPREADSHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';

let dataCache = {
  categories: null,
  characteristics: null,
  options: null,
  brands: null,
  marketplaces: null,
  mpColumnsMeta: null
};

export async function loadAllEntitiesData() {
  try {
    // Batch завантажити всі основні таблиці
    const ranges = [
      'Categories',
      'Characteristics',
      'Options',
      'Brands',
      'Marketplaces',
      'MP_Columns_Meta'
    ];

    const result = await window.apiClient.sheets.batchGet(ranges, 'main');

    // Парсинг кожного аркушу
    dataCache.categories = parseSheetData(result.valueRanges[0].values);
    dataCache.characteristics = parseSheetData(result.valueRanges[1].values);
    dataCache.options = parseSheetData(result.valueRanges[2].values);
    dataCache.brands = parseSheetData(result.valueRanges[3].values);
    dataCache.marketplaces = parseSheetData(result.valueRanges[4].values);
    dataCache.mpColumnsMeta = parseSheetData(result.valueRanges[5].values);

    console.log('✅ Завантажено всі entities');

  } catch (error) {
    console.error('❌ Помилка завантаження entities:', error);
    throw error;
  }
}

// Парсинг даних з Google Sheets формату в об'єкти
function parseSheetData(values) {
  if (!values || values.length === 0) return [];

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map((row, index) => {
    const obj = { _rowIndex: index + 2 };  // +2 бо рядок 1 - заголовки

    headers.forEach((header, colIndex) => {
      obj[header] = row[colIndex] || '';
    });

    return obj;
  });
}

// Геттери
export function getCategories() {
  return dataCache.categories || [];
}

export function getCharacteristics() {
  return dataCache.characteristics || [];
}

export function getOptions() {
  return dataCache.options || [];
}

export function getBrands() {
  return dataCache.brands || [];
}

export function getMarketplaces() {
  return dataCache.marketplaces || [];
}

export function getMpColumns() {
  return dataCache.mpColumnsMeta || [];
}
```

### Приклад 2: Додати нову сутність

**Файл:** `js/entities/entities-data.js`

```javascript
export async function addEntity(entityType, data) {
  try {
    const sheetName = getSheetNameByType(entityType);  // 'Categories', 'Brands' ...

    // 1. Отримати заголовки
    const headerResult = await window.apiClient.sheets.get(
      `${sheetName}!1:1`,
      'main'
    );

    const headers = headerResult.values[0];

    // 2. Сформувати рядок з даних відповідно до заголовків
    const values = [headers.map(header => data[header] || '')];

    // 3. Додати в кінець таблиці
    await window.apiClient.sheets.append(
      `${sheetName}!A:Z`,
      values,
      'main'
    );

    console.log(`✅ Додано нову сутність в ${sheetName}`);

    // 4. Оновити кеш
    await loadAllEntitiesData();

  } catch (error) {
    console.error('❌ Помилка додавання entity:', error);
    throw error;
  }
}

function getSheetNameByType(type) {
  const mapping = {
    'category': 'Categories',
    'characteristic': 'Characteristics',
    'option': 'Options',
    'brand': 'Brands',
    'marketplace': 'Marketplaces'
  };
  return mapping[type] || 'Categories';
}
```

### Приклад 3: Оновити сутність

**Файл:** `js/entities/entities-data.js`

```javascript
export async function updateEntity(entityType, rowIndex, data) {
  try {
    const sheetName = getSheetNameByType(entityType);

    // 1. Отримати заголовки
    const headerResult = await window.apiClient.sheets.get(
      `${sheetName}!1:1`,
      'main'
    );

    const headers = headerResult.values[0];

    // 2. Сформувати рядок
    const values = [headers.map(header => data[header] || '')];

    // 3. Оновити конкретний рядок
    await window.apiClient.sheets.update(
      `${sheetName}!A${rowIndex}:Z${rowIndex}`,
      values,
      'main'
    );

    console.log(`✅ Оновлено сутність в ${sheetName}, рядок ${rowIndex}`);

    // 4. Оновити кеш
    await loadAllEntitiesData();

  } catch (error) {
    console.error('❌ Помилка оновлення entity:', error);
    throw error;
  }
}
```

### Приклад 4: Видалити сутність (структурна операція)

**Файл:** `js/entities/entities-data.js`

```javascript
export async function deleteEntity(entityType, rowIndex) {
  try {
    const sheetName = getSheetNameByType(entityType);

    // 1. Отримати sheetId
    const sheetNames = await window.apiClient.sheets.getSheetNames('main');
    const sheetId = sheetNames.indexOf(sheetName);

    if (sheetId === -1) {
      throw new Error(`Аркуш ${sheetName} не знайдено`);
    }

    // 2. Виконати структурне видалення рядка
    const requests = [{
      deleteDimension: {
        range: {
          sheetId: sheetId,
          dimension: 'ROWS',
          startIndex: rowIndex - 1,  // 0-based index
          endIndex: rowIndex
        }
      }
    }];

    await window.apiClient.sheets.batchUpdateSpreadsheet(requests, 'main');

    console.log(`✅ Видалено сутність з ${sheetName}, рядок ${rowIndex}`);

    // 3. Оновити кеш
    await loadAllEntitiesData();

  } catch (error) {
    console.error('❌ Помилка видалення entity:', error);
    throw error;
  }
}
```

---

## 🛠️ УТИЛІТИ

### Batch Operations Helper

**Файл:** `js/utils/google-sheets-batch.js`

```javascript
/**
 * Batch оновлення комірок
 * @param {Object} config
 * @param {string} config.spreadsheetId - ID таблиці
 * @param {Array} config.updates - Масив оновлень
 * @param {number} config.chunkSize - Розмір пакету (default: 100)
 */
export async function batchUpdate(config) {
  const { spreadsheetId, updates, chunkSize = 100 } = config;

  // Визначити тип таблиці
  const spreadsheetType = getSpreadsheetType(spreadsheetId);

  // Конвертувати updates в Google Sheets API формат
  const data = updates.map(update => ({
    range: `${update.sheet}!${update.column}${update.row}`,
    values: [[update.value]]
  }));

  // Розбити на пакети якщо треба
  if (data.length <= chunkSize) {
    return await window.apiClient.sheets.batchUpdate(data, spreadsheetType);
  }

  // Batch по частинах
  const chunks = chunkArray(data, chunkSize);
  const results = [];

  for (const chunk of chunks) {
    const result = await window.apiClient.sheets.batchUpdate(chunk, spreadsheetType);
    results.push(result);

    // Невелика затримка між запитами
    await sleep(100);
  }

  return results;
}

/**
 * Batch завантаження діапазонів
 */
export async function batchGet(config) {
  const { spreadsheetId, ranges } = config;
  const spreadsheetType = getSpreadsheetType(spreadsheetId);

  return await window.apiClient.sheets.batchGet(ranges, spreadsheetType);
}

/**
 * Розбити масив на пакети
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Визначити тип таблиці по ID
 */
function getSpreadsheetType(spreadsheetId) {
  const TEXTS_ID = '1qQ2ob8zsgSfE1G64SorpdbW0xYLOdPfw_cbAH23xUhM';
  const MAIN_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
  const USERS_ID = '1XE9C6eByiQOoJ_3WNewlMO4QjUpSR-eXI-M6eDn20ls';

  if (spreadsheetId === TEXTS_ID) return 'texts';
  if (spreadsheetId === USERS_ID) return 'users';
  return 'main';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Column Index Converters

**Файл:** `js/utils/google-sheets-batch.js` (додатково)

```javascript
/**
 * Конвертувати індекс колонки в літеру (0 → A, 25 → Z, 26 → AA)
 */
export function columnIndexToLetter(index) {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

/**
 * Конвертувати літеру колонки в індекс (A → 0, Z → 25, AA → 26)
 */
export function columnLetterToIndex(letter) {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}
```

---

## ✅ BEST PRACTICES

### 1. Використовуй Batch операції

❌ **Погано:**
```javascript
// 100 запитів до API
for (const item of items) {
  await window.apiClient.sheets.update(`Sheet!A${item.row}`, [[item.value]], 'texts');
}
```

✅ **Добре:**
```javascript
// 1 запит до API
const data = items.map(item => ({
  range: `Sheet!A${item.row}`,
  values: [[item.value]]
}));

await window.apiClient.sheets.batchUpdate(data, 'texts');
```

### 2. Кешуй дані

✅ **Використовуй кеш для статичних даних:**
```javascript
let dataCache = null;

export async function getData() {
  if (dataCache) return dataCache;

  const result = await window.apiClient.sheets.get('Sheet!A:Z', 'main');
  dataCache = parseSheetData(result.values);

  return dataCache;
}
```

### 3. Додавай `_rowIndex` до об'єктів

✅ **Зберігай номер рядка для оновлень:**
```javascript
const items = rows.map((row, index) => ({
  ...parseRow(row),
  _rowIndex: index + 2  // +2 бо рядок 1 - заголовки
}));

// Потім можна легко оновити:
const update = {
  sheet: 'Products',
  row: item._rowIndex,
  column: 'G',
  value: 'TRUE'
};
```

### 4. Обробляй помилки

✅ **Завжди використовуй try-catch:**
```javascript
try {
  const result = await window.apiClient.sheets.get('Sheet!A:B', 'texts');

  if (!result.values || result.values.length === 0) {
    console.warn('Немає даних');
    return [];
  }

  return parseSheetData(result.values);

} catch (error) {
  console.error('Помилка завантаження:', error);

  // Показати користувачу
  showToast('Помилка завантаження даних', 'error');

  // Повернути fallback
  return [];
}
```

### 5. Валідуй дані перед оновленням

✅ **Перевіряй дані:**
```javascript
export async function updateCell(sheet, row, column, value) {
  // Валідація
  if (!sheet || !row || !column) {
    throw new Error('Не вказані обов\'язкові параметри');
  }

  if (row < 2) {
    throw new Error('Не можна оновлювати заголовки (рядок 1)');
  }

  // Оновлення
  await window.apiClient.sheets.update(
    `${sheet}!${column}${row}`,
    [[value]],
    'texts'
  );
}
```

### 6. Використовуй константи

✅ **Винеси IDs в константи:**
```javascript
// constants.js
export const SPREADSHEETS = {
  MAIN: {
    ID: '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk',
    SHEETS: {
      CATEGORIES: 'Categories',
      BANNED_WORDS: 'Banned_Words'
    }
  },
  TEXTS: {
    ID: '1qQ2ob8zsgSfE1G64SorpdbW0xYLOdPfw_cbAH23xUhM',
    SHEETS: {
      PRODUCTS: 'Products'
    }
  }
};

// Використання
import { SPREADSHEETS } from './constants.js';

const result = await window.apiClient.sheets.get(
  `${SPREADSHEETS.TEXTS.SHEETS.PRODUCTS}!A:Z`,
  'texts'
);
```

---

## 📝 ДОДАТКОВІ РЕСУРСИ

- **Google Sheets API v4 Docs:** https://developers.google.com/sheets/api
- **PapaParse (CSV parser):** https://www.papaparse.com/docs
- **Service Account Setup:** https://cloud.google.com/iam/docs/service-accounts

---

**Дата оновлення:** 2025-01-16
**Версія мануалу:** 1.0
