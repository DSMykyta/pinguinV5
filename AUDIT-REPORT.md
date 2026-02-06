# Аудит дизайн-системи Pinguin V5

Повний аудит CSS, JS та HTML на відповідність LEGO-системі.
Дата: 2026-02-06
**Версія 2 — з точними шляхами до файлів та рядків.**

---

## Короткий підсумок

| Категорія проблеми | Кількість | Серйозність |
|--------------------|-----------|-------------|
| Старі змінні (не з root.css) | 72 місця | КРИТИЧНО |
| Захардкоджені кольори (не через змінні) | 82 місця | ВИСОКО |
| Захардкоджені border-radius | 133 місця | ВИСОКО |
| Захардкоджені box-shadow (не --shadow-*) | 18 місць | ВИСОКО |
| Дублікати компонентів (CSS-класи) | 55+ пар | ВИСОКО |
| Inline-стилі в HTML | 42 місця | ВИСОКО |
| Стилі в JS (.style.xxx) | 159 місць | ВИСОКО |
| Мертвий CSS (не підключений) | 1 файл | КРИТИЧНО |
| Legacy-код (застарілий) | 5+ класів | СЕРЕДНЬО |
| Відсутні CSS-змінні | 6+ значень | СЕРЕДНЬО |

**Загалом: 560+ місць потребують виправлення.**

---

## 1. КРИТИЧНО: Файл-привид

**Файл `css/layout/layout-main.css` НЕ підключено в `main.css`.**

Цей файл існує в проєкті, але ніде не імпортується. Він дублює стилі з `layout-app.css` (body, .content-main, .material-symbols-outlined, scrollbar, ::selection). Це "мертвий код" — він нічого не робить, але може збивати з пантелику.

**Рішення:** Видалити `css/layout/layout-main.css`.

---

## 2. КРИТИЧНО: Старі назви змінних (72 місця у 2 файлах)

### 2.1 `css/components/forms/custom-select.css` — 3 місця

| Рядок | Стара змінна | Має бути |
|-------|-------------|----------|
| 25 | `var(--primary)` | `var(--color-main)` |
| 29 | `var(--primary)` | `var(--color-main)` |
| 30 | `var(--primary)` | `var(--color-main)` |

### 2.2 `css/components/forms/drop-zone.css` — 69 місць

#### --primary (8 місць)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 54 | `var(--primary)` | `var(--color-main)` |
| 59 | `var(--primary)` | `var(--color-main)` |
| 81 | `var(--primary)` | `var(--color-main)` |
| 151 | `var(--primary)` | `var(--color-main)` |
| 342 | `var(--primary)` | `var(--color-main)` |
| 453 | `var(--color-main, var(--primary))` | Прибрати fallback |
| 454 | `var(--color-main, var(--primary))` | Прибрати fallback |
| 471 | `var(--color-main, var(--primary))` | Прибрати fallback |

#### --primary-container (1 місце)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 60 | `var(--primary-container)` | `var(--color-main-c)` |

#### --primary-rgb (1 місце)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 470 | `var(--primary-rgb)` | Немає еквіваленту — потрібно додати в root.css |

#### --on-surface / --on-surface-variant (18 місць)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 75 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 88 | `var(--on-surface)` | `var(--color-on-surface)` |
| 94 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 146 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 176 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 191 | `var(--on-surface)` | `var(--color-on-surface)` |
| 204 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 234 | `var(--on-surface)` | `var(--color-on-surface)` |
| 247 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 263 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 295 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 303 | `var(--on-surface)` | `var(--color-on-surface)` |
| 336 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 363 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 408 | `var(--on-surface)` | `var(--color-on-surface)` |
| 413 | `var(--on-surface-variant)` | `var(--color-on-surface-v)` |
| 426 | `var(--on-surface)` | `var(--color-on-surface)` |

#### --surface-container (11 місць)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 15 | `var(--surface-container-lowest)` | `var(--color-surface-c-low)` |
| 55 | `var(--surface-container-low)` | `var(--color-surface-c)` |
| 143 | `var(--surface-container-low)` | `var(--color-surface-c)` |
| 166 | `var(--surface-container-lowest)` | `var(--color-surface-c-low)` |
| 171 | `var(--surface-container)` | `var(--color-surface-c)` |
| 211 | `var(--surface-container)` | `var(--color-surface-c)` |
| 293 | `var(--surface-container)` | `var(--color-surface-c)` |
| 302 | `var(--surface-container-lowest)` | `var(--color-surface-c-low)` |
| 315 | `var(--surface-container-lowest)` | `var(--color-surface-c-low)` |
| 428 | `var(--surface-container-lowest)` | `var(--color-surface-c-low)` |
| 435 | `var(--surface-container-low)` | `var(--color-surface-c)` |

#### --outline / --outline-variant (6 місць)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 13 | `var(--outline-variant)` | `var(--color-outline-v)` |
| 269 | `var(--outline-variant)` | `var(--color-outline-v)` |
| 289 | `var(--outline-variant)` | `var(--color-outline-v)` |
| 430 | `var(--outline-variant)` | `var(--color-outline-v)` |
| 436 | `var(--outline)` | `var(--color-outline)` |
| 444 | `var(--outline)` | `var(--color-outline)` |

#### --error / --error-container (4 місця)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 125 | `var(--error)` | `var(--color-error)` |
| 126 | `var(--error-container)` | `var(--color-error-c)` |
| 130 | `var(--error)` | `var(--color-error)` |
| 195 | `var(--error)` | `var(--color-error)` |

#### --success (6 місць)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 115 | `var(--success)` | `var(--color-success)` |
| 116 | `var(--success-container, rgba(...))` | `var(--color-success-c)` |
| 120 | `var(--success)` | `var(--color-success)` |
| 181 | `var(--success, #4caf50)` | `var(--color-success)` |
| 255 | `var(--success, #4caf50)` | `var(--color-success)` |
| 328 | `var(--success, #4caf50)` | `var(--color-success)` |

