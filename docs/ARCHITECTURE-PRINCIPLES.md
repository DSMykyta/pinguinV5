# АРХІТЕКТУРНІ ПРИНЦИПИ ПРОЄКТУ

> **ВАЖЛИВО:** Цей документ є обов'язковим для читання перед будь-якими змінами в коді.
> **Claude Code:** Завжди перечитуй цей документ перед початком роботи над проєктом.

---

## 🎯 ЯДРО ФІЛОСОФІЇ ПРОЄКТУ

Проєкт побудований на **трьох фундаментальних принципах**:

### 1. **ФРАГМЕНТОВАНІСТЬ** (Fragmentation)
> Кожен модуль має працювати незалежно. Можна видалити будь-який компонент — решта продовжить працювати.

**Що це означає:**
- ✅ Модуль A не знає про внутрішню структуру модуля B
- ✅ Зміна в одному модулі не ламає інші
- ✅ Тестування кожного модуля окремо без залежностей
- ❌ Жорсткі зв'язки типу `document.querySelector('#module-b-internal-div')`

### 2. **ПЕРЕВИКОРИСТАННЯ** (Reusability)
> Ніколи не дублюй код. Один раз написав — використовуй скрізь.

**Що це означає:**
- ✅ Спільні функції в `js/utils/`
- ✅ Базові CSS класи + модифікатори
- ✅ Імпорт замість копіювання
- ❌ Копіювати функцію в кілька файлів

### 3. **НЕЗАЛЕЖНІСТЬ** (Independence)
> Loose coupling, high cohesion. Модулі спілкуються через публічні API, не через внутрішні деталі.

**Що це означає:**
- ✅ Використання експорт/імпорт
- ✅ Події замість прямих викликів
- ✅ Dependency injection де потрібно
- ❌ Глобальні змінні та прямий доступ до DOM інших модулів

---

## 📦 ПРАВИЛА ДЛЯ JAVASCRIPT

### Структура модулів

#### ✅ ПРАВИЛЬНО: Один файл = одна відповідальність

```javascript
// js/utils/string-utils.js
/**
 * Утиліти для роботи з рядками
 */

export function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str, maxLength) {
    return str.length > maxLength
        ? str.slice(0, maxLength) + '...'
        : str;
}
```

```javascript
// js/generators/generator-text/gte-ui.js
import { capitalizeFirst, truncate } from '../../utils/string-utils.js';

function displayText(text) {
    const formatted = capitalizeFirst(truncate(text, 100));
    // ...
}
```

#### ❌ НЕПРАВИЛЬНО: Дублювання коду

```javascript
// js/generators/generator-text/gte-ui.js
function capitalizeFirst(str) {  // ❌ Дублювання!
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// js/generators/generator-seo/gse-ui.js
function capitalizeFirst(str) {  // ❌ Ще раз те саме!
    return str.charAt(0).toUpperCase() + str.slice(1);
}
```

---

### Імпорти та експорти

#### ✅ ПРАВИЛЬНО: Явні залежності

```javascript
// generator-table.js
import { debounce } from '../../utils/common-utils.js';
import { showModal, closeModal } from '../../common/ui-modal.js';
import { DOM } from './gt-dom.js';

export function initTableGenerator() {
    const handleInput = debounce(() => {
        // ...
    }, 300);

    showModal('preview-modal');
}
```

#### ❌ НЕПРАВИЛЬНО: Глобальні залежності

```javascript
// ❌ Покладається на глобальний Sortable з CDN
if (typeof Sortable !== 'undefined') {
    new Sortable(container, {...});
}

// ❌ Викликає функцію з невідомого модуля
someGlobalFunction();  // Звідки вона?

// ❌ Доступ до DOM іншого модуля
document.querySelector('#other-module-internal-div').click();
```

---

### Взаємодія між модулями

#### ✅ ПРАВИЛЬНО: Через публічний API

