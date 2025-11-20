# Стандарт роботи з Google Sheets API

## 📋 Загальні принципи

Всі модулі, що працюють з Google Sheets (banned-words, keywords, brands, entities тощо), **ПОВИННІ** використовувати однаковий підхід для роботи з API.

## ✅ Правильний підхід (як у banned-words та keywords)

### 1. Структура файлів модуля

Кожен модуль повинен мати такі файли:

```
js/module-name/
├── module-name-init.js      # Ініціалізація та state
├── module-name-data.js       # Робота з API (CRUD операції)
├── module-name-crud.js       # UI модалів та форм
├── module-name-table.js      # Рендеринг таблиць
└── module-name-aside.js      # Кнопки в aside панелі
```

### 2. Функція callSheetsAPI

**Кожен** `*-data.js` файл повинен мати власну функцію `callSheetsAPI`:

```javascript
/**
 * Виклик Sheets API через backend
 */
async function callSheetsAPI(action, params = {}) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        throw new Error('Authorization required. Please login first.');
    }

    const response = await fetch(`${window.location.origin}/api/sheets`, {
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
```

**⚠️ ВАЖЛИВО:** Ця функція НЕ експортується, вона internal для модуля.

### 3. Завантаження даних (READ)

```javascript
export async function loadModuleData() {
    console.log('📥 Завантаження даних з Google Sheets...');

    try {
        const values = await callSheetsAPI('get', {
            range: 'SheetName',           // Назва аркушу
            spreadsheetType: 'main'        // або 'banned' для забор. слів
        });

        if (!values || values.length === 0) {
            console.warn('⚠️ Немає даних');
            moduleState.items = [];
            return moduleState.items;
        }

        moduleState.items = parseSheetData(values);
        console.log(`✅ Завантажено ${moduleState.items.length} записів`);

        return moduleState.items;
    } catch (error) {
        console.error('❌ Помилка завантаження:', error);
        throw error;
    }
}

function parseSheetData(values) {
    if (!values || values.length === 0) return [];

    const headers = values[0];
    const rows = values.slice(1);

    return rows.map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((header, colIndex) => {
            const value = row[colIndex] || '';
            obj[header] = typeof value === 'string' ? value.trim() : value;
        });
        return obj;
    });
}
```

### 4. Створення запису (CREATE)

```javascript
export async function addItem(itemData) {
    console.log('➕ Додавання нового запису:', itemData);

    try {
        // Генерувати ID
        const local_id = generateLocalId();

        // Створити масив значень відповідно до структури таблиці
        const newRow = [
            local_id,
            itemData.field1 || '',
            itemData.field2 || '',
            // ... всі поля по порядку
        ];

        // Відправити на backend
        await callSheetsAPI('append', {
            range: 'SheetName!A:Z',        // Діапазон до останньої колонки
            values: [newRow],
            spreadsheetType: 'main'
        });

        // Оновити локальний state
        const newEntry = {
            _rowIndex: moduleState.items.length + 2,
            local_id,
            ...itemData
        };

        moduleState.items.push(newEntry);

        console.log('✅ Запис додано:', newEntry);
        return newEntry;
    } catch (error) {
        console.error('❌ Помилка додавання:', error);
        throw error;
    }
}
```

### 5. Оновлення запису (UPDATE)

```javascript
export async function updateItem(localId, updates) {
    console.log(`📝 Оновлення запису ${localId}:`, updates);

    try {
        const entry = moduleState.items.find(e => e.local_id === localId);
        if (!entry) {
            throw new Error(`Запис ${localId} не знайдено`);
        }

        const range = `SheetName!A${entry._rowIndex}:Z${entry._rowIndex}`;

        // Створити масив з оновленими значеннями
        const updatedRow = [
            entry.local_id,  // ID не змінюється
            updates.field1 !== undefined ? updates.field1 : entry.field1,
            updates.field2 !== undefined ? updates.field2 : entry.field2,
            // ... всі поля
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        // Оновити локальні дані
        Object.assign(entry, updates);

        console.log('✅ Запис оновлено:', entry);
        return entry;
    } catch (error) {
        console.error('❌ Помилка оновлення:', error);
        throw error;
    }
}
```

### 6. Видалення запису (DELETE)

```javascript
export async function deleteItem(localId) {
    console.log(`🗑️ Видалення запису ${localId}`);

    try {
        const entryIndex = moduleState.items.findIndex(e => e.local_id === localId);
        if (entryIndex === -1) {
            throw new Error(`Запис ${localId} не знайдено`);
        }

        const entry = moduleState.items[entryIndex];

        // Очистити рядок (записати порожні значення)
        const range = `SheetName!A${entry._rowIndex}:Z${entry._rowIndex}`;
        const emptyRow = new Array(columnCount).fill('');

        await callSheetsAPI('update', {
            range: range,
            values: [emptyRow],
            spreadsheetType: 'main'
        });

        // Видалити з локального state
        moduleState.items.splice(entryIndex, 1);

        console.log('✅ Запис видалено');
    } catch (error) {
        console.error('❌ Помилка видалення:', error);
        throw error;
    }
}
```