#### --warning (3 місця)

| Рядок | Що написано | Має бути |
|-------|-------------|----------|
| 186 | `var(--warning, #ff9800)` | `var(--color-warning)` |
| 259 | `var(--warning, #ff9800)` | `var(--color-warning)` |
| 332 | `var(--warning, #ff9800)` | `var(--color-warning)` |

---

## 3. ВИСОКО: Захардкоджені кольори (82 місця)

### 3.1 Іменовані кольори (white, black) — 5 місць

| Файл | Рядок | Що написано | Має бути |
|------|-------|-------------|----------|
| `css/components/avatar.css` | 227 | `color: white` | `var(--color-on-main)` |
| `css/components/products.css` | 398 | `color: white` | `var(--color-on-main)` |
| `css/components/products.css` | 413 | `color: white !important` | `var(--color-on-main)` |
| `css/components/products.css` | 757 | `background: white` | `var(--color-surface)` |
| `css/components/products.css` | 885 | `color: white` | `var(--color-on-main)` |

### 3.2 Hex-кольори — 29 місць

#### products.css (Google Search Preview — можливо навмисно)

| Рядок | Колір | Призначення |
|-------|-------|-------------|
| 758 | `#dadce0` | Рамка Google-картки |
| 765 | `#1a0dab` | Колір Google-посилання |
| 777 | `#006621` | Колір Google URL |
| 783 | `#545454` | Колір Google-опису |

#### avatar.css (fallback-значення в var())

| Рядок | Код |
|-------|-----|
| 61 | `var(--color-surface-variant, #e8e8e8)` |
| 62 | `var(--text-secondary, #666)` |
| 118 | `var(--color-surface, #fff)` |
| 119 | `var(--color-outline, #ddd)` |
| 132 | `var(--color-primary, #1976d2)` |
| 137 | `var(--color-primary, #1976d2)` |
| 138 | `var(--color-primary-container, #e3f2fd)` |
| 154 | `var(--color-surface-variant, #f5f5f5)` |
| 164 | `var(--color-surface, #fff)` |
| 180 | `var(--text-secondary, #666)` |
| 187 | `var(--text-primary, #000)` |

#### toast.css (fallback-значення + невідомі MD змінні)

| Рядок | Код |
|-------|-----|
| 22 | `var(--md-sys-color-inverse-surface, #313033)` |
| 23 | `var(--md-sys-color-inverse-on-surface, #F4EFF4)` |
| 42 | `var(--md-sys-color-inverse-surface, #313033)` |
| 47 | `var(--md-sys-color-error-container, #F9DEDC)` |
| 48 | `var(--md-sys-color-on-error-container, #410E0B)` |
| 52 | `var(--md-sys-color-inverse-surface, #313033)` |

#### modal-content.css

| Рядок | Код |
|-------|-----|
| 56 | `var(--color-success, #4caf50)` |

#### drop-zone.css (fallback в var())

| Рядок | Код |
|-------|-----|
| 181 | `var(--success, #4caf50)` |
| 186 | `var(--warning, #ff9800)` |
| 255 | `var(--success, #4caf50)` |
| 259 | `var(--warning, #ff9800)` |
| 328 | `var(--success, #4caf50)` |
| 332 | `var(--warning, #ff9800)` |

#### DATA HTML файли

| Файл | Рядок | Код |
|------|-------|-----|
| `DATA/SectionInfo.html` | 97 | `style="color: #dc3545;"` |
| `DATA/SectionInfo.html` | 98 | `style="color: #ffc107;"` |

### 3.3 RGBA-кольори — 48 місць

#### content-card.css (10 місць)

| Рядок | Код |
|-------|-----|
| 33 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)` |
| 43 | `box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2)` |
| 73 | `border-top: 1px solid rgba(255, 255, 255, 0.1)` |
| 74 | `border-bottom: 1px solid rgba(255, 255, 255, 0.1)` |
| 129 | `background: rgba(255, 255, 255, 0.15)` |
| 131 | `border-color: rgba(255, 255, 255, 0.2)` |
| 136 | `background: rgba(255, 255, 255, 0.1)` |
| 138 | `border-color: rgba(255, 255, 255, 0.2)` |
| 156 | `border-top: 1px solid rgba(255, 255, 255, 0.1)` |
| 166 | `background: rgba(255, 255, 255, 0.1)` |

#### products.css (3 місця)

| Рядок | Код |
|-------|-----|
| 383 | `background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)` |
| 414 | `background: rgba(255,255,255,0.2)` |
| 418 | `background: rgba(255,255,255,0.3)` |

#### tooltip.css (3 місця)

| Рядок | Код |
|-------|-----|
| 34 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)` |
| 132 | `color: rgba(255, 255, 255, 0.6)` |
| 147 | `background: rgba(255, 255, 255, 0.15)` |
| 153 | `border: 1px solid rgba(255, 255, 255, 0.2)` |

#### rich-editor.css (3 місця)

| Рядок | Код |
|-------|-----|
| 187 | `background-color: rgba(245, 158, 11, 0.25)` |
| 192 | `background-color: rgba(59, 130, 246, 0.25)` |
| 197 | `background-color: rgba(34, 197, 94, 0.25)` |

#### statistics.css (3 місця)

| Рядок | Код |
|-------|-----|
| 50 | `border-right: 1px solid rgba(255, 255, 255, 0.1)` |
| 106 | `background-color: rgba(239, 68, 68, 0.15)` |
| 118 | `background-color: rgba(245, 158, 11, 0.15)` |

