# Принципи та рекомендації дизайн-системи pinguin-v5

> **Проєкт:** pinguin-v5
> **Дата:** 2026-02-25
> **Тип:** Принципи, конвенції, рекомендації
> **Для кого:** Розробники та дизайнери команди

---

## Частина 1: Фундаментальні принципи

### Принцип 1 — Один файл = Один компонент

Кожен CSS-файл відповідає рівно за один компонент або одну функціональну область.

```
✅ button-base.css       → базові стилі <button>
✅ button-primary.css    → стилі .btn-primary
✅ modal.css             → базова структура модалів
✅ modal-sizes.css       → варіанти розмірів модалів

❌ styles.css            → "все в одному"
❌ page-mapper.css       → стилі прив'язані до сторінки
```

**Правило:** Якщо компонент має більше 3 варіацій — розбивайте на підфайли.
**Правило:** Жоден файл не повинен перевищувати 150 рядків.

---

### Принцип 2 — Каскадний порядок імпорту

Файли імпортуються в `main.css` у суворому порядку від загального до конкретного:

```
┌─────────────────────────────────────┐
│  1. ROOT VARIABLES (root.css)       │  ← Токени, змінні
├─────────────────────────────────────┤
│  2. FOUNDATION                      │  ← Reset, Typography, Scrollbar
├─────────────────────────────────────┤
│  3. LAYOUT                          │  ← Base, Nav, Aside, Header, Body, Footer
├─────────────────────────────────────┤
│  4. COMPONENTS                      │  ← Buttons, Forms, Overlays, Feedback...
├─────────────────────────────────────┤
│  5. UTILITIES                       │  ← Colors, Helpers, Animations, Grid
└─────────────────────────────────────┘
```

**Правило:** Ніколи не порушуйте цей порядок.
**Правило:** Utilities завжди останні — їх `!important` має перекривати все.

---

### Принцип 3 — Design Tokens як єдине джерело правди

Всі значення кольорів, відступів, радіусів, тіней визначаються ТІЛЬКИ в `root.css`.
Компоненти ЗАВЖДИ використовують змінні, ніколи — хардкодовані значення.

```css
/* ✅ ПРАВИЛЬНО */
.card {
    background: var(--color-surface);
    border: 1px solid var(--color-outline);
    border-radius: var(--radius-m);
    padding: var(--space-m);
    box-shadow: var(--shadow-1);
}

/* ❌ НЕПРАВИЛЬНО */
.card {
    background: #fafafa;
    border: 1px solid #d4d4d4;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0px 1px 3px rgba(0,0,0,0.15);
}
```

**Правило:** `grep -r "#[0-9a-fA-F]" css/components/` повинен повертати 0 результатів.
**Виняток:** Кольори всередині коментарів.

---

### Принцип 4 — Dark Mode через інверсію токенів

Темна тема працює через перевизначення CSS-змінних в `[data-theme="dark"]`.
Компоненти НЕ ПОВИННІ мати окремих dark-стилів.

```css
/* ✅ Правильно — компонент автоматично працює в обох темах */
.card {
    background: var(--color-surface);
    color: var(--color-on-surface);
}

/* ❌ Неправильно — компонент має dark-override */
.card {
    background: white;
}
[data-theme="dark"] .card {
    background: #121212;
}
```

**Правило:** Якщо ви додаєте `[data-theme="dark"]` поза `root.css` — ви робите щось не так.

---

### Принцип 5 — Перевикористання без прив'язки до сторінки

Жоден CSS-файл не повинен бути прив'язаний до конкретної HTML-сторінки.
Компоненти мають працювати в будь-якому контексті.

```css
/* ✅ Універсальний компонент */
.pseudo-table-container { }
.pseudo-table-header { }
.pseudo-table-row { }

/* ❌ Сторінко-специфічний стиль */
.mapper-page .table { }
.brands-list .row { }
```

**Правило:** Якщо стиль потрібен тільки на одній сторінці — це ознака що компонент потребує нового модифікатора.

