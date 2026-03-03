# Products — рефакторинг на архітектуру brands (еталон)

## Контекст
Brands (`js/pages/brands/`) — еталон для сторінкових модулів. Products має 4 конкретних відхилення від brands. Хук-система, структура main.js, порядок ключів createManagedTable — все відповідає brands і залишається як є.

---

## Фаза 1: Видалити window globals

**Проблема:** `products-main.js:125-126` зберігає бренди/категорії в `window.__productsPageBrands` / `window.__productsPageCategories`. Brands зберігає залежні дані в `brandsState` або імпортує напряму.

### Зміни:

**`products-state.js`** — додати 2 поля:
```js
brands: [],
categories: [],
```

**`products-main.js:125-126`** — замінити:
```js
// було:   window.__productsPageBrands = getBrands();
// стало:  productsState.brands = getBrands();
// було:   window.__productsPageCategories = getCategories();
// стало:  productsState.categories = getCategories();
```

**`products-table.js:111-121`** — спростити dataTransform:
```js
// було:   let brands = []; try { brands = window.__productsPageBrands || []; ... } catch {}
// стало:  const brands = productsState.brands || [];
//         const categories = productsState.categories || [];
```
Видалити зайвий try/catch.

**Тест:** Таблиця товарів показує назви брендів і категорій коректно.

---

## Фаза 2: Розділити groups-table.js → groups-table + groups-crud

**Проблема:** `groups-table.js` (~358 рядків) містить і таблицю, і CRUD модал. В brands це розділено: `lines-table.js` (таблиця) + `lines-crud.js` (CRUD).

### 2.1 — Створити `groups-crud.js`

Перенести з `groups-table.js`:
- `_currentGroupId`, `_groupProductIds` (рядки 121-122)
- `showAddGroupModal()`, `showEditGroupModal()` (рядки 124-156)
- `renderGroupProductsList()` (рядки 162-203)
- `initGroupSearch()`, `renderSuggestions()` (рядки 209-284)
- `initGroupSaveHandler()`, `handleSaveGroup()`, `handleDeleteGroup()` (рядки 290-333)
- `registerActionHandlers` delete handler

Шапка з `🔌 ПЛАГІН`. Імпорти: `groups-data`, `products-data`, `modal-main`, `toast`, `escapeHtml`.

### 2.2 — Скоротити `groups-table.js`

Залишити: `getColumns()`, `initGroupsPageTable()`, `renderGroupsTable()`, `resetGroupsTableAPI()`, `registerActionHandlers` тільки edit (lazy import showEditGroupModal).

Видалити CRUD-імпорти: `showModal`, `closeModal`, `showConfirmModal`, `showToast`, `escapeHtml`.

Кнопку "Додати групу" (рядок 113-114) перенести до `groups-crud.js`.

**Тест:** Groups таб — таблиця + CRUD працюють.

---

## Фаза 3: Додати init(state) + зареєструвати в PLUGINS

**Проблема:**
- `variants-table.js` — в PLUGINS, але **немає** `init(state)`
- `groups-table.js` — **НЕ** в PLUGINS, немає `init(state)`
- `groups-crud.js` (новий) — потрібен `init(state)`

Еталон — brands `lines-table.js:159`:
```js
export function init(state) {
    registerBrandsPlugin('onInit', () => {
        if (brandsState.activeTab === 'lines') renderLinesTable();
    });
}
```

### 3.1 — `variants-table.js`: додати init + імпорт registerProductsPlugin
```js
export function init(state) {
    registerProductsPlugin('onInit', () => {
        if (productsState.activeTab === 'variants') renderVariantsTable();
    });
}
```

### 3.2 — `groups-table.js`: додати init + імпорт registerProductsPlugin
```js
export function init(state) {
    registerProductsPlugin('onInit', () => {
        if (productsState.activeTab === 'groups') renderGroupsTable();
    });
}
```

### 3.3 — `groups-crud.js`: додати init для кнопки "Додати"

### 3.4 — `products-main.js` PLUGINS: додати `'./groups-table.js'`, `'./groups-crud.js'`

**Тест:** Всі 3 таби працюють, lazy-loaded таблиці рендеряться.

---

## Фаза 4: Маркери + header

### 4.1 — `products-events.js`: додати `🔌 ПЛАГІН` в шапку
### 4.2 — `groups-crud.js`: шапка з `🔌 ПЛАГІН` (створено у фазі 2)
### 4.3 — `products-main.js` header: додати `groups-crud.js` в дерево файлів

**Тест:** Візуальна перевірка шапок.

---

## Фаза 5: docs/PROJECT-OVERVIEW.html — правило неймінгу

Додати примітку: сторінкові модулі (`js/pages/`) можуть використовувати повну назву папки як префікс (`products-`, `brands-`).

---

## Підсумок

| Фаза | Файлів змінено | Створено | Видалено |
|------|----------------|----------|----------|
| 1 | 3 | 0 | 0 |
| 2 | 1 | 1 (`groups-crud.js`) | 0 |
| 3 | 3 | 0 | 0 |
| 4 | 3 | 0 | 0 |
| 5 | 1 | 0 | 0 |

**Разом:** ~8 файлів змінено, 1 створено. Фінал: 21 файл (було 20).

## Критичні файли
- `js/pages/products/products-state.js` — додати brands/categories поля
- `js/pages/products/products-main.js` — window globals → state, PLUGINS
- `js/pages/products/products-table.js` — dataTransform без window globals
- `js/pages/products/groups-table.js` — витягнути CRUD, додати init
- `js/pages/products/variants-table.js` — додати init
- `js/pages/products/groups-crud.js` — новий файл
- `js/pages/products/products-events.js` — маркер в шапці
- `docs/PROJECT-OVERVIEW.html` — правило неймінгу

## Верифікація
1. Таб Products — таблиця з брендами/категоріями, пошук, фільтри
2. Таб Variants — таблиця рендериться при перемиканні
3. Таб Groups — таблиця + створення/редагування/видалення груп
4. Модал товару — всі секції
5. Aside FAB — додавання товару
6. Консоль — без помилок