```javascript
// js/common/ui-modal.js
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('is-visible');
    }
}

export function closeModal() {
    const activeModal = document.querySelector('.modal.is-visible');
    if (activeModal) {
        activeModal.classList.remove('is-visible');
    }
}
```

```javascript
// js/generators/generator-table/gt-events.js
import { closeModal } from '../../common/ui-modal.js';

function handleCancel() {
    closeModal();  // ✅ Використовуємо API
}
```

#### ❌ НЕПРАВИЛЬНО: Прямий доступ до структури

```javascript
// ❌ Знає про внутрішню структуру modal системи
document.querySelector('#global-modal-wrapper .modal-close-btn')?.click();

// ❌ Модифікує DOM іншого модуля напряму
document.querySelector('#other-component .internal-state').style.display = 'none';
```

---

### Організація файлів генераторів

Кожен генератор має чітку структуру:

```
js/generators/generator-NAME/
  ├── NAME-main.js          // Точка входу, ініціалізація
  ├── NAME-dom.js           // Кешування DOM елементів
  ├── NAME-state.js         // Управління станом
  ├── NAME-config.js        // Константи та конфігурація
  ├── NAME-events.js        // Обробники подій
  ├── NAME-ui.js            // Оновлення UI
  ├── NAME-utils.js         // Специфічні утиліти (тільки для цього генератора)
  └── NAME-data-provider.js // Робота з даними
```

**Правила:**
- `*-main.js` — тільки ініціалізація, експортує `init` функцію
- `*-dom.js` — тільки селектори, ніякої логіки
- `*-state.js` — тільки state, ніякого DOM
- `*-utils.js` — тільки специфічні для цього генератора утиліти
  - Якщо утиліта потрібна в 2+ генераторах → винести в `js/utils/`

---

## 🎨 ПРАВИЛА ДЛЯ CSS

### Організація стилів

#### Структура CSS:

```
css/
  ├── root.css                    // CSS змінні (кольори, розміри, тощо)
  ├── main.css                    // Імпорти всіх стилів
  ├── foundation/                 // Базові reset, typography, scrollbar
  ├── layout/                     // Структура сторінок
  ├── components/                 // Компоненти UI
  │   ├── buttons/
  │   │   ├── button-base.css    // Базовий клас для всіх кнопок
  │   │   ├── button-primary.css // Модифікатор
  │   │   ├── button-secondary.css
  │   │   └── ...
  │   ├── forms/
  │   ├── navigation/
  │   └── overlays/
  └── utilities/                  // Допоміжні класи
      ├── helpers.css             // .u-hidden, .u-flex, тощо
      ├── animations.css          // .is-spinning, тощо
      └── grid.css                // .grid2, .grid3, тощо
```

---

### Принцип базового класу + модифікатори

#### ✅ ПРАВИЛЬНО: Спільна база + варіації

**CSS:**
```css
/* css/components/buttons/button-base.css */
.btn-base {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
}

.btn-base:active {
    transform: scale(0.98);
}

.btn-base:disabled {
    opacity: 0.38;
    cursor: not-allowed;
}

/* css/components/buttons/button-primary.css */
.btn-primary {
    background: var(--color-primary);
    color: var(--color-on-primary);
}

.btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
}

/* css/components/buttons/button-secondary.css */
.btn-secondary {
    background: var(--color-surface-variant);
    color: var(--color-on-surface-variant);
}
```

**HTML:**
```html
<button class="btn-base btn-primary">Додати</button>
<button class="btn-base btn-secondary">Скасувати</button>
```

#### ❌ НЕПРАВИЛЬНО: Дублювання базових стилів