---

### Принцип 6 — Документація в кожному файлі

Кожен CSS-файл починається з JSDoc-блоку:

```css
/**
 * COMPONENT: Button Primary
 *
 * ПРИЗНАЧЕННЯ:
 * Стилі для основної кнопки дії (CTA).
 *
 * ВИКОРИСТАННЯ:
 * <button class="btn-primary">Зберегти</button>
 *
 * HTML ПРИКЛАД:
 * <button class="btn-primary">
 *   <span class="material-symbols-outlined">save</span>
 *   Зберегти
 * </button>
 *
 * ЗАЛЕЖНОСТІ:
 * - button-base.css (базові стилі)
 * - root.css (CSS змінні)
 *
 * ЗАСТОСУВАННЯ:
 * - Модальні вікна (кнопка підтвердження)
 * - Форми (кнопка відправки)
 * - Toolbar (основна дія)
 */
```

**Обов'язкові поля:**
- `COMPONENT/FOUNDATION/LAYOUT/UTILITY` — тип файлу
- `ПРИЗНАЧЕННЯ` — що робить
- `ВИКОРИСТАННЯ` — як використовувати
- `HTML ПРИКЛАД` — мінімальний приклад
- `ЗАЛЕЖНОСТІ` — від чого залежить
- `ЗАСТОСУВАННЯ` — де використовується в проєкті

---

## Частина 2: Конвенція іменування

### 2.1 CSS-класи

| Патерн | Категорія | Приклади |
|--------|-----------|----------|
| `.btn-{variant}` | Кнопки | `.btn-primary`, `.btn-ghost`, `.btn-icon` |
| `.input-{type}` | Поля вводу | `.input-main`, `.input-ghost` |
| `.modal-{part}` | Модальні вікна | `.modal-header`, `.modal-body`, `.modal-footer` |
| `.{role}-{size}` | Типографіка | `.headline-l`, `.body-m`, `.label-s` |
| `.c-{color}` | Кольорові утиліти | `.c-main`, `.c-red`, `.c-green` |
| `.u-{action}` | Допоміжні утиліти | `.u-hidden`, `.u-flex-center` |
| `.col-{1-12}` | Grid-колонки | `.col-6`, `.col-4`, `.col-12` |
| `.separator-{dir}` | Розділювачі | `.separator-h`, `.separator-v` |
| `.panel-{part}` | Бокові панелі | `.panel-item`, `.panel-title` |
| `.pseudo-table-{part}` | Таблиці | `.pseudo-table-header`, `.pseudo-table-row` |
| `.{component}` | Прості компоненти | `.badge`, `.chip`, `.tag`, `.dot`, `.fab` |

### 2.2 CSS-змінні

| Патерн | Категорія | Приклади |
|--------|-----------|----------|
| `--color-{name}` | Основні кольори | `--color-main`, `--color-secondary` |
| `--color-on-{name}` | Текст на кольорі | `--color-on-main`, `--color-on-error` |
| `--color-{name}-c` | Контейнерний фон | `--color-main-c`, `--color-error-c` |
| `--color-on-{name}-c` | Текст на контейнері | `--color-on-main-c` |
| `--color-{name}-t-{n}` | Прозорий рівень | `--color-main-t-1`, `--color-main-t-2` |
| `--color-surface` | Поверхня | `--color-surface`, `--color-surface-c` |
| `--color-outline` | Межі | `--color-outline`, `--color-outline-v` |
| `--text-{role}` | Текстові кольори | `--text-primary`, `--text-secondary` |
| `--radius-{size}` | Радіуси | `--radius-s`, `--radius-m`, `--radius-l` |
| `--space-{size}` | Відступи | `--space-s`, `--space-m`, `--space-l` |
| `--shadow-{level}` | Тіні | `--shadow-1`, `--shadow-2`, `--shadow-3` |
| `--z-{layer}` | Z-index шари | `--z-modal`, `--z-dropdown`, `--z-toast` |
| `--font-{role}` | Шрифти | `--font-body`, `--font-display`, `--font-mono` |
| `--transition-{type}` | Переходи | `--transition-speed`, `--transition-ease` |
| `--panel-width-{state}` | Ширина панелей | `--panel-width-expanded`, `--panel-width-collapsed` |

