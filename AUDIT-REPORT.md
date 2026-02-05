# Аудит дизайн-системи Pinguin V5

Повний аудит CSS, JS та HTML на відповідність LEGO-системі.
Дата: 2026-02-05

---

## Короткий підсумок

| Категорія проблеми | Кількість | Серйозність |
|--------------------|-----------|-------------|
| Старі змінні (не з root.css) | 46+ місць | КРИТИЧНО |
| Захардкоджені кольори (не через змінні) | 50+ місць | ВИСОКО |
| Захардкоджені border-radius | 120+ місць | ВИСОКО |
| Захардкоджені box-shadow (не --shadow-*) | 40+ місць | ВИСОКО |
| Дублікати компонентів | 8+ пар | ВИСОКО |
| Inline-стилі в HTML | 29 місць | ВИСОКО |
| Стилі в JS (.style.xxx) | 91+ місць | КРИТИЧНО |
| Мертвий CSS (не підключений) | 1 файл | КРИТИЧНО |
| Legacy-код (застарілий) | 5+ класів | СЕРЕДНЬО |
| Відсутні CSS-змінні | 6+ значень | СЕРЕДНЬО |

**Загалом: 480+ місць потребують виправлення.**

---

## 1. КРИТИЧНО: Файл-привид

**Файл `css/layout/layout-main.css` НЕ підключено в `main.css`.**

Цей файл існує в проєкті, але ніде не імпортується. Він дублює стилі з `layout-app.css` (body, .content-main, scrollbar, ::selection). Це "мертвий код" — він нічого не робить, але може збивати з пантелику.

**Рішення:** Видалити `css/layout/layout-main.css`.

---

## 2. КРИТИЧНО: Старі назви змінних (46+ місць)

Два файли використовують **старі** назви CSS-змінних з Material Design, яких **немає** в `root.css`:

### `css/components/forms/drop-zone.css` — 40+ місць

Використовує змінні типу:
```
var(--primary)              ← має бути var(--color-main)
var(--error)                ← має бути var(--color-error)
var(--surface-container)    ← має бути var(--color-surface-c)
var(--on-surface-variant)   ← має бути var(--color-on-surface-v)
var(--outline-variant)      ← має бути var(--color-outline-v)
var(--primary-container)    ← немає еквівалента, потрібно додати
var(--primary-rgb)          ← немає еквівалента
```

**Що це означає:** ці стилі **можуть не працювати** або відображатися з дефолтними fallback-кольорами (чи просто не мати кольору), бо змінні не визначені.

### `css/components/forms/custom-select.css` — 3 місця

```
Рядок 25: var(--primary)    ← має бути var(--color-main)
Рядок 29: var(--primary)
Рядок 30: var(--primary)
```

**Рішення:** Замінити всі старі назви на нові з root.css.

---

## 3. ВИСОКО: Захардкоджені кольори (50+ місць)

Замість CSS-змінних (`var(--color-xxx)`) використані конкретні значення кольорів. Це означає, що при зміні палітри ці місця **не оновляться автоматично**.

### Іменовані кольори (white, black)

| Файл | Що написано | Що має бути |
|------|-------------|-------------|
| `avatar.css:227` | `color: white` | `color: var(--color-on-main)` |
| `products.css:398` | `color: white` | `color: var(--color-on-main)` |
| `products.css:413` | `color: white !important` | `color: var(--color-on-main)` |
| `products.css:885` | `color: white` | `color: var(--color-on-main)` |
| `drop-zone.css:464` | `border: solid white` | `border: solid var(--color-on-main)` |

### Hex-кольори (products.css — "Google Search Preview")

| Рядок | Колір | Проблема |
|-------|-------|----------|
| 765 | `#1a0dab` (синій) | Колір Google-посилання — не з палітри |
| 777 | `#006621` (зелений) | Колір Google URL — не з палітри |
| 783 | `#545454` (сірий) | Колір Google-опису — не з палітри |
| 758 | `#dadce0` (рамка) | Рамка Google-картки — не з палітри |

**Примітка:** Google Search Preview стилі можуть бути навмисно захардкоджені (щоб імітувати реальний вигляд Google). Якщо так — це ОК, але потрібно додати коментар.

