# Design System — PinguinV5

## Головний принцип

**Все — generic.** Кожен компонент повинен бути таким, щоб його можна було використати будь-де без змін. Жодних унікальних класів для конкретних випадків. Якщо потрібна варіація — це чарм, а не новий компонент.

Правила:
- Компонент = один CSS-файл з базовим класом (`.btn-icon`, `.nav`, `.switch`)
- Варіація = чарм — додатковий клас на тому ж елементі (`.btn-icon.touch`, `.nav.row`)
- Ніяких scoped overrides типу `.my-page .btn-icon { ... }` — якщо стиль потрібен на одній сторінці, він потрібен як чарм для всіх
- HTML диктує поведінку через класи і атрибути, CSS/JS реагують на них
- Якщо щось можна вирішити одним `max-height: 32px` на контейнері — не створюй `font-size`/`padding` модифікатори на дітях

---

## Що таке чарм

Чарм (charm) — це модифікатор базового компонента. Додається як CSS-клас або HTML-атрибут прямо на елемент.

```html
<!-- Базовий компонент -->
<button class="btn-icon">

<!-- Компонент + чарми -->
<button class="btn-icon expand touch">

<!-- Компонент + чарм через атрибут (JS-чарми) -->
<section refresh confirm>
```

Чарм НЕ створює новий компонент. Він змінює одну-дві властивості існуючого.

### Типи чармів

| Тип | Визначається | Ініціалізація | Приклад |
|-----|-------------|---------------|---------|
| **CSS-чарм** | Клас в CSS-файлі компонента | Не потрібна | `.btn-icon.ghost`, `.nav.row` |
| **JS-чарм** | HTML-атрибут | `initXxxCharm()` в `main-core.js` | `[refresh]`, `[pagination]`, `[columns]` |
| **Гібридний** | Клас + JS логіка | JS додає/знімає CSS-класи | `.morph-search` + `.open` |

---

## CSS-чарми

### Як використовувати

Просто додай клас в HTML. Ніякого JS не потрібно.

```html
<!-- touch: збільшена ціль 44x44 -->
<button class="btn-icon touch">

<!-- expand + touch: розкривається при hover -->
<a class="btn-icon expand touch" aria-label="Бренди">
    <span class="material-symbols-outlined">shopping_bag</span>
    <span class="btn-icon-label">Бренди</span>
</a>

<!-- ghost: прозорий, тільки зміна кольору при hover -->
<button class="btn-icon ghost">

<!-- danger: червоний hover для деструктивних дій -->
<button class="btn-icon danger">
```

### Як створити CSS-чарм

1. Відкрий CSS-файл компонента (наприклад `button-icon.css`)
2. Додай правило з подвійним класом:

```css
/* Чарм: назва — опис що робить */
.btn-icon.назва {
    /* Зміни 1-3 властивості, не більше */
}

.btn-icon.назва:hover {
    /* Стан при hover, якщо потрібен */
}
```

3. Документуй в коментарі вгорі файлу (секція ЧАРМИ)

**Правила:**
- Чарм змінює мінімум властивостей (1-3)
- Чарм НЕ дублює стилі іншого чарму
- Чарми комбінуються: `.btn-icon.expand.touch` — і expand, і touch працюють разом
- Назва — одне слово, lowercase, описує ефект: `ghost`, `touch`, `danger`, `reveal`

---

## JS-чарми

### Як використовувати

Додай HTML-атрибут. JS-чарм ініціалізується автоматично через `main-core.js`.

```html
<!-- refresh: кнопка перезавантаження секції -->
<section id="section-table" refresh>

<!-- refresh + confirm: з підтвердженням -->
<section id="section-seo" refresh confirm>

<!-- pagination: пагінація по 25 елементів -->
<div class="pseudo-table-container" pagination="25">

<!-- columns: дропдаун видимості колонок -->
<div class="pseudo-table-container" columns>

<!-- data-clear-for: кнопка очищення інпуту -->
<button data-clear-for="search-input" class="btn-icon u-hidden">
    <span class="material-symbols-outlined">close</span>
</button>

<!-- data-filter-value: фільтр-пілс -->
<div data-filter-group="status">
    <button class="btn-icon expand active" data-filter-value="all">Всі</button>
    <button class="btn-icon expand" data-filter-value="active">Активні</button>
</div>
```

### Як створити JS-чарм

1. Створи файл `js/common/charms/charm-назва.js`
2. Експортуй init-функцію:

```js
// js/common/charms/charm-example.js

/**
 * Чарм: example
 * Тригер: атрибут [example] на елементі
 * Що робить: короткий опис
 */
export function initExampleCharm(scope = document) {
    const elements = scope.querySelectorAll('[example]');
    elements.forEach(el => {
        // Логіка чарму
    });
}
```

3. Зареєструй в `main-core.js`:

```js
import { initExampleCharm } from './common/charms/charm-example.js';

export async function initCore() {
    // ... існуючі init ...
    initExampleCharm();
}
```

**Правила:**
- Тригер — HTML-атрибут, не клас (щоб відрізнити від CSS-чармів)
- Функція приймає `scope` (default: `document`) для ініціалізації в динамічному контенті
- Чарм НЕ знає про конкретну сторінку — працює з будь-яким елементом що має тригер-атрибут
- Події чарму — через CustomEvent з префіксом `charm:` (напр. `charm:refresh`, `charm:filter`)

---

## Каталог чармів

### .btn-icon (CSS)

| Чарм | Клас | Ефект |
|------|------|-------|
| **ghost** | `.btn-icon.ghost` | Прозорий фон, тільки зміна кольору при hover |
| **touch** | `.btn-icon.touch` | Збільшена ціль 44x44 (замість 32x32), іконка 22px |
| **expand** | `.btn-icon.expand` | Pill-shaped, розкриває `.btn-icon-label` при hover через max-width анімацію |
| **drag** | `.btn-icon.drag` | Cursor: grab/grabbing |
| **reveal** | `.btn-icon.reveal` | Прихований, з'являється при hover батька |
| **reload** | `.btn-icon.reload` | Приглушений колір, нейтральний hover |
| **danger** | `.btn-icon.danger` | Червоний hover для деструктивних дій |

Комбінації: `.expand.touch` — розкриття з великою ціллю (навігація)

### .nav (CSS)

| Чарм | Клас | Ефект |
|------|------|-------|
| **row** | `.nav.row` | Горизонтальний рядок, sticky, centered |
| **column** | `.nav.column` | Вертикальна фіксована колонка (68px, 100dvh) |

Діти column: `.nav-main` (навігація), `.nav-footer` (тема, авторизація)

### Секції / контейнери (JS, атрибути)

| Чарм | Атрибут | Ефект |
|------|---------|-------|
| **refresh** | `[refresh]` | Кнопка перезавантаження в header секції |
| **refresh + confirm** | `[refresh confirm]` | З модальним підтвердженням |
| **refresh + aside** | `[refresh aside]` | Також оновлює aside-панель |
| **pagination** | `[pagination]` або `[pagination="25"]` | Пагінація контенту (кнопки сторінок, FAB розміру, статистика) |
| **columns** | `[columns]` | Дропдаун видимості колонок таблиці |

### Інпути / фільтри (JS, атрибути)

| Чарм | Атрибут | Ефект |
|------|---------|-------|
| **search-clear** | `[data-clear-for="id"]` | Кнопка очищення інпуту |
| **filter-pills** | `[data-filter-value]` + `[data-filter-group]` | Single-select фільтр, dispatch `charm:filter` |
| **morph-search** | `.morph-search` | Кнопка → поле пошуку (анімація) |

### Стан (CSS-класи, керуються JS)

| Клас | Ефект |
|------|-------|
| `.active` | Активний стан (кнопки, таби, пагінація) |
| `.open` | Відкритий стан (дропдауни, morph-search) |
| `.u-hidden` | Сховати елемент (display: none !important) |
| `.spinning` | Обертання іконки 360 (анімація завантаження) |

---

## Структура файлів

```
css/components/
├── buttons/
│   └── button-icon.css       ← .btn-icon + чарми (ghost, touch, expand...)
├── navigation/
│   └── nav.css         ← .nav + чарми (row, column)
├── forms/
│   └── switch.css             ← .switch + чарми (switch-bordered, switch-sm)
└── ...

js/common/charms/
├── charm-refresh.js           ← [refresh], [refresh confirm]
├── charm-columns.js           ← [columns]
├── charm-filter-pills.js      ← [data-filter-value]
├── charm-morph-search.js      ← .morph-search
├── charm-search-clear.js      ← [data-clear-for]
└── pagination/
    ├── pagination-main.js     ← [pagination]
    ├── pagination-fab.js
    ├── pagination-ui.js
    └── pagination-stats.js

templates/partials/
└── nav.html            ← шаблон навігації (завантажується JS)
```
