# 📚 Мануал: Створення табованої сторінки

> **Детальний посібник по створенню сторінок з динамічними табами на основі реалізації banned-words.html**

## 📖 Зміст

1. [Огляд архітектури](#огляд-архітектури)
2. [HTML структура](#html-структура)
3. [CSS стилізація](#css-стилізація)
4. [JavaScript модулі](#javascript-модулі)
5. [State Management](#state-management)
6. [Lifecycle табів](#lifecycle-табів)
7. [Persistence (збереження стану)](#persistence-збереження-стану)
8. [Pagination](#pagination)
9. [Batch операції](#batch-операції)
10. [Приклад впровадження](#приклад-впровадження)

---

## Огляд архітектури

### Компоненти табованої сторінки

```
┌─────────────────────────────────────────────────────────┐
│ TABBED PAGE                                             │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Section Navigator (Tabs Header)                     │ │
│ │ [Tab 1] [Tab 2 ×] [Tab 3 ×] ...                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Active Tab Content                                  │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Section Header (Controls, Filters)              │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Pseudo Table Container                          │ │ │
│ │ │ (Scrollable content area)                       │ │ │
│ │ │                                                 │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Fixed Footer (Pagination)                           │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Ключові принципи

1. **Flexbox Layout** - вертикальний flex контейнер з фіксованою висотою
2. **Абсолютне позиціювання Navigator** - не займає місце в flex потоці
3. **display: contents для динамічних табів** - прозорий контейнер для DOM
4. **Єдина пагінація** - один footer для всіх табів з динамічним state
5. **State Persistence** - збереження стану в localStorage з TTL

---

## HTML структура

### Базовий шаблон сторінки

```html
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ваша табована сторінка</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" />
</head>
<body>
    <!-- ЦЕНТРАЛЬНИЙ БЛОК -->
    <main id="content-main" class="content-main tabbed-page">

        <!-- НАВІГАЦІЯ ТАБАМИ -->
        <nav class="section-navigator" role="group" aria-label="Таби"
             data-tabs-container id="tabs-head-container">

            <!-- Статичний головний таб -->
            <button class="nav-icon active" data-tab-target="tab-main">
                <span class="material-symbols-outlined">list</span>
                <span class="nav-icon-label">Головний таб</span>
            </button>

            <!-- Динамічні таби додаються сюди через JS -->
        </nav>

        <!-- TAB 1: ГОЛОВНИЙ ТАБ (статичний) -->
        <div class="tab-content active" data-tab-content="tab-main" id="tab-main">

            <!-- Заголовок та контроли -->
            <div class="section-header">
                <div class="section-name-block">
                    <div class="section-name">
                        <h2>Назва секції</h2>
                    </div>
                    <h3 id="tab-stats-main">Показано 0 з 0</h3>

                    <!-- Фільтри (опціонально) -->
                    <div class="tab-controls">
                        <button class="nav-icon active" data-filter="all" data-tab-id="tab-main">
                            <span class="material-symbols-outlined">list</span>
                            <span class="nav-icon-label">Всі</span>
                        </button>
                        <button class="nav-icon" data-filter="checked" data-tab-id="tab-main">
                            <span class="material-symbols-outlined">check_circle</span>
                            <span class="nav-icon-label">Перевірені</span>
                        </button>
                    </div>
                </div>

                <!-- Кнопки управління -->
                <div class="tab-controls">
                    <button id="refresh-tab-main" class="btn-icon">
                        <span class="material-symbols-outlined">refresh</span>
                    </button>
                </div>
            </div>

            <!-- Контейнер таблиці/контенту -->
            <div id="main-table-container" class="pseudo-table-container">
                <div class="loading-state">
                    <span class="material-symbols-outlined">hourglass_empty</span>
                    <p>Завантаження даних...</p>
                </div>
            </div>
        </div>

        <!-- КОНТЕЙНЕР ДЛЯ ДИНАМІЧНИХ ТАБІВ -->
        <!-- display: contents робить його "прозорим" для flexbox -->
        <div id="dynamic-tabs-content-container"></div>

        <!-- ФІКСОВАНИЙ ФУТЕР З ПАГІНАЦІЄЮ -->
        <footer class="fixed-footer">
            <div></div>

            <div class="pagination-container">
                <div id="pagination-nav-container" class="pagination-nav"></div>

                <div class="page-size-selector" id="page-size-selector">
                    <button class="page-size-trigger">
                        <span id="page-size-label">10</span>
                    </button>
                    <div class="page-size-menu">
                        <button class="page-size-option" data-page-size="10">10</button>
                        <button class="page-size-option" data-page-size="25">25</button>
                        <button class="page-size-option" data-page-size="50">50</button>
                        <button class="page-size-option" data-page-size="100">100</button>
                    </div>
                </div>
            </div>
        </footer>
    </main>

    <script type="module" src="js/main-your-page.js"></script>
</body>
</html>
```

### Шаблон динамічного табу (check-tab.html)

Створіть файл `templates/partials/your-dynamic-tab.html`:

```html
<div class="state-layer">
    <span class="label">{{tabTitle}}</span>
    <button class="tab-close-btn" aria-label="Закрити таб">
        <span class="material-symbols-outlined">close</span>
    </button>
</div>
```

### Шаблон контенту динамічного табу (check-tab-content.html)

Створіть файл `templates/partials/your-dynamic-tab-content.html`:

```html
<div class="section-header">
    <div class="section-name-block">
        <div class="section-name">
            <h2>Динамічний таб</h2>
        </div>
        <h3 id="tab-stats-{{tabId}}">Показано 0 з 0</h3>

        <!-- Фільтри для табу -->
        <div class="tab-controls">
            <button class="nav-icon active" data-filter="all" data-tab-id="{{tabId}}">
                <span class="material-symbols-outlined">list</span>
                <span class="nav-icon-label">Всі</span>
            </button>
            <button class="nav-icon" data-filter="unchecked" data-tab-id="{{tabId}}">
                <span class="material-symbols-outlined">radio_button_unchecked</span>
                <span class="nav-icon-label">Не перевірені</span>
            </button>
        </div>
    </div>

    <div class="tab-controls">
        <button id="refresh-{{tabId}}" class="btn-icon">
            <span class="material-symbols-outlined">refresh</span>
        </button>
    </div>
</div>

<!-- Контейнер результатів -->
<div id="results-{{tabId}}" class="pseudo-table-container">
    <div class="loading-state">
        <span class="material-symbols-outlined">search</span>
        <p>Виконується перевірка...</p>
    </div>
</div>
```

---

## CSS стилізація

Використовуйте файл `css/layout/layout-tabbed-page.css`:

```css
/**
 * LAYOUT: Tabbed Page
 * Структура табованої сторінки з навігацією по табах,
 * контентом та фіксованим footer.
 */

/* Головний контейнер - flexbox з фіксованою висотою */
.content-main.tabbed-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

/* Navigator - абсолютне позиціювання, не займає місця */
.tabbed-page .section-navigator {
    position: absolute;
    top: 8px;
    margin-top: 0;
    z-index: 300;
}

/* Неактивні таби приховані */
.tabbed-page .tab-content {
    display: none;
}

/* Активний таб займає весь доступний простір */
.tabbed-page .tab-content.active {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 8px 24px;
    overflow: hidden;
}

/* Контейнер таблиці розтягується */
.tabbed-page .tab-content .pseudo-table-container {
    flex: 1 1 auto;
    min-height: 0;
    margin: 16px 0;
}

/* Прозорий контейнер для динамічних табів */
#dynamic-tabs-content-container {
    display: contents;
}

/* Footer - фіксований знизу */
.tabbed-page .fixed-footer {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    gap: 16px;
    background: var(--color-surface);
}
```

**⚠️ ВАЖЛИВО:**
- **НЕ використовуйте `position: fixed`** для footer - використовуйте `flex-shrink: 0`
- **`display: contents`** для контейнера динамічних табів критично важливий
- **`min-height: 0`** потрібен для правильної роботи scroll в flexbox

---

## JavaScript модулі

### Структура модулів

```
js/
└── your-feature/
    ├── your-feature-init.js         # Головний файл ініціалізації + state
    ├── your-feature-tabs.js         # Управління табами
    ├── your-feature-data.js         # Робота з даними
    ├── your-feature-ui.js           # UI рендеринг
    ├── your-feature-events.js       # Event handlers
    ├── your-feature-pagination.js   # Пагінація
    ├── your-feature-state-persistence.js  # localStorage
    └── your-feature-batch.js        # Масові операції (опціонально)
```

### 1. Init модуль (your-feature-init.js)

```javascript
/**
 * Глобальний state
 */
export const yourFeatureState = {
    // Дані
    items: [],

    // Поточний таб
    currentTab: 'tab-main',

    // Пагінація для кожного табу
    tabPaginations: {},

    // Фільтри для табів
    tabFilters: {},

    // Вибрані елементи для batch операцій
    selectedItems: {}
};

/**
 * Головна функція ініціалізації
 */
export function initYourFeature() {
    console.log('📋 Ініціалізація вашої фічі...');

    // 1. Ініціалізувати UI без даних
    initializeUIWithoutData();

    // 2. Завантажити дані
    loadData();
}

async function initializeUIWithoutData() {
    // Ініціалізувати обробники табів
    const { initTabHandlers } = await import('./your-feature-tabs.js');
    initTabHandlers();

    // Показати loading state
    showLoadingState();
}

async function loadData() {
    // Завантажити дані з API
    const { loadItems } = await import('./your-feature-data.js');
    await loadItems();

    // Оновити UI з даними
    await updateUIWithData();
}

async function updateUIWithData() {
    // Ініціалізувати пагінацію
    const { initPagination } = await import('./your-feature-pagination.js');
    initPagination();

    // Рендерити таблицю
    const { renderTable } = await import('./your-feature-ui.js');
    await renderTable();

    // Відновити збережені таби
    const { restoreSavedTabs } = await import('./your-feature-tabs.js');
    await restoreSavedTabs();
}
```

### 2. Tabs модуль (your-feature-tabs.js)

```javascript
import { yourFeatureState } from './your-feature-init.js';
import { addTabToState, removeTabFromState, setActiveTab } from './your-feature-state-persistence.js';

let tabTemplate = null;
let tabContentTemplate = null;

/**
 * Завантажити шаблон кнопки табу
 */
async function getTabTemplate() {
    if (tabTemplate) return tabTemplate;
    const response = await fetch('/templates/partials/your-dynamic-tab.html');
    tabTemplate = await response.text();
    return tabTemplate;
}

/**
 * Завантажити шаблон контенту табу
 */
async function getTabContentTemplate() {
    if (tabContentTemplate) return tabContentTemplate;
    const response = await fetch('/templates/partials/your-dynamic-tab-content.html');
    tabContentTemplate = await response.text();
    return tabContentTemplate;
}

/**
 * Створити новий динамічний таб
 * @param {Object} params - Параметри табу
 * @param {boolean} skipAutoActivate - Пропустити автоактивацію (для restore)
 */
export async function createDynamicTab(params, skipAutoActivate = false) {
    const { id, title, data } = params;
    const tabId = `dynamic-${id}`;

    // Перевірити чи таб вже існує
    const existingTab = document.querySelector(`[data-tab-target="${tabId}"]`);
    if (existingTab) {
        existingTab.click();
        return;
    }

    // Створити кнопку табу
    const tabsContainer = document.getElementById('tabs-head-container');
    const tabButton = document.createElement('button');
    tabButton.className = 'nav-icon';
    tabButton.dataset.tabTarget = tabId;

    const template = await getTabTemplate();
    const html = template.replace(/{{tabTitle}}/g, title);
    tabButton.innerHTML = html;

    tabsContainer.appendChild(tabButton);

    // Створити контент табу
    const contentContainer = document.getElementById('dynamic-tabs-content-container');
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabContent.dataset.tabContent = tabId;

    const contentTemplate = await getTabContentTemplate();
    const contentHtml = contentTemplate.replace(/{{tabId}}/g, tabId);
    tabContent.innerHTML = contentHtml;

    contentContainer.appendChild(tabContent);

    // Зберегти параметри в dataset
    tabButton.dataset.tabParams = JSON.stringify(params);

    // Зберегти стан для persistence
    addTabToState(tabId, params);

    // Активувати таб (якщо не restoration)
    if (!skipAutoActivate) {
        setTimeout(() => tabButton.click(), 50);
    }

    console.log(`✅ Таб створено: ${tabId}`);
}

/**
 * Ініціалізувати обробники табів
 */
export function initTabHandlers() {
    // Обробник закриття табу
    document.addEventListener('click', async (e) => {
        const closeButton = e.target.closest('.tab-close-btn');
        if (!closeButton) return;

        e.preventDefault();
        e.stopPropagation();

        const tabButton = closeButton.closest('.nav-icon');
        if (!tabButton) return;

        const tabId = tabButton.dataset.tabTarget;
        if (!tabId || tabId === 'tab-main') return;

        const { showConfirmModal } = await import('../common/ui-modal.js');
        const confirmed = await showConfirmModal({
            title: 'Закрити таб?',
            message: 'Всі незбережені дані будуть втрачені.',
            confirmText: 'Закрити',
            cancelText: 'Скасувати'
        });

        if (confirmed) {
            removeTab(tabId);
        }
    });

    // Обробник перемикання табів
    document.addEventListener('click', (e) => {
        const tabButton = e.target.closest('.nav-icon');
        if (!tabButton) return;

        const tabId = tabButton.dataset.tabTarget;
        if (!tabId) return;

        const tabsContainer = document.getElementById('tabs-head-container');
        if (!tabsContainer?.contains(tabButton)) return;

        e.preventDefault();

        // Зняти active з усіх
        tabsContainer.querySelectorAll('.nav-icon').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content.active').forEach(content => {
            content.classList.remove('active');
        });

        // Додати active
        tabButton.classList.add('active');
        const tabContent = document.querySelector(`[data-tab-content="${tabId}"]`);
        if (tabContent) {
            tabContent.classList.add('active');

            // Зберегти активний таб
            setActiveTab(tabId);

            // Відновити пагінацію
            restorePaginationForTab(tabId);
        }
    });
}

/**
 * Видалити таб
 */
export function removeTab(tabId) {
    const tabButton = document.querySelector(`[data-tab-target="${tabId}"]`);
    const tabContent = document.querySelector(`[data-tab-content="${tabId}"]`);
    const wasActive = tabButton?.classList.contains('active');

    tabButton?.remove();
    tabContent?.remove();

    // Видалити з state
    delete yourFeatureState.tabPaginations[tabId];
    removeTabFromState(tabId);

    // Переключити на головний таб
    if (wasActive) {
        setTimeout(() => {
            document.querySelector('[data-tab-target="tab-main"]')?.click();
        }, 100);
    }
}

/**
 * Відновити збережені таби
 */
export async function restoreSavedTabs() {
    const { loadTabsState } = await import('./your-feature-state-persistence.js');
    const savedState = loadTabsState();

    if (!savedState?.openTabs?.length) return;

    console.log(`🔄 Відновлення ${savedState.openTabs.length} табів...`);

    for (const tab of savedState.openTabs) {
        try {
            // Відновити пагінацію
            if (tab.currentPage && tab.pageSize) {
                yourFeatureState.tabPaginations[tab.tabId] = {
                    currentPage: tab.currentPage,
                    pageSize: tab.pageSize,
                    totalItems: 0
                };
            }

            // Створити таб БЕЗ автоактивації
            await createDynamicTab(tab.params, true);

            // Завантажити дані для табу
            await loadTabData(tab.params);

        } catch (error) {
            console.error(`❌ Помилка відновлення ${tab.tabId}:`, error);
        }
    }

    // Активувати збережений активний таб
    if (savedState.activeTabId) {
        setTimeout(() => {
            document.querySelector(`[data-tab-target="${savedState.activeTabId}"]`)?.click();
        }, 500);
    }
}
```

---

## State Management

### Структура state об'єкта

```javascript
export const yourFeatureState = {
    // ═══════════════════════════════════════════════════════
    // ДАНІ
    // ═══════════════════════════════════════════════════════
    items: [],              // Основні дані

    // ═══════════════════════════════════════════════════════
    // ТАБИ
    // ═══════════════════════════════════════════════════════
    currentTab: 'tab-main', // ID активного табу

    // ═══════════════════════════════════════════════════════
    // ПАГІНАЦІЯ
    // ═══════════════════════════════════════════════════════
    // Кожен таб має свою пагінацію
    tabPaginations: {
        'tab-main': {
            currentPage: 1,
            pageSize: 10,
            totalItems: 100
        },
        'dynamic-123': {
            currentPage: 2,
            pageSize: 25,
            totalItems: 50
        }
    },

    // ═══════════════════════════════════════════════════════
    // ФІЛЬТРИ
    // ═══════════════════════════════════════════════════════
    // Кожен таб може мати свій фільтр
    tabFilters: {
        'tab-main': 'all',           // 'all' | 'checked' | 'unchecked'
        'dynamic-123': 'unchecked'
    },

    // ═══════════════════════════════════════════════════════
    // BATCH ОПЕРАЦІЇ
    // ═══════════════════════════════════════════════════════
    // Вибрані елементи для масових операцій
    selectedItems: {
        'tab-main': new Set(['item-1', 'item-2']),
        'dynamic-123': new Set(['item-5'])
    },

    // ═══════════════════════════════════════════════════════
    // КЕШ
    // ═══════════════════════════════════════════════════════
    cache: {
        // Структура: { "cacheKey": { data: [...], timestamp: Date } }
    },
    cacheTTL: 5 * 60 * 1000  // 5 хвилин
};
```

### Робота з cache

```javascript
/**
 * Отримати дані з кешу
 */
export function getCachedData(key) {
    const cached = yourFeatureState.cache[key];
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > yourFeatureState.cacheTTL) {
        delete yourFeatureState.cache[key];
        return null;
    }

    return cached.data;
}

/**
 * Зберегти в кеш
 */
export function setCachedData(key, data) {
    yourFeatureState.cache[key] = {
        data: data,
        timestamp: Date.now()
    };
}

/**
 * Інвалідувати кеш
 */
export function invalidateCache(key) {
    if (yourFeatureState.cache[key]) {
        delete yourFeatureState.cache[key];
    }
}
```

---

## Lifecycle табів

### Створення табу

```
1. Користувач ініціює створення табу
   ↓
2. createDynamicTab(params, skipAutoActivate = false)
   ↓
3. Перевірка чи таб вже існує
   ├─ Так → Активувати існуючий
   └─ Ні → Продовжити
   ↓
4. Завантажити шаблони (getTabTemplate, getTabContentTemplate)
   ↓
5. Створити DOM елементи
   ├─ Кнопка табу в #tabs-head-container
   └─ Контент в #dynamic-tabs-content-container
   ↓
6. Додати event listeners (refresh, close)
   ↓
7. Зберегти параметри в dataset
   ↓
8. addTabToState() → localStorage
   ↓
9. Активувати таб (якщо skipAutoActivate === false)
   ↓
10. Завантажити дані для табу
```

### Перемикання табів

```
1. Click на кнопці табу
   ↓
2. Event delegation на document
   ↓
3. Зняти .active з усіх табів
   ↓
4. Додати .active на клікнутий таб
   ↓
5. setActiveTab(tabId) → localStorage
   ↓
6. Відновити пагінацію для табу
   ├─ Отримати tabPaginations[tabId]
   └─ Оновити footer pagination API
   ↓
7. Відновити фільтри (якщо є)
   ↓
8. Оновити batch action bar видимість
   ↓
9. Відновити стан чекбоксів
```

### Закриття табу

```
1. Click на .tab-close-btn
   ↓
2. e.stopPropagation() (щоб не активувати таб)
   ↓
3. showConfirmModal() → підтвердження
   ├─ Скасувати → Нічого не робити
   └─ Підтвердити → Продовжити
   ↓
4. removeTab(tabId)
   ├─ Видалити DOM елементи
   ├─ Очистити tabPaginations[tabId]
   ├─ Очистити tabFilters[tabId]
   ├─ Очистити selectedItems[tabId]
   └─ removeTabFromState() → localStorage
   ↓
5. Якщо таб був активний
   └─ Активувати tab-main
```

### Відновлення табів (Restoration)

```
1. restoreSavedTabs() викликається після завантаження даних
   ↓
2. loadTabsState() → отримати з localStorage
   ↓
3. Перевірити наявність збережених табів
   ├─ Немає → return
   └─ Є → Продовжити
   ↓
4. Для кожного збереженого табу:
   ├─ Відновити пагінацію в state
   ├─ createDynamicTab(params, skipAutoActivate = true)
   │  └─ Створити UI БЕЗ активації
   └─ Завантажити дані для табу
   ↓
5. Активувати збережений активний таб
   └─ setTimeout(() => click(), 500)
```

**⚠️ КРИТИЧНО ВАЖЛИВО:**

При restoration ЗАВЖДИ:
1. Спочатку створити UI з `skipAutoActivate = true`
2. Потім завантажити дані
3. Інакше буде помилка "Cannot read properties of null"

---

## Persistence (збереження стану)

### Модуль state-persistence.js

```javascript
const STORAGE_KEY = 'your-feature-tabs-state';
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 години

/**
 * Зберегти стан табів
 */
export function saveTabsState(tabsState) {
    const stateToSave = {
        ...tabsState,
        timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
}

/**
 * Завантажити стан табів
 */
export function loadTabsState(maxAge = MAX_AGE) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const state = JSON.parse(saved);

    // Перевірити чи не застарів
    if (Date.now() - state.timestamp > maxAge) {
        clearTabsState();
        return null;
    }

    return state;
}

/**
 * Додати таб до збереженого стану
 */
export function addTabToState(tabId, params) {
    const state = loadTabsState() || { openTabs: [], activeTabId: null };

    // Видалити якщо вже існує
    state.openTabs = state.openTabs.filter(tab => tab.tabId !== tabId);

    // Додати новий
    state.openTabs.push({
        tabId,
        params,
        currentPage: 1,
        pageSize: 10
    });

    saveTabsState(state);
}

/**
 * Видалити таб зі збереженого стану
 */
export function removeTabFromState(tabId) {
    const state = loadTabsState();
    if (!state) return;

    state.openTabs = state.openTabs.filter(tab => tab.tabId !== tabId);

    if (state.activeTabId === tabId) {
        state.activeTabId = 'tab-main';
    }

    saveTabsState(state);
}

/**
 * Встановити активний таб
 */
export function setActiveTab(tabId) {
    const state = loadTabsState() || { openTabs: [], activeTabId: null };
    state.activeTabId = tabId;
    saveTabsState(state);
}

/**
 * Оновити параметри табу
 */
export function updateTabState(tabId, updates) {
    const state = loadTabsState() || { openTabs: [], activeTabId: null };

    const tabIndex = state.openTabs.findIndex(tab => tab.tabId === tabId);

    if (tabIndex !== -1) {
        state.openTabs[tabIndex] = {
            ...state.openTabs[tabIndex],
            ...updates
        };
    } else {
        state.openTabs.push({ tabId, ...updates });
    }

    saveTabsState(state);
}

/**
 * Очистити збережений стан
 */
export function clearTabsState() {
    localStorage.removeItem(STORAGE_KEY);
}
```

### Що зберігати для кожного табу

```javascript
{
    tabId: 'dynamic-123',           // Унікальний ID табу
    params: {                        // Параметри для створення табу
        id: '123',
        title: 'Таб 123',
        data: { ... }
    },
    currentPage: 2,                  // Поточна сторінка пагінації
    pageSize: 25,                    // Розмір сторінки
    filter: 'unchecked'              // Активний фільтр (опціонально)
}
```

### Коли оновлювати localStorage

```javascript
// При зміні фільтра
updateTabState(tabId, { filter: 'checked' });

// При зміні пагінації
updateTabState(tabId, {
    currentPage: 3,
    pageSize: 50
});

// При створенні табу
addTabToState(tabId, params);

// При закритті табу
removeTabFromState(tabId);

// При перемиканні табів
setActiveTab(tabId);
```

---

## Pagination

### Ініціалізація пагінації

```javascript
// your-feature-pagination.js

import { yourFeatureState } from './your-feature-init.js';
import { initPagination } from '../common/ui-pagination.js';
import { updateTabState } from './your-feature-state-persistence.js';

export function initPaginationForYourFeature() {
    const footer = document.querySelector('.fixed-footer');
    if (!footer) return;

    const paginationAPI = initPagination({
        container: footer,
        initialPage: 1,
        initialPageSize: 10,
        totalItems: 0,

        // Callback при зміні сторінки
        onPageChange: (page, pageSize) => {
            const activeTabId = getActiveTabId();

            // Оновити state
            if (!yourFeatureState.tabPaginations[activeTabId]) {
                yourFeatureState.tabPaginations[activeTabId] = {};
            }

            yourFeatureState.tabPaginations[activeTabId].currentPage = page;
            yourFeatureState.tabPaginations[activeTabId].pageSize = pageSize;

            // Зберегти в localStorage (якщо не головний таб)
            if (activeTabId !== 'tab-main') {
                updateTabState(activeTabId, { currentPage: page, pageSize });
            }

            // Перерендерити таблицю
            renderCurrentTabTable();
        }
    });

    // Зберегти API в state
    yourFeatureState.paginationAPI = paginationAPI;
    footer._paginationAPI = paginationAPI;
}

/**
 * Отримати ID активного табу
 */
function getActiveTabId() {
    const activeTab = document.querySelector('.nav-icon.active');
    return activeTab?.dataset.tabTarget || 'tab-main';
}

/**
 * Перерендерити таблицю активного табу
 */
async function renderCurrentTabTable() {
    const activeTabId = getActiveTabId();

    if (activeTabId === 'tab-main') {
        const { renderMainTable } = await import('./your-feature-ui.js');
        await renderMainTable();
    } else {
        const { renderDynamicTabTable } = await import('./your-feature-ui.js');
        await renderDynamicTabTable(activeTabId);
    }
}

/**
 * Оновити пагінацію для активного табу
 */
export function updatePaginationForTab(tabId, totalItems) {
    const footer = document.querySelector('.fixed-footer');
    if (!footer?._paginationAPI) return;

    const tabPagination = yourFeatureState.tabPaginations[tabId] || {
        currentPage: 1,
        pageSize: 10
    };

    footer._paginationAPI.update({
        currentPage: tabPagination.currentPage,
        pageSize: tabPagination.pageSize,
        totalItems: totalItems
    });

    // Оновити label розміру сторінки
    const pageSizeLabel = document.getElementById('page-size-label');
    if (pageSizeLabel) {
        pageSizeLabel.textContent = tabPagination.pageSize;
    }
}
```

### Робота з пагінацією при перемиканні табів

```javascript
// В tab click handler:

const tabPagination = yourFeatureState.tabPaginations[tabId];

if (tabPagination) {
    footer._paginationAPI.update({
        currentPage: tabPagination.currentPage,
        pageSize: tabPagination.pageSize,
        totalItems: tabPagination.totalItems
    });
} else {
    // Якщо пагінація відсутня - створити default
    yourFeatureState.tabPaginations[tabId] = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0
    };
}
```

---

## Batch операції

### Модуль batch.js

```javascript
import { yourFeatureState } from './your-feature-init.js';
import { createBatchActionsBar, getBatchBar } from '../common/ui-batch-actions.js';
import { showToast } from '../common/ui-toast.js';

/**
 * Ініціалізувати batch actions bar для табу
 */
export function initBatchActionsBar(tabId) {
    const existingBar = getBatchBar(tabId);
    if (existingBar) return existingBar;

    // Ініціалізувати Set для вибраних елементів
    if (!yourFeatureState.selectedItems[tabId]) {
        yourFeatureState.selectedItems[tabId] = new Set();
    }

    // Визначити дії
    const actions = [
        {
            id: 'mark-done',
            label: 'Позначити виконаними',
            icon: 'check_circle',
            primary: true,
            handler: async (selectedIds, tabId) => {
                await batchMarkDone(selectedIds, tabId);
            }
        },
        {
            id: 'export',
            label: 'Експорт',
            icon: 'download',
            handler: async (selectedIds, tabId) => {
                await batchExport(selectedIds, tabId);
            }
        }
    ];

    // Створити панель
    const batchBar = createBatchActionsBar({
        tabId,
        actions,
        onSelectionChange: (count) => {
            console.log(`Вибрано: ${count}`);
        }
    });

    return batchBar;
}

/**
 * Вибрати елемент
 */
export function selectItem(tabId, itemId) {
    const batchBar = getBatchBar(tabId);
    if (batchBar) {
        batchBar.selectItem(itemId);
    }

    if (!yourFeatureState.selectedItems[tabId]) {
        yourFeatureState.selectedItems[tabId] = new Set();
    }
    yourFeatureState.selectedItems[tabId].add(itemId);
}

/**
 * Зняти вибір
 */
export function deselectItem(tabId, itemId) {
    const batchBar = getBatchBar(tabId);
    if (batchBar) {
        batchBar.deselectItem(itemId);
    }

    if (yourFeatureState.selectedItems[tabId]) {
        yourFeatureState.selectedItems[tabId].delete(itemId);
    }
}

/**
 * Batch операція: позначити виконаними
 */
async function batchMarkDone(selectedIds, tabId) {
    if (selectedIds.length === 0) {
        showToast('Не вибрано елементів', 'warning');
        return;
    }

    showToast(`Оновлення ${selectedIds.length} записів...`, 'info');

    try {
        let successCount = 0;
        let failedCount = 0;

        // Підготувати batch update
        const updates = selectedIds.map(id => ({
            id: id,
            status: 'done'
        }));

        // Виконати batch API call
        const { batchUpdate } = await import('./your-feature-data.js');
        const result = await batchUpdate(updates);

        successCount = result.success;
        failedCount = result.failed;

        // Показати результат
        if (successCount > 0) {
            showToast(`✅ Оновлено ${successCount} записів`, 'success');
        }
        if (failedCount > 0) {
            showToast(`⚠️ ${failedCount} помилок`, 'warning');
        }

        // Зняти вибір
        deselectAll(tabId);

        // Перерендерити таблицю
        await rerenderTable(tabId);

    } catch (error) {
        console.error('Помилка batch операції:', error);
        showToast('Помилка оновлення', 'error');
    }
}
```

---

## Приклад впровадження

### Крок 1: Створити HTML файл

```html
<!-- your-page.html -->
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Ваша сторінка</title>
    <link rel="stylesheet" href="css/main.css">
</head>
<body>
    <main class="content-main tabbed-page">
        <nav class="section-navigator" id="tabs-head-container">
            <button class="nav-icon active" data-tab-target="tab-main">
                <span class="material-symbols-outlined">list</span>
                <span class="nav-icon-label">Головний</span>
            </button>
        </nav>

        <div class="tab-content active" data-tab-content="tab-main">
            <div class="section-header">
                <h2>Ваша сторінка</h2>
            </div>
            <div id="main-container" class="pseudo-table-container"></div>
        </div>

        <div id="dynamic-tabs-content-container"></div>

        <footer class="fixed-footer">
            <div></div>
            <div class="pagination-container">
                <div id="pagination-nav-container" class="pagination-nav"></div>
            </div>
        </footer>
    </main>

    <script type="module" src="js/main-your-page.js"></script>
</body>
</html>
```

### Крок 2: Створити entry point

```javascript
// js/main-your-page.js
import { initCore } from './main-core.js';
import { initYourFeature } from './your-feature/your-feature-init.js';

document.addEventListener('DOMContentLoaded', () => {
    initCore();
    initYourFeature();
});
```

### Крок 3: Створити модулі

Використовуйте структуру описану вище:
- `your-feature-init.js` - state + ініціалізація
- `your-feature-tabs.js` - управління табами
- `your-feature-data.js` - API calls
- `your-feature-ui.js` - рендеринг
- `your-feature-pagination.js` - пагінація
- `your-feature-state-persistence.js` - localStorage

### Крок 4: Створити шаблони

```html
<!-- templates/partials/your-tab.html -->
<div class="state-layer">
    <span class="label">{{title}}</span>
    <button class="tab-close-btn">
        <span class="material-symbols-outlined">close</span>
    </button>
</div>
```

```html
<!-- templates/partials/your-tab-content.html -->
<div class="section-header">
    <h2>{{title}}</h2>
</div>
<div id="content-{{tabId}}" class="pseudo-table-container">
    Контент табу
</div>
```

---

## Чеклист для нової табованої сторінки

### HTML
- [ ] Додано клас `tabbed-page` до `<main>`
- [ ] Створено `<nav class="section-navigator">`
- [ ] Додано статичний головний таб
- [ ] Створено контейнер `#dynamic-tabs-content-container` з `display: contents`
- [ ] Додано `<footer class="fixed-footer">` з пагінацією

### CSS
- [ ] Підключено `css/layout/layout-tabbed-page.css`
- [ ] Перевірено що footer НЕ має `position: fixed`
- [ ] Перевірено flexbox структуру (flex-direction: column, flex: 1)

### JavaScript
- [ ] Створено init модуль з state
- [ ] Створено tabs модуль з lifecycle функціями
- [ ] Реалізовано `createDynamicTab()` з параметром `skipAutoActivate`
- [ ] Реалізовано `initTabHandlers()` з event delegation
- [ ] Реалізовано `removeTab()` з confirmation
- [ ] Реалізовано `restoreSavedTabs()`

### State Management
- [ ] Створено state об'єкт з `tabPaginations`
- [ ] Створено state об'єкт з `tabFilters`
- [ ] Реалізовано cache з TTL (якщо потрібно)

### Persistence
- [ ] Створено state-persistence.js модуль
- [ ] Реалізовано `saveTabsState()` / `loadTabsState()`
- [ ] Реалізовано `addTabToState()` / `removeTabFromState()`
- [ ] Реалізовано `updateTabState()` для пагінації/фільтрів
- [ ] Додано TTL перевірку (24 години)

### Pagination
- [ ] Ініціалізовано єдину пагінацію для всіх табів
- [ ] Реалізовано збереження пагінації в `tabPaginations`
- [ ] Реалізовано відновлення пагінації при перемиканні
- [ ] Додано `updateTabState()` при зміні сторінки/розміру

### Templates
- [ ] Створено шаблон кнопки табу
- [ ] Створено шаблон контенту табу
- [ ] Додано placeholder'и для заміни ({{tabId}}, {{title}})

### Testing
- [ ] Створення нового табу працює
- [ ] Перемикання між табами працює
- [ ] Закриття табу з confirmation працює
- [ ] Пагінація зберігається для кожного табу
- [ ] Після refresh сторінки таби відновлюються
- [ ] Active таб відновлюється правильно
- [ ] Старі таби (>24h) не відновлюються

---

## Поширені помилки та рішення

### 1. "Cannot read properties of null" при restoration

**Проблема:** При відновленні табів намагаємось завантажити дані до створення UI.

**Рішення:**
```javascript
// ❌ НЕПРАВИЛЬНО
await performCheck();
await createDynamicTab();

// ✅ ПРАВИЛЬНО
await createDynamicTab(params, skipAutoActivate = true);
await performCheck();
```

### 2. Footer перекриває контент

**Проблема:** Використано `position: fixed` для footer.

**Рішення:**
```css
/* ❌ НЕПРАВИЛЬНО */
.fixed-footer {
    position: fixed;
    bottom: 0;
}

/* ✅ ПРАВИЛЬНО */
.fixed-footer {
    flex-shrink: 0;
}
```

### 3. Динамічні таби не працюють з flexbox

**Проблема:** Контейнер динамічних табів порушує flexbox.

**Рішення:**
```css
#dynamic-tabs-content-container {
    display: contents; /* Робить контейнер "прозорим" */
}
```

### 4. Пагінація не зберігається між табами

**Проблема:** Використовується глобальна пагінація замість per-tab.

**Рішення:**
```javascript
// Зберігати окрему пагінацію для кожного табу
yourFeatureState.tabPaginations = {
    'tab-main': { currentPage: 1, pageSize: 10 },
    'dynamic-123': { currentPage: 2, pageSize: 25 }
};
```

### 5. Клік на close button активує таб

**Проблема:** Event bubbling.

**Рішення:**
```javascript
closeButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // ВАЖЛИВО!
    // ... код закриття
});
```

### 6. localStorage переповнюється

**Проблема:** Зберігаємо занадто багато даних або без TTL.

**Рішення:**
```javascript
// Завжди додавати TTL
const MAX_AGE = 24 * 60 * 60 * 1000;

// Зберігати тільки метадані, не самі дані
{
    tabId: 'dynamic-123',
    params: { id: '123' }, // Тільки ID, не весь об'єкт
    currentPage: 2,
    pageSize: 25
}
```

---

## Референси

### Приклади з banned-words

- **HTML:** `banned-words.html` - повна структура сторінки
- **CSS:** `css/layout/layout-tabbed-page.css` - стилі табів
- **Init:** `js/banned-words/banned-words-init.js` - state + ініціалізація
- **Tabs:** `js/banned-words/banned-words-tabs.js` - lifecycle табів
- **Persistence:** `js/banned-words/banned-words-state-persistence.js` - localStorage
- **Pagination:** `js/banned-words/banned-words-pagination.js` - пагінація

### Корисні модулі

- `js/common/ui-pagination.js` - універсальна пагінація
- `js/common/ui-batch-actions.js` - batch операції
- `js/common/ui-modal.js` - модальні вікна
- `js/common/ui-toast.js` - toast повідомлення
- `js/common/ui-dropdown.js` - dropdown меню

---

## Версія документу

**Версія:** 1.0
**Дата:** 2025-01-14
**Автор:** Based on banned-words implementation
**Статус:** Production Ready

---

**📝 Примітка:** Цей мануал базується на реальній реалізації табованої сторінки `banned-words.html` яка пройшла повний цикл розробки та тестування.