### 2.3 Суфікси розмірів

Проєкт використовує 3-рівневу шкалу для всього:

| Суфікс | Значення | Приклади |
|--------|----------|----------|
| `-s` | Small / Малий | `--radius-s: 8px`, `.body-s: 12px` |
| `-m` | Medium / Середній | `--radius-m: 12px`, `.body-m: 14px` |
| `-l` | Large / Великий | `--radius-l: 16px`, `.body-l: 16px` |

Для кольорових контейнерів:
| Суфікс | Значення |
|--------|----------|
| `-c-low` | Світлий контейнер |
| `-c` | Стандартний контейнер |
| `-c-high` | Насичений контейнер |

### 2.4 Стани та модифікатори

```css
/* Стани — прості класи */
.active { }
.disabled { }
.ghost { }
.expanded { }

/* Charm-модифікатори — HTML-атрибути */
[compact] { }
[striped] { }
[pagination] { }

/* Псевдо-стани */
:hover { }
:focus-visible { }
:disabled { }
:checked { }
```

---

## Частина 3: Система кольорів

### 3.1 Архітектура кольорів

```
┌─────────────────────────────────────────────────┐
│                 BRAND COLORS                     │
│                                                  │
│  Main         rgb(9, 63, 69)      ← Primary     │
│  Secondary    rgb(39, 93, 99)     ← Supporting   │
│  Tertiary     rgb(232, 110, 80)   ← Accent       │
├─────────────────────────────────────────────────┤
│                 SEMANTIC COLORS                   │
│                                                  │
│  Error        rgb(239, 68, 68)    ← Помилки      │
│  Warning      rgb(245, 158, 11)   ← Попередження │
│  Success      rgb(16, 185, 129)   ← Успіх        │
│  Info         rgb(59, 130, 246)   ← Інформація   │
├─────────────────────────────────────────────────┤
│                 SURFACE COLORS                    │
│                                                  │
│  Surface      #fafafa             ← Фон          │
│  On-surface   #171717             ← Текст        │
│  Outline      #d4d4d4             ← Межі         │
├─────────────────────────────────────────────────┤
│                 AFFINITY COLORS                   │
│                                                  │
│  Main         #86efac             ← Основна роль  │
│  Vector       #06b6d4             ← Вектор       │
│  Pixel        #d946ef             ← Піксель      │
│  Layout       #fb923c             ← Лейаут       │
│  Canvas       #60a5fa             ← Канвас       │
└─────────────────────────────────────────────────┘
```

### 3.2 Правило Color + Container

Для кожного семантичного кольору існує пара:

```
--color-{name}        → насичений колір (іконки, текст, рамки)
--color-{name}-c      → прозорий фон контейнера (8-15% opacity)
--color-on-{name}     → текст НА насиченому фоні (зазвичай білий)
--color-on-{name}-c   → текст НА прозорому фоні (зазвичай сам колір)
```

**Приклад використання:**

```html
<!-- Насичений badge -->
<span style="background: var(--color-error); color: var(--color-on-error);">
  Помилка
</span>

<!-- М'який container badge (рекомендовано) -->
<span style="background: var(--color-error-c); color: var(--color-on-error-c);">
  Помилка
</span>
```

---

## Частина 4: Типографіка

### 4.1 Шрифтова система

```
┌──────────────────────────────────────────────────┐
│  Geologica (Variable)                             │
│  ├── body-l / body-m / body-s                    │
│  ├── title-l / title-m / title-s                 │
│  └── label-l / label-m / label-s                 │
├──────────────────────────────────────────────────┤
│  NyghtSerif (Static)                              │
│  ├── display-l / display-m / display-s           │
│  └── headline-l / headline-m / headline-s        │
├──────────────────────────────────────────────────┤
│  Roboto Mono (Variable)                           │
│  └── Код, моноширинний текст, технічні мітки     │
├──────────────────────────────────────────────────┤
│  DM Sans (Variable) — резервний sans-serif       │
│  Playfair Display (Variable) — резервний serif   │
└──────────────────────────────────────────────────┘
```

