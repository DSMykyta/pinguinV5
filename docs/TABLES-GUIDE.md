# ГАЙД ПО ТАБЛИЦЯХ (PSEUDO-TABLE)

> **ВАЖЛИВО:** Цей документ описує уніфіковану систему роботи з таблицями.
> Перед використанням прочитай [ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md)

---

## 📚 Зміст

1. [Філософія системи](#філософія-системи)
2. [Структура таблиці](#структура-таблиці)
3. [Типи колонок](#типи-колонок)
4. [Створення нової таблиці](#створення-нової-таблиці)
5. [Шаблони таблиць](#шаблони-таблиць)
6. [Заповнення даними](#заповнення-даними)
7. [Сортування](#сортування)
8. [Приклади](#приклади)
9. [Чеклист](#чеклист)

---

## 🎯 Філософія системи

### Основні принципи:

1. **Уніфікація** - всі таблиці використовують однакову структуру
2. **Стандартизація** - фіксовані типи колонок (.cell-id, .cell-bool, .cell-actions)
3. **Шаблони** - HTML структура відокремлена від JavaScript логіки
4. **Перевикористання** - один раз створив шаблон → використовуй скрізь

### Переваги:

✅ Візуальна консистентність всіх таблиць
✅ Легко змінювати - редагуєш HTML, не JavaScript
✅ Швидкий пошук - всі шаблони в `templates/tables/`
✅ Не дублюєш код - типи колонок визначені один раз в CSS

---

## 🏗️ Структура таблиці

### Анатомія pseudo-table:

```html
<div class="pseudo-table-container">

    <!-- 1. HEADER (фіксований, завжди видимий) -->
    <div class="pseudo-table-header">
        <div class="pseudo-table-cell cell-actions">
            <input type="checkbox" class="header-select-all">
        </div>
        <div class="pseudo-table-cell cell-id sortable-header" data-sort-key="id">
            <span>ID</span>
            <span class="sort-indicator">
                <span class="material-symbols-outlined">unfold_more</span>
            </span>
        </div>
        <div class="pseudo-table-cell cell-name sortable-header" data-sort-key="name">
            <span>Назва</span>
            <span class="sort-indicator">
                <span class="material-symbols-outlined">unfold_more</span>
            </span>
        </div>
        <div class="pseudo-table-cell cell-bool" data-column="is_active">
            <span>Активний</span>
        </div>
    </div>

    <!-- 2. BODY (рядки, скролиться) -->
    <div class="pseudo-table-row" data-row-id="1">
        <div class="pseudo-table-cell cell-actions">
            <input type="checkbox" class="row-checkbox" data-id="1">
            <button class="btn-icon btn-edit" data-row-id="1">
                <span class="material-symbols-outlined">edit</span>
            </button>
        </div>
        <div class="pseudo-table-cell cell-id">1</div>
        <div class="pseudo-table-cell cell-name">Приклад</div>
        <div class="pseudo-table-cell cell-bool">
            <span class="badge badge-success">
                <span class="material-symbols-outlined">check_circle</span>
                Так
            </span>
        </div>
    </div>

    <!-- Більше рядків... -->

</div>
```

### Важливі класи:

- `.pseudo-table-container` - обгортка з scroll (height: 100%)
- `.pseudo-table-header` - липкий заголовок (position: sticky)
- `.pseudo-table-row` - один рядок даних
- `.pseudo-table-cell` - одна клітинка (колонка)

---

## 📐 Типи колонок

**ОБОВ'ЯЗКОВО використовуй стандартні типи!** Не створюй нові без обґрунтування.

### 1. Actions (.cell-actions)

**Призначення:** Чекбокси + кнопки дій (edit, delete, view)

```html
<div class="pseudo-table-cell cell-actions">
    <input type="checkbox" class="row-checkbox" data-id="123">
    <button class="btn-icon btn-edit" data-row-id="123">
        <span class="material-symbols-outlined">edit</span>
    </button>
    <button class="btn-icon btn-delete" data-row-id="123">
        <span class="material-symbols-outlined">delete</span>
    </button>
</div>
```

**Характеристики:**
- `flex: 0 0 auto` - гнучка ширина (підлаштовується під вміст)
- `min-width: 80px`
- `justify-content: flex-start`

### 2. ID (.cell-id)

**Призначення:** Унікальний ідентифікатор рядка

```html
<div class="pseudo-table-cell cell-id">123</div>
```

**Характеристики:**
- `flex: 0 0 80px` - фіксована ширина
- `justify-content: flex-start`

### 3. Checkbox (.cell-checkbox)

**Призначення:** Окрема колонка тільки для чекбокса (якщо немає actions)

```html
<div class="pseudo-table-cell cell-checkbox">
    <input type="checkbox" class="row-checkbox" data-id="123">
</div>
```

**Характеристики:**
- `flex: 0 0 48px` - вузька фіксована ширина
- `justify-content: center`

### 4. Boolean (.cell-bool)

**Призначення:** Так/Ні, Active/Inactive, True/False

```html
<div class="pseudo-table-cell cell-bool">
    <span class="badge badge-success">
        <span class="material-symbols-outlined">check_circle</span>
        Так
    </span>
</div>
```

**Характеристики:**
- `flex: 0 0 100px`
- `justify-content: center`

### 5. Count (.cell-count)

**Призначення:** Лічильники, кількість, числові бейджі

```html
<div class="pseudo-table-cell cell-count">
    <span class="match-count-badge">5×</span>
</div>
```

**Характеристики:**
- `flex: 0 0 60px`
- `justify-content: center`

### 6. Severity (.cell-severity)

**Призначення:** Рівень серйозності (low/medium/high)

```html
<div class="pseudo-table-cell cell-severity">
    <span class="severity-badge severity-high">
        <span class="material-symbols-outlined">brightness_alert</span>
    </span>
</div>
```

**Характеристики:**
- `flex: 0 0 40px`
- `justify-content: center`

### 7. Name (.cell-name)

**Призначення:** Головна текстова колонка (назва, заголовок)

```html
<div class="pseudo-table-cell cell-name">
    <strong>Назва товару</strong>
</div>
```

**Характеристики:**
- `flex: 2` - займає в 2 рази більше місця ніж flex: 1
- `justify-content: flex-start`
- `text-overflow: ellipsis` - обрізає довгий текст

### 8. Context (.cell-context)

**Призначення:** Великий текстовий фрагмент з можливістю перенесення

```html
<div class="pseudo-table-cell cell-context">
    <div class="context-fragment">
        Це текст з <span class="highlight-banned-word">підсвіткою</span> знайдених слів.
    </div>
</div>
```

**Характеристики:**
- `flex: 3` - займає найбільше місця
- `min-width: 300px`
- `white-space: normal` - дозволяє перенесення тексту
- `word-break: break-word`

### 9. Кастомна колонка

**Тільки якщо стандартні типи НЕ підходять!**

```html
<div class="pseudo-table-cell" style="flex: 0 0 120px;">
    <!-- Унікальний контент -->
</div>
```

⚠️ **Перед створенням кастомної колонки запитай себе:**
- Чи можна використати існуючий тип?
- Чи буде ця колонка використовуватись в інших таблицях?
- Якщо так - додай новий тип в CSS з обґрунтуванням!

---

## 🆕 Створення нової таблиці

### Крок 1: Створити HTML шаблон

**Файл:** `templates/tables/table-[назва].html`

```html
<!-- templates/tables/table-products.html -->

<!-- HEADER таблиці -->
<div class="pseudo-table-header">
    <!-- Колонка дій -->
    <div class="pseudo-table-cell cell-actions">
        <input type="checkbox" class="header-select-all">
    </div>

    <!-- ID колонка з сортуванням -->
    <div class="pseudo-table-cell cell-id sortable-header" data-sort-key="id">
        <span>ID</span>
        <span class="sort-indicator">
            <span class="material-symbols-outlined">unfold_more</span>
        </span>
    </div>

    <!-- Назва з сортуванням -->
    <div class="pseudo-table-cell cell-name sortable-header" data-sort-key="name">
        <span>Назва</span>
        <span class="sort-indicator">
            <span class="material-symbols-outlined">unfold_more</span>
        </span>
    </div>

    <!-- Boolean без сортування -->
    <div class="pseudo-table-cell cell-bool" data-column="is_active">
        <span>Активний</span>
    </div>
</div>

<!-- TEMPLATE для рядка -->
<template id="row-template">
    <div class="pseudo-table-row" data-row-id="{{id}}">
        <!-- Дії -->
        <div class="pseudo-table-cell cell-actions">
            <input type="checkbox" class="row-checkbox" data-id="{{id}}">
            <button class="btn-icon btn-edit" data-row-id="{{id}}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-delete" data-row-id="{{id}}" title="Видалити">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>

        <!-- ID -->
        <div class="pseudo-table-cell cell-id" data-field="id">{{id}}</div>

        <!-- Назва -->
        <div class="pseudo-table-cell cell-name" data-field="name">{{name}}</div>

        <!-- Boolean -->
        <div class="pseudo-table-cell cell-bool" data-field="is_active">
            <!-- Заповнюється через JavaScript renderBadge() -->
        </div>
    </div>
</template>
```

### Крок 2: Завантажити та використати шаблон

```javascript
// Імпортувати функції
import { loadTableTemplate, populateTableRow } from '../common/ui-table-loader.js';
import { renderBadge } from '../common/ui-table.js';

// Завантажити шаблон
async function renderProductsTable(data) {
    const container = document.getElementById('products-table-container');

    // Завантажити шаблон таблиці
    const tableTemplate = await loadTableTemplate('table-products');

    // Додати header
    container.innerHTML = '';
    container.appendChild(tableTemplate.header);

    // Додати рядки
    data.forEach(item => {
        const row = populateTableRow(tableTemplate.rowTemplate, {
            id: item.id,
            name: item.name,
            is_active: renderBadge(item.is_active, 'boolean')
        });
        container.appendChild(row);
    });
}
```

---

## 📄 Шаблони таблиць

### Структура папки templates/tables/

```
templates/
  tables/
    table-banned-words-manage.html    ← Управління забороненими словами
    table-banned-words-check.html     ← Перевірка аркушів
    table-entities-categories.html    ← Категорії товарів
    table-entities-characteristics.html ← Характеристики
    table-entities-options.html       ← Опції
    table-products.html               ← Приклад
```

### Правила іменування:

- `table-[модуль]-[тип].html` - для специфічних таблиць
- `table-[сутність].html` - для загальних таблиць
- Використовуй kebab-case

---

## 💾 Заповнення даними

### Метод 1: Через populateTableRow (РЕКОМЕНДОВАНО)

```javascript
import { populateTableRow } from '../common/ui-table-loader.js';
import { renderBadge } from '../common/ui-table.js';

const row = populateTableRow(rowTemplate, {
    id: item.id,                              // Простий текст
    name: item.name,                          // Простий текст
    is_active: renderBadge(item.is_active, 'boolean'),  // HTML через render функцію
    custom_html: `<strong>${item.title}</strong>`       // Кастомний HTML
});
```

### Метод 2: Через data-field атрибути

```html
<template id="row-template">
    <div class="pseudo-table-row">
        <div class="pseudo-table-cell cell-id" data-field="id"></div>
        <div class="pseudo-table-cell cell-name" data-field="name"></div>
    </div>
</template>
```

```javascript
const rowElement = rowTemplate.content.cloneNode(true);
rowElement.querySelector('[data-field="id"]').textContent = item.id;
rowElement.querySelector('[data-field="name"]').textContent = item.name;
```

### Метод 3: Template literals (для простих випадків)

```javascript
const rowHTML = `
    <div class="pseudo-table-row" data-row-id="${item.id}">
        <div class="pseudo-table-cell cell-id">${item.id}</div>
        <div class="pseudo-table-cell cell-name">${escapeHtml(item.name)}</div>
    </div>
`;
container.insertAdjacentHTML('beforeend', rowHTML);
```

⚠️ **ВАЖЛИВО:** Завжди використовуй `escapeHtml()` для користувацьких даних!

---

## 🔀 Сортування

### Додати сортування до колонки:

```html
<!-- В header -->
<div class="pseudo-table-cell cell-name sortable-header" data-sort-key="name">
    <span>Назва</span>
    <span class="sort-indicator">
        <span class="material-symbols-outlined">unfold_more</span>
    </span>
</div>
```

### Класи для стану сортування:

- `.sortable-header` - колонка може сортуватись (показує курсор pointer)
- `.sorted-asc` - сортується за зростанням (стрілка вгору)
- `.sorted-desc` - сортується за спаданням (стрілка вниз)

### JavaScript обробка:

```javascript
// Додати обробник кліків на sortable headers
container.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
        const sortKey = header.dataset.sortKey;

        // Визначити напрямок
        let direction = 'asc';
        if (header.classList.contains('sorted-asc')) {
            direction = 'desc';
        }

        // Оновити класи
        container.querySelectorAll('.sortable-header').forEach(h => {
            h.classList.remove('sorted-asc', 'sorted-desc');
        });
        header.classList.add(`sorted-${direction}`);

        // Сортувати дані
        sortData(sortKey, direction);
    });
});
```

---

## 📋 Приклади

### Приклад 1: Проста таблиця з ID та назвою

```html
<!-- templates/tables/table-simple.html -->
<div class="pseudo-table-header">
    <div class="pseudo-table-cell cell-id sortable-header" data-sort-key="id">
        <span>ID</span>
        <span class="sort-indicator">
            <span class="material-symbols-outlined">unfold_more</span>
        </span>
    </div>
    <div class="pseudo-table-cell cell-name sortable-header" data-sort-key="name">
        <span>Назва</span>
        <span class="sort-indicator">
            <span class="material-symbols-outlined">unfold_more</span>
        </span>
    </div>
</div>

<template id="row-template">
    <div class="pseudo-table-row" data-row-id="{{id}}">
        <div class="pseudo-table-cell cell-id">{{id}}</div>
        <div class="pseudo-table-cell cell-name">{{name}}</div>
    </div>
</template>
```

### Приклад 2: Таблиця з діями та boolean

```html
<!-- templates/tables/table-with-actions.html -->
<div class="pseudo-table-header">
    <div class="pseudo-table-cell cell-actions">
        <input type="checkbox" class="header-select-all">
    </div>
    <div class="pseudo-table-cell cell-id sortable-header" data-sort-key="id">
        <span>ID</span>
        <span class="sort-indicator">
            <span class="material-symbols-outlined">unfold_more</span>
        </span>
    </div>
    <div class="pseudo-table-cell cell-name sortable-header" data-sort-key="name">
        <span>Назва</span>
        <span class="sort-indicator">
            <span class="material-symbols-outlined">unfold_more</span>
        </span>
    </div>
    <div class="pseudo-table-cell cell-bool">
        <span>Активний</span>
    </div>
</div>

<template id="row-template">
    <div class="pseudo-table-row" data-row-id="{{id}}">
        <div class="pseudo-table-cell cell-actions">
            <input type="checkbox" class="row-checkbox" data-id="{{id}}">
            <button class="btn-icon btn-edit" data-row-id="{{id}}">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-delete" data-row-id="{{id}}">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
        <div class="pseudo-table-cell cell-id">{{id}}</div>
        <div class="pseudo-table-cell cell-name">{{name}}</div>
        <div class="pseudo-table-cell cell-bool" data-field="is_active"></div>
    </div>
</template>
```

---

## ✅ Чеклист створення нової таблиці

### 1. Планування
- [ ] Визначив які колонки потрібні
- [ ] Перевірив чи можна використати стандартні типи (.cell-id, .cell-name, .cell-bool)
- [ ] Визначив які колонки мають сортування
- [ ] Визначив чи потрібні дії (edit, delete, view)

### 2. Створення шаблону
- [ ] Створив файл `templates/tables/table-[назва].html`
- [ ] Додав `.pseudo-table-header` з правильними класами колонок
- [ ] Додав `.sortable-header` та `.sort-indicator` де потрібно
- [ ] Створив `<template id="row-template">` для рядка
- [ ] Використав `data-field` або `{{placeholders}}` для даних
- [ ] Додав `data-row-id` на рядок
- [ ] Додав чекбокси якщо потрібен вибір рядків

### 3. JavaScript
- [ ] Імпортував `loadTableTemplate` та `populateTableRow`
- [ ] Завантажив шаблон через `await loadTableTemplate('table-назва')`
- [ ] Додав header в контейнер
- [ ] Додав рядки через цикл по даних
- [ ] Використав `renderBadge()` для boolean колонок
- [ ] Використав `escapeHtml()` для користувацьких даних
- [ ] Додав обробники подій (edit, delete, checkbox)

### 4. Перевірка
- [ ] Таблиця відображається коректно
- [ ] Header фіксований при скролі
- [ ] Колонки мають правильні розміри
- [ ] Сортування працює (якщо є)
- [ ] Чекбокси працюють (якщо є)
- [ ] Кнопки дій працюють (якщо є)
- [ ] Текст обрізається з `...` якщо задовгий
- [ ] Hover ефект на рядках працює

### 5. Документація
- [ ] Додав коментарі в HTML шаблон
- [ ] Додав JSDoc до JavaScript функцій
- [ ] Оновив цей гайд якщо створив новий тип колонки

---

## 📚 Додаткові ресурси

- [ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md) - Архітектурні принципи
- [PAGES-STRUCTURE-GUIDE.md](./PAGES-STRUCTURE-GUIDE.md) - Структура сторінок
- [CODE-STYLE-GUIDE.md](./CODE-STYLE-GUIDE.md) - Стиль коду

---

## 🎓 Навчальні приклади

Дивись реальні приклади в:
- `templates/tables/table-test.html` - тестовий приклад
- `templates/tables/table-banned-words-manage.html` - повний приклад
- `js/banned-words/banned-words-test.js` - JavaScript для тесту

---

**Дата створення:** 2025-01-15
**Версія:** 1.0
**Статус:** Активний (використовується для всіх нових таблиць)