### RGBA-кольори в компонентах (25+ місць)

**Найгірші порушники:**

| Файл | Скільки місць | Приклади |
|------|---------------|----------|
| `content-card.css` | 8 | `rgba(255,255,255,0.1)`, `rgba(255,255,255,0.15)` |
| `products.css` | 5 | `rgba(0,0,0,0.7)`, `rgba(255,255,255,0.2)` |
| `tooltip.css` | 3 | `rgba(255,255,255,0.6)`, `rgba(255,255,255,0.15)` |
| `rich-editor.css` | 3 | `rgba(245,158,11,0.25)`, `rgba(59,130,246,0.25)` |
| `statistics.css` | 3 | `rgba(239,68,68,0.15)`, `rgba(245,158,11,0.15)` |
| `toolbar.css` | 3 | `rgba(0,0,0,0.08)`, `rgba(0,106,99,0.08)` |
| `drop-zone.css` | 4 | `rgba(76,175,80,0.08)`, `rgba(255,152,0,0.05)` |

---

## 4. ВИСОКО: Захардкоджені box-shadow (40+ місць)

В `root.css` є змінні `--shadow-1`, `--shadow-2`, `--shadow-3`, але більшість компонентів їх **ігнорують** і пишуть тінь руками:

| Файл | Що написано | Що має бути |
|------|-------------|-------------|
| `button-primary.css:36` | `box-shadow: 0 2px 8px rgba(...)` | `var(--shadow-1)` |
| `button-secondary.css:31` | `box-shadow: 0 2px 8px rgba(...)` | `var(--shadow-1)` |
| `button-icon.css:66` | `box-shadow: 0 2px 8px rgba(...)` | `var(--shadow-1)` |
| `content-card.css:33` | `box-shadow: 0 4px 12px rgba(...)` | `var(--shadow-2)` |
| `chip.css:236,263` | `box-shadow: 0 4px 12px rgba(...)` | `var(--shadow-2)` |
| `tooltip.css:34` | `box-shadow: 0 4px 12px rgba(...)` | `var(--shadow-2)` |
| `custom-select.css:69,88` | `box-shadow: 0 4px 12px rgba(...)` | `var(--shadow-2)` |
| `toast.css:19` | `box-shadow: 0px 8px 12px ...` | `var(--shadow-3)` або нова змінна |
| `batch-actions.css:15` | `box-shadow: 0 1px 3px rgba(...)` | `var(--shadow-1)` |
| `pagination-fab.css:24` | `box-shadow: 0 1px 3px rgba(...)` | `var(--shadow-1)` |
| `pseudo-table.css:83` | `box-shadow: 0 1px 3px rgba(...)` | `var(--shadow-1)` |

---

## 5. ВИСОКО: Захардкоджені border-radius (120+ місць)

В `root.css` є змінні `--radius-s (8px)`, `--radius-m (12px)`, `--radius-l (16px)`, `--radius-full (999px)`, але вони майже не використовуються.

### Відсутні змінні (потрібно додати в root.css)

| Значення | Скільки разів зустрічається | Запропонована змінна |
|----------|----------------------------|---------------------|
| `4px` | 25+ разів | `--radius-xs: 4px` |
| `6px` | 10+ разів | відсутня (тільки в avatar) |
| `20px` | 5+ разів | `--radius-xl: 20px` |
| `24px` | 3+ рази | відсутня |

### Найгірші файли

| Файл | Скільки захардкоджених radius |
|------|-------------------------------|
| `products.css` | 15+ |
| `avatar.css` | 12+ |
| `drop-zone.css` | 10+ |
| `form-group.css` | 6+ |
| `button-groups.css` | 6+ |
| `table-row-inputs.css` | 7+ |
| `pseudo-table.css` | 6+ |

---

## 6. ВИСОКО: Дублікати компонентів

### 6.1 `.button-group` = `.connected-button-group-square`

**Файл:** `button-groups.css`

Ці два класи мають **ідентичні стилі** (display: flex, gap: 2px, height: 32px).

**Рішення:** Видалити `.button-group` або зробити аліасом.

### 6.2 `.btn-reload` і `.move-btn` ≈ `.btn-icon`

**Файл:** `button-variants.css`