### 4.2 Матриця типографіки (15 класів)

| Клас | Шрифт | Розмір | Вага | Line-height | Контекст |
|------|-------|--------|------|-------------|----------|
| `.display-l` | NyghtSerif | 32px | 400 | 1.2 | Hero-блоки, landing |
| `.display-m` | NyghtSerif | 28px | 400 | 1.2 | Великі заголовки |
| `.display-s` | NyghtSerif | 24px | 400 | 1.3 | Підзаголовки hero |
| `.headline-l` / `h1` | NyghtSerif | 32px | 700 | 1.2 | Заголовки сторінок |
| `.headline-m` / `h2` | NyghtSerif | 24px | 600 | 1.3 | Заголовки секцій |
| `.headline-s` / `h3` | NyghtSerif | 20px | 600 | 1.4 | Заголовки блоків |
| `.title-l` / `h4` | Geologica | 18px | 600 | 1.4 | Підзаголовки |
| `.title-m` | Geologica | 16px | 500 | 1.5 | Назви карток |
| `.title-s` | Geologica | 14px | 500 | 1.5 | Назви елементів |
| `.body-l` | Geologica | 16px | 400 | 1.5 | Основний текст (великий) |
| `.body-m` | Geologica | 14px | 400 | 1.5 | Основний текст (стандарт) |
| `.body-s` | Geologica | 12px | 400 | 1.4 | Компактний текст |
| `.label-l` | Geologica | 13px | 500 | 1.4 | Мітки форм |
| `.label-m` | Geologica | 12px | 500 | 1.4 | Табличні заголовки |
| `.label-s` | Geologica | 11px | 500 | 1.3 | Мета-текст, підписи |

### 4.3 Коли що використовувати

```
Сторінка документації:
  h1 (headline-l)    → "Style Guide"
  h2 (headline-m)    → "Design Tokens"
  h3 (headline-s)    → "Primary Colors"
  body-m             → Опис секції
  label-s            → Мітка файлу, технічна інформація

Модальне вікно:
  title-l            → Заголовок модалу
  body-m             → Основний текст
  label-l            → Мітки полів форми
  label-s            → Підказки

Таблиця:
  label-m            → Заголовки колонок
  body-s             → Дані комірок
  label-s            → Мета-інформація
```

---

## Частина 5: Компонентна система

### 5.1 Анатомія компонента

Кожен компонент складається з:

```
[Base]          → button-base.css       (reset, layout, спільні стилі)
[Variants]      → button-primary.css    (кольори, специфічні стилі)
                → button-secondary.css
                → button-ghost.css
[Modifiers]     → button-variants.css   (розміри, стани)
[Groups]        → button-groups.css     (композиції)
```

### 5.2 Як додати новий компонент

**Крок 1:** Створіть файл у відповідній категорії:
```
css/components/{category}/{component-name}.css
```

**Крок 2:** Додайте JSDoc-заголовок (див. Принцип 6)

**Крок 3:** Використовуйте тільки CSS-змінні з `root.css`:
```css
.new-component {
    background: var(--color-surface);
    border: 1px solid var(--color-outline);
    border-radius: var(--radius-m);
    padding: var(--space-m);
    transition: var(--transition-standard);
}
```

**Крок 4:** Додайте `@import` в `main.css` у відповідну секцію

**Крок 5:** Протестуйте в обох темах (light / dark)

### 5.3 Категорії компонентів