#### toolbar.css (3 місця)

| Рядок | Код |
|-------|-----|
| 87 | `background: rgba(0, 0, 0, 0.08)` |
| 91 | `background: rgba(0, 0, 0, 0.12)` |
| 151 | `background: rgba(0, 106, 99, 0.08)` |

#### drop-zone.css (5 місць)

| Рядок | Код |
|-------|-----|
| 116 | `var(--success-container, rgba(76, 175, 80, 0.1))` |
| 180 | `background: rgba(76, 175, 80, 0.08)` |
| 185 | `background: rgba(255, 152, 0, 0.08)` |
| 307 | `background: rgba(76, 175, 80, 0.05)` |
| 311 | `background: rgba(255, 152, 0, 0.05)` |
| 470 | `background: rgba(var(--primary-rgb), 0.08)` |

#### pseudo-table.css (4 місця)

| Рядок | Код |
|-------|-----|
| 83 | `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)` |
| 338 | `box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7)` |
| 339 | `box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4)` |
| 340 | `box-shadow: 0 0 0 0 rgba(239, 68, 68, 0)` |

#### loading.css (2 місця)

| Рядок | Код |
|-------|-----|
| 33 | `background-color: rgba(var(--color-surface-rgb), 0.9)` |
| 120-121 | `rgba(255, 255, 255, 0.2)` (в анімаціях) |

#### mobile-instruments.css (1 місце)

| Рядок | Код |
|-------|-----|
| 261 | `box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1) !important` |

#### Інші (по 1-2 місця)

| Файл | Рядок | Код |
|------|-------|-----|
| `button-icon.css` | 66 | `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)` |
| `button-secondary.css` | 31 | `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)` |
| `button-primary.css` | 36 | `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)` |
| `custom-select.css` | 69 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)` |
| `custom-select.css` | 88 | `box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15)` |
| `batch-actions.css` | 15 | `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)` |
| `chip.css` | 236 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)` |
| `chip.css` | 263 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)` |
| `pagination-fab.css` | 24 | `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)` |

---

## 4. ВИСОКО: Захардкоджені box-shadow (18 місць)

В `root.css` є змінні `--shadow-1`, `--shadow-2`, `--shadow-3`, але більшість компонентів їх ігнорують:

| Файл | Рядок | Що написано | Рекомендована змінна |
|------|-------|-------------|---------------------|
| `css/components/buttons/button-primary.css` | 36 | `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)` | `--shadow-1` |
| `css/components/buttons/button-secondary.css` | 31 | `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)` | `--shadow-1` |
| `css/components/buttons/button-icon.css` | 66 | `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)` | `--shadow-1` |
| `css/components/content/content-card.css` | 33 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)` | `--shadow-2` |
| `css/components/content/content-card.css` | 43 | `box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2)` | `--shadow-3` |
| `css/components/feedback/chip.css` | 236 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)` | `--shadow-2` |
| `css/components/feedback/chip.css` | 263 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)` | `--shadow-2` |
| `css/components/feedback/tooltip.css` | 34 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)` | `--shadow-2` |
| `css/components/feedback/batch-actions.css` | 15 | `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)` | `--shadow-1` |
| `css/components/forms/custom-select.css` | 69 | `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)` | `--shadow-2` |
| `css/components/forms/custom-select.css` | 88 | `box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15)` | `--shadow-2` |
| `css/components/overlays/toast.css` | 19 | `box-shadow: 0px 8px 12px 6px rgba(...)` | `--shadow-3` або нова |
| `css/components/tables/pseudo-table.css` | 83 | `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)` | `--shadow-1` |
| `css/components/tables/pseudo-table.css` | 338 | `box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7)` | Анімація — прийнятно |
| `css/components/tables/pseudo-table.css` | 339 | `box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4)` | Анімація — прийнятно |
| `css/components/tables/pseudo-table.css` | 340 | `box-shadow: 0 0 0 0 rgba(239, 68, 68, 0)` | Анімація — прийнятно |
| `css/components/navigation/pagination-fab.css` | 24 | `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)` | `--shadow-1` |
| `css/mobile/mobile-instruments.css` | 261 | `box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1) !important` | `--shadow-3` |

---

## 5. ВИСОКО: Захардкоджені border-radius (133 місця)

### 5.1 Відсутні змінні (потрібно додати в root.css)

| Значення | Скільки разів | Запропонована змінна |
|----------|---------------|---------------------|
| `4px` | 25+ | `--radius-xs: 4px` |
| `6px` | 10+ | `--radius-avatar-sm: 6px` |
| `20px` | 5+ | `--radius-xl: 20px` |
| `24px` | 3+ | `--radius-xxl: 24px` |
| `50%` | 15+ | `--radius-circle: 50%` |

### 5.2 Кнопки (buttons) — 12 місць

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/components/buttons/button-base.css` | 42 | `border-radius: 20px` |
| `css/components/buttons/button-icon.css` | 51 | `border-radius: 50%` |
| `css/components/buttons/button-groups.css` | 62 | `border-radius: 4px` |
| `css/components/buttons/button-groups.css` | 67 | `border-radius: 4px` |
| `css/components/buttons/button-groups.css` | 71 | `border-radius: 16px 4px 4px 16px` |
| `css/components/buttons/button-groups.css` | 75 | `border-radius: 4px 16px 16px 4px` |
| `css/components/buttons/button-groups.css` | 97 | `border-radius: 24px` |
| `css/components/buttons/button-variants.css` | 24 | `border-radius: 8px` |
| `css/components/buttons/button-variants.css` | 59 | `border-radius: 50%` |
| `css/components/buttons/button-variants.css` | 83 | `border-radius: 4px` |
| `css/components/buttons/fab.css` | 14 | `border-radius: 16px` |
| `css/components/buttons/fab.css` | 70 | `border-radius: 12px` |