```css
/* button-primary.css */
.btn-primary {
    display: inline-flex;           /* ❌ Дублюється */
    align-items: center;            /* ❌ Дублюється */
    justify-content: center;        /* ❌ Дублюється */
    gap: 8px;                       /* ❌ Дублюється */
    padding: 8px 16px;              /* ❌ Дублюється */
    /* ... всі базові стилі ... */
    background: var(--color-primary);
}

/* button-secondary.css */
.btn-secondary {
    display: inline-flex;           /* ❌ Знову дублюється! */
    align-items: center;            /* ❌ Знову дублюється! */
    /* ... знову всі ті ж стилі ... */
    background: var(--color-surface-variant);
}
```

---

### Коли створювати новий CSS клас

#### ✅ Новий клас ПОТРІБЕН, якщо:

1. **Компонент використовується 2+ рази**
   ```css
   /* ✅ Використовується в багатьох модалах */
   .modal-header {
       padding: 16px;
       border-bottom: 1px solid var(--color-outline);
   }
   ```

2. **Група стилів повторюється**
   ```css
   /* ✅ Замість 10 разів писати flex + gap + align */
   .u-flex-center {
       display: flex;
       align-items: center;
       gap: 8px;
   }
   ```

3. **Стан елемента**
   ```css
   /* ✅ Стан який змінюється через JS */
   .is-loading {
       opacity: 0.6;
       pointer-events: none;
   }
   ```

#### ❌ Новий клас НЕ ПОТРІБЕН, якщо:

1. **Використовується тільки раз**
   ```css
   /* ❌ Тільки для одного div в одному модалі */
   .modal-special-unique-div {
       margin-top: 8px;  /* Краще інлайн або в батьківський клас */
   }
   ```

2. **Можна використати utility клас**
   ```css
   /* ❌ Непотрібно */
   .margin-top-8 {
       margin-top: 8px;
   }

   /* ✅ Використай utility */
   .u-mt-8 { margin-top: 8px; }
   ```

3. **Можна додати до існуючого класу**
   ```css
   /* ❌ Створювати окремий клас */
   .panel-box-special {
       /* всі стилі panel-box + */
       background: transparent;
   }

   /* ✅ Додати модифікатор */
   .panel-box--transparent {
       background: transparent;
   }
   ```

---

### Інлайн стилі

#### ✅ Інлайн стилі ДОЗВОЛЕНІ тільки для:

1. **Динамічних значень з JS**
   ```javascript
   // ✅ Позиція визначається динамічно
   element.style.left = `${x}px`;
   element.style.top = `${y}px`;
   ```

2. **Унікальних розмірів зображень**
   ```html
   <!-- ✅ Розміри специфічні для цього зображення -->
   <img src="photo.jpg" style="width: 247px; height: 185px;">
   ```

#### ❌ Інлайн стилі ЗАБОРОНЕНІ для:

1. **Стилів, що повторюються**
   ```html
   <!-- ❌ Повторюється 6 разів -->
   <button style="color: var(--text-disabled);">

   <!-- ✅ Створити клас -->
   <button class="text-disabled">
   ```

2. **Управління відображенням**
   ```html
   <!-- ❌ НІКОЛИ! -->
   <div style="display: none;">

   <!-- ✅ Використовуй utility клас -->
   <div class="u-hidden">
   ```

3. **Складних комбінацій**
   ```html
   <!-- ❌ НІКОЛИ! -->
   <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">

   <!-- ✅ Створити клас компонента -->
   <div class="toolbar-header">
   ```

---

## 📄 ПРАВИЛА ДЛЯ HTML

### Шаблони (Templates)

**Структура:**
```
templates/
  ├── aside/           // Бічні панелі
  │   ├── aside-entities.html
  │   ├── aside-glossary.html
  │   └── ...
  └── modals/          // Модальні вікна
      ├── entity-edit.html
      ├── confirm-delete.html
      └── ...
```

**Правила:**
- ✅ Кожен template = окремий файл
- ✅ Template не має inline scripts
- ✅ Template не має inline стилів (крім виняткових випадків)
- ✅ Класи замість ID (де можливо) для перевикористання

---

## 🚫 ЗАБОРОНЕНІ ПРАКТИКИ