| Категорія | Директорія | Компоненти |
|-----------|-----------|------------|
| **Buttons** | `components/buttons/` | base, primary, secondary, outline, ghost, icon, groups, variants, fab |
| **Forms** | `components/forms/` | input, input-box, form-group, custom-select, checkbox, switch, toggle, drop-zone, morph-search |
| **Navigation** | `components/navigation/` | panel-item, panel-title, pagination, tabs, tab-header, toolbar |
| **Overlays** | `components/overlays/` | modal, modal-sizes, modal-fullscreen, modal-avatar, modal-content, dropdown, toast |
| **Feedback** | `components/feedback/` | dot, badge, chip, tag, counter, text-stats, states, loading, tooltip, batch-actions |
| **Content** | `components/content/` | preview, tree, section-misc, image-tool, content-card |
| **Tables** | `components/tables/` | pseudo-table, table-states |
| **Other** | `components/` | avatar, avatar-states, rich-editor, statistics, permissions-matrix, mapper-bindings |

---

## Частина 6: Layout-система

### 6.1 Структура сторінки

```
┌─────────────────────────────────────────────────────────┐
│ body (display: flex, height: 100dvh, overflow: hidden)  │
│                                                          │
│  ┌──────┐  ┌──────────────────────────────────┐  ┌────┐ │
│  │ NAV  │  │        CONTENT-MAIN              │  │ASIDE│ │
│  │      │  │                                   │  │    │ │
│  │ 68px │  │  ┌──────────────────────────────┐ │  │320px│ │
│  │fixed │  │  │  SECTION (100dvh)            │ │  │    │ │
│  │      │  │  │  scroll-snap-align: start    │ │  │    │ │
│  │      │  │  └──────────────────────────────┘ │  │    │ │
│  │      │  │  ┌──────────────────────────────┐ │  │    │ │
│  │      │  │  │  SECTION (100dvh)            │ │  │    │ │
│  │      │  │  └──────────────────────────────┘ │  │    │ │
│  └──────┘  └──────────────────────────────────┘  └────┘ │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Grid-система

12-колонок CSS Grid для форм, модалів, карток:

```html
<!-- 50% + 50% -->
<div class="grid">
  <div class="group column col-6">
    <label class="label-l">Назва</label>
    <input class="input-main">
  </div>
  <div class="group column col-6">
    <label class="label-l">Тип</label>
    <select class="input-main">...</select>
  </div>
</div>

<!-- 33% + 33% + 33% -->
<div class="grid">
  <div class="col-4">...</div>
  <div class="col-4">...</div>
  <div class="col-4">...</div>
</div>

<!-- 100% -->
<div class="grid">
  <div class="col-12">...</div>
</div>
```

**Responsive:** Mobile (< 768px) → все в 1 колонку автоматично.

---

## Частина 7: Z-Index стратегія

### 7.1 Шари

```
z-toast:    10000  ─┐
z-tooltip:  10000  ─┤  Верхній рівень (поверх всього)
z-dropdown: 10000  ─┘
z-modal:    1000   ─── Модальні вікна
z-tabs:     300    ─── Табуляція
z-panel:    200    ─── Бокові панелі
z-header:   100    ─── Заголовки
z-fab:      20     ─── Плаваючі кнопки
z-sticky:   10     ─── Sticky елементи
z-content:  1      ─── Основний контент
```

### 7.2 Правила

```css
/* ✅ Використовуйте змінні */
.modal { z-index: var(--z-modal); }
.tooltip { z-index: var(--z-tooltip); }

/* ❌ Ніколи не хардкодьте */
.modal { z-index: 9999; }
.tooltip { z-index: 99999; }
```

---

## Частина 8: Transition та Animation

### 8.1 Стандартний перехід

```css
/* Базовий перехід для будь-якого компонента */
.component {
    transition: var(--transition-standard);
    /* розгортається в: 0.2s cubic-bezier(0.2, 0, 0, 1) */
}

/* Або конкретна властивість */
.component {
    transition: background-color var(--transition-standard);
}
```

### 8.2 Easing-функції

| Назва | Значення | Контекст |
|-------|----------|----------|
| Standard | `cubic-bezier(0.2, 0, 0, 1)` | Більшість переходів |
| Linear | `linear` | Нескінченні анімації (spinning) |
| Ease | `ease` | Кнопки (fallback) |

### 8.3 Доступні анімації

```css
/* Обертання (для іконок завантаження) */
.spinning { animation: spin 1s linear infinite; }

