# ГАЙД ПО СТРУКТУРІ СТОРІНОК

> **ВАЖЛИВО:** Цей документ описує обов'язкову структуру HTML сторінок.
> Архітектурні принципи описані в [ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md)
> Правила стилю описані в [CODE-STYLE-GUIDE.md](./CODE-STYLE-GUIDE.md)

---

## 📚 Зміст

1. [Еталонні сторінки](#еталонні-сторінки)
2. [Базова структура сторінки](#базова-структура-сторінки)
3. [Типи сторінок](#типи-сторінок)
4. [Ліва панель навігації](#ліва-панель-навігації)
5. [Права панель (Aside)](#права-панель-aside)
6. [Section Navigator](#section-navigator)
7. [Кастомні компоненти](#кастомні-компоненти)
8. [Чеклист створення нової сторінки](#чеклист-створення-нової-сторінки)

---

## 🎯 Еталонні сторінки

**Завжди орієнтуйся на ці сторінки при створенні нових:**

### ✅ index.html - Секційна сторінка (ЕТАЛОН)
- Містить кілька незалежних секцій
- Навігація через `section-navigator` з якірними посиланнями
- Кожна секція прив'язана до свого aside-шаблону
- Використання: багатофункціональні сторінки з різними інструментами

**Приклад використання:**
- Інструменти (таблиці, текст, SEO, переклад)
- Dashboard з різними віджетами
- Сторінка налаштувань з категоріями

### ✅ banned-words.html - Табована сторінка (ЕТАЛОН)
- Містить таби з динамічним контентом
- Навігація через `section-navigator` з `data-tabs-container`
- Фіксований футер з пагінацією
- Використання: сторінки з табличними даними

**Приклад використання:**
- Перелік заборонених слів з перевіркою
- Перелік сутностей (категорії, характеристики, опції)
- Будь-які сторінки з табами та таблицями

---

## 🏗️ Базова структура сторінки

**ОБОВ'ЯЗКОВА структура всіх сторінок:**

```html
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Назва сторінки</title>
    <link rel="icon" href="data:,">

    <!-- CSS -->
    <link rel="stylesheet" href="css/main.css">

    <!-- Material Icons (ОБОВ'ЯЗКОВО) -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />

    <!-- Шрифт DM Sans (ОБОВ'ЯЗКОВО) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet">
</head>

<body>
    <!-- ЛІВА ПАНЕЛЬ НАВІГАЦІЇ -->
    <nav id="panel-left" class="panel panel-left">
        <!-- Контент лівої панелі -->
    </nav>

    <!-- ЦЕНТРАЛЬНИЙ БЛОК -->
    <main id="content-main" class="content-main">
        <!-- Контент сторінки (секції або таби) -->
    </main>

    <!-- ПРАВА ПАНЕЛЬ (ASIDE) -->
    <aside id="panel-right" class="panel panel-right">
        <!-- Контент правої панелі -->
    </aside>

    <!-- JavaScript -->
    <script type="module" src="js/main-XXX.js"></script>
</body>
</html>
```

---

## 📑 Типи сторінок

### 1️⃣ Секційна сторінка

**Коли використовувати:**
- Сторінка має кілька незалежних розділів (інструменти, форми, віджети)
- Користувач переключається між розділами через навігацію
- Кожен розділ має свою праву панель (aside)

**Структура:**

```html
<main id="content-main" class="content-main">

    <!-- НАВІГАТОР ПО СЕКЦІЯХ -->
    <nav class="section-navigator" id="section-navigator">
        <a href="#section-table" class="nav-icon" aria-label="Таблиці">
            <span class="material-symbols-outlined">table_chart</span>
            <span class="nav-icon-label">Таблиці</span>
        </a>
        <a href="#section-text" class="nav-icon" aria-label="Текст">
            <span class="material-symbols-outlined">edit_note</span>
            <span class="nav-icon-label">Текст</span>
        </a>
        <a href="#section-seo" class="nav-icon" aria-label="Сео">
            <span class="material-symbols-outlined">search</span>
            <span class="nav-icon-label">Сео</span>
        </a>
    </nav>

    <!-- СЕКЦІЯ 1 -->
    <section id="section-table" data-panel-template="aside-table">
        <div class="section-header">
            <div class="section-name-block">
                <div class="section-name">
                    <h2>Таблиці</h2>
                    <button class="btn-icon" aria-label="Інформація">
                        <span class="material-symbols-outlined">info</span>
                    </button>
                </div>
                <h3>Налаштування таблиць</h3>
            </div>
            <button id="reload-section-table" class="btn-icon btn-reload" aria-label="Перезавантажити">
                <span class="material-symbols-outlined">refresh</span>
            </button>
        </div>

        <div class="section-content">
            <!-- Контент секції -->
        </div>
    </section>

    <!-- СЕКЦІЯ 2 -->
    <section id="section-text" data-panel-template="aside-text">
        <!-- Аналогічна структура -->
    </section>

</main>
```

**Важливо:**
- `id` секції має відповідати `href` в навігаторі (`#section-table`)
- `data-panel-template` вказує на aside-шаблон (`aside-table.html`)
- Кожна секція ОБОВ'ЯЗКОВО має `section-header` та `section-content`

---

### 2️⃣ Табована сторінка

**Коли використовувати:**
- Сторінка має таби з динамічним контентом
- Потрібна пагінація та робота з таблицями
- Таби переключаються без перезавантаження сторінки

**Структура:**

```html
<main id="content-main" class="content-main tabbed-page">

    <!-- НАВІГАТОР ПО ТАБАХ -->
    <nav class="section-navigator" role="group" aria-label="Таби"
         data-tabs-container id="tabs-head-container">
        <button class="nav-icon active" data-tab-target="tab-manage">
            <span class="material-symbols-outlined">block</span>
            <span class="nav-icon-label">Заборонені слова</span>
        </button>
        <!-- Динамічні таби додаються тут через JS -->
    </nav>

    <!-- ТАБ 1: Управління -->
    <div class="tab-content active" data-tab-content="tab-manage" id="tab-manage">
        <div class="section-header" style="align-items: flex-end;">
            <div class="section-name-block">
                <div class="section-name">
                    <h2>Заборонені слова</h2>
                    <button class="btn-icon" aria-label="Інформація">
                        <span class="material-symbols-outlined">info</span>
                    </button>
                </div>
                <h3 id="tab-stats-manage">Показано 0 з 0</h3>

                <!-- Фільтри табу (якщо потрібно) -->
                <div class="tab-controls" style="margin-top: 8px;">
                    <button class="nav-icon active" data-filter="all" data-tab-id="tab-manage">
                        <span class="material-symbols-outlined">list</span>
                        <span class="nav-icon-label">Всі</span>
                    </button>
                    <button class="nav-icon" data-filter="unchecked" data-tab-id="tab-manage">
                        <span class="material-symbols-outlined">radio_button_unchecked</span>
                        <span class="nav-icon-label">Не перевірені</span>
                    </button>
                </div>
            </div>

            <div class="tab-controls">
                <button id="refresh-tab-manage" class="btn-icon" aria-label="Оновити таб">
                    <span class="material-symbols-outlined">refresh</span>
                </button>

                <!-- Dropdown вибору колонок -->
                <div class="dropdown-wrapper">
                    <button class="btn-icon" data-dropdown-trigger aria-label="Вібір колонок">
                        <span class="material-symbols-outlined">view_column</span>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right">
                        <div class="dropdown-header">Показати колонки</div>
                        <div id="table-columns-list" class="dropdown-body">
                            <!-- Чекбокси додаються динамічно -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Контейнер таблиці -->
        <div id="banned-words-table-container" class="pseudo-table-container">
            <div class="loading-state">
                <span class="material-symbols-outlined">key</span>
                <p>Авторизуйтесь для завантаження даних</p>
            </div>
        </div>
    </div>

    <!-- ТАБ 2: (створюється динамічно або статично) -->
    <div id="sheet-tabs-content-container"></div>

    <!-- ФІКСОВАНИЙ ФУТЕР (для табованих сторінок) -->
    <footer class="fixed-footer">
        <div></div>

        <div class="pagination-container">
            <div id="pagination-nav-container" class="pagination-nav"></div>

            <div class="page-size-selector" id="page-size-selector">
                <button class="page-size-trigger" aria-label="Кількість на сторінці">
                    <span id="page-size-label">10</span>
                </button>
                <div class="page-size-menu">
                    <button class="page-size-option" data-page-size="10">10</button>
                    <button class="page-size-option" data-page-size="25">25</button>
                    <button class="page-size-option" data-page-size="50">50</button>
                    <button class="page-size-option" data-page-size="100">100</button>
                    <button class="page-size-option" data-page-size="999999">Всі</button>
                </div>
            </div>
        </div>
    </footer>

</main>
```

**Важливо:**
- Додай клас `tabbed-page` до `content-main`
- `data-tab-target` на кнопці має відповідати `data-tab-content` на контенті
- Активний таб має клас `active` і на кнопці, і на контенті
- Фіксований футер з пагінацією ОБОВ'ЯЗКОВИЙ

---

## 🧭 Ліва панель навігації

**ОБОВ'ЯЗКОВА структура лівої панелі:**

```html
<nav id="panel-left" class="panel panel-left">

    <!-- Скролабельний контент -->
    <div class="panel-content-scroll">

        <!-- Навігація по сторінках -->
        <a href="index.html" target="_blank" class="panel-item is-active">
            <span class="material-symbols-outlined panel-item-icon">instant_mix</span>
            <span class="panel-item-text">Інструменти</span>
        </a>

        <a href="glossary.html" target="_blank" class="panel-item">
            <span class="material-symbols-outlined panel-item-icon">import_contacts</span>
            <span class="panel-item-text">Глосарій</span>
            <!-- Опціонально: іконка зовнішнього посилання -->
            <div class="btn-icon">
                <span class="material-symbols-outlined">open_in_new</span>
            </div>
        </a>

        <a href="entities.html" target="_blank" class="panel-item">
            <span class="material-symbols-outlined panel-item-icon">label</span>
            <span class="panel-item-text">Сутності</span>
            <div class="btn-icon">
                <span class="material-symbols-outlined">open_in_new</span>
            </div>
        </a>

        <!-- Вимкнені елементи -->
        <a href="javascript:void(0)" class="panel-item panel-item-disabled">
            <span class="material-symbols-outlined panel-item-icon">shopping_bag</span>
            <span class="panel-item-text">Бренди</span>
            <div class="btn-icon">
                <span class="material-symbols-outlined">open_in_new</span>
            </div>
        </a>

        <!-- Розділювач -->
        <div class="panel-separator"></div>

        <!-- Зовнішні посилання -->
        <a href="https://docs.google.com/..." target="_blank" rel="noopener noreferrer"
           class="panel-item">
            <span class="material-symbols-outlined panel-item-icon">table_chart</span>
            <span class="panel-item-text">Тексти товарів</span>
            <div class="btn-icon">
                <span class="material-symbols-outlined">open_in_new</span>
            </div>
        </a>

    </div>

    <!-- ФІКСОВАНИЙ ФУТЕР (ОБОВ'ЯЗКОВО) -->
    <div class="panel-content-footer">
        <!-- Кнопка входу (показується коли НЕ авторизований) -->
        <button id="auth-login-trigger-btn" class="panel-item">
            <span class="material-symbols-outlined panel-item-icon">login</span>
            <span class="panel-item-text">Увійти</span>
        </button>

        <!-- Інформація про користувача (показується коли авторизований) -->
        <div id="auth-user-info" class="panel-item u-hidden">
            <span id="auth-user-avatar-container" class="panel-item-icon">
                <span class="material-symbols-outlined">person</span>
            </span>
            <div class="panel-item-text">
                <div id="auth-username-display"></div>
                <div id="auth-user-role-display"></div>
            </div>
        </div>

        <!-- Кнопка виходу (показується коли авторизований) -->
        <button id="auth-logout-btn" class="panel-item u-hidden">
            <span class="material-symbols-outlined panel-item-icon">logout</span>
            <span class="panel-item-text">Вийти</span>
        </button>
    </div>

</nav>
```

**Правила:**
- `is-active` - клас для активної сторінки
- `panel-item-disabled` - клас для вимкнених елементів
- `panel-separator` - розділювач між групами
- `target="_blank"` - обов'язково для всіх посилань
- Футер з авторизацією **ОБОВ'ЯЗКОВИЙ** на всіх сторінках

---

## 🎨 Права панель (Aside)

**Призначення:**
- Додаткові налаштування для активної секції
- Інструменти та контроли
- Фільтри та опції

**Структура HTML:**

```html
<aside id="panel-right" class="panel panel-right">
    <!-- Заголовок панелі -->
    <div class="panel-header">
        <button id="btn-panel-right-toggle" class="btn-icon" aria-label="Згорнути панель">
            <span class="material-symbols-outlined">keyboard_arrow_left</span>
        </button>
    </div>

    <!-- Контент завантажується динамічно через JS -->
    <div id="panel-right-content" class="panel-content"></div>
</aside>
```

**Структура aside-шаблонів** (`templates/aside/aside-XXX.html`):

```html
<!-- Фіксована верхня частина (якщо потрібно) -->
<div class="panel-content-fix">
    <div class="panel-box">
        <span class="material-symbols-outlined">search</span>
        <input type="text" id="search-triger" class="input-main" placeholder="Пошук...">
        <button class="btn-icon clear-search-btn u-hidden" aria-label="Очистити пошук">
            <span class="material-symbols-outlined">close</span>
        </button>
    </div>
</div>

<div class="panel-separator"></div>

<!-- Скролабельний контент -->
<div id="triger-buttons-container" class="chip-container">
    <!-- Динамічний контент -->
</div>

<!-- Фіксований футер (якщо потрібно) -->
<div class="panel-content-footer">
    <button class="panel-item">
        <span class="material-symbols-outlined panel-item-icon">save</span>
        <span class="panel-item-text">Зберегти</span>
    </button>
</div>
```

**Класи для aside:**
- `.panel-content-fix` - фіксована верхня частина
- `.panel-separator` - розділювач
- `.panel-content-footer` - фіксований футер
- Решта контенту - автоматично скролиться

**Прив'язка до секції:**
```html
<!-- В HTML секції -->
<section id="section-seo" data-panel-template="aside-seo">
    <!-- Контент секції -->
</section>
```

**JavaScript автоматично завантажить шаблон** `templates/aside/aside-seo.html` при переході до секції.

---

## 🧭 Section Navigator

**Призначення:**
- Навігація між секціями або табами
- Візуальна індикація активного розділу
- Може бути фіксованим або скролабельним

### Для секційної сторінки:

```html
<nav class="section-navigator" id="section-navigator">
    <a href="#section-table" class="nav-icon" aria-label="Таблиці">
        <span class="material-symbols-outlined">table_chart</span>
        <span class="nav-icon-label">Таблиці</span>
    </a>
    <a href="#section-text" class="nav-icon" aria-label="Текст">
        <span class="material-symbols-outlined">edit_note</span>
        <span class="nav-icon-label">Текст</span>
    </a>
    <a href="#section-seo" class="nav-icon" aria-label="Сео">
        <span class="material-symbols-outlined">search</span>
        <span class="nav-icon-label">Сео</span>
    </a>
</nav>
```

**Важливо:**
- Використовуй `<a href="#section-XXX">` для секційної навігації
- Активний розділ отримує клас `.active` автоматично через JS
- Якірні посилання мають відповідати `id` секцій

### Для табованої сторінки:

```html
<nav class="section-navigator" role="group" aria-label="Таби"
     data-tabs-container id="tabs-head-container">
    <button class="nav-icon active" data-tab-target="tab-manage">
        <span class="material-symbols-outlined">block</span>
        <span class="nav-icon-label">Заборонені слова</span>
    </button>
    <button class="nav-icon" data-tab-target="tab-check-1">
        <span class="material-symbols-outlined">description</span>
        <span class="nav-icon-label">Аркуш 1</span>
    </button>
</nav>
```

**Важливо:**
- Використовуй `<button data-tab-target="XXX">` для табів
- Додай атрибут `data-tabs-container` до навігатора
- `data-tab-target` має відповідати `data-tab-content` на контенті
- Перший таб має клас `active`

**Стани навігатора:**
- `.nav-icon` - базовий клас
- `.nav-icon.active` - активний елемент
- `.nav-icon:hover` - ховер стан
- `.nav-icon:focus` - фокус стан

---

## 🛠️ Кастомні компоненти

**ВАЖЛИВО:** НІКОЛИ не використовуй системні компоненти! Завжди тільки кастомні!

### ❌ ЗАБОРОНЕНО:
```html
<!-- НЕПРАВИЛЬНО - системний select -->
<select>
    <option>Опція 1</option>
</select>

<!-- НЕПРАВИЛЬНО - системний checkbox -->
<input type="checkbox">

<!-- НЕПРАВИЛЬНО - системний alert -->
<script>alert('Повідомлення')</script>

<!-- НЕПРАВИЛЬНО - системний confirm -->
<script>confirm('Підтвердити?')</script>
```

### ✅ ПРАВИЛЬНО - ЗАВЖДИ використовуй:

#### 1. Кастомний Select

```html
<select id="marketplace-select" data-custom-select>
    <option value="">-- Оберіть маркетплейс --</option>
    <option value="rozetka">Rozetka</option>
    <option value="prom">Prom</option>
</select>
```

**Важливо:**
- Додай атрибут `data-custom-select`
- Ініціалізація через `initCustomSelects(container)`
- Стилі застосуються автоматично
- Файл: `js/common/ui-select.js`

#### 2. Кастомний Checkbox

```html
<label class="checkbox-label">
    <input type="checkbox" id="my-checkbox">
    <span>Текст чекбокса</span>
</label>
```

**Важливо:**
- Обгорни в `.checkbox-label`
- `<span>` для тексту після `<input>`
- Стилі застосуються автоматично через CSS
- Файл стилів: `css/components/inputs/checkbox.css`

#### 3. Кастомний Radio

```html
<div class="connected-button-group-round" role="group">
    <input type="radio" id="mode-resize" name="gim-mode-select" value="resize" checked>
    <label for="mode-resize" class="segment" aria-label="Змінити розмір">
        <div class="state-layer">
            <span class="material-symbols-outlined">photo_size_select_large</span>
            <span class="label">Розмір</span>
        </div>
    </label>

    <input type="radio" id="mode-canvas" name="gim-mode-select" value="canvas">
    <label for="mode-canvas" class="segment" aria-label="Змінити полотно">
        <div class="state-layer">
            <span class="material-symbols-outlined">crop</span>
            <span class="label">Полотно</span>
        </div>
    </label>
</div>
```

**Важливо:**
- Використовуй `.connected-button-group-round` або `.connected-button-group-square`
- `<input type="radio">` приховується, стилізується `<label>`
- `name` атрибут має бути однаковий для групи
- Файл стилів: `css/components/inputs/radio.css`

#### 4. Кастомний Modal

```html
<!-- В HTML - тригер -->
<button data-modal-trigger="my-modal-id">Відкрити модалку</button>

<!-- Шаблон модалки в templates/modals/XXX.html -->
<div class="modal-title-source u-hidden">
    Заголовок модалки
</div>

<div class="modal-header-actions-source u-hidden">
    <!-- Кнопки в заголовку (якщо потрібно) -->
</div>

<div class="modal-body-source">
    <!-- Контент модалки -->
    <p>Контент тут</p>

    <!-- Футер модалки -->
    <div class="modal-footer">
        <button class="btn-secondary" data-modal-close>Скасувати</button>
        <button class="btn-primary">Зберегти</button>
    </div>
</div>
```

**Важливо:**
- Шаблон в `templates/modals/`
- Тригер: `data-modal-trigger="modal-id"`
- Закриття: `data-modal-close` на кнопці
- Ініціалізація автоматична
- Файл: `js/common/ui-modal.js`

#### 5. Кастомний Toast (повідомлення)

```javascript
import { showToast } from './common/ui-toast.js';

// Успішне повідомлення
showToast('Дані збережено!', 'success');

// Помилка
showToast('Виникла помилка', 'error', 5000);

// Інформація
showToast('Завантаження...', 'info');

// Попередження
showToast('Увага! Перевірте дані', 'warning');
```

**Типи:**
- `success` - зелений (успіх)
- `error` - червоний (помилка)
- `warning` - жовтий (попередження)
- `info` - синій (інформація)

**Параметри:**
- `message` - текст повідомлення
- `type` - тип (success/error/warning/info)
- `duration` - тривалість в мс (за замовчуванням 3000)

#### 6. Кастомний Dropdown

```html
<div class="dropdown-wrapper">
    <button class="btn-icon" data-dropdown-trigger aria-label="Меню">
        <span class="material-symbols-outlined">more_vert</span>
    </button>
    <div class="dropdown-menu">
        <div class="dropdown-header">Заголовок</div>
        <div class="dropdown-body">
            <button class="dropdown-item">Опція 1</button>
            <button class="dropdown-item">Опція 2</button>
            <div class="dropdown-separator"></div>
            <button class="dropdown-item">Опція 3</button>
        </div>
    </div>
</div>
```

**Варіанти позиціонування:**
- `.dropdown-menu` - за замовчуванням (зліва)
- `.dropdown-menu.dropdown-menu-right` - справа

#### 7. Кастомний Confirm Dialog

```javascript
import { showModal } from './common/ui-modal.js';

// Використовуй modal з типом confirm
// Шаблон: templates/modals/confirm-clear-modal.html
<button data-modal-trigger="confirm-clear-modal">Очистити</button>
```

**Приклад confirm модалки:**
```html
<div class="modal-title-source u-hidden">
    Підтвердження
</div>

<div class="modal-body-source">
    <p>Ви впевнені, що хочете очистити дані?</p>

    <div class="modal-footer">
        <button class="btn-secondary" data-modal-close>Скасувати</button>
        <button id="confirm-clear-action" class="btn-primary">Підтвердити</button>
    </div>
</div>
```

---

## ✅ Чеклист створення нової сторінки

### 1. Визначити тип сторінки
- [ ] Секційна (кілька незалежних розділів)
- [ ] Табована (таби з динамічним контентом)

### 2. Базова структура HTML
- [ ] Скопіювати структуру з еталонної сторінки (index.html або banned-words.html)
- [ ] Змінити `<title>` в `<head>`
- [ ] Перевірити всі обов'язкові `<link>` (main.css, Material Icons, DM Sans)
- [ ] Додати специфічні `<script>` якщо потрібно (PapaParse, Sortable, XLSX)

### 3. Ліва панель навігації
- [ ] Додати посилання на нову сторінку
- [ ] Встановити клас `is-active` на поточній сторінці
- [ ] Перевірити наявність футера з авторизацією
- [ ] ID елементів авторизації:
  - `auth-login-trigger-btn`
  - `auth-user-info`
  - `auth-logout-btn`
  - `auth-username-display`
  - `auth-user-role-display`

### 4. Section Navigator
- [ ] Для секційної: `<nav class="section-navigator" id="section-navigator">`
- [ ] Для табованої: `<nav class="section-navigator" data-tabs-container>`
- [ ] Додати іконки Material Icons
- [ ] Перевірити відповідність `href` / `data-tab-target`

### 5. Секції / Таби
- [ ] Для секційної:
  - [ ] `<section id="section-XXX" data-panel-template="aside-XXX">`
  - [ ] `.section-header` з назвою та кнопками
  - [ ] `.section-content` з контентом
- [ ] Для табованої:
  - [ ] Клас `tabbed-page` на `content-main`
  - [ ] `<div class="tab-content" data-tab-content="tab-XXX">`
  - [ ] Перший таб має клас `active`
  - [ ] Додати `<footer class="fixed-footer">` з пагінацією

### 6. Права панель (Aside)
- [ ] Структура `<aside id="panel-right">`
- [ ] `<div class="panel-header">` з кнопкою згортання
- [ ] `<div id="panel-right-content" class="panel-content">`
- [ ] Створити aside-шаблони в `templates/aside/`
- [ ] Перевірити атрибут `data-panel-template` на секціях

### 7. Кастомні компоненти
- [ ] **ТІЛЬКИ кастомні селекти** (`data-custom-select`)
- [ ] **ТІЛЬКИ кастомні чекбокси** (`.checkbox-label`)
- [ ] **ТІЛЬКИ кастомні модалки** (`data-modal-trigger`)
- [ ] **ТІЛЬКИ кастомні Toast** (`showToast()`)
- [ ] **ЗАБОРОНЕНО** системні `alert()`, `confirm()`, `<select>` без атрибута

### 8. JavaScript
- [ ] Створити `js/main-XXX.js` (точка входу)
- [ ] Імпортувати необхідні модулі
- [ ] Ініціалізувати кастомні компоненти:
  ```javascript
  import { initCustomSelects } from './common/ui-select.js';
  import { initModal } from './common/ui-modal.js';
  import { showToast } from './common/ui-toast.js';
  ```
- [ ] Додати `<script type="module" src="js/main-XXX.js"></script>` в `<body>`

### 9. Стилі
- [ ] Перевірити, що всі стилі йдуть з `css/main.css`
- [ ] **НЕ** створювати нові inline стилі (`style="..."`)
- [ ] **НЕ** створювати нові CSS файли без обґрунтування
- [ ] Використовувати CSS змінні з `root.css`
- [ ] Використовувати utility класи (`.u-hidden`, `.u-flex-center`, тощо)

### 10. Доступність
- [ ] `aria-label` на кнопках без тексту
- [ ] `role="group"` на групах кнопок
- [ ] `aria-label` на section-navigator для табів

### 11. Перевірка перед комітом
- [ ] Прочитати [ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md)
- [ ] Прочитати [CODE-STYLE-GUIDE.md](./CODE-STYLE-GUIDE.md)
- [ ] Перевірити, що сторінка візуально ідентична еталонним
- [ ] Перевірити роботу навігації
- [ ] Перевірити роботу aside панелі
- [ ] Перевірити авторизацію
- [ ] Перевірити всі кастомні компоненти
- [ ] Немає console.log (крім обґрунтованих)
- [ ] Немає закоментованого коду

---

## 📋 Приклад: Створення нової табованої сторінки

**Завдання:** Створити сторінку "Бренди" з табами для управління брендами.

### Крок 1: Створити файл `brands.html`

```html
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Бренди</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js"></script>
</head>

<body>
    <!-- ЛІВА ПАНЕЛЬ (скопіювати з banned-words.html, змінити is-active) -->
    <nav id="panel-left" class="panel panel-left">
        <div class="panel-content-scroll">
            <a href="index.html" target="_blank" class="panel-item">
                <span class="material-symbols-outlined panel-item-icon">instant_mix</span>
                <span class="panel-item-text">Інструменти</span>
            </a>
            <!-- ... інші пункти ... -->
            <a href="brands.html" target="_blank" class="panel-item is-active">
                <span class="material-symbols-outlined panel-item-icon">shopping_bag</span>
                <span class="panel-item-text">Бренди</span>
            </a>
        </div>

        <!-- Футер з авторизацією (обов'язково) -->
        <div class="panel-content-footer">
            <button id="auth-login-trigger-btn" class="panel-item">
                <span class="material-symbols-outlined panel-item-icon">login</span>
                <span class="panel-item-text">Увійти</span>
            </button>
            <div id="auth-user-info" class="panel-item u-hidden">
                <span id="auth-user-avatar-container" class="panel-item-icon">
                    <span class="material-symbols-outlined">person</span>
                </span>
                <div class="panel-item-text">
                    <div id="auth-username-display"></div>
                    <div id="auth-user-role-display"></div>
                </div>
            </div>
            <button id="auth-logout-btn" class="panel-item u-hidden">
                <span class="material-symbols-outlined panel-item-icon">logout</span>
                <span class="panel-item-text">Вийти</span>
            </button>
        </div>
    </nav>

    <!-- ЦЕНТРАЛЬНИЙ БЛОК -->
    <main id="content-main" class="content-main tabbed-page">
        <nav class="section-navigator" role="group" aria-label="Таби"
             data-tabs-container id="tabs-head-container">
            <button class="nav-icon active" data-tab-target="tab-brands">
                <span class="material-symbols-outlined">shopping_bag</span>
                <span class="nav-icon-label">Бренди</span>
            </button>
        </nav>

        <div class="tab-content active" data-tab-content="tab-brands" id="tab-brands">
            <div class="section-header">
                <div class="section-name-block">
                    <div class="section-name">
                        <h2>Бренди</h2>
                        <button class="btn-icon" aria-label="Інформація">
                            <span class="material-symbols-outlined">info</span>
                        </button>
                    </div>
                    <h3 id="tab-stats-brands">Показано 0 з 0</h3>
                </div>
                <div class="tab-controls">
                    <button id="refresh-tab-brands" class="btn-icon" aria-label="Оновити таб">
                        <span class="material-symbols-outlined">refresh</span>
                    </button>
                </div>
            </div>

            <div id="brands-table-container" class="pseudo-table-container">
                <div class="loading-state">
                    <span class="material-symbols-outlined">shopping_bag</span>
                    <p>Авторизуйтесь для завантаження даних</p>
                </div>
            </div>
        </div>

        <footer class="fixed-footer">
            <div></div>
            <div class="pagination-container">
                <div id="pagination-nav-container" class="pagination-nav"></div>
                <div class="page-size-selector" id="page-size-selector">
                    <button class="page-size-trigger" aria-label="Кількість на сторінці">
                        <span id="page-size-label">10</span>
                    </button>
                    <div class="page-size-menu">
                        <button class="page-size-option" data-page-size="10">10</button>
                        <button class="page-size-option" data-page-size="25">25</button>
                        <button class="page-size-option" data-page-size="50">50</button>
                        <button class="page-size-option" data-page-size="100">100</button>
                        <button class="page-size-option" data-page-size="999999">Всі</button>
                    </div>
                </div>
            </div>
        </footer>
    </main>

    <!-- ПРАВА ПАНЕЛЬ -->
    <aside id="panel-right" class="panel panel-right">
        <div class="panel-header">
            <button id="btn-panel-right-toggle" class="btn-icon" aria-label="Згорнути панель">
                <span class="material-symbols-outlined">keyboard_arrow_left</span>
            </button>
        </div>
        <div id="panel-right-content" class="panel-content"></div>
    </aside>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="js/utils/api-client.js"></script>
    <script type="module" src="js/main-brands.js"></script>
</body>
</html>
```

### Крок 2: Створити `js/main-brands.js`

```javascript
import { initAuth } from './auth/auth-init.js';
import { initModal } from './common/ui-modal.js';
import { showToast } from './common/ui-toast.js';

console.log('[Brands] Ініціалізація...');

// Ініціалізація авторизації
initAuth();

// Ініціалізація модалок
initModal();

// Ініціалізація логіки брендів
// import { initBrandsLogic } from './brands/brands-main.js';
// initBrandsLogic();

console.log('[Brands] Готово!');
```

### Крок 3: Створити aside шаблон (якщо потрібно)

`templates/aside/aside-brands.html`:

```html
<div class="panel-content-fix">
    <div class="panel-box">
        <span class="material-symbols-outlined">search</span>
        <input type="text" id="search-brand" class="input-main" placeholder="Пошук бренду...">
        <button class="btn-icon clear-search-btn u-hidden" aria-label="Очистити пошук">
            <span class="material-symbols-outlined">close</span>
        </button>
    </div>
</div>

<div class="panel-separator"></div>

<div class="panel-content-footer">
    <button class="panel-item" id="add-brand-btn">
        <span class="material-symbols-outlined panel-item-icon">add</span>
        <span class="panel-item-text">Додати бренд</span>
    </button>
</div>
```

### Крок 4: Перевірка

- ✅ Сторінка візуально ідентична banned-words.html
- ✅ Навігація працює
- ✅ Футер з авторизацією присутній
- ✅ Пагінація працює
- ✅ Немає системних компонентів
- ✅ Всі ID унікальні

---

## 📚 Додаткові ресурси

- [ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md) - Архітектурні принципи
- [CODE-STYLE-GUIDE.md](./CODE-STYLE-GUIDE.md) - Правила стилю коду
- [ARCHITECTURE-VIOLATIONS-REPORT.md](./ARCHITECTURE-VIOLATIONS-REPORT.md) - Звіт про порушення

---

**Дата створення:** 2025-01-15
**Версія:** 1.0
**Еталонні сторінки:** index.html, banned-words.html