### 5.3 Форми (forms) — 23 місця

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/components/forms/input.css` | 67 | `border-radius: 8px` |
| `css/components/forms/form-group.css` | 183 | `border-radius: 8px` |
| `css/components/forms/form-group.css` | 219 | `border-radius: 8px` |
| `css/components/forms/form-group.css` | 235 | `border-radius: 8px` |
| `css/components/forms/form-group.css` | 340 | `border-radius: 0` |
| `css/components/forms/custom-select.css` | 162 | `border-radius: 12px` |
| `css/components/forms/search.css` | 35 | `border-radius: 8px` |
| `css/components/forms/checkbox.css` | 22 | `border-radius: 4px` |
| `css/components/forms/checkbox.css` | 36 | `border-radius: 24px` |
| `css/components/forms/checkbox.css` | 42 | `border-radius: 24px` |
| `css/components/forms/badge.css` | 16 | `border-radius: 12px` |
| `css/components/forms/badge.css` | 48 | `border-radius: 12px` |
| `css/components/forms/toggle.css` | 28 | `border-radius: 12px` |
| `css/components/forms/toggle.css` | 40 | `border-radius: 50%` |
| `css/components/forms/toggle.css` | 85 | `border-radius: 20px` |
| `css/components/forms/toggle.css` | 101 | `border-radius: 20px` |
| `css/components/forms/switch.css` | 47 | `border-radius: 6px` |
| `css/components/forms/drop-zone.css` | 14 | `border-radius: 16px` |
| `css/components/forms/drop-zone.css` | 144 | `border-radius: 8px` |
| `css/components/forms/drop-zone.css` | 167 | `border-radius: 8px` |
| `css/components/forms/drop-zone.css` | 212 | `border-radius: 4px` |
| `css/components/forms/drop-zone.css` | 270 | `border-radius: 8px` |
| `css/components/forms/drop-zone.css` | 429 | `border-radius: 8px` |
| `css/components/forms/drop-zone.css` | 445 | `border-radius: 4px` |

### 5.4 Аватари (avatar) — 12 місць

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/components/avatar.css` | 19 | `border-radius: 50%` |
| `css/components/avatar.css` | 25 | `border-radius: 4px` |
| `css/components/avatar.css` | 31 | `border-radius: 6px` |
| `css/components/avatar.css` | 37 | `border-radius: 8px` |
| `css/components/avatar.css` | 43 | `border-radius: 12px` |
| `css/components/avatar.css` | 69 | `border-radius: 6px` |
| `css/components/avatar.css` | 120 | `border-radius: 8px` |
| `css/components/avatar.css` | 127 | `border-radius: 6px` |
| `css/components/avatar.css` | 145 | `border-radius: 4px` |
| `css/components/avatar.css` | 155 | `border-radius: 8px` |
| `css/components/avatar.css` | 162 | `border-radius: 8px` |
| `css/components/avatar.css` | 196 | `border-radius: 6px` |

### 5.5 Таблиці (tables) — 15 місць

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/components/tables/table-row-inputs.css` | 149 | `border-radius: 16px` |
| `css/components/tables/table-row-inputs.css` | 248 | `border-radius: 0` |
| `css/components/tables/table-row-inputs.css` | 259 | `border-radius: 8px 8px 0 0` |
| `css/components/tables/table-row-inputs.css` | 265 | `border-radius: 8px 8px 0 0` |
| `css/components/tables/table-row-inputs.css` | 272 | `border-radius: 0 0 8px 8px` |
| `css/components/tables/table-row-inputs.css` | 278 | `border-radius: 0 0 8px 8px` |
| `css/components/tables/table-row-inputs.css` | 287 | `border-radius: 8px` |
| `css/components/tables/table-row-inputs.css` | 295 | `border-radius: 8px` |
| `css/components/tables/table-row-inputs.css` | 301 | `border-radius: 8px` |
| `css/components/tables/table-row-inputs.css` | 307 | `border-radius: 8px` |
| `css/components/tables/pseudo-table.css` | 241 | `border-radius: 8px` |
| `css/components/tables/pseudo-table.css` | 250 | `border-radius: 8px` |
| `css/components/tables/pseudo-table.css` | 287 | `border-radius: 8px` |
| `css/components/tables/pseudo-table.css` | 322 | `border-radius: 4px` |
| `css/components/tables/pseudo-table.css` | 357 | `border-radius: 12px` |

### 5.6 Фідбек і оверлеї (feedback/overlays) — 20 місць

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/components/feedback/tooltip.css` | 26 | `border-radius: 8px` |
| `css/components/feedback/tooltip.css` | 53 | `border-radius: 8px` |
| `css/components/feedback/tooltip.css` | 98 | `border-radius: 8px` |
| `css/components/feedback/tooltip.css` | 149 | `border-radius: 4px` |
| `css/components/feedback/states.css` | 54 | `border-radius: 8px` |
| `css/components/feedback/loading.css` | 62 | `border-radius: 50%` |
| `css/components/feedback/loading.css` | 79 | `border-radius: 50%` |
| `css/components/feedback/chip.css` | 123 | `border-radius: 8px` |
| `css/components/feedback/chip.css` | 139 | `border-radius: 16px` |
| `css/components/feedback/chip.css` | 167 | `border-radius: 8px` |
| `css/components/feedback/chip.css` | 185 | `border-radius: 8px` |
| `css/components/feedback/chip.css` | 230 | `border-radius: 8px` |
| `css/components/feedback/chip.css` | 253 | `border-radius: 8px` |
| `css/components/feedback/chip.css` | 304 | `border-radius: 8px` |
| `css/components/feedback/batch-actions.css` | 59 | `border-radius: 8px` |
| `css/components/overlays/toast.css` | 17 | `border-radius: 4px` |
| `css/components/overlays/modal.css` | 210 | `border-radius: 8px` |
| `css/components/overlays/modal-avatar.css` | 82 | `border-radius: 8px` |
| `css/components/overlays/dropdown.css` | 57 | `border-radius: 4px` |
| `css/components/overlays/dropdown.css` | 221 | `border-radius: 10px` |

