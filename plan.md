# Plan: Material Design 3 Typography Refactoring

## Контекст

**Поточний стан:** 10 типографічних класів (h1-h4, .body-l, .body-m, .caption, .small, .tiny, .section-upper) з хардкодженими px-значеннями. 189 хардкоджених `font-size` і 86 `font-weight` розкидані по 55 CSS-файлах.

**Ціль:** Перейти на структуровану токен-систему типографіки за принципами M3 (Material Design 3) — 5 ролей × 3 розміри, все через CSS-змінні.

---

## M3 Type Scale → Адаптація для проєкту

M3 визначає 15 токенів: **Display / Headline / Title / Body / Label** × **Large / Medium / Small**.

Адаптований маппінг (зберігаємо шрифти проєкту — Geologica + NyghtSerif):

| M3 Токен | Розмір | Вага | Line-Height | Шрифт | Поточний аналог |
|---|---|---|---|---|---|
| **Display Large** | 32px | 400 | 1.2 | NyghtSerif | `.section-upper` |
| **Display Medium** | 28px | 400 | 1.2 | NyghtSerif | — (новий) |
| **Display Small** | 24px | 400 | 1.3 | NyghtSerif | — (новий) |
| **Headline Large** | 32px | 700 | 1.2 | NyghtSerif | `h1` |
| **Headline Medium** | 24px | 600 | 1.3 | NyghtSerif | `h2` |
| **Headline Small** | 20px | 600 | 1.4 | NyghtSerif | `h3` |
| **Title Large** | 18px | 600 | 1.4 | Geologica | `h4` |
| **Title Medium** | 16px | 500 | 1.5 | Geologica | `.body-l` |
| **Title Small** | 14px | 500 | 1.5 | Geologica | — (новий) |
| **Body Large** | 16px | 400 | 1.5 | Geologica | — (новий) |
| **Body Medium** | 14px | 400 | 1.5 | Geologica | `.body-m` |
| **Body Small** | 12px | 400 | 1.4 | Geologica | `.small` |
| **Label Large** | 13px | 500 | 1.4 | Geologica | `.caption` |
| **Label Medium** | 12px | 500 | 1.4 | Geologica | — (новий) |
| **Label Small** | 11px | 500 | 1.3 | Geologica | `.tiny` |

---

## Кроки реалізації

### Крок 1: CSS-змінні типографіки в `root.css`

Додати секцію `/* --- ТИПОГРАФІКА --- */` з усіма токенами:

```css
:root {
    /* --- ШРИФТИ --- */
    --font-body: 'Geologica', sans-serif;
    --font-display: 'NyghtSerif', serif;
    --font-mono: 'Roboto Mono', monospace;

    /* --- ТИПОГРАФІКА (M3 Type Scale) --- */

    /* Display */
    --typ-display-lg: 600 32px/1.2 var(--font-display);
    --typ-display-md: 400 28px/1.2 var(--font-display);
    --typ-display-sm: 400 24px/1.3 var(--font-display);

    /* Headline */
    --typ-headline-lg: 700 32px/1.2 var(--font-display);
    --typ-headline-md: 600 24px/1.3 var(--font-display);
    --typ-headline-sm: 600 20px/1.4 var(--font-display);

    /* Title */
    --typ-title-lg: 600 18px/1.4 var(--font-body);
    --typ-title-md: 500 16px/1.5 var(--font-body);
    --typ-title-sm: 500 14px/1.5 var(--font-body);

    /* Body */
    --typ-body-lg: 400 16px/1.5 var(--font-body);
    --typ-body-md: 400 14px/1.5 var(--font-body);
    --typ-body-sm: 400 12px/1.4 var(--font-body);

    /* Label */
    --typ-label-lg: 500 13px/1.4 var(--font-body);
    --typ-label-md: 500 12px/1.4 var(--font-body);
    --typ-label-sm: 500 11px/1.3 var(--font-body);
}
```

**Важливо:** shorthand `font` не підтримує CSS-змінні для `font-family` в деяких браузерах. Тому кожен токен буде розбитий на окремі змінні:

```css
:root {
    /* Display Large */
    --typ-display-lg-font: var(--font-display);
    --typ-display-lg-size: 32px;
    --typ-display-lg-weight: 600;
    --typ-display-lg-line-height: 1.2;
    --typ-display-lg-tracking: 0.04em;

    /* ... і так для кожного з 15 токенів */
}
```

### Крок 2: Оновити `typography.css` — класи через змінні

Переписати всі класи щоб використовували нові змінні:

```css
/* Headings → Headline токени */
h1, .h1 { font: var(--typ-headline-lg); ... }  /* було: hardcoded 32px/700 */
h2, .h2 { font: var(--typ-headline-md); ... }  /* було: hardcoded 24px/600 */
h3, .h3 { font: var(--typ-headline-sm); ... }  /* було: hardcoded 20px/600 */
h4, .h4 { font: var(--typ-title-lg); ... }     /* було: hardcoded 18px/600 */

/* Body → Body/Title токени */
.body-l { ... var(--typ-title-md) }   /* 16px/500 */
.body-m { ... var(--typ-body-md) }    /* 14px/400 */

/* Helpers → Label/Body-small токени */
.caption { ... var(--typ-label-lg) }  /* 13px/500 */
.small   { ... var(--typ-body-sm) }   /* 12px/400 */
.tiny    { ... var(--typ-label-sm) }  /* 11px/500 (було 400, тепер 500 за M3) */

/* Display */
.section-upper { ... var(--typ-display-lg); text-transform: uppercase; }
```

Додати **нові** utility-класи для повного покриття M3:

```css
.display-lg { ... }  .display-md { ... }  .display-sm { ... }
.headline-lg { ... } .headline-md { ... } .headline-sm { ... }
.title-lg { ... }    .title-md { ... }    .title-sm { ... }
.body-lg { ... }     .body-md { ... }     .body-sm { ... }
.label-lg { ... }    .label-md { ... }    .label-sm { ... }
```

### Крок 3: Заміна хардкоджених значень в компонентах

Пріоритет по кількості хардкоджених значень:

**Група A (15+ замін кожен):**
1. `css/mobile/mobile-instruments.css` — мобільні стилі з `!important`
2. `css/components/overlays/modal-content.css` — модальні вікна
3. `css/components/permissions-matrix.css` — матриця дозволів

**Група B (8-14 замін кожен):**
4. `css/components/feedback/tooltip.css`
5. `css/components/overlays/dropdown.css`
6. `css/components/tables/pseudo-table.css`
7. `css/components/navigation/panel-item.css`
8. `css/components/forms/input.css`
9. `css/components/forms/custom-select.css`

**Група C (3-7 замін кожен):**
10. `css/components/overlays/toast.css`
11. `css/components/feedback/chip.css`
12. `css/components/buttons/button-base.css`
13. `css/components/content/glossary-article.css`
14. `css/components/rich-editor.css`
15. `css/components/statistics.css`
16. `css/layout/layout-section.css`
17. `css/layout/layout-header.css`
18. `css/layout/layout-panel-left.css`
19. ...та ще ~35 файлів

**Принцип заміни:**
```css
/* БУЛО: */
.dropdown-item { font-size: 14px; font-weight: 400; }
.dropdown-header { font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }

/* СТАЛО: */
.dropdown-item {
    font-size: var(--typ-body-md-size);
    font-weight: var(--typ-body-md-weight);
}
.dropdown-header {
    font-size: var(--typ-label-md-size);
    font-weight: var(--typ-title-lg-weight);
    letter-spacing: var(--typ-display-lg-tracking);
}
```

### Крок 4: Додати `letter-spacing` (tracking) змінні

```css
:root {
    --tracking-tight: -0.02em;   /* Display, великий текст */
    --tracking-normal: 0;        /* Body текст */
    --tracking-wide: 0.04em;     /* Uppercase, labels */
    --tracking-wider: 0.5px;     /* Uppercase headers */
}
```

### Крок 5: Видалити дублювання `font-family`

Зараз `font-family: 'NyghtSerif', serif` повторюється 10+ разів в компонентах. Після рефакторингу — тільки через `var(--font-display)` або як частина typography-класу.

Те саме для `font-family: 'Geologica', sans-serif` (3 хардкоджені випадки) і `monospace` (4 випадки).

### Крок 6: Тестування і валідація

- Візуально перевірити всі сторінки (index, products, tasks, price, glossary, banned-words, brands, keywords, mapper)
- Перевірити dark mode
- Перевірити мобільну версію
- Перевірити ui-showcase.html як reference

---

## Що НЕ змінюємо

- **Icon sizes** (48px, 64px, 96px для Material Symbols) — це не типографіка
- **Font-face declarations** — залишаємо як є
- **Кольори тексту** — вже на змінних (`--text-primary`, `--text-secondary`)
- **DM Sans / Playfair Display** — спеціальні шрифти для конкретних компонентів, не частина type scale

---

## Порядок виконання

1. `root.css` — додати змінні типографіки
2. `typography.css` — переписати класи + додати нові M3 utility-класи
3. Група A компонентів (mobile, modal, permissions)
4. Група B компонентів (tooltip, dropdown, table, panel, input, select)
5. Група C компонентів (toast, chip, button, glossary, rich-editor, layout...)
6. Перевірка
