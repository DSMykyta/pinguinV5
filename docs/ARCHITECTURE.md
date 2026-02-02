# Архітектура проєкту PinguinV5

> Цей документ описує принципи архітектури, спільні системи та CSS компоненти проєкту.
> **Мета**: уникнути створення унікальних компонентів — використовувати тільки наявні.

---

## Зміст

1. [LEGO Architecture](#1-lego-architecture)
2. [Common JS Systems](#2-common-js-systems)
3. [CSS Design System](#3-css-design-system)
4. [Utils Library](#4-utils-library)

---

## 1. LEGO Architecture

### Філософія

**Монолітний код → Модульні плагіни**, які можна видаляти без поломки системи.

### Принципи

| Принцип | Опис |
|---------|------|
| **Graceful degradation** | Якщо плагін не завантажився — система працює далі |
| **Умовна ініціалізація** | Плагін перевіряє config в `init()` і може не активуватися |
| **Centralized State** | Один об'єкт state для всього модуля |
| **Hooks система** | Комунікація між компонентами через pub/sub |
| **Dynamic import** | `Promise.allSettled` для завантаження плагінів |

### Структура модуля

```
module/
├── 🔒 ЯДРО (не видаляти):
│   ├── *-main.js      — Точка входу + завантаження плагінів
│   ├── *-state.js     — Централізований state + hooks
│   └── *-utils.js     — Спільні утиліти
│
└── 🔌 ПЛАГІНИ (можна видалити):
    ├── *-feature1.js
    ├── *-feature2.js
    └── *-feature3.js
```

### Hooks система

```javascript
// Визначення хуків в state.js
const hooks = {
    onDataLoaded: [],
    onItemCreate: [],
    onItemUpdate: [],
    onItemDelete: [],
};

// Реєстрація хука
export function registerHook(hookName, callback) {
    if (hooks[hookName]) {
        hooks[hookName].push(callback);
    }
}

// Виконання хука
export function runHook(hookName, ...args) {
    if (!hooks[hookName]) return;
    hooks[hookName].forEach(cb => {
        try {
            cb(...args);
        } catch (e) {
            console.error(`[Hook Error] ${hookName}:`, e);
        }
    });
}
```

### Завантаження плагінів

```javascript
// main.js
const PLUGINS = [
    './module-feature1.js',
    './module-feature2.js',
];

export async function loadPlugins(state) {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(state);
        } else if (result.status === 'rejected') {
            console.warn(`⚠️ ${PLUGINS[index]} — не завантажено`);
        }
    });
}
```

### Структура плагіна

```javascript
// module-feature.js
import { state, registerHook, markPluginLoaded } from './module-state.js';

export const PLUGIN_NAME = 'module-feature';

export function init() {
    // 1. Позначити плагін завантаженим
    markPluginLoaded(PLUGIN_NAME);

    // 2. Реєстрація хуків (опціонально)
    registerHook('onDataLoaded', handleDataLoaded);

    // 3. Ініціалізація DOM listeners (опціонально)
}

// Експортовані функції для зовнішнього використання
export function doSomething() { ... }
```

---

## 2. Common JS Systems

### Огляд модулів

| Модуль | Файл | Призначення |
|--------|------|-------------|
| **Modal** | `ui-modal.js` | Модальні вікна з шаблонами |
| **Toast** | `ui-toast.js` | Спливаючі повідомлення |
| **Table** | `ui-table.js` | Pseudo-таблиці з сортуванням |
| **Actions** | `ui-actions.js` | Централізована система дій |
| **Select** | `ui-select.js` | Custom select з пошуком |
| **Pagination** | `ui-pagination.js` | Пагінація |
| **Tabs** | `ui-tabs.js` | Вкладки |
| **Confirm** | `ui-modal-confirm.js` | Діалоги підтвердження |

---

### ui-modal.js — Модальні вікна

```javascript
import { showModal, closeModal, closeAllModals } from './common/ui-modal.js';

// Відкрити модал (завантажує /templates/modals/my-modal.html)
await showModal('my-modal');

// Закрити верхній модал
closeModal();

// Закрити конкретний модал
closeModal('my-modal');

// Події
document.addEventListener('modal-opened', (e) => {
    const { modalId, modalElement } = e.detail;
});

document.addEventListener('modal-closed', (e) => {
    const { modalId } = e.detail;
});
```

**HTML шаблон модалу** (`/templates/modals/my-modal.html`):
```html
<div class="modal-overlay" data-modal-id="my-modal">
    <div class="modal-container modal-medium">
        <header class="modal-header">
            <h2 class="modal-title">Заголовок</h2>
            <div class="modal-header-actions">
                <button class="btn-icon" data-modal-close>
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        </header>
        <div class="modal-body">
            <!-- Контент -->
        </div>
        <footer class="modal-footer">
            <button class="btn-secondary" data-modal-close>Скасувати</button>
            <button class="btn-primary" id="save-btn">Зберегти</button>
        </footer>
    </div>
</div>
```

---

### ui-toast.js — Повідомлення

```javascript
import { showToast } from './common/ui-toast.js';

// Типи: 'success', 'error', 'info'
showToast('Збережено успішно', 'success');
showToast('Помилка збереження', 'error');
showToast('Інформація', 'info', 5000); // 5 секунд
```

---

### ui-table.js — Таблиці

```javascript
import { createPseudoTable, renderBadge } from './common/ui-table.js';

const tableAPI = createPseudoTable(container, {
    columns: [
        { id: 'id', label: 'ID', sortable: true, className: 'cell-id' },
        { id: 'name', label: 'Назва', sortable: true },
        {
            id: 'status',
            label: 'Статус',
            render: (value) => renderBadge(value, 'checked')
        }
    ],
    rowActions: [
        { icon: 'edit', handler: (row) => showEditModal(row.id) },
        { icon: 'delete', handler: (row) => showDeleteConfirm(row.id) }
    ],
    onRowClick: (row) => showDetails(row),
    getRowId: (row) => row.id
});

// Початковий рендер
tableAPI.render(data);

// Оновити тільки рядки (заголовок залишається)
tableAPI.updateRows(filteredData);

// Оновити видимість колонок
tableAPI.setVisibleColumns(['id', 'name']);
```

**Badge типи:**
```javascript
renderBadge(true, 'checked')      // ✓ Так / ✗ Ні
renderBadge('ACTIVE', 'status')   // Статус
renderBadge('OK', 'success')      // Зелений
renderBadge('Error', 'error')     // Червоний
renderBadge('Warning', 'warning') // Жовтий
```

---

### ui-actions.js — Система дій

```javascript
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton,
    actionButtons
} from './common/ui-actions.js';

// 1. Реєстрація обробників для контексту
registerActionHandlers('my-context', {
    edit: async (rowId, data) => {
        await showEditModal(rowId);
    },
    delete: async (rowId, data) => {
        const confirmed = await showConfirmModal({ ... });
        if (confirmed) await deleteItem(rowId);
    }
});

// 2. Ініціалізація на контейнері
const cleanup = initActionHandlers(tableContainer, 'my-context');

// 3. Генерація HTML кнопок
const html = actionButton({
    action: 'edit',
    rowId: '123',
    tooltip: 'Редагувати'
});

// Або кілька кнопок
const buttonsHtml = actionButtons('123', ['edit', 'delete']);
```

**HTML з data-атрибутами:**
```html
<button class="btn-icon"
        data-action="edit"
        data-row-id="123"
        data-context="my-context">
    <span class="material-symbols-outlined">edit</span>
</button>
```

**Стандартні дії:** `edit`, `delete`, `view`, `unlink`, `unmap`, `copy`, `add`, `remove`

---

### ui-select.js — Custom Select

```javascript
import { initCustomSelects, populateSelect } from './common/ui-select.js';

// Ініціалізація всіх select з data-custom-select
initCustomSelects(container);

// Заповнення select
populateSelect('my-select', [
    { value: '1', text: 'Option 1' },
    { value: '2', text: 'Option 2', dataset: { id: '2' } }
], {
    placeholder: '-- Оберіть --',
    selectedValue: '1'
});
```

**HTML:**
```html
<select id="my-select" data-custom-select>
    <option value="">-- Оберіть --</option>
</select>

<!-- Мультиселект з "Всі" -->
<select id="multi-select" data-custom-select multiple data-select-all="true">
</select>
```

---

### ui-pagination.js — Пагінація

```javascript
import { initPagination } from './common/ui-pagination.js';

const paginationAPI = initPagination(footerElement, {
    currentPage: 1,
    pageSize: 25,
    totalItems: 100,
    onPageChange: (page, pageSize) => {
        loadData(page, pageSize);
    }
});

// Оновити кількість елементів
paginationAPI.updateTotalItems(150);

// Отримати поточну сторінку
const page = paginationAPI.getCurrentPage();
```

---

### ui-tabs.js — Вкладки

```javascript
import { initTabs } from './common/ui-tabs.js';

initTabs(container);
```

**HTML:**
```html
<div data-tabs-container>
    <div class="tab-header">
        <button data-tab-target="tab1" class="active">Таб 1</button>
        <button data-tab-target="tab2">Таб 2</button>
    </div>

    <div data-tab-content="tab1" class="tab-content active">
        Контент 1
    </div>
    <div data-tab-content="tab2" class="tab-content">
        Контент 2
    </div>
</div>
```

---

### ui-modal-confirm.js — Діалоги підтвердження

```javascript
import { showConfirmModal } from './common/ui-modal-confirm.js';

const confirmed = await showConfirmModal({
    title: 'Видалити елемент?',
    message: 'Ця дія незворотна. Ви впевнені?',
    confirmText: 'Видалити',
    cancelText: 'Скасувати',
    confirmClass: 'btn-danger',
    avatarState: 'confirmClose', // опціонально
    avatarSize: 'medium'
});

if (confirmed) {
    // Виконати дію
}
```

---

## 3. CSS Design System

### Організація файлів

```
css/
├── root.css                 # CSS змінні (кольори, розміри, тіні)
├── main.css                 # Головний файл імпортів
│
├── foundation/              # Базові стилі
│   ├── reset.css
│   ├── typography.css
│   └── scrollbar.css
│
├── layout/                  # Структура сторінок
│   ├── layout-app.css
│   ├── layout-section.css
│   ├── layout-panel-*.css
│   └── layout-header.css
│
├── components/              # UI компоненти
│   ├── buttons/
│   ├── forms/
│   ├── navigation/
│   ├── tables/
│   ├── overlays/
│   └── feedback/
│
└── utilities/               # Допоміжні класи
    ├── helpers.css
    └── animations.css
```

### CSS Змінні (root.css)

```css
:root {
    /* Кольори */
    --color-main: rgb(9, 63, 69);
    --color-on-main: #ffffff;
    --color-main-c: rgba(9, 63, 69, 0.08);    /* Container */

    --color-error: rgb(239, 68, 68);
    --color-error-c: rgba(239, 68, 68, 0.1);

    --color-warning: rgb(245, 158, 11);
    --color-success: rgb(16, 185, 129);
    --color-info: rgb(59, 130, 246);

    --color-surface: #fafafa;
    --color-surface-c-low: #f5f5f5;
    --color-surface-c: #e5e5e5;
    --color-surface-c-high: #d4d4d4;

    --color-outline: #d4d4d4;
    --color-outline-v: #a3a3a3;

    /* Текст */
    --text-primary: #171717;
    --text-secondary: var(--color-on-surface-v);
    --text-disabled: rgba(23, 23, 23, 0.38);

    /* Розміри */
    --radius-s: 8px;
    --radius-m: 12px;
    --radius-l: 16px;
    --radius-full: 999px;

    --space-s: 12px;
    --space-m: 16px;
    --space-l: 24px;

    /* Тіні */
    --shadow-1: 0px 1px 3px 1px rgba(0, 0, 0, 0.15);
    --shadow-2: 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
}
```

---

### Кнопки

| Клас | Використання |
|------|-------------|
| `.btn-primary` | Головна дія (Зберегти, Додати) |
| `.btn-secondary` | Другорядна дія (Скасувати) |
| `.btn-outline` | Неакцентована дія |
| `.btn-icon` | Кнопка-іконка |
| `.btn-danger` | Небезпечна дія (Видалити) |

```html
<button class="btn-primary">
    <span class="material-symbols-outlined">add</span>
    <span>Додати</span>
</button>

<button class="btn-icon" data-tooltip="Редагувати">
    <span class="material-symbols-outlined">edit</span>
</button>
```

---

### Форми

**Input:**
```html
<input type="text" class="input-main" placeholder="Введіть текст...">
```

**Form Group:**
```html
<div class="form-group">
    <label class="form-label">Назва</label>
    <input type="text" class="input-main">
</div>
```

**Custom Select:**
```html
<select data-custom-select>
    <option value="">-- Оберіть --</option>
</select>
```

**Checkbox/Switch:**
```html
<label class="checkbox-label">
    <input type="checkbox">
    <span class="checkbox-custom"></span>
    <span>Активний</span>
</label>

<label class="switch">
    <input type="checkbox">
    <span class="switch-slider"></span>
</label>
```

---

### Chips (Badges)

```html
<!-- Базовий -->
<span class="chip">Текст</span>

<!-- Варіанти -->
<span class="chip chip-active">Активний</span>
<span class="chip chip-error">Помилка</span>
<span class="chip chip-warning">Попередження</span>
<span class="chip chip-success">Успіх</span>

<!-- Контейнери -->
<div class="chip-container">...</div>  <!-- зі scroll -->
<div class="chip-list">...</div>       <!-- без scroll -->
```

---

### Таблиці

```html
<div class="pseudo-table-container">
    <div class="pseudo-table-header">
        <div class="pseudo-table-cell cell-actions"></div>
        <div class="pseudo-table-cell sortable-header" data-sort-key="name">
            <span>Назва</span>
            <span class="sort-indicator">
                <span class="material-symbols-outlined">unfold_more</span>
            </span>
        </div>
    </div>

    <div class="pseudo-table-row" data-row-id="1">
        <div class="pseudo-table-cell cell-actions">
            <button class="btn-icon" data-action="edit">...</button>
        </div>
        <div class="pseudo-table-cell">Значення</div>
    </div>
</div>
```

---

### Модальні вікна

**Розміри:** `.modal-small`, `.modal-medium`, `.modal-large`, `.modal-fullscreen`

```html
<div class="modal-overlay" data-modal-id="example">
    <div class="modal-container modal-medium">
        <header class="modal-header">
            <h2 class="modal-title">Заголовок</h2>
            <div class="modal-header-actions">
                <button class="btn-icon" data-modal-close>
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        </header>
        <div class="modal-body">
            <!-- Контент -->
        </div>
        <footer class="modal-footer">
            <button class="btn-secondary" data-modal-close>Скасувати</button>
            <button class="btn-primary">Зберегти</button>
        </footer>
    </div>
</div>
```

---

### Секції

```html
<section>
    <div class="section-header">
        <div class="section-name">
            <h2>Назва секції</h2>
        </div>
        <div class="section-actions">
            <button class="btn-primary">Дія</button>
        </div>
    </div>

    <div class="section-content">
        <!-- Контент -->
    </div>
</section>
```

---

### Utility класи

```css
.u-hidden          /* display: none */
.u-flex-row-8      /* flex row з gap 8px */
.u-flex-col-8      /* flex column з gap 8px */
.u-flex-center     /* inline-flex з центруванням */
.u-p-8             /* padding: 8px */
.u-mt-8            /* margin-top: 8px */
.text-disabled     /* колір для disabled */
```

---

## 4. Utils Library

### text-utils.js

```javascript
import {
    escapeHtml,
    truncateText,
    stripHtmlTags,
    normalizeSearchText,
    highlightText,
    checkTextForBannedWords
} from './utils/text-utils.js';

// Екранування HTML
escapeHtml('<script>alert("XSS")</script>')
// → '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'

// Обрізання тексту
truncateText('Дуже довгий текст', 10)
// → 'Дуже до...'

// Видалення HTML тегів
stripHtmlTags('<p>Текст <strong>з тегами</strong></p>')
// → 'Текст з тегами'

// Нормалізація для пошуку
normalizeSearchText('  Текст   З   Пробілами  ')
// → 'текст з пробілами'

// Підсвітка термінів
highlightText('Текст з важливим словом', ['важливим'])
// → 'Текст з <span class="highlight">важливим</span> словом'
```

### common-utils.js

```javascript
import { debounce, throttle } from './utils/common-utils.js';

// Debounce - виконати через 300ms після останнього виклику
const debouncedSearch = debounce((query) => {
    search(query);
}, 300);

// Throttle - виконувати не частіше ніж раз на 100ms
const throttledScroll = throttle(() => {
    updatePosition();
}, 100);
```

---

## Чек-лист перед створенням нового компонента

1. **CSS**: Чи є вже готовий клас в `css/components/`?
2. **JS**: Чи є вже готовий модуль в `js/common/`?
3. **Паттерн**: Чи можна використати LEGO архітектуру?
4. **State**: Чи можна використати централізований state + hooks?
5. **Actions**: Чи можна використати `ui-actions.js`?

> **Правило**: Якщо щось схоже вже існує — використовуй наявне, а не створюй нове.
