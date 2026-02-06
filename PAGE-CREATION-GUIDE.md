# Як створити нову сторінку в Pinguin V5

Це покрокова інструкція для створення нової сторінки в проєкті.
Головний принцип: **нічого не пишемо з нуля** — збираємо сторінку з готових блоків, як конструктор LEGO.

---

## Зміст

1. [Що таке LEGO-система](#1-що-таке-lego-система)
2. [Анатомія сторінки — з чого вона складається](#2-анатомія-сторінки--з-чого-вона-складається)
3. [Покрокове створення нової сторінки](#3-покрокове-створення-нової-сторінки)
4. [Готові блоки (common) — що є і як використовувати](#4-готові-блоки-common--що-є-і-як-використовувати)
   - [Таблиця](#41-таблиця-ui-tablejs)
   - [Модальне вікно](#42-модальне-вікно-ui-modaljs)
   - [Select (випадаючий список)](#43-select-ui-selectjs)
   - [Toast (повідомлення)](#44-toast-ui-toastjs)
   - [Loading (завантаження)](#45-loading-ui-loadingjs)
   - [Tabs (вкладки)](#46-tabs-ui-tabsjs)
   - [Dropdown (меню)](#47-dropdown-ui-dropdownjs)
   - [Actions (дії з рядками)](#48-actions-ui-actionsjs)
   - [Batch Actions (масові дії)](#49-batch-actions-ui-batch-actionsjs)
   - [Pagination (пагінація)](#410-pagination-ui-paginationjs)
   - [Editor (текстовий редактор)](#411-editor-текстовий-редактор)
5. [Aside-панель (права бокова панель)](#5-aside-панель-права-бокова-панель)
6. [Найкращий приклад: як влаштований Editor](#6-найкращий-приклад-як-влаштований-editor)
7. [Чеклист створення сторінки](#7-чеклист-створення-сторінки)

---

## 1. Що таке LEGO-система

Уяви набір конструктора LEGO. У тебе є:
- **Цеглинки** — базові деталі (кнопка, поле вводу, іконка)
- **Готові блоки** — зібрані модулі (таблиця з сортуванням, модалка з формою, select з пошуком)
- **Інструкція** — як з цих блоків зібрати сторінку

**В нашому проєкті це працює так:**

```
LEGO-цеглинки (css/root.css)          →  Кольори, шрифти, відступи, тіні
         ↓
LEGO-деталі (css/components/)         →  Кнопки, поля, чіпи, бейджі
         ↓
LEGO-блоки (js/common/)               →  Таблиця, модалка, select, toast, editor
         ↓
LEGO-конструкція (сторінка)           →  HTML-сторінка зібрана з блоків
```

**Ключова ідея:**
- Ти **не малюєш** нову кнопку для кожної сторінки — ти **використовуєш** готову `.btn-primary`
- Ти **не пишеш** код таблиці з нуля — ти **викликаєш** `createPseudoTable()` з потрібними параметрами
- Ти **не верстаєш** модалку — ти **створюєш** HTML-шаблон і викликаєш `showModal()`

Якщо щось потрібно змінити (наприклад, колір кнопки) — змінюєш в одному місці (`root.css`), і він оновиться **на всіх сторінках одночасно**.

---

## 2. Анатомія сторінки — з чого вона складається

Кожна сторінка проєкту складається з **трьох колонок**:

```
┌─────────────┬──────────────────────────────┬────────────────┐
│             │                              │                │
│  ЛІВА       │   ГОЛОВНИЙ КОНТЕНТ           │  ПРАВА         │
│  ПАНЕЛЬ     │   (таблиця, форми, дані)     │  ПАНЕЛЬ        │
│  (навігація)│                              │  (aside —      │
│             │                              │   інструменти) │
│             │                              │                │
│  panel-left │   content-main               │  panel-right   │
│             │                              │                │
└─────────────┴──────────────────────────────┴────────────────┘
```

### Ліва панель (`panel-left`)
- Навігація між сторінками (Entities, Keywords, Glossary тощо)
- Кнопка логіну / інформація про користувача
- **Однакова на всіх сторінках** — копіюється з існуючої сторінки

### Головний контент (`content-main`)
- Заголовок з назвою та кнопками
- Таблиця з даними
- Фіксований footer з пагінацією (перемикання сторінок)
- **Унікальний для кожної сторінки** — але збирається з готових блоків

### Права панель — Aside (`panel-right`)
- Інструменти: пошук, фільтри, редактори
- Кнопки дій (Додати, Зберегти)
- **Завантажується з HTML-шаблону** у папці `templates/aside/`

### Файлова структура сторінки

Для нової сторінки (припустимо, "Products") потрібні такі файли:

```
products.html                          ← HTML-сторінка
js/main-products.js                    ← Точка входу (запуск)
js/products/
  ├── products-init.js                 ← Ініціалізація (головний файл)
  ├── products-data.js                 ← Завантаження даних з API
  ├── products-table.js                ← Малювання таблиці
  ├── products-events.js               ← Обробка кліків та дій
  └── products-crud.js                 ← Створення/Редагування/Видалення
templates/aside/aside-products.html    ← Шаблон правої панелі
```

---

## 3. Покрокове створення нової сторінки

### Крок 1: Створи HTML-файл

Найпростіше — **скопіювати** існуючу сторінку (наприклад, `keywords.html`) і замінити назви.

Структура HTML-файлу:

```html
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Назва сторінки</title>
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">

  <!-- Підключаємо стилі дизайн-системи (один файл для ВСІХ сторінок) -->
  <link rel="stylesheet" href="css/main.css">

  <!-- Підключаємо іконки Material Symbols -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"/>

  <!-- Підключаємо шрифт DM Sans -->
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>

<body>
  <!-- ======================================== -->
  <!-- ЛІВА ПАНЕЛЬ (копіюємо з існуючої сторінки) -->
  <!-- ======================================== -->
  <nav id="panel-left" class="panel panel-left">
    <div class="panel-content-scroll">
      <!-- Навігаційні посилання -->
      <a href="entities.html" class="panel-item">
        <span class="material-symbols-outlined panel-item-icon">category</span>
        <span class="panel-item-text">Сутності</span>
      </a>
      <!-- Для ПОТОЧНОЇ сторінки додаємо клас is-active -->
      <a href="products.html" class="panel-item is-active">
        <span class="material-symbols-outlined panel-item-icon">inventory_2</span>
        <span class="panel-item-text">Продукти</span>
      </a>
      <!-- ...інші посилання... -->
    </div>

    <div class="panel-content-footer">
      <!-- Кнопка логіну (копіюємо з існуючої сторінки) -->
    </div>
  </nav>

  <!-- ======================================== -->
  <!-- ГОЛОВНИЙ КОНТЕНТ -->
  <!-- ======================================== -->
  <main id="content-main" class="content-main">

    <!-- Заголовок секції -->
    <div class="section-header u-align-end">
      <div class="section-name-block">
        <div class="section-name">
          <h2>Продукти</h2>
          <button class="btn-icon" aria-label="Інформація">
            <span class="material-symbols-outlined">info</span>
          </button>
        </div>
        <h3 id="products-stats">Показано 0 з 0</h3>
      </div>
      <div class="tab-controls">
        <button id="refresh-products" class="btn-icon" aria-label="Оновити">
          <span class="material-symbols-outlined">refresh</span>
        </button>
      </div>
    </div>

    <!-- Таблиця (JS наповнить автоматично) -->
    <div id="products-table-container" class="pseudo-table-container">
      <!-- Заповниться через JavaScript -->
    </div>

    <!-- Фіксований footer з пагінацією -->
    <footer class="fixed-footer">
      <!-- Заповниться через JS (ui-pagination.js) -->
    </footer>

  </main>

  <!-- ======================================== -->
  <!-- ПРАВА ПАНЕЛЬ (Aside) -->
  <!-- ======================================== -->
  <aside id="panel-right" class="panel panel-right">
    <div class="panel-header">
      <button class="btn-icon" id="toggle-panel-right" aria-label="Згорнути панель">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
    <div id="panel-right-content" class="panel-content">
      <!-- Завантажиться з templates/aside/aside-products.html -->
    </div>
  </aside>

  <!-- Підключаємо JavaScript (один скрипт на сторінку) -->
  <script type="module" src="js/main-products.js"></script>
</body>
</html>
```

**Що тут важливо:**
- `css/main.css` підключає ВСЮ дизайн-систему — більше нічого не потрібно
- `id="products-table-container"` — порожній блок, який JS наповнить таблицею
- `id="panel-right-content"` — порожній блок, в який JS завантажить aside-шаблон
- `<script type="module" src="js/main-products.js">` — запуск JavaScript

### Крок 2: Створи точку входу JS

Файл `js/main-products.js` — це "пускач". Він запускає всю логіку сторінки:

```javascript
// Імпортуємо готові модулі
import { initCore } from './main-core.js';          // Ядро (навігація, модалки, auth)
import { initProducts } from './products/products-init.js'; // Логіка цієї сторінки

// Коли HTML завантажився — запускаємо
document.addEventListener('DOMContentLoaded', () => {
  initCore();       // 1. Ініціалізуємо все спільне (ліва панель, модалки, auth)
  initProducts();   // 2. Ініціалізуємо специфічну логіку сторінки
});
```

**`initCore()`** — це "базовий комплект", який запускається на КОЖНІЙ сторінці. Він підключає:
- Ліву панель (згортання/розгортання)
- Праву панель
- Систему модальних вікон
- Систему авторизації
- Dropdown-меню
- Таби
- Tooltip-підказки

### Крок 3: Створи модуль ініціалізації

Файл `js/products/products-init.js` — "мозок" сторінки:

```javascript
// Імпортуємо готові UI-компоненти (LEGO-блоки)
import { initDropdowns } from '../common/ui-dropdown.js';
import { initPagination } from '../common/ui-pagination.js';
import { showToast } from '../common/ui-toast.js';
import { initCustomSelects } from '../common/ui-select.js';

// Стан сторінки — тут зберігаються всі дані
export const productsState = {
  items: [],                    // Масив продуктів
  searchQuery: '',              // Поточний пошуковий запит
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0
  }
};

// Головна функція ініціалізації
export function initProducts() {
  loadAsidePanel();             // Завантажити праву панель
  initPaginationControl();      // Налаштувати пагінацію
  checkAuthAndLoadData();       // Перевірити авторизацію і завантажити дані

  // Слухати зміну авторизації (наприклад, коли користувач залогінився)
  document.addEventListener('auth-state-changed', (event) => {
    if (event.detail.isAuthorized) {
      checkAuthAndLoadData();
    }
  });
}

// Завантаження правої панелі з HTML-шаблону
async function loadAsidePanel() {
  const panelContent = document.getElementById('panel-right-content');
  if (!panelContent) return;

  // Завантажуємо HTML-шаблон
  const response = await fetch('templates/aside/aside-products.html');
  panelContent.innerHTML = await response.text();

  // Після завантаження — ініціалізуємо компоненти всередині
  initCustomSelects(panelContent);  // Якщо є select-и в aside
  initDropdowns();                   // Якщо є dropdown-и
}

// Перевірка авторизації та завантаження даних
async function checkAuthAndLoadData() {
  if (window.isAuthorized) {
    try {
      // Завантажуємо дані з API
      const response = await fetch('/api/products');
      const data = await response.json();
      productsState.items = data;
      productsState.pagination.totalItems = data.length;

      // Малюємо таблицю
      renderTable();

    } catch (error) {
      showToast('Помилка завантаження даних', 'error');
    }
  }
}

function renderTable() {
  // Тут використовуємо createPseudoTable() — див. розділ 4.1
}

function initPaginationControl() {
  // Тут використовуємо initPagination() — див. розділ 4.10
}
```

### Крок 4: Створи шаблон Aside

Файл `templates/aside/aside-products.html`:

```html
<div class="panel-fragment is-active" id="aside-products">

  <!-- Верхня частина (завжди видима, не прокручується) -->
  <div class="panel-content-fix">
    <div class="panel-box">
      <span class="material-symbols-outlined panel-box-icon">search</span>
      <input type="text"
             id="search-products"
             class="input-main"
             placeholder="Шукати продукти...">
      <button class="btn-icon" id="clear-search-products" aria-label="Очистити">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  </div>

  <div class="panel-separator"></div>

  <!-- Середня частина (прокручується, якщо контенту багато) -->
  <div class="panel-content-scroll">
    <!-- Сюди JS може динамічно додавати контент -->
    <!-- Наприклад: список фільтрів, результати пошуку, редактор -->
  </div>

  <div class="panel-separator"></div>

  <!-- Нижня частина (завжди видима, прибита до низу) -->
  <div class="panel-content-footer">
    <button id="btn-add-product" class="panel-item">
      <span class="material-symbols-outlined panel-item-icon">add</span>
      <span class="panel-item-text">Додати продукт</span>
    </button>
  </div>
</div>
```

**Структура aside — три зони:**

```
┌─────────────────────────┐
│  panel-content-fix      │  ← Зафіксована зверху (пошук, фільтри)
├─────────────────────────┤
│  panel-separator        │  ← Горизонтальна лінія
├─────────────────────────┤
│                         │
│  panel-content-scroll   │  ← Прокручується (основний контент)
│                         │
├─────────────────────────┤
│  panel-separator        │  ← Горизонтальна лінія
├─────────────────────────┤
│  panel-content-footer   │  ← Зафіксована знизу (кнопки дій)
└─────────────────────────┘
```

### Крок 5: Додай сторінку в навігацію

Відкрий **кожну** існуючу HTML-сторінку і додай посилання на нову в ліву панель:

```html
<a href="products.html" class="panel-item">
  <span class="material-symbols-outlined panel-item-icon">inventory_2</span>
  <span class="panel-item-text">Продукти</span>
</a>
```

---

## 4. Готові блоки (common) — що є і як використовувати

Все, що лежить у папці `js/common/`, — це готові LEGO-блоки. Ти не переписуєш їх, а просто використовуєш. Нижче — опис кожного.

### 4.1 Таблиця (`ui-table.js`)

**Що це:** Готова таблиця з сортуванням, фільтрами, кнопками дій для кожного рядка.

**Як використати:**

```javascript
import { createPseudoTable } from '../common/ui-table.js';

const container = document.getElementById('products-table-container');

const table = createPseudoTable(container, {
  // Описуємо колонки таблиці
  columns: [
    { id: 'id',     label: 'ID',       sortable: true,  className: 'cell-id' },
    { id: 'name',   label: 'Назва',    sortable: true,  filterable: true },
    { id: 'price',  label: 'Ціна',     sortable: true },
    { id: 'status', label: 'Статус',   render: (value) => {
      // Кастомне відображення: замість тексту показуємо бейдж
      return `<span class="chip chip-${value === 'active' ? 'success' : 'error'}">${value}</span>`;
    }}
  ],

  // Кнопки дій для кожного рядка
  rowActions: [
    { icon: 'edit',   title: 'Редагувати', handler: (rowId) => editProduct(rowId) },
    { icon: 'delete', title: 'Видалити',   handler: (rowId) => deleteProduct(rowId) }
  ],

  // Як отримати ID рядка
  getRowId: (row) => row.id,

  // Що робити при кліку на рядок
  onRowClick: (row) => openProductDetails(row),
});

// Намалювати таблицю з даними
table.render(productsState.items);

// Оновити тільки рядки (без перемальовування шапки)
table.updateRows(newData);
```

**Що отримуєш "з коробки":**
- Шапка таблиці з назвами колонок
- Сортування по кліку на заголовок (стрілочки вгору/вниз)
- Кнопки дій, що з'являються при наведенні на рядок
- Пуста таблиця красиво показує "Немає даних"
- Виділення рядка при наведенні
- Клікабельні рядки

---

### 4.2 Модальне вікно (`ui-modal.js`)

**Що це:** Вікно, що з'являється поверх сторінки (для форм, підтверджень, деталей).

**Як використати:**

```javascript
import { showModal, closeModal } from '../common/ui-modal.js';

// Відкрити модалку (за її ID)
showModal('modal-add-product');

// Закрити модалку
closeModal('modal-add-product');

// Закрити всі модалки
closeAllModals();
```

**HTML модалки** (в основному файлі або завантажується динамічно):

```html
<div class="modal-overlay" id="modal-add-product" data-modal-id="modal-add-product">
  <div class="modal-container modal-medium">
    <header class="modal-header">
      <h2 class="modal-title">Додати продукт</h2>
      <button class="btn-icon" data-modal-close aria-label="Закрити">
        <span class="material-symbols-outlined">close</span>
      </button>
    </header>

    <div class="modal-body">
      <div class="form-group">
        <label>Назва продукту</label>
        <input type="text" id="product-name" placeholder="Введіть назву...">
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" data-modal-close>Скасувати</button>
      <button class="btn-primary" id="btn-save-product">Зберегти</button>
    </div>
  </div>
</div>
```

**Як відкрити модалку кнопкою (без JS):**

```html
<!-- Кнопка з атрибутом data-modal-trigger відкриє модалку автоматично -->
<button data-modal-trigger="modal-add-product">Додати</button>
```

**Розміри модалок:**
- `modal-small` — 400px (підтвердження, логін)
- `modal-medium` — 60vw (форми)
- `modal-large` — 80vw (таблиці, імпорт)

---

### 4.3 Select (`ui-select.js`)

**Що це:** Красивий випадаючий список замість стандартного браузерного `<select>`. З пошуком, мультивибором, чіпами.

**Як використати в HTML:**

```html
<!-- Звичайний select стає красивим автоматично -->
<select id="product-category" data-custom-select>
  <option value="">-- Оберіть категорію --</option>
  <option value="vector">Vector</option>
  <option value="pixel">Pixel</option>
  <option value="layout">Layout</option>
</select>

<!-- Мультивибір -->
<select id="product-tags" data-custom-select multiple>
  <option value="new">Новий</option>
  <option value="sale">Знижка</option>
  <option value="top">Топ</option>
</select>
```

**Ініціалізація:**

```javascript
import { initCustomSelects, populateSelect } from '../common/ui-select.js';

// Ініціалізувати всі select-и на сторінці (або в конкретному контейнері)
initCustomSelects();
initCustomSelects(document.getElementById('modal-add-product'));

// Заповнити select динамічно (наприклад, даними з API)
populateSelect('product-category', [
  { value: '1', text: 'Категорія 1' },
  { value: '2', text: 'Категорія 2' },
  { value: '3', text: 'Категорія 3' }
], {
  placeholder: '-- Оберіть --',
  selectedValue: '2'    // Попередньо обрати значення
});
```

**Що отримуєш:**
- Пошук серед опцій (набираєш текст — список фільтрується)
- Мультивибір з чіпами (обрані показуються як бірюзові "таблетки")
- "Вибрати все" / "Зняти все"
- Навігація клавіатурою (стрілки вгору/вниз, Enter)
- Автоматичне відкриття вгору, якщо внизу мало місця

---

### 4.4 Toast (`ui-toast.js`)

**Що це:** Короткі повідомлення внизу екрану ("Збережено!", "Помилка!"), що зникають автоматично.

**Як використати:**

```javascript
import { showToast } from '../common/ui-toast.js';

showToast('Продукт успішно додано', 'success');       // Зелений/темний
showToast('Помилка збереження', 'error');               // Червоний
showToast('Дані оновлено', 'info');                     // Інформаційний
showToast('Увага! Є незбережені зміни', 'info', 5000); // 5 секунд замість стандартних 3
```

---

### 4.5 Loading (`ui-loading.js`)

**Що це:** Індикатори завантаження — spinner (крутилка), dots (крапки), progress bar (смуга прогресу).

**Як використати:**

```javascript
import { showLoader, hideLoader, withLoader } from '../common/ui-loading.js';

// Показати spinner в контейнері
const container = document.getElementById('products-table-container');
showLoader(container, {
  type: 'spinner',                // 'spinner' | 'dots' | 'progress'
  message: 'Завантаження...',     // Текст під спіннером
  overlay: true                   // Затемнити контент під спіннером
});

// Прибрати spinner
hideLoader();

// АБО — автоматично: показати спіннер → виконати дію → прибрати спіннер
await withLoader(container, async () => {
  const data = await fetch('/api/products');
  return data.json();
});
```

---

### 4.6 Tabs (`ui-tabs.js`)

**Що це:** Система вкладок — клікаєш на "Вкладка 1" — бачиш контент 1, клікаєш на "Вкладка 2" — бачиш контент 2.

**Як використати в HTML:**

```html
<div data-tabs-container>
  <!-- Кнопки вкладок -->
  <div class="connected-button-group-round">
    <button class="segment active" data-tab-target="tab-general">
      <span class="state-layer"><span class="label">Загальне</span></span>
    </button>
    <button class="segment" data-tab-target="tab-seo">
      <span class="state-layer"><span class="label">SEO</span></span>
    </button>
    <button class="segment" data-tab-target="tab-images">
      <span class="state-layer"><span class="label">Зображення</span></span>
    </button>
  </div>

  <!-- Контент вкладок -->
  <div class="tab-content is-active" data-tab-content="tab-general">
    <p>Контент вкладки "Загальне"</p>
  </div>
  <div class="tab-content" data-tab-content="tab-seo">
    <p>Контент вкладки "SEO"</p>
  </div>
  <div class="tab-content" data-tab-content="tab-images">
    <p>Контент вкладки "Зображення"</p>
  </div>
</div>
```

**Ініціалізація:**

```javascript
import { initTabs } from '../common/ui-tabs.js';

// Автоматично ініціалізується через initCore()
// АБО вручну для конкретного контейнера:
initTabs(document.getElementById('modal-body'));
```

---

### 4.7 Dropdown (`ui-dropdown.js`)

**Що це:** Випадаюче меню при кліку на кнопку (наприклад, "ще дії": Редагувати, Копіювати, Видалити).

**Як використати в HTML:**

```html
<div class="dropdown-wrapper">
  <!-- Кнопка-тригер -->
  <button class="btn-icon" aria-label="Дії">
    <span class="material-symbols-outlined">more_vert</span>
  </button>

  <!-- Меню (приховане за замовчуванням) -->
  <div class="dropdown-menu">
    <div class="dropdown-header">Дії</div>
    <div class="dropdown-body">
      <button class="dropdown-item" data-action="edit">
        <span class="material-symbols-outlined">edit</span>
        Редагувати
      </button>
      <button class="dropdown-item" data-action="duplicate">
        <span class="material-symbols-outlined">content_copy</span>
        Дублювати
      </button>
      <div class="dropdown-separator"></div>
      <button class="dropdown-item" data-action="delete">
        <span class="material-symbols-outlined">delete</span>
        Видалити
      </button>
    </div>
  </div>
</div>
```

**Ініціалізація:**

```javascript
import { initDropdowns } from '../common/ui-dropdown.js';

// Автоматично ініціалізується через initCore()
// АБО після динамічного додавання dropdown:
initDropdowns();
```

Клік по кнопці — меню відкривається. Клік поза меню — закривається.

---

### 4.8 Actions (`ui-actions.js`)

**Що це:** Система для обробки дій з рядками таблиці (Редагувати, Видалити, Переглянути).

**Як використати:**

```javascript
import { registerActionHandlers, initActionHandlers } from '../common/ui-actions.js';

// 1. Реєструємо обробники для конкретної "зони"
registerActionHandlers('products', {
  edit:   (rowId) => openEditModal(rowId),
  delete: (rowId) => confirmDelete(rowId),
  view:   (rowId) => openDetails(rowId)
});

// 2. Ініціалізуємо слухачі подій на контейнері
const tableContainer = document.getElementById('products-table-container');
initActionHandlers(tableContainer, 'products');
```

**В HTML** кнопки мають спеціальні атрибути:

```html
<button data-action="edit" data-row-id="123" data-context="products">
  <span class="material-symbols-outlined">edit</span>
</button>
```

Коли користувач натискає кнопку — система автоматично знаходить потрібний обробник і передає йому `rowId`.

---

### 4.9 Batch Actions (`ui-batch-actions.js`)

**Що це:** Масові дії — коли потрібно вибрати кілька рядків і зробити щось з усіма одночасно (видалити, експортувати, змінити статус).

**Як використати:**

```javascript
import { createBatchActionsBar } from '../common/ui-batch-actions.js';

const batchBar = createBatchActionsBar({
  tabId: 'products',
  actions: [
    {
      id: 'delete-selected',
      label: 'Видалити обрані',
      icon: 'delete',
      handler: (selectedIds) => deleteMultiple(selectedIds)
    },
    {
      id: 'export-selected',
      label: 'Експортувати',
      icon: 'download',
      handler: (selectedIds) => exportProducts(selectedIds)
    }
  ],
  onSelectionChange: (count) => {
    console.log(`Обрано: ${count} елементів`);
  }
});

// Методи:
batchBar.selectItem(id);      // Обрати один елемент
batchBar.deselectItem(id);    // Зняти вибір
batchBar.toggleItem(id);      // Перемкнути
batchBar.selectAll(allIds);   // Обрати всі
batchBar.deselectAll();       // Зняти всі
```

---

### 4.10 Pagination (`ui-pagination.js`)

**Що це:** Перемикач сторінок внизу таблиці ("Сторінка 1 з 5", кнопки "Назад"/"Вперед").

**Як використати:**

```javascript
import { initPagination } from '../common/ui-pagination.js';

const footer = document.querySelector('.fixed-footer');

const paginationAPI = initPagination(footer, {
  currentPage: 1,
  pageSize: 10,
  totalItems: productsState.items.length,

  // Що робити при зміні сторінки
  onPageChange: (newPage, newPageSize) => {
    productsState.pagination.currentPage = newPage;
    productsState.pagination.pageSize = newPageSize;
    renderTableRowsOnly();  // Перемалювати таблицю
  }
});

// Оновити кількість елементів (наприклад, після фільтрації)
paginationAPI.update({ totalItems: 42, currentPage: 1 });
```

---

### 4.11 Editor (текстовий редактор)

**Що це:** Найскладніший і найкраще задокументований компонент. Повноцінний текстовий редактор з:
- Форматуванням (жирний, курсив, заголовки, списки)
- Перевіркою заборонених слів
- Режимами "Текст" та "Код"
- Знайти та замінити
- Скасувати / Повторити (Undo/Redo)
- Підрахунком статистики (символи, слова)

Детально про нього — у [розділі 6](#6-найкращий-приклад-як-влаштований-editor).

**Як використати:**

```javascript
import { createHighlightEditor } from '../common/editor/editor-main.js';

const container = document.getElementById('editor-container');

const editor = createHighlightEditor(container, {
  validation: true,          // Увімкнути перевірку заборонених слів
  showStats: true,           // Показувати статистику (символи, слова)
  showFindReplace: true,     // Кнопка "Знайти та замінити"
  placeholder: 'Введіть опис продукту...',
  initialValue: '<p>Початковий текст</p>',
  minHeight: 200,
  onChange: (html) => {
    // Ця функція викликається кожного разу, коли текст змінюється
    console.log('Новий HTML:', html);
  }
});

// Отримати контент
const html = editor.getValue();          // HTML (з тегами)
const text = editor.getPlainText();      // Чистий текст (без тегів)

// Встановити контент
editor.setValue('<p>Новий текст</p>');

// Перемикання режимів
editor.setMode('code');     // Режим коду (показує HTML-теги)
editor.setMode('text');     // Режим тексту (WYSIWYG)

// Інше
editor.focus();             // Поставити курсор в редактор
editor.clear();             // Очистити
editor.destroy();           // Видалити з DOM
```

---

## 5. Aside-панель (права бокова панель)

Aside — це права бокова панель, яка містить інструменти для роботи з контентом головної частини. Вона **завантажується динамічно** з HTML-шаблону.

### Як вона працює

1. В HTML-сторінці є порожній контейнер `<div id="panel-right-content">`
2. JavaScript завантажує HTML-шаблон з `templates/aside/aside-feature.html`
3. Вставляє його вміст у контейнер
4. Ініціалізує компоненти всередині (select-и, dropdown-и тощо)

### Існуючі aside-шаблони (можна взяти як приклад)

| Файл | Що містить |
|------|-----------|
| `aside-keywords.html` | Пошук + кнопка додавання |
| `aside-text.html` | Редактор тексту + інструменти форматування |
| `aside-table.html` | Генератор таблиць |
| `aside-products.html` | Управління продуктами |
| `aside-highlight.html` | Підсвічування тексту |
| `aside-translate.html` | Переклад |
| `aside-image-tool.html` | Робота із зображеннями |
| `aside-banned-words.html` | Заборонені слова |
| `aside-mapper.html` | Маппінг сутностей |
| `aside-links.html` | Управління посиланнями |
| `aside-price.html` | Прайс |
| `aside-glossary.html` | Глосарій |
| `aside-tasks.html` | Завдання |

### Три зони aside

```html
<div class="panel-fragment is-active" id="aside-feature">

  <!-- ЗОНА 1: Фіксована зверху -->
  <!-- Тут зазвичай: пошук, фільтри, перемикачі -->
  <div class="panel-content-fix">
    <div class="panel-box">
      <!-- panel-box — це контейнер з іконкою та контролом -->
      <span class="material-symbols-outlined panel-box-icon">search</span>
      <input type="text" class="input-main" placeholder="Шукати...">
    </div>
  </div>

  <div class="panel-separator"></div>

  <!-- ЗОНА 2: Прокручувана (основний контент) -->
  <!-- Тут зазвичай: результати, списки, форми, редактор -->
  <div class="panel-content-scroll">
    <!-- Будь-який контент -->
  </div>

  <div class="panel-separator"></div>

  <!-- ЗОНА 3: Фіксована знизу -->
  <!-- Тут зазвичай: кнопки дій (Додати, Зберегти) -->
  <div class="panel-content-footer">
    <button class="panel-item">
      <span class="material-symbols-outlined panel-item-icon">add</span>
      <span class="panel-item-text">Додати</span>
    </button>
  </div>
</div>
```

### Panel-item (елемент панелі)

```html
<!-- Кнопка в aside -->
<button class="panel-item">
  <span class="material-symbols-outlined panel-item-icon">add</span>
  <span class="panel-item-text">Назва кнопки</span>
</button>

<!-- Panel box (контейнер з іконкою + контрол) -->
<div class="panel-box">
  <span class="material-symbols-outlined panel-box-icon">tune</span>
  <span class="panel-box-text">Фільтр</span>
</div>
```

---

## 6. Найкращий приклад: як влаштований Editor

Editor — це найскладніший компонент проєкту, і він чудово демонструє LEGO-підхід. Подивимось, як він побудований.

### Архітектура Editor

```
js/common/editor/
├── editor-main.js          ← "Фабрика" — створює редактор
├── editor-template.js      ← HTML-шаблон (генерується JS)
├── editor-state.js         ← Стан (дані, які зберігає редактор)
├── editor-mode.js          ← Перемикання режимів (Текст / Код)
├── editor-formatting.js    ← Плагін: форматування (Bold, Italic, H1...)
├── editor-validation.js    ← Плагін: перевірка заборонених слів
├── editor-undo.js          ← Плагін: скасувати / повторити
├── editor-find.js          ← Плагін: знайти та замінити
├── editor-case.js          ← Плагін: зміна регістру (великі/малі літери)
├── editor-stats.js         ← Плагін: підрахунок статистики
├── editor-paste.js         ← Плагін: обробка вставки (Ctrl+V)
└── editor-utils.js         ← Утиліти (позиція курсора, очистка HTML)
```

### Як це працює

**1. Ядро (Core)** — файли, без яких редактор не працює:
- `editor-main.js` — створює редактор, завантажує плагіни
- `editor-template.js` — генерує HTML-розмітку
- `editor-state.js` — зберігає стан (поточний текст, режим, налаштування)
- `editor-mode.js` — перемикання між текстовим і кодовим режимом

**2. Плагіни (Plugins)** — додаткові можливості, кожну можна видалити незалежно:
- `editor-formatting.js` — кнопки Bold, Italic, H1, H2, H3, списки
- `editor-validation.js` — підсвічування заборонених слів
- `editor-undo.js` — Ctrl+Z / Ctrl+Y
- `editor-find.js` — Ctrl+F (знайти та замінити)
- `editor-stats.js` — лічильник слів і символів
- `editor-paste.js` — очистка тексту при вставці
- `editor-case.js` — зміна регістру тексту

### Чому це хороший приклад

**Модульність:**
- Кожен файл робить ОДНУ річ
- Якщо тобі не потрібна перевірка заборонених слів — просто не підключаєш `editor-validation.js`
- Якщо потрібно додати нову фічу (наприклад, вставка посилань) — створюєш новий файл `editor-links.js`

**Плагінна система:**
- Плагіни реєструють свої "хуки" (гачки) — коли текст змінюється, коли натискається клавіша, коли змінюється режим
- Ядро викликає ці хуки в потрібний момент
- Плагіни не знають один про одного — вони спілкуються тільки через ядро

**Документація в коді:**
Кожен файл редактора починається з детального коментаря. Наприклад:

```javascript
/**
 * COMPONENT: Editor Main
 *
 * ПРИЗНАЧЕННЯ:
 * Фабрика для створення rich text editor з підсвічуванням заборонених слів.
 *
 * ВИКОРИСТАННЯ:
 * const editor = createHighlightEditor(container, options);
 *
 * ПАРАМЕТРИ:
 * - container: DOM-елемент куди вставити редактор
 * - options.validation: увімкнути перевірку слів
 * - options.showStats: показувати статистику
 * ...
 */
```

**Це і є LEGO-система в дії:**
- Ядро (main + template + state + mode) = базова платформа LEGO
- Плагіни = додаткові деталі, які ставляться на платформу
- Весь редактор = готовий LEGO-блок, який вставляється в будь-яку сторінку одним рядком коду

---

## 7. Чеклист створення сторінки

Використовуй цей чеклист кожного разу, коли створюєш нову сторінку:

### HTML

- [ ] Створити `feature-name.html` (скопіювати з існуючої сторінки)
- [ ] Підключити `css/main.css` (стилі)
- [ ] Підключити Material Symbols (іконки)
- [ ] Підключити DM Sans (шрифт)
- [ ] Ліва панель — скопіювати з існуючої, додати `is-active` до нової сторінки
- [ ] Головний контент — створити `section-header` + порожній контейнер таблиці
- [ ] Права панель — порожній `panel-right-content`
- [ ] Footer — для пагінації
- [ ] Підключити `<script type="module" src="js/main-feature.js">`

### JavaScript

- [ ] `js/main-feature.js` — точка входу (`initCore()` + `initFeature()`)
- [ ] `js/feature/feature-init.js` — стан + ініціалізація + завантаження aside
- [ ] `js/feature/feature-data.js` — API-запити
- [ ] `js/feature/feature-table.js` — малювання таблиці
- [ ] `js/feature/feature-events.js` — обробка подій

### Templates

- [ ] `templates/aside/aside-feature.html` — шаблон правої панелі

### Навігація

- [ ] Додати посилання на нову сторінку в ліву панель **всіх** існуючих сторінок