### 1. Дублювання коду

#### ❌ НІКОЛИ не копіюй функції

```javascript
// File A
function debounce(func, delay) { ... }

// File B - ❌ КОПІЯ!
function debounce(func, delay) { ... }
```

#### ✅ Використовуй спільні утиліти

```javascript
// js/utils/common-utils.js
export function debounce(func, delay) { ... }

// File A
import { debounce } from '../../utils/common-utils.js';

// File B
import { debounce } from '../utils/common-utils.js';
```

---

### 2. Жорсткі залежності

#### ❌ НІКОЛИ не звертайся до внутрішньої структури

```javascript
// ❌ Знаєш про внутрішню структуру modal
document.querySelector('#global-modal-wrapper .modal-close-btn')?.click();

// ❌ Модифікуєш DOM іншого компонента
document.querySelector('#generator-table .internal-state').innerHTML = 'test';
```

#### ✅ Використовуй публічні API

```javascript
// ✅ Викликаєш публічну функцію
import { closeModal } from './ui-modal.js';
closeModal();

// ✅ Відправляєш подію
const event = new CustomEvent('table:updated', { detail: data });
document.dispatchEvent(event);
```

---

### 3. Глобальні змінні

#### ❌ НІКОЛИ не створюй глобальні змінні

```javascript
// ❌ Глобальна змінна
window.myGeneratorState = {};

// ❌ Неявна глобальна (забули let/const)
tableData = [];
```

#### ✅ Використовуй модульний scope

```javascript
// ✅ Приватна змінна модуля
let state = {};

export function getState() {
    return { ...state };  // Копія, не оригінал
}

export function setState(newState) {
    state = { ...state, ...newState };
}
```

---

### 4. Inline стилі без причини

#### ❌ НІКОЛИ для статичних стилів

```html
<!-- ❌ -->
<div style="padding: 8px; background: white;">

<!-- ❌ -->
<button style="display: flex; gap: 4px;">
```

#### ✅ Створюй CSS класи

```css
/* css/components/panel.css */
.panel-content {
    padding: 8px;
    background: var(--color-surface);
}

.btn-with-icon {
    display: flex;
    gap: 4px;
}
```

---

### 5. Створення класів для одноразового використання

#### ❌ НІКОЛИ не створюй клас для одного div

```css
/* ❌ Використовується тільки раз */
.special-modal-unique-title-container {
    margin-bottom: 16px;
}
```

#### ✅ Використовуй utility або додай до батьківського

```css
/* ✅ Варіант 1: Utility */
.u-mb-16 { margin-bottom: 16px; }

/* ✅ Варіант 2: В батьківський клас */
.modal-header > .title {
    margin-bottom: 16px;
}
```

---

## ✅ РЕКОМЕНДОВАНІ ПРАКТИКИ

### 1. Модульна структура

```javascript
// generator-NAME-main.js - Точка входу
import { DOM } from './NAME-dom.js';
import { state } from './NAME-state.js';
import { setupEvents } from './NAME-events.js';

export function initNAMEGenerator() {
    DOM.cache();
    setupEvents();
    // Мінімум логіки, тільки ініціалізація
}
```

```javascript
// generator-NAME-dom.js - Кешування DOM
export const DOM = {
    container: null,
    input: null,
    button: null,

    cache() {
        this.container = document.getElementById('NAME-container');
        this.input = document.getElementById('NAME-input');
        this.button = document.getElementById('NAME-button');
    }
};
```

```javascript
// generator-NAME-state.js - Управління станом
let state = {
    isActive: false,
    data: []
};

export function getState() {
    return { ...state };
}

export function setState(updates) {
    state = { ...state, ...updates };
}
```

---

### 2. Події замість прямих викликів

#### ✅ Використовуй CustomEvents для комунікації