### 7. Генерація ID

```javascript
function generateLocalId() {
    // Знайти максимальний номер
    let maxNum = 0;

    moduleState.items.forEach(item => {
        if (item.local_id && item.local_id.startsWith('prefix-')) {
            const num = parseInt(item.local_id.substring(7), 10); // 7 = довжина "prefix-"
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    // Новий номер
    const newNum = maxNum + 1;

    // Форматувати як prefix-XXXXXX (6 цифр)
    return `prefix-${String(newNum).padStart(6, '0')}`;
}
```

**Формати ID:**
- Banned words: `ban-000001`
- Keywords: `glo-000001`
- Brands: `brd-000001`
- Entities: `ent-000001`

## ❌ Неправильний підхід (НЕ використовувати)

### 1. Використання window.apiClient

```javascript
// ❌ НЕ РОБИТИ ТАК
await window.apiClient.sheets.append(SHEET_NAME, [newRow]);
```

**Проблема:** `window.apiClient` може бути не ініціалізований на деяких сторінках (наприклад, index.html).

### 2. Використання gapi.client

```javascript
// ❌ НЕ РОБИТИ ТАК
await gapi.client.sheets.spreadsheets.values.append({...});
```

**Проблема:** Застарілий підхід, потребує завантаження додаткових скриптів.

### 3. Експорт callSheetsAPI

```javascript
// ❌ НЕ РОБИТИ ТАК
export async function callSheetsAPI(action, params) {
    // ...
}
```

**Проблема:** Функція повинна бути internal для модуля, не експортується.

## 🎯 Чеклист для нових модулів

- [ ] Створено структуру файлів модуля
- [ ] Додано функцію `callSheetsAPI` в `*-data.js`
- [ ] Функція бере токен з `localStorage.getItem('auth_token')`
- [ ] Реалізовано `loadModuleData()` через `callSheetsAPI('get')`
- [ ] Реалізовано `addItem()` через `callSheetsAPI('append')`
- [ ] Реалізовано `updateItem()` через `callSheetsAPI('update')`
- [ ] Реалізовано `deleteItem()` через `callSheetsAPI('update')` з порожніми значеннями
- [ ] Генерація ID працює коректно (знаходить максимум, додає 1)
- [ ] Всі функції оновлюють локальний state після успішної операції
- [ ] Додано логування в консоль (📥 ➕ 📝 🗑️ ✅ ❌)

## 📦 Параметри spreadsheetType

- `'main'` - основна таблиця (для keywords, brands, entities)
- `'banned'` - таблиця заборонених слів

Backend автоматично вибирає правильний spreadsheet ID на основі цього параметра.

## 🔧 Приклади викликів API

### GET (читання)
```javascript
const data = await callSheetsAPI('get', {
    range: 'SheetName',
    spreadsheetType: 'main'
});
```

### APPEND (додавання)
```javascript
await callSheetsAPI('append', {
    range: 'SheetName!A:M',
    values: [['val1', 'val2', 'val3']],
    spreadsheetType: 'main'
});
```

### UPDATE (оновлення)
```javascript
await callSheetsAPI('update', {
    range: 'SheetName!A5:M5',
    values: [['val1', 'val2', 'val3']],
    spreadsheetType: 'main'
});
```

### BATCH GET (множинне читання)
```javascript
const data = await callSheetsAPI('batchGet', {
    ranges: ['Sheet1!A:Z', 'Sheet2!A:Z'],
    spreadsheetType: 'main'
});
```

## 🚨 Типові помилки та рішення

### Помилка: "Cannot read properties of undefined (reading 'sheets')"
**Причина:** Використання `window.apiClient` замість `callSheetsAPI`
**Рішення:** Замінити на прямі виклики через `callSheetsAPI`

### Помилка: "Authorization required"
**Причина:** Токен не знайдено в localStorage
**Рішення:** Користувач повинен авторізуватись через кнопку "Увійти"

### ID генерується з 1 замість наступного номера
**Причина:** `moduleState.items` порожній при створенні
**Рішення:** Переконатись що `loadModuleData()` викликається при відкритті модалу

## 📚 Посилання

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Backend API Implementation](../api/sheets.php)
- [Приклад реалізації: banned-words-data.js](../js/banned-words/banned-words-data.js)
- [Приклад реалізації: keywords-data.js](../js/keywords/keywords-data.js)