Всі три — круглі кнопки 32x32px з іконкою. Різниця мінімальна:
- `.btn-icon` — прозорий, при hover бірюзовий фон
- `.btn-reload` — прозорий, при hover сірий фон
- `.move-btn` — прозорий, cursor: grab

**Рішення:** Використовувати `.btn-icon` з модифікаторами замість окремих класів.

### 6.3 `.badge` ≈ `.chip` ≈ `.word-chip` ≈ `.filter-pill`

**Файли:** `badge.css`, `chip.css`

Чотири компоненти, які роблять схоже — показують маленьку мітку з текстом:

| Компонент | Padding | Border-radius | Різниця |
|-----------|---------|---------------|---------|
| `.badge` | 2px 8px | 12px | Є рамка, висота 32px |
| `.chip` | 4px 12px | 8px→16px | Є hover-ефект |
| `.word-chip` | 2px 8px | 8px | Для таблиць |
| `.filter-pill` | 6px 12px | 999px (таблетка) | Для фільтрів |

**Рішення:** Зробити один базовий клас `.chip` з модифікаторами розміру.

### 6.4 `.auth-avatar` = `.avatar-md`

**Файл:** `avatar.css`

`.auth-avatar` — це 32x32px з border-radius 6px. `.avatar-md` — теж 32x32px з border-radius 6px. Повний дублікат.

**Рішення:** Видалити `.auth-avatar`, використовувати `.avatar-md`.

### 6.5 `.modal-content` (Legacy)

**Файл:** `modal.css:90-95`

Позначений коментарем "Legacy: старий контейнер". Замінений на `.modal-container`.

**Рішення:** Видалити `.modal-content`.

### 6.6 Toggle vs Switch — три реалізації перемикача

| Компонент | Файл | Тип |
|-----------|------|-----|
| `.toggle-switch` | toggle.css | Checkbox → повзунок |
| `.toggle-switch-segmented` | toggle.css | Checkbox → дві кнопки з текстом |
| `.switch-container` | switch.css | Radio → кнопки-перемикачі |

Три різні реалізації того самого UX-патерну.

**Рішення:** Задокументувати, коли який використовувати, або об'єднати.

### 6.7 Legacy-таблиці в pseudo-table.css

Файл `pseudo-table.css` містить **4 застарілі варіанти таблиць**, які не використовуються в новому коді:

- `.admin-table-container` + `.admin-table` (рядки 232-243)
- `.table-wrapper` (рядки 246-251)
- `.entities-table` (рядки 254-275)
- `.merge-table` (рядки 278-294)

**Рішення:** Перевірити використання і видалити непотрібні.

---

## 7. ВИСОКО: Inline-стилі в HTML (29 місць)

Замість CSS-класів або утиліт використані `style="..."` прямо в HTML.

### Найгірші файли

| Файл | Кількість | Приклади |
|------|-----------|----------|
| `templates/modals/product-edit-modal.html` | 6 | `style="display: none"`, `style="margin: 0 0 12px"` |
| `templates/modals/product-text-view.html` | 9 | `style="font-size: 16px"`, `style="gap: 16px"` |
| `templates/aside/aside-banned-words.html` | 4 | `style="margin-top: 12px"`, `style="font-size: 13px"` |
| `templates/aside/aside-image-tool.html` | 4 | `style="flex: 1"`, `style="padding: 0 16px"` |
| `index.html` | 3 | `style="display: none"`, `style="pointer-events: auto"` |

**Типові порушення:**
- `style="display: none"` → має бути `class="u-hidden"`
- `style="margin-top: 12px"` → має бути `class="u-mt-12"` (утиліта)
- `style="font-size: 16px"` → має бути визначено в CSS-класі
- `style="flex: 1"` → має бути `class="u-flex-1"` (утиліта)
- `style="gap: 16px"` → має бути частиною компонента

---

## 8. КРИТИЧНО: Стилі в JavaScript (91+ місць)

JavaScript-код напряму змінює стилі елементів через `.style.xxx` замість перемикання CSS-класів.

### Найгірші файли

