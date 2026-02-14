# Pinguin V5 — Дизайн-система

Це документація дизайн-системи проєкту Pinguin V5.
Тут описано всі візуальні "будівельні блоки" — кольори, шрифти, відступи, компоненти — з яких складається інтерфейс додатку.

---

## Зміст

1. [Що таке дизайн-система і навіщо вона потрібна](#1-що-таке-дизайн-система-і-навіщо-вона-потрібна)
2. [Кольори](#2-кольори)
3. [Типографіка (шрифти)](#3-типографіка-шрифти)
4. [Відступи та розміри](#4-відступи-та-розміри)
5. [Тіні](#5-тіні)
6. [Заокруглення кутів](#6-заокруглення-кутів)
7. [Іконки](#7-іконки)
8. [Компоненти](#8-компоненти)
   - [Кнопки](#81-кнопки)
   - [Форми](#82-форми)
   - [Чіпи та бейджі](#83-чіпи-та-бейджі)
   - [Модальні вікна](#84-модальні-вікна)
   - [Dropdown (випадаючі меню)](#85-dropdown-випадаючі-меню)
   - [Таблиці](#86-таблиці)
   - [Toast-повідомлення](#87-toast-повідомлення)
   - [Завантаження (Loading)](#88-завантаження-loading)
   - [Tooltip (підказки)](#89-tooltip-підказки)
   - [Аватари](#810-аватари)
   - [Toolbar (панель інструментів)](#811-toolbar-панель-інструментів)
   - [Таби (вкладки)](#812-таби-вкладки)
9. [Допоміжні класи (Utilities)](#9-допоміжні-класи-utilities)
10. [Архітектура CSS](#10-архітектура-css)
11. [Статус та плани](#11-статус-та-плани)

---

## 1. Що таке дизайн-система і навіщо вона потрібна

**Дизайн-система** — це набір правил та готових компонентів (кнопок, форм, модалок тощо), які забезпечують **єдиний стиль** по всьому додатку.

**Навіщо:**
- Всі сторінки виглядають однаково — кнопка "Зберегти" скрізь однакова
- Не потрібно вигадувати стилі з нуля для кожного нового елемента
- Якщо потрібно змінити, наприклад, колір бренду — змінюєш в одному місці, і він оновиться скрізь

**Як це працює в нашому проєкті:**
- Файл `css/root.css` зберігає базові значення (кольори, відступи, тіні тощо) як CSS-змінні
- Компоненти в папці `css/components/` використовують ці змінні
- Якщо потрібно змінити основний колір — міняєш `--color-main` в `root.css`, і весь додаток перефарбовується

---

## 2. Кольори

Всі кольори визначені в `css/root.css`. Кожен колір має парний колір для тексту поверх нього (префікс `on-`).

### Основні кольори бренду

| Змінна | Колір | Для чого |
|--------|-------|----------|
| `--color-main` | `rgb(9, 63, 69)` — темний бірюзовий | Головний колір бренду. Кнопки, акценти, активні елементи |
| `--color-on-main` | `#ffffff` — білий | Текст та іконки поверх main |
| `--color-secondary` | `rgb(9, 63, 69)` — темний бірюзовий | Другорядний колір (зараз такий самий як main) |
| `--color-on-secondary` | `#ffffff` — білий | Текст поверх secondary |
| `--color-tertiary` | `rgb(39, 93, 99)` — світліший бірюзовий | Третинний колір для доповнення |
| `--color-on-tertiary` | `#ffffff` — білий | Текст поверх tertiary |

### Контейнерні варіанти (легкий фон)

Кожен колір має "контейнерний" варіант — це той самий колір, але дуже прозорий (8-10% прозорості). Використовується як легкий фон:

| Змінна | Що це | Де використовується |
|--------|-------|---------------------|
| `--color-main-c` | `rgba(9, 63, 69, 0.08)` — майже прозорий бірюзовий | Фон активних чіпів, hover-ефекти кнопок |
| `--color-main-t-1` | `rgba(9, 63, 69, 0.1)` — 10% прозорості | Легкий hover-фон |
| `--color-main-t-2` | `rgba(9, 63, 69, 0.2)` — 20% прозорості | Активний стан icon-кнопок |

### Статусні кольори

Ці кольори повідомляють користувачу про результат дії:

| Змінна | Колір | Значення |
|--------|-------|----------|
| `--color-error` | `rgb(239, 68, 68)` — червоний | Помилка, видалення, заборонене |
| `--color-warning` | `rgb(245, 158, 11)` — жовто-оранжевий | Попередження, увага |
| `--color-success` | `rgb(16, 185, 129)` — зелений | Успіх, підтвердження |
| `--color-info` | `rgb(59, 130, 246)` — синій | Інформація, підказка |

Кожен статусний колір також має контейнерний варіант (`-c`) для легкого фону:
- `--color-error-c` → `rgba(239, 68, 68, 0.1)` — легкий червоний фон
- `--color-warning-c` → `rgba(245, 158, 11, 0.1)` — легкий жовтий фон
- `--color-success-c` → `rgba(16, 185, 129, 0.1)` — легкий зелений фон
- `--color-info-c` → `rgba(59, 130, 246, 0.1)` — легкий синій фон

### Поверхні та фони

| Змінна | Колір | Для чого |
|--------|-------|----------|
| `--color-surface` | `#fafafa` — майже білий | Основний фон сторінки |
| `--color-on-surface` | `#171717` — майже чорний | Основний колір тексту |
| `--color-on-surface-v` | `#737373` — сірий | Другорядний текст (підказки, мітки) |
| `--color-background` | `#fafafa` | Фон body |
| `--color-surface-c-low` | `#f5f5f5` — світло-сірий | Легкий фон (карточки, рядки таблиць) |
| `--color-surface-c` | `#e5e5e5` — сірий | Середній фон (hover рядків) |
| `--color-surface-c-high` | `#d4d4d4` — темнуватий сірий | Виражений фон (secondary кнопки) |

### Лінії та рамки

| Змінна | Колір | Для чого |
|--------|-------|----------|
| `--color-outline` | `#d4d4d4` | Рамки полів вводу, розділювачі |
| `--color-outline-v` | `#a3a3a3` | Більш контрастні рамки |
| `--color-modal-overlay` | `rgba(23, 23, 23, 0.5)` | Затемнення під модальним вікном |

### Кольори тексту

| Змінна | Вигляд | Де використовується |
|--------|--------|---------------------|
| `--text-primary` | `#171717` — майже чорний | Основний текст, заголовки |
| `--text-secondary` | `#737373` — сірий | Підписи, мітки, підказки |
| `--text-disabled` | `rgba(23, 23, 23, 0.38)` — напівпрозорий | Текст вимкнених елементів |
| `--text-hint` | `rgba(23, 23, 23, 0.6)` — напівпрозорий | Підказки в полях вводу |

### Кольори Affinity (категорії продуктів)

| Змінна | Колір | Категорія |
|--------|-------|-----------|
| `--affinity-main` | `#86efac` — м'ятний зелений | Main (Sketch-like) |
| `--affinity-vector` | `#06b6d4` — блакитний | Vector |
| `--affinity-pixel` | `#d946ef` — фіолетовий | Pixel |
| `--affinity-layout` | `#fb923c` — оранжевий | Layout |
| `--affinity-canvas` | `#60a5fa` — голубий | Canvas |

---

## 3. Типографіка (шрифти)

Визначено в `css/foundation/typography.css`.

### Основний шрифт

```
Шрифт: "DM Sans", з fallback-ланцюжком: "Roboto" → "Segoe UI" → "Helvetica Neue" → Arial → sans-serif
```

Це означає: браузер спробує завантажити DM Sans. Якщо не вдалося — Roboto. І так далі по черзі.

### Шкала розмірів тексту

| Розмір | Де використовується |
|--------|---------------------|
| **11px** | Severity бейджі (мітки рівня серйозності) |
| **12px** | Мітки полів (label), підказки (hint), лічильники, бейджі, tooltip |
| **13px** | Чіпи, другорядний текст в таблицях, switch-перемикачі |
| **14px** | Базовий текст по всьому додатку, кнопки, поля вводу, меню |
| **16px** | Заголовки секцій, легенди форм |
| **18px** | Заголовки модальних вікон |
| **24px** | Іконки в FAB-кнопках |

### Вага шрифту (товщина)

| Значення | Де використовується |
|----------|---------------------|
| **400** (normal) | Звичайний текст, tooltip |
| **500** (medium) | Кнопки, мітки, заголовки шапки таблиці, чіпи |
| **600** (semibold) | Бейджі, виділені елементи, checked select-опції |

### Висота рядка

| Значення | Де використовується |
|----------|---------------------|
| **1.2** | Компактний текст (імена, ролі) |
| **1.4** | Контент, контексти |
| **1.5** | Базова висота рядка для всього тексту |

---

## 4. Відступи та розміри

Визначено в `css/root.css`.

### Система відступів

| Змінна | Значення | Де використовується |
|--------|----------|---------------------|
| `--space-s` | `12px` | Малі відступи: між елементами форми, padding чіпів |
| `--space-m` | `16px` | Стандартні відступи: padding модалок, header |
| `--space-l` | `24px` | Великі відступи: padding body модалки, між секціями |

### Додаткові розміри, які часто зустрічаються

| Значення | Де використовується |
|----------|---------------------|
| **4px** | Мінімальний gap між елементами (switch, сегменти) |
| **8px** | Стандартний gap між елементами (кнопки, чіпи, flex-групи) |
| **12px** | Gap в header-controls, margin форм |
| **16px** | Padding кнопок, відступи всередині секцій |
| **32px** | Ширина icon-кнопок |
| **40px** | Висота полів вводу (min-height) |
| **48px** | Висота toolbar, великі відступи loading |
| **56px** | Ширина/висота FAB-кнопки |

### Розміри панелей

| Змінна | Значення | Для чого |
|--------|----------|----------|
| `--panel-width-collapsed` | `72px` | Ліва панель в згорнутому стані |
| `--panel-width-expanded` | `320px` | Ліва панель в розгорнутому стані |

---

## 5. Тіні

Тіні створюють візуальний ефект "підняття" елемента над поверхнею. Чим більший номер — тим вище елемент "піднятий":

| Змінна | Вигляд | Де використовується |
|--------|--------|---------------------|
| `--shadow-1` | Легка тінь | Бейджі при наведенні, FAB при натисканні |
| `--shadow-2` | Середня тінь | Модальні вікна, dropdown-меню, FAB |
| `--shadow-3` | Виражена тінь | FAB при наведенні |

Технічні значення:
```css
--shadow-1: 0px 1px 3px 1px rgba(0,0,0,0.15), 0px 1px 2px 0px rgba(0,0,0,0.30);
--shadow-2: 0px 2px 6px 2px rgba(0,0,0,0.15), 0px 1px 2px 0px rgba(0,0,0,0.30);
--shadow-3: 0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px 0px rgba(0,0,0,0.30);
```

---

## 6. Заокруглення кутів

| Змінна | Значення | Де використовується |
|--------|----------|---------------------|
| `--radius-s` | `8px` | Поля пошуку, чіпи, карточки, dropdown-елементи |
| `--radius-m` | `12px` | Dropdown-панелі, select-панелі, таблиці |
| `--radius-l` | `16px` | Модальні вікна, FAB-кнопки, drop-zone |
| `--radius-full` | `999px` | Повністю круглі елементи (таблетки, filter pills) |

Додатково:
- **4px** — сегменти кнопкових груп, tooltip-рамки
- **20px** — основні кнопки (btn-primary, btn-secondary)
- **50% (border-radius: 50%)** — круглі icon-кнопки, toolbar-кнопки

---

## 7. Іконки

Використовується шрифт **Material Symbols Outlined** від Google.

### Розміри іконок

| Розмір | Де використовується |
|--------|---------------------|
| **14px** | Severity бейджі |
| **16px** | Icon-кнопки (btn-icon), filter pills |
| **18px** | Кнопки (всередині btn-primary і т.д.), сегменти, сортування |
| **20px** | Поле пошуку, toolbar, reload-кнопка, drag handle |
| **24px** | FAB-кнопки, toolbar-кнопки, заголовок модалки |

### Як додати іконку

```html
<span class="material-symbols-outlined">search</span>
<span class="material-symbols-outlined">add</span>
<span class="material-symbols-outlined">close</span>
<span class="material-symbols-outlined">edit</span>
<span class="material-symbols-outlined">delete</span>
```

Повний каталог іконок: https://fonts.google.com/icons

---

## 8. Компоненти

### 8.1 Кнопки

Файли: `css/components/buttons/`

Всі кнопки автоматично отримують базові стилі з `button-base.css`:
- Flex-розташування з gap 8px
- Padding 8px 16px
- Заокруглення 20px (таблетка)
- Шрифт DM Sans, 14px, weight 500
- Анімація scale(0.98) при натисканні
- Opacity 0.38 при disabled

#### Primary (головна дія)

**Файл:** `button-primary.css` | **Клас:** `.btn-primary`

Для найважливішої дії на сторінці: "Зберегти", "Додати", "Створити". Темний бірюзовий фон з білим текстом.

```html
<button class="btn-primary">Зберегти</button>

<button class="btn-primary">
  <span class="material-symbols-outlined">add</span>
  <span>Додати</span>
</button>
```

**Правило:** не більше однієї primary-кнопки на секцію.

| Стан | Вигляд |
|------|--------|
| Звичайний | Фон `--color-main`, білий текст |
| Hover | Фон `--color-secondary`, легка тінь |
| Disabled | Opacity 0.38, курсор not-allowed |

#### Secondary (другорядна дія)

**Файл:** `button-secondary.css` | **Клас:** `.btn-secondary`

Для менш важливих дій: "Скасувати", "Назад", "Закрити". Сірий фон.

```html
<button class="btn-secondary">Скасувати</button>
```

| Стан | Вигляд |
|------|--------|
| Звичайний | Фон `--color-surface-c-high` (сірий), темний текст |
| Hover | Фон `--color-surface-c`, легка тінь |

#### Outline (контурна)

**Файл:** `button-outline.css` | **Клас:** `.btn-outline`

Для альтернативних дій. Прозорий фон з рамкою.

```html
<button class="btn-outline">
  <span class="material-symbols-outlined">storefront</span>
  <span>Маркетплейси</span>
</button>
```

| Стан | Вигляд |
|------|--------|
| Звичайний | Прозорий фон, рамка `--color-outline` |
| Hover | Фон `--color-surface-c-low`, рамка темніша |

#### Icon (кнопка-іконка)

**Файл:** `button-icon.css` | **Клас:** `.btn-icon`

Кругла кнопка 32x32px тільки з іконкою. Для "закрити", "редагувати", "видалити".

```html
<button class="btn-icon" aria-label="Закрити">
  <span class="material-symbols-outlined">close</span>
</button>
```

**Модифікатор `.on-hover`** — кнопка з'являється тільки при наведенні на батьківський елемент:
```html
<div class="some-row">
  <span>Текст</span>
  <button class="btn-icon on-hover" aria-label="Редагувати">
    <span class="material-symbols-outlined">edit</span>
  </button>
</div>
```

#### Delete (видалення)

**Файл:** `button-variants.css` | **Клас:** `.btn-delete`

Червона кнопка для деструктивних дій.

```html
<button class="btn-delete">Видалити</button>
```

| Стан | Вигляд |
|------|--------|
| Звичайний | Легкий червоний фон, червоний текст |
| Hover | Повністю червоний фон, білий текст |

#### FAB (Floating Action Button)

**Файл:** `fab.css` | **Клас:** `.fab`

Велика кнопка 56x56px, "плаваюча" над контентом. Для головної дії на сторінці.

```html
<button class="fab">
  <span class="material-symbols-outlined">add</span>
</button>

<!-- Маленький FAB (40x40) -->
<button class="fab fab-small">
  <span class="material-symbols-outlined">edit</span>
</button>

<!-- FAB з текстом -->
<button class="fab fab-extended">
  <span class="material-symbols-outlined">add</span>
  <span class="fab-label">Створити</span>
</button>
```

| Стан | Вигляд |
|------|--------|
| Звичайний | Легкий бірюзовий фон, середня тінь |
| Hover | Піднімається на 2px вгору, тінь збільшується |
| Active | Опускається назад, тінь зменшується |

#### Група кнопок (Segmented)

**Файл:** `button-groups.css` | **Класи:** `.connected-button-group-round`, `.connected-button-group-square`, `.segment`

Група з'єднаних кнопок для перемикання між опціями (як radio, але візуально як кнопки).

```html
<div class="connected-button-group-round">
  <button class="segment active">
    <span class="state-layer"><span class="label">Опція 1</span></span>
  </button>
  <button class="segment">
    <span class="state-layer"><span class="label">Опція 2</span></span>
  </button>
</div>
```

**Round** — перша і остання кнопки мають великі заокруглення (таблетка).
**Square** — всі кнопки мають маленькі заокруглення (4px).

#### Модифікатори розміру

| Клас | Що робить |
|------|-----------|
| `.btn-small` | Менші padding (4px 12px) і шрифт (13px) |
| `.btn-icon-small` | Icon-кнопка 28x28px |

---

### 8.2 Форми

Файли: `css/components/forms/`

#### Текстове поле

**Файл:** `input.css` | **Клас:** `.input-main`

Базове поле вводу без рамки (використовується всередині form-group або search-container).

```html
<input type="text" class="input-main" placeholder="Введіть текст...">
```

#### Група форми (Form Group)

**Файл:** `form-group.css` | **Клас:** `.form-group`

Обгортка для поля вводу з міткою, підказкою та лічильником. Це основний спосіб створення полів у формах.

```html
<div class="form-group">
  <label for="name">Назва <span class="required">*</span></label>
  <input type="text" id="name" placeholder="Введіть назву">
  <p class="form-hint">Максимум 65 символів</p>
</div>
```

**Стани полів всередині form-group:**
| Стан | Що відбувається |
|------|-----------------|
| Звичайний | Рамка `--color-outline`, фон `--color-surface` |
| Hover | Рамка стає темнішою |
| Focus | Рамка змінюється на `--color-main` (бірюзовий), стає 2px |
| Disabled | Opacity 0.5, курсор not-allowed |

**Form Group Result** — для відображення результату (readonly):
```html
<div class="form-group form-group-result">
  <span class="form-group-label">Title:</span>
  <input type="text" class="input-main" readonly>
  <span class="form-group-counter">0/65</span>
</div>
```

**Form Fieldset** — групування пов'язаних полів:
```html
<fieldset class="form-fieldset">
  <legend>Назва групи</legend>
  <div class="form-group">...</div>
  <div class="form-group">...</div>
</fieldset>
```

**Розташування:**
- `.form-group-column` — поля у стовпчик (вертикально)
- `.form-group-row` — поля в рядок (горизонтально)

#### Select (випадаючий список)

**Файл:** `custom-select.css` | **Клас:** `.custom-select-wrapper`

Кастомний select замість стандартного браузерного.

```html
<div class="custom-select-wrapper">
  <div class="custom-select-trigger">
    <div class="custom-select-value-container">
      <span class="custom-select-placeholder">Оберіть...</span>
    </div>
    <span class="custom-select-arrow">▼</span>
  </div>
  <div class="custom-select-panel">
    <div class="custom-select-search-wrapper">
      <input class="custom-select-search" placeholder="Шукати...">
    </div>
    <ul class="custom-select-options">
      <li class="custom-select-option">Опція 1</li>
      <li class="custom-select-option">Опція 2</li>
    </ul>
  </div>
</div>
```

**Підтримує:**
- Пошук серед опцій
- Мультивибір (чіпи з можливістю видалення)
- Стан "Вибрати все"
- Навігацію клавіатурою
- Стан disabled
- Автоматичне відкриття вгору, якщо внизу мало місця

#### Checkbox

**Файл:** `checkbox.css`

Кастомний checkbox: квадрат → при hover стає колом → при checked стає заповненим колом з галочкою.

```html
<input type="checkbox" id="check1">
<label for="check1">Опція</label>
```

| Стан | Вигляд |
|------|--------|
| Звичайний | Квадрат 24x24px з рамкою |
| Hover | Перетворюється на коло з легким фоном |
| Checked | Заповнене коло бірюзового кольору з білою галочкою |
| Focus | Рамка фокусу 2px бірюзова |
| Disabled | Opacity 0.38 |

#### Toggle Switch (перемикач)

**Файл:** `toggle.css` | **Клас:** `.toggle-switch`

Перемикач Увімк/Вимк у стилі iOS.

```html
<label class="toggle-switch">
  <input type="checkbox">
  <span class="slider"></span>
</label>
```

**Segmented Toggle** — перемикач з двома текстовими мітками:
```html
<label class="toggle-switch-segmented">
  <input type="checkbox">
  <span class="slider">
    <span class="text-off">Текст</span>
    <span class="text-on">HTML</span>
  </span>
</label>
```

#### Switch (Radio Toggle)

**Файл:** `switch.css` | **Клас:** `.switch-container`

Група radio-кнопок, що виглядають як кнопки-перемикачі.

```html
<div class="switch-container">
  <input type="radio" id="opt1" name="group" value="1" checked>
  <label for="opt1" class="switch-label">Опція 1</label>
  <input type="radio" id="opt2" name="group" value="2">
  <label for="opt2" class="switch-label">Опція 2</label>
</div>
```

#### Поле пошуку

**Файл:** `search.css` | **Клас:** `.search-container`

Поле пошуку з іконкою лупи. Min-width: 300px.

```html
<div class="search-container">
  <span class="material-symbols-outlined">search</span>
  <input type="text" placeholder="Пошук..." class="input-main">
</div>
```

#### Drop Zone (область завантаження файлів)

**Файл:** `drop-zone.css` | **Клас:** `.drop-zone`

Область для перетягування файлів. Має стани: hover, drag-over, loading, success, error.

```html
<div class="drop-zone">
  <div class="drop-zone-content">
    <span class="material-symbols-outlined drop-zone-icon">upload_file</span>
    <p class="drop-zone-text">Перетягніть файл сюди</p>
    <p class="drop-zone-hint">або натисніть для вибору</p>
  </div>
</div>

<!-- Компактний варіант -->
<div class="drop-zone drop-zone-compact">...</div>
```

#### Badge

**Файл:** `badge.css` | **Клас:** `.badge`

Маленька мітка з числом або текстом. Висота 32px.

```html
<span class="badge">12</span>
<span class="badge badge-success">Активний</span>
<span class="badge badge-neutral">Помилка</span>
```

**Severity Badge** — мітка рівня серйозності:
```html
<span class="severity-badge severity-low">Low</span>
<span class="severity-badge severity-medium">Medium</span>
<span class="severity-badge severity-high">High</span>
```

---

### 8.3 Чіпи та бейджі

**Файл:** `css/components/feedback/chip.css`

Чіпи — це маленькі мітки-таблетки для тегів, фільтрів, категорій.

#### Базовий чіп

```html
<span class="chip">Тег</span>
```

Вигляд: легкий бірюзовий фон, бірюзовий текст, заокруглення 8px. При hover — заповнюється кольором, заокруглення збільшується до 16px.

#### Модифікатори чіпів

| Клас | Вигляд | Для чого |
|------|--------|----------|
| `.chip` | Бірюзовий контейнерний | Базовий тег |
| `.chip-active` | Повністю бірюзовий (заповнений) | Активний/обраний тег |
| `.chip-error` | Червоний контейнерний | Помилки, заборонені слова |
| `.chip-warning` | Жовтий контейнерний | Попередження |
| `.chip-success` | Зелений контейнерний | Успіх |
| `.chip-clickable` | Курсор pointer | Клікабельний чіп |
| `.chip-link` | Курсор pointer | Чіп-посилання |
| `.chip-nav` | Клікабельний, змінює фон при hover | Чіп навігації |
| `.chip-tooltip` | Курсор help, має tooltip | Чіп з підказкою |

#### Контейнери для чіпів

| Клас | Як поводиться | Для чого |
|------|---------------|----------|
| `.chip-container` | Flex wrap, вертикальний scroll | Багато чіпів (десятки) |
| `.chip-list` | Горизонтальний scroll, без перенесення | Мала кількість чіпів |
| `.filter-pills-container` | Flex wrap | Фільтри-таблетки |

#### Filter Pills

```html
<div class="filter-pills-container">
  <button class="filter-pill active">Всі</button>
  <button class="filter-pill">Категорія 1</button>
  <button class="filter-pill">Категорія 2</button>
</div>
```

#### Word Chip (в таблицях)

```html
<span class="word-chip">слово</span>
<span class="word-chip primary">головне слово</span>
<span class="word-chip word-chip-small">маленький</span>
```

---

### 8.4 Модальні вікна

**Файли:** `css/components/overlays/modal.css`, `modal-sizes.css`

#### Структура модального вікна

```html
<div class="modal-overlay" data-modal-id="example">
  <div class="modal-container modal-medium">
    <header class="modal-header">
      <div class="modal-title-container">
        <span class="material-symbols-outlined">edit</span>
        <h2 class="modal-title">Редагування</h2>
      </div>
      <div class="modal-header-actions">
        <button class="btn-icon" aria-label="Закрити">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </header>
    <div class="modal-body">
      <!-- Контент модалки -->
    </div>
    <div class="modal-footer">
      <button class="btn-secondary">Скасувати</button>
      <button class="btn-primary">Зберегти</button>
    </div>
  </div>
</div>
```

#### Розміри модальних вікон

| Клас | Ширина | Для чого |
|------|--------|----------|
| `.modal-small` | 400px | Підтвердження, логін, прості форми |
| `.modal-medium` | 60vw | Стандартні форми, редагування |
| `.modal-large` | 80vw | Таблиці, списки, імпорт |
| `.modal-fullscreen` | 100% | Повноекранний режим |

#### Анімація

Модалка з'являється плавно:
- Overlay: opacity 0 → 1, blur 0 → 4px
- Container: scale 0.95 → 1
- Тривалість: 0.2s

#### Стан активності

Щоб відкрити модалку, додайте клас `.is-open` до `.modal-overlay`.
При відкритій модалці на `body` додається клас `.is-modal-open` (блокує прокрутку).

---

### 8.5 Dropdown (випадаючі меню)

**Файл:** `css/components/overlays/dropdown.css`

```html
<div class="dropdown-wrapper">
  <button class="btn-icon">
    <span class="material-symbols-outlined">more_vert</span>
  </button>
  <div class="dropdown-menu">
    <div class="dropdown-header">Дії</div>
    <div class="dropdown-body">
      <button class="dropdown-item">
        <span class="material-symbols-outlined">edit</span>
        Редагувати
      </button>
      <div class="dropdown-separator"></div>
      <button class="dropdown-item">
        <span class="material-symbols-outlined">delete</span>
        Видалити
      </button>
    </div>
  </div>
</div>
```

Щоб відкрити — додайте клас `.is-open` до `.dropdown-wrapper`.

Анімація: opacity 0→1, translateY(-10px)→0, тривалість 0.15s.

---

### 8.6 Таблиці

**Файл:** `css/components/tables/pseudo-table.css`

"Псевдо-таблиця" на основі flex (не `<table>`). Шапка прибита до верху.

```html
<div class="pseudo-table-container">
  <div class="pseudo-table-header">
    <div class="pseudo-table-cell cell-id sortable-header">
      ID <span class="sort-indicator"><span class="material-symbols-outlined">arrow_upward</span></span>
    </div>
    <div class="pseudo-table-cell cell-main-name">Назва</div>
    <div class="pseudo-table-cell cell-actions">Дії</div>
  </div>
  <div class="pseudo-table-row clickable-row">
    <div class="pseudo-table-cell cell-id">1</div>
    <div class="pseudo-table-cell cell-main-name">Товар</div>
    <div class="pseudo-table-cell cell-actions">
      <button class="btn-icon on-hover"><span class="material-symbols-outlined">edit</span></button>
    </div>
  </div>
</div>
```

#### Типи колонок

| Клас | Ширина | Для чого |
|------|--------|----------|
| `.cell-id` | Фіксована 120px | ID запису |
| `.cell-article` | Фіксована 100px | Артикул |
| `.cell-main-name` | flex: 3, min 250px | Головна назва |
| `.cell-actions` | Фіксована 80px | Кнопки дій |
| `.cell-bool` | Фіксована 100px, по центру | Так/Ні статуси |
| `.cell-count` | Фіксована 40px, по центру | Лічильник |
| `.cell-severity` | Фіксована 20px, по центру | Рівень серйозності |
| `.cell-context` | flex: 3, min 300px | Контекст тексту |

#### Сортування

Клікабельні заголовки мають клас `.sortable-header`. Стан сортування позначається:
- `.sorted-asc` — по зростанню (стрілка вгору)
- `.sorted-desc` — по спаданню (стрілка вниз)

---

### 8.7 Toast-повідомлення

**Файл:** `css/components/overlays/toast.css`

Короткі повідомлення внизу зліва екрану, які з'являються і зникають автоматично.

```html
<div id="toast-container">
  <div class="toast toast-visible toast-success">Збережено!</div>
</div>
```

| Клас | Вигляд |
|------|--------|
| `.toast` (базовий) | Темний фон, білий текст |
| `.toast-success` | Темний фон (як базовий) |
| `.toast-error` | Червоний фон, темний текст |
| `.toast-info` | Темний фон (як базовий) |

Анімація: з'їжджає знизу вгору (translateY: 100% → 0), тривалість 0.4s.

---

### 8.8 Завантаження (Loading)

**Файл:** `css/components/feedback/loading.css`

#### Spinner (обертання)

```html
<div class="loading-state">
  <div class="spinner"></div>
  <p class="loading-message">Завантаження...</p>
</div>
```

Коло 48x48px, бірюзовий сегмент обертається. Текст пульсує (opacity 0.6 → 1).

#### Loading Dots (три крапки)

```html
<div class="loading-dots">
  <div class="dot"></div>
  <div class="dot"></div>
  <div class="dot"></div>
</div>
```

Три крапки 12x12px, що по черзі збільшуються і зменшуються.

#### Progress Bar

```html
<div class="progress-bar">
  <div class="progress-fill" style="width: 60%"></div>
</div>
```

Смуга з діагональними рухомими полосками.

#### Loading Overlay

```html
<div class="loading-overlay">
  <div class="spinner"></div>
  <p class="loading-message">Обробка...</p>
</div>
```

Накладається поверх контенту з blur-ефектом.

---

### 8.9 Tooltip (підказки)

**Файл:** `css/components/feedback/tooltip.css`

Темні підказки, що з'являються при наведенні.

```html
<div data-tooltip="Повний текст тут">Обрізаний те...</div>
```

Вигляд: чорний фон, білий текст, заокруглення 8px, тінь.
Анімація: opacity 0→1, scale 0.95→1, тривалість 150ms.

**Shortcuts Tooltip** — спеціальний tooltip для відображення гарячих клавіш:

```html
<div class="shortcuts-tooltip visible">
  <div class="tooltip-title">Гарячі клавіші</div>
  <div class="shortcuts-list">
    <div class="shortcut-item">
      Зберегти <span><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
    </div>
  </div>
</div>
```

---

### 8.10 Аватари

**Файл:** `css/components/avatar.css`

Зображення користувачів або entities.

```html
<div class="avatar avatar-md">
  <img src="avatar.jpg" alt="Ім'я">
</div>
```

#### Розміри аватарів

| Клас | Розмір | Заокруглення | Де використовується |
|------|--------|--------------|---------------------|
| `.avatar-xs` | 24x24px | Коло (50%) | Мінімальний |
| `.avatar-sm` | 20x20px | 4px | У таблицях |
| `.avatar-md` | 32x32px | 6px | Стандартний |
| `.avatar-lg` | 48x48px | 8px | Профіль, preview |
| `.avatar-xl` | 64x64px | 12px | Великий профіль |

#### Аватар з ініціалами (без фото)

```html
<div class="avatar avatar-md avatar-initials" style="background: #86efac">
  МК
</div>
```

---

### 8.11 Toolbar (панель інструментів)

**Файл:** `css/components/navigation/toolbar.css`

#### Простий toolbar

```html
<div class="toolbar">
  <button class="toolbar-button">
    <span class="state-layer">
      <span class="material-symbols-outlined">save</span>
    </span>
  </button>
</div>
```

#### Extended toolbar (з кнопками по обидва боки)

```html
<div class="xr-toolbar">
  <div class="toolbar">
    <!-- Ліва частина: icon-кнопки -->
  </div>
  <div class="header-controls">
    <!-- Права частина: primary/secondary кнопки -->
    <button class="btn-outline">Скасувати</button>
    <button class="btn-primary">Зберегти</button>
  </div>
</div>
```

#### Toolbar Wrapper (з розділювачем)

```html
<div class="toolbar-wrapper">
  <!-- Висота 48px, border-bottom -->
</div>
```

---

### 8.12 Таби (вкладки)

**Файл:** `css/components/navigation/tabs.css`

```html
<!-- Кнопки табів -->
<div class="segment-group" role="tablist">
  <button class="segment active" data-tab="tab1" data-tab-target="content1">
    <span class="state-layer"><span class="label">Вкладка 1</span></span>
  </button>
  <button class="segment" data-tab="tab2" data-tab-target="content2">
    <span class="state-layer"><span class="label">Вкладка 2</span></span>
  </button>
</div>

<!-- Контент табів -->
<div class="tab-content is-active" data-tab-content="content1">Контент 1</div>
<div class="tab-content" data-tab-content="content2">Контент 2</div>
```

Активний таб має клас `.active` (для кнопки) і `.is-active` (для контенту).

Таби з кнопкою закриття:
```html
<button class="segment active" data-tab="sheet1">
  <span class="state-layer"><span class="label">Аркуш 1</span></span>
  <button class="tab-close-btn"><span class="material-symbols-outlined">close</span></button>
</button>
```

---

## 9. Допоміжні класи (Utilities)

**Файли:** `css/utilities/`

### Відображення

| Клас | Що робить |
|------|-----------|
| `.u-hidden` | Повністю ховає елемент (display: none !important) |

### Текст

| Клас | Що робить |
|------|-----------|
| `.text-disabled` | Текст стає напівпрозорим (колір disabled) |
| `.text-muted` | Сірий курсивний текст (opacity 0.6) |

### Відступи

| Клас | Що робить |
|------|-----------|
| `.u-p-8` | Padding 8px з усіх боків |
| `.u-mt-8` | Margin-top 8px |

### Flex-розташування

| Клас | Що робить |
|------|-----------|
| `.u-flex-row-8` | Flex row, gap 8px, align center |
| `.u-flex-col-8` | Flex column, gap 8px |
| `.u-flex-center` | Inline-flex, центрування по обох осях |
| `.u-dropdown-flex` | Flex + position relative (для dropdown) |
| `.u-align-end` | Align items до нижнього краю |

### Сітки

| Клас | Колонки |
|------|---------|
| `.grid2` | 2 колонки |
| `.grid3` | 3 колонки |
| `.grid4` | 4 колонки |
| `.grid5` | 5 колонок |

Всі сітки мають gap 8px.

### Анімації

| Клас / Keyframe | Що робить |
|-----------------|-----------|
| `.is-spinning` | Безкінечне обертання (для іконок завантаження) |
| `@keyframes spin` | Обертання 360° |
| `@keyframes stripeMove` | Рух діагональних смуг (progress bar) |
| `@keyframes bounce` | Пульсація крапок (loading dots) |
| `@keyframes pulse` | Пульсація opacity (loading message) |

---

## 10. Архітектура CSS

### Порядок підключення файлів

Визначено в `css/main.css`. Порядок принциповий — пізніші стилі перекривають ранні:

```
1. Root Variables     — CSS-змінні (кольори, розміри, тіні)
2. Foundation         — Базові стилі (reset, typography, scrollbar, selection)
3. Layout             — Структура сторінки (панелі, grid, header, footer)
4. Components         — UI-компоненти (кнопки, форми, модалки, таблиці)
5. Utilities          — Допоміжні класи (helpers, animations, grid)
```

### Принципи

- **Атомарність** — кожен файл відповідає за один компонент
- **Перевикористання** — жоден файл не прив'язаний до конкретної сторінки
- **Модульність** — компоненти незалежні один від одного
- **CSS-змінні** — всі значення беруться з `root.css`, а не хардкодяться

### Іменування класів

- **Компоненти:** `назва-компонента` → `btn-primary`, `modal-overlay`, `chip`
- **Модифікатори:** `компонент-модифікатор` → `chip-error`, `modal-small`, `fab-extended`
- **Стани:** `is-назва` або `active` → `is-open`, `is-active`, `is-spinning`
- **Утиліти:** `u-назва` → `u-hidden`, `u-flex-row-8`
- **Колонки таблиці:** `cell-назва` → `cell-id`, `cell-actions`

---

## 11. Статус та плани

### Що вже реалізовано

- Повна система кольорів на CSS-змінних
- 50+ CSS-компонентів
- 50+ JS UI-компонентів (модалки, таблиці, select, dropdown, toast тощо)
- Типографіка, відступи, тіні, заокруглення
- Система станів (hover, active, disabled, focus)
- Анімації появи/зникнення

### Заплановано

- **Темна тема** — CSS-змінні вже готові для перемикання, потрібно створити альтернативний набір значень
- **Мобільна версія** — окрема адаптація для мобільних пристроїв
- **Accessibility аудит** — перевірка контрастності кольорів та навігації клавіатурою за стандартом WCAG

---

## Швидка довідка

### Як створити кнопку?
```html
<button class="btn-primary">Головна дія</button>
<button class="btn-secondary">Другорядна дія</button>
<button class="btn-outline">Альтернативна дія</button>
<button class="btn-icon"><span class="material-symbols-outlined">edit</span></button>
```

### Як створити поле вводу?
```html
<div class="form-group">
  <label>Назва</label>
  <input type="text" placeholder="Введіть...">
</div>
```

### Як створити модалку?
```html
<div class="modal-overlay">
  <div class="modal-container modal-medium">
    <header class="modal-header">
      <h2 class="modal-title">Заголовок</h2>
    </header>
    <div class="modal-body">Контент</div>
    <div class="modal-footer">
      <button class="btn-secondary">Скасувати</button>
      <button class="btn-primary">Зберегти</button>
    </div>
  </div>
</div>
```

### Як показати статус?
```html
<span class="chip chip-success">Успішно</span>
<span class="chip chip-error">Помилка</span>
<span class="chip chip-warning">Увага</span>
```

### Як створити таблицю?
```html
<div class="pseudo-table-container">
  <div class="pseudo-table-header">
    <div class="pseudo-table-cell">Колонка</div>
  </div>
  <div class="pseudo-table-row">
    <div class="pseudo-table-cell">Дані</div>
  </div>
</div>
```
