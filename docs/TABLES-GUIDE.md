# ГАЙД: ЯК ПРАЦЮВАТИ З ТАБЛИЦЯМИ

> **Для кого:** Для тебе, щоб швидко зрозуміти як додати/змінити колонку в таблиці
> **Що використовуємо:** Систему `renderPseudoTable()` - вся таблиця створюється в JS

---

## 📚 Зміст

1. [Швидкий старт: Додати нову колонку](#швидкий-старт-додати-нову-колонку)
2. [Як працює система](#як-працює-система)
3. [Типи колонок (шпаргалка)](#типи-колонок-шпаргалка)
4. [Сортування](#сортування)
5. [Звідки беруться дані](#звідки-беруться-дані)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Швидкий старт: Додати нову колонку

### Приклад: Додати колонку "Пояснення" в таблицю заборонених слів

**Крок 1: Знайди файл з таблицею**

```
js/banned-words/banned-words-manage.js
```

**Крок 2: Знайди функцію `renderBannedWordsTable()`**

Там є масив `columns` - це список всіх колонок:

```javascript
renderPseudoTable(container, {
    data: paginatedWords,
    columns: [
        { id: 'local_id', label: 'ID', ... },
        { id: 'group_name_ua', label: 'Назва Групи', ... },
        // ТУТ ДОДАЄМО НОВУ КОЛОНКУ
    ]
});
```

**Крок 3: Додай нову колонку в масив `columns`**

```javascript
columns: [
    { id: 'local_id', label: 'ID', sortable: true, className: 'cell-id', render: (value) => `<span class="word-chip">${value || 'Невідомо'}</span>` },
    { id: 'group_name_ua', label: 'Назва Групи', sortable: true, className: 'cell-main-name', render: (value) => `<strong>${escapeHtml(value || 'N/A')}</strong>` },

    // 👇 НОВА КОЛОНКА "Пояснення"
    {
        id: 'banned_explaine',           // Назва поля з Google Sheets
        label: 'Пояснення',              // Текст в заголовку
        sortable: true,                  // Чи можна сортувати
        render: (value) => value || '-'  // Як показувати (якщо пусто - показати "-")
    },

    { id: 'severity', label: ' ', ... },
    { id: 'cheaked_line', label: 'Перевірено', ... }
]
```

**Крок 4: Готово!**

Таблиця автоматично:
- ✅ Створить нову колонку
- ✅ Додасть сортування (бо `sortable: true`)
- ✅ Візьме дані з Google Sheets (колонка `banned_explaine`)
- ✅ Застосує фільтри/пагінацію

---

## 🧠 Як працює система

### Схема роботи:

```
Google Sheets → loadBannedWords() → bannedWordsState.bannedWords → renderPseudoTable() → Таблиця на екрані
```

### 1. Дані завантажуються з Google Sheets

**Файл:** `js/banned-words/banned-words-data.js`

```javascript
export async function loadBannedWords() {
    // Завантажує CSV з Google Sheets
    const csvUrl = `https://docs.google.com/spreadsheets/d/${BANNED_SPREADSHEET_ID}/export?format=csv&gid=${BANNED_SHEET_GID}`;

    // Парсить CSV і зберігає в bannedWordsState.bannedWords
    const parsedData = Papa.parse(csvText, { header: true });
    bannedWordsState.bannedWords = parsedData.data;
}
```

**Важливо:**
- Назви колонок у Google Sheets = ключі в об'єкті (`banned_explaine`, `group_name_ua` і т.д.)
- Все **динамічне** - якщо змінити назву колонки в Sheets, треба змінити `id` в `columns`

### 2. Таблиця створюється через `renderPseudoTable()`

**Файл:** `js/common/ui-table.js`

```javascript
renderPseudoTable(container, {
    data: paginatedWords,     // Дані для показу
    columns: [                // Конфігурація колонок
        {
            id: 'group_name_ua',        // Ключ з даних
            label: 'Назва Групи',       // Заголовок
            sortable: true,             // Можна сортувати
            className: 'cell-main-name',// CSS клас для стилів
            render: (value) => `<strong>${value}</strong>` // Як відобразити
        }
    ],
    visibleColumns: ['local_id', 'group_name_ua'], // Які колонки показувати
    rowActionsCustom: (row) => `...` // Кнопки (edit, delete)
});
```

### 3. Що робить `renderPseudoTable()`

1. Створює HTML заголовок таблиці (`.pseudo-table-header`)
2. Створює рядки (`.pseudo-table-row`) для кожного елемента в `data`
3. Додає сортування на колонки з `sortable: true`
4. Додає tooltips на довгий текст
5. Додає обробники кліків на кнопки

---

## 📐 Типи колонок (шпаргалка)

Використовуй **стандартні класи** для правильного вигляду:

| Тип | Клас | Використання | Приклад |
|-----|------|-------------|---------|
| **Actions** | `cell-actions` | Чекбокси + кнопки edit/delete | Перша колонка |
| **ID** | `cell-id` | Унікальний ID (фіксована ширина 80px) | `ban-0001` |
| **Назва (головна)** | `cell-main-name` | Основна текстова колонка (flex: 2) | **Жінің список** |
| **Назва (звичайна)** | `cell-name` | Текст середньої довжини | Слова UA, RU |
| **Boolean** | `cell-bool` | Так/Ні, Активний/Неактивний | Перевірено ✓ |
| **Severity** | `cell-severity` | Іконка пріоритету (40px) | ⚠️ High |
| **Count** | `cell-count` | Число, кількість | `5×` |
| **Context** | `cell-context` | Великий текст з переносом | Довгий опис... |

### Приклади використання:

```javascript
// ID колонка
{
    id: 'local_id',
    label: 'ID',
    className: 'cell-id',
    render: (value) => `<span class="word-chip">${value}</span>`
}

// Головна назва
{
    id: 'group_name_ua',
    label: 'Назва Групи',
    className: 'cell-main-name',
    render: (value) => `<strong>${value || 'N/A'}</strong>`
}

// Звичайна назва
{
    id: 'name_uk',
    label: 'Слова (UA)',
    className: 'cell-name',
    render: (value) => renderWordChips(value)
}

// Boolean
{
    id: 'cheaked_line',
    label: 'Перевірено',
    className: 'cell-bool',
    render: (value, row) => renderBadge(value, 'checked', {clickable: true, id: row.local_id})
}

// Severity
{
    id: 'severity',
    label: ' ',
    className: 'cell-severity',
    render: (value) => renderSeverityBadge(value)
}
```

---

## 🔀 Сортування

### Як працює:

1. Колонка з `sortable: true` отримує клас `.sortable-header`
2. При кліку на заголовок викликається функція сортування
3. Дані пересортовуються
4. Таблиця перемальовується

### Де налаштовується сортування:

**Файл:** `js/banned-words/banned-words-events.js`

```javascript
export function initBannedWordsSorting() {
    // Слухає кліки на .sortable-header
    container.addEventListener('click', (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const sortKey = header.dataset.sortKey;

        // Визначає напрямок (asc/desc)
        let direction = 'asc';
        if (header.classList.contains('sorted-asc')) {
            direction = 'desc';
        }

        // Сортує дані
        bannedWordsState.bannedWords.sort((a, b) => {
            // Логіка сортування
        });

        // Оновлює таблицю
        renderBannedWordsTable();
    });
}
```

### Типи сортування:

```javascript
// Числа
if (typeof aVal === 'number' && typeof bVal === 'number') {
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
}

// Рядки (з підтримкою кирилиці)
aVal = String(aVal || '').toLowerCase();
bVal = String(bVal || '').toLowerCase();
return direction === 'asc'
    ? aVal.localeCompare(bVal, 'uk')  // Українське сортування
    : bVal.localeCompare(aVal, 'uk');
```

---

## 📊 Звідки беруться дані

### Google Sheets → JavaScript

**1. ID таблиці і аркуша**

**Файл:** `js/banned-words/banned-words-data.js`

```javascript
export const BANNED_SPREADSHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
const BANNED_SHEET_GID = '1742878044'; // GID для аркуша "Banned"
```

**2. Завантаження CSV**

```javascript
const csvUrl = `https://docs.google.com/spreadsheets/d/${BANNED_SPREADSHEET_ID}/export?format=csv&gid=${BANNED_SHEET_GID}`;
```

**3. Парсинг через PapaParse**

```javascript
const parsedData = Papa.parse(csvText, {
    header: true,           // Перший рядок = назви колонок
    skipEmptyLines: true
});

// Результат:
// parsedData.data = [
//   { local_id: 'ban-0001', group_name_ua: 'Жінің список', ... },
//   { local_id: 'ban-0002', group_name_ua: 'лікує', ... }
// ]
```

### Назви колонок в Google Sheets:

```
| local_id | group_name_ua | name_uk | name_ru | banned_type | banned_explaine | banned_hint | severity | cheaked_line |
```

**Важливо:**
- Назва колонки в Sheets = `id` в `columns`
- Якщо змінити `group_name_ua` на `назва_групи` в Sheets, треба змінити в `columns`:

```javascript
{
    id: 'назва_групи',  // ← Змінено
    label: 'Назва Групи',
    ...
}
```

---

## 🔧 Troubleshooting

### Проблема: Колонка не показується

**Перевір:**

1. Чи є колонка в `visibleColumns`?

```javascript
const visibleCols = (bannedWordsState.visibleColumns && bannedWordsState.visibleColumns.length > 0)
    ? bannedWordsState.visibleColumns
    : ['local_id', 'severity', 'group_name_ua', 'banned_type', 'cheaked_line'];
    //  👆 Додай свою колонку тут
```

2. Чи правильна назва поля (`id` = назва колонки в Sheets)?

```javascript
console.log(bannedWordsState.bannedWords[0]); // Подивись які ключі є
```

### Проблема: Сортування працює неправильно

**Перевір:**

1. Чи є `sortable: true` в конфігурації колонки?
2. Чи правильний тип даних (число vs рядок)?

```javascript
// Для кирилиці використовуй localeCompare
aVal.localeCompare(bVal, 'uk')
```

### Проблема: Дані не завантажуються

**Перевір:**

1. Консоль браузера (F12) - чи є помилки?
2. Чи правильний `BANNED_SPREADSHEET_ID` і `BANNED_SHEET_GID`?
3. Чи доступна таблиця публічно?

```javascript
// Перевір URL:
https://docs.google.com/spreadsheets/d/1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk/export?format=csv&gid=1742878044
```

---

## 📝 Повний приклад: Додати колонку "Підказка"

### 1. Відкрий `js/banned-words/banned-words-manage.js`

### 2. Знайди масив `columns` в функції `renderBannedWordsTable()`

### 3. Додай нову колонку:

```javascript
columns: [
    { id: 'local_id', ... },
    { id: 'group_name_ua', ... },
    { id: 'name_uk', ... },
    { id: 'name_ru', ... },
    { id: 'banned_type', ... },

    // ➕ НОВА КОЛОНКА
    {
        id: 'banned_hint',              // Назва з Google Sheets
        label: 'Підказка',              // Заголовок
        sortable: true,                 // Можна сортувати
        render: (value) => value || '-' // Показати значення або "-"
    },

    { id: 'severity', ... },
    { id: 'cheaked_line', ... }
]
```

### 4. Додай в `visibleColumns` (якщо потрібно показувати по дефолту):

```javascript
const visibleCols = (bannedWordsState.visibleColumns && bannedWordsState.visibleColumns.length > 0)
    ? bannedWordsState.visibleColumns
    : ['local_id', 'severity', 'group_name_ua', 'banned_type', 'banned_hint', 'cheaked_line'];
    //                                                           👆 Додано
```

### 5. Збережи файл і оновіть сторінку (Ctrl+F5)

---

## 🎯 Чеклист: Додати нову колонку

- [ ] Переконався що колонка є в Google Sheets (назва без пробілів, підкреслення)
- [ ] Додав конфігурацію в масив `columns` з правильним `id`
- [ ] Встановив `sortable: true` якщо потрібне сортування
- [ ] Вибрав правильний `className` (`.cell-id`, `.cell-name`, `.cell-bool` і т.д.)
- [ ] Написав `render` функцію для відображення
- [ ] Додав `id` колонки в `visibleColumns` (якщо потрібно показувати)
- [ ] Перевірив в консолі чи є дані: `console.log(bannedWordsState.bannedWords[0])`
- [ ] Оновив сторінку (Ctrl+F5) і перевірив результат

---

## 🔗 Де що знаходиться

| Що | Де |
|----|-----|
| Конфігурація таблиці заборонених слів | `js/banned-words/banned-words-manage.js` → `renderBannedWordsTable()` |
| Завантаження даних з Google Sheets | `js/banned-words/banned-words-data.js` → `loadBannedWords()` |
| Функція рендерингу таблиць | `js/common/ui-table.js` → `renderPseudoTable()` |
| Сортування | `js/banned-words/banned-words-events.js` → `initBannedWordsSorting()` |
| Стилі колонок | `css/components/pseudo-table.css` |
| ID таблиці Google Sheets | `js/banned-words/banned-words-data.js` → `BANNED_SPREADSHEET_ID` |

---

**Версія:** 2.0 (2025-01-16)
**Статус:** Актуальна (використовується зараз)
**Система:** `renderPseudoTable()` - стара, але робоча система