| Файл | Кількість | Що робить |
|------|-----------|-----------|
| `js/common/ui-select.js` | 30+ | Позиціонування dropdown-панелі |
| `js/common/ui-table-controls.js` | 7 | Позиціонування фільтрів |
| `js/banned-words/banned-words-product-modal.js` | 8 | Позиціонування tooltip |
| `js/generators/generator-translate/gtr-reset.js` | 7 | Зміна кольору кнопки reload |
| `js/generators/generator-table/gt-row-manager.js` | 5 | Зміна кольору та анімації |
| `js/mapper/mapper-import-wizard.js` | 7 | Зміна display та width progress |
| `js/common/editor/editor-mode.js` | 4 | Перемикання display editor/code |

### Типові порушення

**Перемикання видимості (35+ місць):**
```javascript
// ❌ Так зараз:
element.style.display = 'none';
element.style.display = 'block';

// ✅ Як має бути:
element.classList.add('u-hidden');
element.classList.remove('u-hidden');
```

**Зміна кольорів (15+ місць):**
```javascript
// ❌ Так зараз:
reloadBtn.style.color = 'var(--color-primary)';
reloadBtn.style.color = 'var(--text-disabled)';

// ✅ Як має бути:
reloadBtn.classList.add('is-active');
reloadBtn.classList.add('is-disabled');
```

**Позиціонування (30+ місць) — прийнятно:**
Tooltip та dropdown **потребують** JavaScript-позиціонування, бо їхня позиція залежить від місця кліку на екрані. Це нормально для:
- `ui-select.js` — позиціонування панелі select
- `ui-tooltip.js` — позиціонування підказки біля курсора
- `table-filters.js` — позиціонування фільтрів
- `chip-tooltip.js` — позиціонування tooltip чіпів

---

## 9. СЕРЕДНЬО: Відсутні CSS-змінні в root.css

Значення, які часто зустрічаються, але для них немає змінних:

| Значення | Де використовується | Запропонована змінна |
|----------|---------------------|---------------------|
| `4px` radius | 25+ компонентів | `--radius-xs: 4px` |
| `6px` radius | avatar (10+ місць) | `--radius-avatar-sm: 6px` |
| `20px` radius | кнопки (5+ місць) | `--radius-xl: 20px` |
| `8px` spacing | 50+ місць | `--space-xs: 8px` |
| `4px` spacing | 20+ місць | `--space-2xs: 4px` |

---

## 10. СЕРЕДНЬО: Конфлікт висоти полів вводу

**Проблема:** `input.css` визначає `.input-main` з `height: 32px`, але `form-group.css` визначає поля всередині `.form-group` з `min-height: 40px`.

Якщо `.input-main` використовується всередині `.form-group` — вона стає 40px. Якщо поза ним — 32px. Це може виглядати непослідовно.

**Рішення:** Стандартизувати висоту полів до одного значення.

---

## 11. СЕРЕДНЬО: `--color-main` = `--color-secondary`

В `root.css` обидві змінні мають **однакове значення** `rgb(9, 63, 69)`.

Це створює плутанину: коли використовувати `--color-main`, а коли `--color-secondary`?

**Рішення:** Або зробити їх різними, або видалити `--color-secondary` і використовувати тільки `--color-main`.

---

## Пріоритети виправлення

### Зробити першим (КРИТИЧНО — впливає на роботу)

1. **Замінити старі змінні** в `drop-zone.css` та `custom-select.css` — без цього стилі можуть не працювати
2. **Видалити** файл-привид `layout-main.css`

### Зробити другим (ВИСОКО — впливає на консистентність)

3. **Додати відсутні змінні** в root.css (`--radius-xs`, `--space-xs`)
4. **Замінити inline-стилі** `style="display: none"` на `class="u-hidden"` у шаблонах
5. **Замінити JS-стилі** `element.style.display` на `classList.toggle('u-hidden')` в коді
6. **Видалити дублікати:** `.button-group`, `.auth-avatar`, `.modal-content`

### Зробити третім (СЕРЕДНЬО — покращення якості)

7. **Замінити захардкоджені кольори** на CSS-змінні
8. **Замінити захардкоджені тіні** на `--shadow-*`
9. **Замінити захардкоджені radius** на `--radius-*`
10. **Видалити Legacy-таблиці** з pseudo-table.css
11. **Вирішити** конфлікт --color-main / --color-secondary