/* Діагональні смуги (для progress bar) */
animation: stripeMove 1s linear infinite;
```

---

## Частина 9: Accessibility рекомендації

### 9.1 Focus Management

```css
/* Рекомендований підхід */
:focus-visible {
    outline: 2px solid var(--color-main);
    outline-offset: 2px;
}

/* Прибирати outline тільки для mouse */
:focus:not(:focus-visible) {
    outline: none;
}
```

### 9.2 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

### 9.3 Контрастність

Мінімальні вимоги WCAG 2.2 AA:
- Звичайний текст: контраст 4.5:1
- Великий текст (18px+): контраст 3:1
- UI-компоненти: контраст 3:1

---

## Частина 10: Чеклист для Code Review

### CSS Pull Request чеклист

- [ ] Файл має JSDoc-заголовок
- [ ] Всі кольори через `var(--color-*)` — жодного хардкоду
- [ ] Всі відступи через `var(--space-*)` або `var(--radius-*)`
- [ ] Всі тіні через `var(--shadow-*)`
- [ ] Всі z-index через `var(--z-*)`
- [ ] Компонент працює в light та dark темі
- [ ] Немає сторінко-специфічних селекторів
- [ ] Файл не перевищує 150 рядків
- [ ] Файл додано в `main.css` у правильну секцію
- [ ] Класи відповідають naming convention
- [ ] Є `:focus-visible` для інтерактивних елементів
- [ ] Transitions використовують `var(--transition-standard)`

---

## Частина 11: Антипатерни (чого уникати)

### 11.1 Заборонені практики

```css
/* ❌ Inline стилі */
<div style="color: red; padding: 10px">

/* ❌ !important (крім utilities) */
.card { display: flex !important; }

/* ❌ ID-селектори для стилів */
#main-card { background: white; }

/* ❌ Глибока вкладеність (більше 3 рівнів) */
.page .section .card .header .title { }

/* ❌ Магічні числа */
.modal { top: 47px; left: 238px; }

/* ❌ Хардкодовані кольори в компонентах */
.btn { background: #093f45; }

/* ❌ Сторінко-специфічні стилі */
.mapper-page .table-row { }

/* ❌ Дублювання стилів між файлами */
/* Якщо стиль повторюється 3+ рази — створіть утиліту */
```

### 11.2 Рекомендовані альтернативи

```css
/* ✅ CSS-змінні замість хардкоду */
.card { background: var(--color-surface); }

/* ✅ Утиліти замість inline */
<div class="u-flex-col-8">

/* ✅ Класи замість ID */
.main-card { }

/* ✅ Плоска структура (BEM-like) */
.card { }
.card-header { }
.card-title { }

/* ✅ Семантичні z-index */
.modal { z-index: var(--z-modal); }
```

---

## Частина 12: Міграційний план

### Фаза 1: Quick Wins (тиждень)

1. Аудит хардкодованих кольорів у компонентах
2. Додати `@media (prefers-reduced-motion: reduce)`
3. Додати `:focus-visible` до button, input, select, a
4. Розширити spacing scale: `--space-xs: 8px`, `--space-xl: 32px`, `--space-2xl: 48px`

### Фаза 2: Структурні покращення (місяць)

1. Впровадити CSS `@layer` для каскаду
2. Додати Container Queries для карток і таблиць
3. Створити повну HTML-документацію (design-system-docs.html)
4. Формалізувати naming convention в лінтер-правилах

### Фаза 3: Еволюція (квартал)

1. Дослідити CSS Nesting для зменшення коду
2. Експортувати токени в JSON для крос-платформенності
3. Впровадити Scroll-Driven Animations
4. Міграція на OKLCH колірний простір
5. Додати CSS Subgrid для складних лейаутів