### 5.7 Контент і навігація (content/navigation) — 23 місця

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/components/content/image-tool.css` | 27 | `border-radius: 12px` |
| `css/components/content/image-tool.css` | 56 | `border-radius: 12px` |
| `css/components/content/image-tool.css` | 103 | `border-radius: 8px` |
| `css/components/content/image-tool.css` | 130 | `border-radius: 4px` |
| `css/components/content/image-tool.css` | 170 | `border-radius: 50%` |
| `css/components/content/image-tool.css` | 210 | `border-radius: 12px` |
| `css/components/content/content-card.css` | 29 | `border-radius: 8px` |
| `css/components/content/glossary-article.css` | 22 | `border-radius: 12px` |
| `css/components/content/glossary-article.css` | 42 | `border-radius: 3px` |
| `css/components/content/glossary-article.css` | 75 | `border-radius: 4px` |
| `css/components/content/glossary-article.css` | 125 | `border-radius: 12px` |
| `css/components/content/glossary-tree.css` | 72 | `border-radius: 4px` |
| `css/components/content/section-misc.css` | 71 | `border-radius: 12px` |
| `css/components/overlays/modal-content.css` | 180 | `border-radius: 4px` |
| `css/components/navigation/tree.css` | 160 | `border-radius: 4px` |
| `css/components/navigation/tree.css` | 169 | `border-radius: 10px` |
| `css/components/navigation/pagination-fab.css` | 71 | `border-radius: 50%` |
| `css/components/navigation/panel-box.css` | 56 | `border-radius: 8px` |
| `css/components/navigation/panel-item.css` | 50 | `border-radius: 8px` |
| `css/components/navigation/tabs.css` | 55 | `border-radius: 9999px` |
| `css/components/navigation/toolbar.css` | 63 | `border-radius: 50%` |
| `css/components/navigation/toolbar.css` | 82 | `border-radius: 50%` |
| `css/components/navigation/toolbar.css` | 136 | `border-radius: 20px` |

### 5.8 Products — 9 місць

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/components/products.css` | 686 | `border-radius: 8px` |
| `css/components/products.css` | 759 | `border-radius: 8px` |
| `css/components/products.css` | 839 | `border-radius: 2px` |
| `css/components/products.css` | 847 | `border-radius: 2px` |
| `css/components/products.css` | 871 | `border-radius: 50%` |
| `css/components/products.css` | 1169 | `border-radius: 0` |
| `css/components/products.css` | 1198 | `border-radius: 50%` |
| `css/components/products.css` | 1452 | `border-radius: 50%` |
| `css/components/products.css` | 1709 | `border-radius: 16px` |