```javascript
// Module A - відправляє подію
function onDataUpdate(newData) {
    const event = new CustomEvent('data:updated', {
        detail: { data: newData }
    });
    document.dispatchEvent(event);
}

// Module B - слухає подію
document.addEventListener('data:updated', (e) => {
    console.log('Отримав нові дані:', e.detail.data);
    updateUI(e.detail.data);
});
```

---

### 3. Dependency Injection

#### ✅ Передавай залежності явно

```javascript
// ✅ Приймає залежність як параметр
export function initTableGenerator(sortableLib, modalAPI) {
    if (sortableLib) {
        new sortableLib(container, config);
    }

    button.addEventListener('click', () => {
        modalAPI.show('preview');
    });
}

// Виклик
import Sortable from 'sortablejs';
import * as modalAPI from './ui-modal.js';

initTableGenerator(Sortable, modalAPI);
```

---

### 4. Utility класи для частих паттернів

```css
/* css/utilities/helpers.css */

/* Display */
.u-hidden { display: none !important; }
.u-flex { display: flex !important; }
.u-block { display: block !important; }

/* Flexbox */
.u-flex-center {
    display: flex;
    align-items: center;
    gap: 8px;
}

.u-flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Spacing */
.u-mt-8 { margin-top: 8px; }
.u-mt-16 { margin-top: 16px; }
.u-mb-8 { margin-bottom: 8px; }
.u-p-8 { padding: 8px; }
.u-p-16 { padding: 16px; }
```

---

### 5. Коментарі та документація

#### ✅ Кожен CSS файл має header

```css
/**
 * COMPONENT: Button Primary
 *
 * ПРИЗНАЧЕННЯ:
 * Основна кнопка для важливих дій (додати, зберегти, підтвердити).
 *
 * ВИКОРИСТАННЯ:
 * <button class="btn-base btn-primary">
 *   <span class="material-symbols-outlined">add</span>
 *   <span>Додати</span>
 * </button>
 *
 * КЛАСИ:
 * - .btn-primary - основний стиль (потребує .btn-base)
 *
 * ЗАЛЕЖНОСТІ:
 * - button-base.css
 * - root.css (--color-primary, --color-on-primary)
 *
 * ЗАСТОСУВАННЯ:
 * - Форми (кнопка submit)
 * - Діалоги підтвердження
 * - Створення нових записів
 */
```

#### ✅ Кожен JS модуль має JSDoc

```javascript
/**
 * Ініціалізує генератор таблиць
 *
 * @module generator-table
 * @description Генератор для створення HTML таблиць з динамічними рядками
 *
 * @example
 * import { initTableGenerator } from './generator-table/gt-main.js';
 * initTableGenerator();
 *
 * @exports initTableGenerator
 * @requires ./gt-dom.js
 * @requires ./gt-state.js
 * @requires ./gt-events.js
 */
```

---

## 📋 ЧЕКЛИСТ ПЕРЕД КОМІТОМ

Перед тим як зробити commit, перевір:

### JavaScript

- [ ] Жодної дубльованої функції (перевір `debounce`, `throttle`, `copyToClipboard`, тощо)
- [ ] Всі імпорти явні (не покладаємось на глобальні змінні)
- [ ] Жодного `document.querySelector` до елементів інших модулів
- [ ] Жодного `window.myVar =` або інших глобальних змінних
- [ ] Кожен файл має одну чітку відповідальність
- [ ] Функції короткі (<50 рядків, в ідеалі <20)
- [ ] JSDoc коментарі для публічних функцій

### CSS

- [ ] Жодного дублювання базових стилів кнопок/форм/карток
- [ ] Новий клас обґрунтований (використовується 2+ рази)
- [ ] Базовий клас + модифікатори (не дублювання всього)
- [ ] Файл в правильній папці (components/buttons/, utilities/, тощо)
- [ ] Header коментар з описом призначення
- [ ] Використання CSS змінних з `root.css`

### HTML

- [ ] Мінімум inline стилів (тільки для динамічних значень)
- [ ] Жодного `style="display: none;"` (тільки `class="u-hidden"`)
- [ ] Класи замість ID де можливо
- [ ] Семантична розмітка

### Архітектура

- [ ] Модуль можна видалити без поломки інших
- [ ] Loose coupling (модулі не знають про внутрішню структуру один одного)
- [ ] High cohesion (всередині модуля все пов'язане)
- [ ] Принцип єдиної відповідальності

---

## 🔍 ЯК ПЕРЕВІРИТИ ДОТРИМАННЯ ПРИНЦИПІВ

### 1. Тест на видалення

**Спробуй видалити один модуль:**
```bash
# Тимчасово перейменуй модуль
mv js/generators/generator-table js/generators/generator-table.backup

# Перевір чи працює решта проєкту
# Відкрий браузер, перейди на сторінки без цього генератора
```

**Якщо щось зламалось** — є жорстка залежність, треба виправити.

---

### 2. Пошук дублювання

**Шукай однакові функції:**
```bash
# Пошук debounce
grep -r "function debounce" js/

# Пошук throttle
grep -r "function throttle" js/

# Пошук copyToClipboard
grep -r "copyToClipboard" js/
```

**Якщо знайшов 2+ входження** — винеси в `js/utils/common-utils.js`

---

### 3. Пошук inline стилів

```bash
# Пошук style= в HTML
grep -r 'style="' *.html templates/

# Пошук .style в JS
grep -r '\.style\.' js/
```

**Якщо знайшов багато** — створи CSS класи.

---

### 4. Пошук глобальних змінних

```bash
# Пошук window.something =
grep -r 'window\.' js/ | grep '='

# Пошук викликів без імпорту
grep -r 'Sortable\|PapaParse' js/
```

**Якщо знайшов** — зроби явний імпорт або dependency injection.

---

## 📚 ДОДАТКОВІ РЕСУРСИ

- [Детальний звіт про порушення](./ARCHITECTURE-VIOLATIONS-REPORT.md)
- [Гайд по стилю коду](./CODE-STYLE-GUIDE.md)
- [Структура CSS](../css/main.css) - дивись коментарі та порядок імпортів

---

## 🎓 ПРИКЛАДИ З ПРОЄКТУ

### Відмінно зроблено ✨

**1. Система реєстрації панелей** (`js/layout/panel-right.js`):
```javascript
const panelInitializers = {};

export function registerPanelInitializer(templateName, initFunction) {
    panelInitializers[templateName] = initFunction;
}

export function initializePanel(templateName) {
    const initializer = panelInitializers[templateName];
    if (initializer) initializer();
}
```
✅ Loose coupling, генератори саморегеструються

**2. Кешування DOM** (всі `*-dom.js` файли):
```javascript
export const DOM = {
    container: null,
    input: null,

    cache() {
        this.container = document.getElementById('table-container');
        this.input = document.getElementById('table-input');
    }
};
```
✅ Один раз знаходимо елементи, використовуємо багато разів

**3. CSS організація** (`css/main.css`):
```css
/* Foundation → Layout → Components → Utilities */
@import url('root.css');
@import url('foundation/reset.css');
@import url('layout/layout-app.css');
@import url('components/buttons/button-base.css');
@import url('utilities/helpers.css');
```
✅ Чітка ієрархія та порядок

---

## ⚠️ ВИСНОВОК

**ПАМ'ЯТАЙ:**
1. **Один раз написав → використовуй скрізь** (не копіюй)
2. **Модулі незалежні** (можна видалити будь-який)
3. **Loose coupling** (модулі через API, не через внутрішню структуру)
4. **Стилі в CSS файлах** (не inline)
5. **Новий клас = обґрунтування** (чому не існуючий?)

---

**Дата створення:** 2025-01-15
**Версія:** 1.0
**Автор:** Architecture Team
**Останнє оновлення:** 2025-01-15