### 5.9 Layout — 9 місць

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/layout/layout-main.css` | 52 | `border-radius: 99px` |
| `css/foundation/scrollbar.css` | 44 | `border-radius: 99px` |
| `css/layout/layout-section.css` | 47 | `border-radius: 12px` |
| `css/layout/layout-section.css` | 117 | `border-radius: 4px` |
| `css/layout/layout-section.css` | 128 | `border-radius: 8px` |
| `css/layout/layout-section.css` | 147 | `border-radius: 16px` |
| `css/components/rich-editor.css` | 121 | `border-radius: 4px` |
| `css/components/permissions-matrix.css` | 16 | `border-radius: 8px` |
| `css/components/permissions-matrix.css` | 151 | `border-radius: 3px` |

### 5.10 Мобільна версія — 9 місць

| Файл | Рядок | Значення |
|------|-------|----------|
| `css/mobile/mobile-instruments.css` | 114 | `border-radius: 50% !important` |
| `css/mobile/mobile-instruments.css` | 257 | `border-radius: 16px 16px 0 0 !important` |
| `css/mobile/mobile-instruments.css` | 280 | `border-radius: 2px !important` |
| `css/mobile/mobile-instruments.css` | 525 | `border-radius: 16px 16px 0 0 !important` |
| `css/mobile/mobile-instruments.css` | 551 | `border-radius: 2px !important` |
| `css/mobile/mobile-instruments.css` | 573 | `border-radius: 50% !important` |
| `css/mobile/mobile-instruments.css` | 610 | `border-radius: 50% !important` |
| `css/mobile/mobile-instruments.css` | 624 | `border-radius: 50% !important` |
| `css/mobile/mobile-instruments.css` | 978 | `border-radius: 50% !important` |

---

## 6. ВИСОКО: Дублікати CSS-класів (55+ пар)

### 6.1 products.css — Внутрішні дублікати (один файл, два визначення)

| Клас | Рядки |
|------|-------|
| `.variants-list` | 506, 1495 |
| `.variant-card` | 512, 1501 |
| `.variant-info` | 528, 1516 |
| `.variant-name` | 542, 1520 |
| `.variant-sku` | 547, 1525 |
| `.variant-meta` | 552, 1531 |
| `.variant-price` | 558, 1537 |
| `.variant-actions` | 564, 1542 |
| `.attributes-block-content` | 699, 748 |
| `.wizard-summary` | 1025, 1032, 1625 **(3 рази!)** |

### 6.2 Крос-файлові дублікати (drop-zone, form-row)

| Клас | Файл 1 | Файл 2 |
|------|---------|---------|
| `.drop-zone` | `forms/drop-zone.css:5` | `products.css:976` |
| `.drop-zone-icon` | `forms/drop-zone.css:73` | `products.css:992` |
| `.drop-zone-text` | `forms/drop-zone.css:85` | `products.css:1002` |
| `.form-row` | `forms/drop-zone.css:367` | `products.css:1225` |

### 6.3 Grid — крос-файлові

| Клас | Файл 1 | Файл 2 |
|------|---------|---------|
| `.grid2` | `layout/layout-grid.css:1` | `utilities/grid.css:30` |
| `.grid3` | `layout/layout-grid.css:7` | `utilities/grid.css:36` |

### 6.4 Header-controls — крос-файловий

| Клас | Файл 1 | Файл 2 |
|------|---------|---------|
| `.header-controls` | `navigation/toolbar.css:123` | `layout/layout-header.css:63` |

### 6.5 Мобільна версія перевизначає основні класи

| Клас | Оригінал | Мобільний дублікат |
|------|----------|-------------------|
| `.form-group` | `forms/form-group.css:78` | `mobile/mobile-instruments.css:679` |
| `.panel-box` | `navigation/panel-box.css:45` | `mobile/mobile-instruments.css:805` |
| `.section-navigator` | `layout/layout-section-navigator.css:1` | `mobile/mobile-instruments.css:80` |
| `.tab-content` | `navigation/tabs.css:34` | `layout/layout-content.css:47` |
| `.btn-icon` | `buttons/button-icon.css:40` | `mobile/mobile-instruments.css:1013` |
| `.btn-reload` | `buttons/button-variants.css:51` | `mobile/mobile-instruments.css:850` |
| `.chip-container` | `feedback/chip.css:39` | `mobile/mobile-instruments.css:821` |
| `.chip-list` | `feedback/chip.css:49` | `mobile/mobile-instruments.css:692` |
| `.canvas-area` | `content/image-tool.css:16` | `mobile/mobile-instruments.css:787` |
| `.image-tool-container` | `content/image-tool.css:8` | `mobile/mobile-instruments.css:779` |
| `.text-stats-container` | `feedback/text-stats.css:28` | `mobile/mobile-instruments.css:732` |
| `.format-toolbar` | `navigation/toolbar.css:204` | `mobile/mobile-instruments.css:702` |
| `.input-right-tool` | `tables/table-row-inputs.css:141` | `mobile/mobile-instruments.css:482` |

**Примітка:** Мобільні дублікати можуть бути навмисними (media-query override), але краще перевірити.

### 6.6 Інші крос-файлові дублікати

| Клас | Файл 1 | Файл 2 |
|------|---------|---------|
| `.word-chip` | `content/glossary-article.css:119` | `feedback/chip.css:297` і `layout/layout-section.css:145` **(3 рази!)** |
| `.cell-actions` | `feedback/batch-actions.css:98` | `tables/pseudo-table.css:111` |
| `.text-muted` | `content/glossary-article.css:136` | `tables/pseudo-table.css:362` |
| `.empty-state-container` | `avatar-states.css:75` | `products.css:1831` |
| `.content-main` | `layout/layout-app.css:48` | `layout/layout-main.css:18` (мертвий файл) |
| `.material-symbols-outlined` | `layout/layout-app.css:68` | `layout/layout-main.css:60` (мертвий файл) |

### 6.7 Внутрішні дублікати мобільного файлу

| Клас | Рядки в `mobile-instruments.css` |
|------|----------------------------------|
| `.mobile-fab` | 966, 971, 1079 **(3 рази!)** |
| `.mobile-header` | 89, 94 |
| `.mobile-aside` | 242, 247 |
| `.mobile-menu-overlay` | 147, 152 |
| `.mobile-bottom-nav` | 182, 187 |
| `.mobile-select-sheet` | 492, 497 |

### 6.8 Інші внутрішні дублікати

| Клас | Файл | Рядки |
|------|------|-------|
| `.form-fieldset` | `forms/form-group.css` | 50, 64 |
| `.modal-body-split-right` | `overlays/modal-content.css` | 293, 304 |
| `.rich-editor-toolbar` | `rich-editor.css` | 27, 215 |
| `.right` | `tables/table-row-inputs.css` | 122, 132 |

### 6.9 Функціональні дублікати (робять одне й те саме)

| Що дублюється | Класи | Рішення |
|---------------|-------|---------|
| Круглі кнопки 32x32 | `.btn-icon`, `.btn-reload`, `.move-btn` | Один клас з модифікаторами |
| Маленькі мітки | `.badge`, `.chip`, `.word-chip`, `.filter-pill` | Один базовий клас |
| Аватар 32x32 | `.auth-avatar`, `.avatar-md` | Видалити `.auth-avatar` |
| Перемикач | `.toggle-switch`, `.toggle-switch-segmented`, `.switch-container` | Задокументувати різницю |
| Legacy-таблиці | `.admin-table`, `.table-wrapper`, `.entities-table`, `.merge-table` | Видалити непотрібні |
| Legacy-модал | `.modal-content` (рядки 90-95 в modal.css) | Видалити, є `.modal-container` |

---

## 7. ВИСОКО: Inline-стилі в HTML (42 місця)

### 7.1 index.html / index-mobile.html

| Файл | Рядок | Що написано |
|------|-------|-------------|
| `index.html` | 236 | `style="display: none;"` |
| `index.html` | 303 | `style="display: none;"` |
| `index.html` | 393 | `style="pointer-events: auto;"` |
| `index-mobile.html` | 221 | `style="display: none;"` |
| `index-mobile.html` | 288 | `style="display: none;"` |
| `index-mobile.html` | 377 | `style="pointer-events: auto;"` |

### 7.2 templates/modals/product-edit-modal.html — 6 місць

| Рядок | Що написано |
|-------|-------------|
| 293 | `style="display: none;"` |
| 354 | `style="display: none;"` |
| 387 | `style="display: none;"` |
| 413 | `style="display: none;"` |
| 829 | `style="margin: 0 0 12px; font-size: 14px; font-weight: 500;"` |
| 832 | `style="color: var(--color-main);"` |

### 7.3 templates/modals/product-text-view.html — 10 місць

| Рядок | Що написано |
|-------|-------------|
| 11 | `style="font-size: 16px;"` |
| 37 | `style="margin-bottom: 16px;"` |
| 41 | `style="gap: 16px;"` |
| 44 | `style="pointer-events: auto;"` |
| 55 | `style="flex-direction: column; align-items: stretch; gap: 12px;"` |
| 56 | `style="pointer-events: auto; justify-content: center; width: 100%;"` |
| 58 | `style="font-size: 16px;"` |
| 62 | `style="font-size: 16px;"` |
| 66 | `style="justify-content: center;"` |

### 7.4 templates/aside/aside-banned-words.html — 4 місця

| Рядок | Що написано |
|-------|-------------|
| 54 | `style="margin-top: 12px; flex-direction: column; gap: 8px;"` |
| 55 | `style="display: flex; align-items: center; gap: 8px;"` |
| 58 | `style="font-size: 13px; color: var(--on-surface-variant);"` |
| 63 | `style="width: 100%;"` |

### 7.5 templates/aside/aside-image-tool.html — 4 місця

| Рядок | Що написано |
|-------|-------------|
| 22 | `style="flex: 1;"` |
| 24 | `style="flex: 1;"` |
| 33 | `style="padding: 0 16px;"` |
| 54 | `style="padding: 0 16px;"` |

### 7.6 Інші шаблони

| Файл | Рядок | Що написано |
|------|-------|-------------|
| `templates/modals/product-create-wizard.html` | 362 | `style="margin: 0 0 16px; font-size: 14px; color: var(--color-on-surface-v);"` |
| `templates/modals/magic-modal.html` | 28 | `style="height: 50vh;"` |
| `templates/modals/banned-word-edit.html` | 8 | `style="font-size: 16px;"` |
| `templates/tooltips/tooltip-highlight-shortcuts.html` | 37 | `style="margin-top: 12px;"` |
| `templates/partials/check-tab-content.html` | 2 | `style="align-items: flex-end;"` |
| `templates/partials/check-tab-content.html` | 8 | `style="margin-top: 8px;"` |

### 7.7 DATA-файли (inline-стилі в даних)

| Файл | Рядок | Що написано |
|------|-------|-------------|
| `DATA/SectionInfo.html` | 97 | `style="color: #dc3545;"` |
| `DATA/SectionInfo.html` | 98 | `style="color: #ffc107;"` |
| Інші DATA файли | 2 | Масивні inline-стилі у кожному (Marketplaces, Glossary, Brands, Banned, Options, Characteristics, MP_Columns_Meta, Categories) |

### 7.8 Типові заміни

| Зараз | Має бути |
|-------|----------|
| `style="display: none;"` | `class="u-hidden"` |
| `style="margin-top: 12px;"` | `class="u-mt-12"` |
| `style="font-size: 16px;"` | CSS-клас |
| `style="flex: 1;"` | `class="u-flex-1"` |
| `style="gap: 16px;"` | Частина компонента |

---

## 8. ВИСОКО: Стилі в JavaScript (159 місць)

### 8.1 Візуальні стилі (мають бути CSS-класами) — 16 місць

| Файл | Рядок | Властивість | Значення |
|------|-------|-------------|----------|
| `js/generators/generator-translate/gtr-reset.js` | 22 | `.style.color` | `'var(--color-primary)'` |
| `js/generators/generator-translate/gtr-reset.js` | 40 | `.style.color` | `'var(--text-disabled)'` |
| `js/generators/generator-link/gln-reset.js` | 33 | `.style.color` | `'var(--color-primary)'` |
| `js/generators/generator-link/gln-reset.js` | 51 | `.style.color` | `'var(--text-disabled)'` |
| `js/generators/generator-seo/gse-reset.js` | 35 | `.style.color` | `'var(--color-primary)'` |
| `js/generators/generator-seo/gse-reset.js` | 60 | `.style.color` | `'var(--text-disabled)'` |
| `js/generators/generator-table/gt-row-manager.js` | 97 | `.style.color` | `'var(--primary-color)'` |
| `js/generators/generator-table/gt-row-manager.js` | 112 | `.style.color` | `'var(--text-disabled)'` |
| `js/generators/generator-highlight/ghl-reset.js` | 22 | `.style.color` | `'var(--color-primary)'` |
| `js/generators/generator-highlight/ghl-reset.js` | 52 | `.style.color` | `''` |
| `js/generators/generator-table/gt-reset.js` | 44 | `.style.color` | `'var(--color-primary)'` |
| `js/generators/generator-table/gt-reset.js` | 58 | `.style.color` | `'var(--text-disabled)'` |
| `js/common/avatar/avatar-text.js` | 155 | `.style.backgroundColor` | Динамічний колір |
| `js/common/avatar/avatar-text.js` | 156 | `.style.color` | Динамічний колір |
| `js/utils/event-handlers.js` | 8 | `.style.cursor` | `'pointer'` |

**Рішення:** Замість `.style.color = 'var(--color-primary)'` використовувати:
```javascript
element.classList.add('is-active');    // замість color = primary
element.classList.remove('is-active'); // замість color = disabled
```

### 8.2 Позиціонування і display (прийнятно, але можна покращити) — 143 місця

#### Перемикання видимості (display: none/block) — ~35 місць

| Файл | Рядки | Що робить |
|------|-------|-----------|
| `js/common/ui-select.js` | 22, 137, 213, 237, 301, 331, 415, 505, 595-627, 664-669 | Показ/ховання dropdown-панелі |
| `js/common/editor/editor-mode.js` | 59, 60, 79, 80 | Перемикання editor/code |
| `js/generators/generator-highlight/ghl-mode.js` | 87, 88, 112, 113 | Перемикання режимів |
| `js/products/main-products.js` | 1396, 1397, 1400, 1752 | Показ/ховання елементів |
| `js/price/price-table.js` | 42, 45, 48 | Показ/ховання стовпців |
| `js/mapper/mapper-characteristics.js` | 370 | Показ/ховання |
| `js/mapper/mapper-import-wizard.js` | 682, 699, 725 | Кроки візарда |
| `js/glossary/glossary-search.js` | 40, 56, 59 | Показ/ховання результатів |

**Рішення:** `element.classList.toggle('u-hidden')` замість `element.style.display = 'none'`.

#### Динамічне позиціонування (необхідно в JS) — ~60 місць

| Файл | Рядки | Що робить |
|------|-------|-----------|
| `js/common/ui-select.js` | 606-627 | Позиціонування dropdown |
| `js/common/ui-tooltip.js` | 92, 93 | Позиція tooltip біля курсора |
| `js/common/ui-table-controls.js` | 433-437, 445, 450 | Позиція фільтрів |
| `js/common/chip-tooltip.js` | 23, 24 | CSS variables для tooltip |
| `js/banned-words/banned-words-product-modal.js` | 809, 810 | Позиція tooltip |
| `js/tasks/tasks-ui.js` | 65-68 | Позиція fixed-елемента |
| `js/common/table/table-filters.js` | 257-260 | Позиція dropdown |

Ці стилі **прийнятні** — позиціонування залежить від координат кліку.

#### Анімації та трансформації — ~20 місць

| Файл | Рядки | Що робить |
|------|-------|-----------|
| `js/generators/generator-translate/gtr-reset.js` | 33, 44, 45, 70 | Анімація кнопки reload |
| `js/generators/generator-table/gt-row-manager.js` | 99, 100, 113 | Обертання іконки |
| `js/generators/generator-link/gln-reset.js` | 53 | Скидання transform |
| `js/generators/generator-seo/gse-reset.js` | 62 | Скидання transform |
| `js/generators/generator-table/gt-reset.js` | 60 | Скидання transform |
| `js/generators/generator-image/gim-state.js` | 64, 65 | Розмір зображення |
| `js/generators/generator-image/gim-renderer.js` | 84, 85 | Розмір canvas |
| `js/generators/generator-highlight/ghl-tooltip.js` | 50, 61, 131, 142 | cssText для tooltip |

#### Прогрес-бар — ~5 місць

| Файл | Рядки | Що робить |
|------|-------|-----------|
| `js/mapper/mapper-import-wizard.js` | 773, 799, 817, 821 | `width` прогрес-бару |
| `js/common/ui-loading.js` | 90 | `width` прогрес-бару |

---

## 9. СЕРЕДНЬО: Відсутні CSS-змінні в root.css

| Значення | Де використовується | Запропонована змінна |
|----------|---------------------|---------------------|
| `4px` radius | 25+ компонентів | `--radius-xs: 4px` |
| `6px` radius | avatar (10+ місць) | `--radius-avatar-sm: 6px` |
| `20px` radius | кнопки (5+ місць) | `--radius-xl: 20px` |
| `24px` radius | checkbox, groups | `--radius-xxl: 24px` |
| `50%` radius | 15+ місць | `--radius-circle: 50%` |
| `8px` spacing | 50+ місць | `--space-xs: 8px` |
| `4px` spacing | 20+ місць | `--space-2xs: 4px` |

---

## 10. СЕРЕДНЬО: Конфлікт висоти полів вводу

**Проблема:** `input.css` визначає `.input-main` з `height: 32px`, але `form-group.css` визначає поля всередині `.form-group` з `min-height: 40px`.

**Рішення:** Стандартизувати висоту полів до одного значення.

---

## 11. СЕРЕДНЬО: `--color-main` = `--color-secondary`

В `root.css` обидві змінні мають **однакове значення** `rgb(9, 63, 69)`.

**Рішення:** Або зробити їх різними, або видалити `--color-secondary`.

---

## Пріоритети виправлення

### Зробити першим (КРИТИЧНО — впливає на роботу)

1. **Замінити старі змінні** в `drop-zone.css` (69 місць) та `custom-select.css` (3 місця)
2. **Видалити** файл-привид `layout-main.css`

### Зробити другим (ВИСОКО — впливає на консистентність)

3. **Додати відсутні змінні** в root.css (`--radius-xs`, `--radius-circle`, `--space-xs`)
4. **Видалити дублікати** в `products.css` (10 класів визначені двічі)
5. **Замінити inline-стилі** `style="display: none"` → `class="u-hidden"` (42 місця)
6. **Замінити JS-стилі** — 16 візуальних `.style.color` замінити на CSS-класи
7. **Замінити JS display** — ~35 місць `style.display` замінити на `classList.toggle('u-hidden')`
8. **Видалити функціональні дублікати:** `.button-group`, `.auth-avatar`, `.modal-content`

### Зробити третім (СЕРЕДНЬО — покращення якості)

9. **Замінити захардкоджені кольори** на CSS-змінні (82 місця)
10. **Замінити захардкоджені тіні** на `--shadow-*` (15 з 18 місць)
11. **Замінити захардкоджені radius** на `--radius-*` (133 місця)
12. **Видалити Legacy-таблиці** з pseudo-table.css
13. **Вирішити** конфлікт --color-main / --color-secondary
14. **Розібратися** з мобільними дублікатами (13 класів) — навмисні чи ні?
