# План реструктуризації кодової бази (bottom-up)

> Порядок виконання: від фундаменту до верхніх рівнів.
> Кожна наступна фаза спирається на попередню — так не доведеться переробляти.

---

## Поточний стан: інвентаризація

```
js/                              10 файлів    194 рядки   ← entry points (чисті)
├── config/                       1 файл       41 рядок   ← чисто
├── auth/                         2 файли     542 рядки   ← чисто
├── utils/                        6 файлів   1,322 рядки  ← потребує консолідації
├── layout/                       9 файлів     976 рядків  ← чисто (має -main/-state)
├── components/
│   ├── 16 loose файлів         3,406 рядків  ← ПОТРЕБУЄ ГРУПУВАННЯ
│   ├── avatar/    8 файлів     1,648 рядків  ← чисто
│   ├── editor/   16 файлів     2,732 рядки   ← чисто
│   ├── table/    11 файлів     3,349 рядків  ← чисто
│   └── charms/    8 файлів       845 рядків  ← чисто
├── generators/   60 файлів     5,083 рядки   ← чисто (всі з -main/-state)
└── pages/
    ├── glossary/   7 файлів      475 рядків  ← потребує стандартизації
    ├── keywords/   6 файлів    1,106 рядків  ← потребує стандартизації
    ├── price/      8 файлів    2,262 рядки   ← потребує стандартизації
    ├── tasks/     10 файлів    2,961 рядок   ← майже чисто
    ├── brands/    11 файлів    2,099 рядків  ← майже чисто
    ├── banned-words/ 11 файлів 4,076 рядків  ← потребує стандартизації
    └── mapper/    20 файлів   12,678 рядків  ← потребує розбиття
```

**Всього: ~37,500 рядків JS**

---

## Еталонна структура модуля

Перед реструктуризацією — ось як виглядає правильно організований модуль
(tasks/ та brands/ найближчі до цього):

```
module-name/
├── module-main.js       ← entry point, ініціалізація, aside, плагіни
├── module-state.js      ← стан модуля, хуки
├── module-plugins.js    ← реєстрація плагінів (опційно)
├── module-data.js       ← API-виклики, завантаження даних
├── module-table.js      ← рендеринг таблиці
├── module-crud.js       ← модальні вікна CRUD
├── module-events.js     ← обробники подій
└── module-ui.js         ← допоміжний UI-рендеринг
```

---

## ФАЗА 1: Консолідація утиліт

**Мета:** Зібрати всі утиліти в `utils/`, прибрати з `components/`.
**Залежність:** Немає (фундамент).
**Ризик:** Низький — тільки зміна шляхів імпорту.

### Що робити

| Файл | Звідки | Куди | Імпортерів |
|------|--------|------|------------|
| `polling.js` | `components/` | `utils/polling.js` | 1 (mapper-polling) |
| `util-lazy-load.js` | `components/` | `utils/lazy-load.js` | 2 (mapper-table, mapper-init) |
| `util-loader.js` | `components/` | **Перевірити дублікат** | 2 (layout-aside, layout-nav) |

### Увага: можливий дублікат

- `components/util-loader.js` (28 рядків) — експортує `loadHTML()`
- `utils/template-loader.js` (37 рядків) — треба перевірити чи не те ж саме

Якщо дублікат — залишити один в `utils/`, оновити імпорти.

### Імпорти для оновлення: ~5 файлів

---

## ФАЗА 2: Тематичне групування UI-компонентів

**Мета:** 16 розсипаних файлів → 4 тематичні папки + 2 standalone.
**Залежність:** Фаза 1 (бо polling і util-* вже переїхали).
**Ризик:** Середній — багато імпортів для оновлення (~100+).

### Цільова структура

```
components/
├── modal/                              ← Модальна система
│   ├── modal-main.js                   (було ui-modal.js,      224 рядки)
│   ├── modal-init.js                   (було ui-modal-init.js,   62 рядки)
│   ├── modal-confirm.js                (було ui-modal-confirm.js, 296 рядків)
│   └── modal-info.js                   (було ui-info-modal.js,  138 рядків)
│
├── feedback/                           ← Зворотній зв'язок / Сповіщення
│   ├── toast.js                        (було ui-toast.js,        85 рядків)
│   ├── loading.js                      (було ui-loading.js,     160 рядків)
│   └── tooltip.js                      (було ui-tooltip.js,     146 рядків)
│
├── forms/                              ← Елементи форм
│   ├── dropdown.js                     (було ui-dropdown.js,    251 рядок)
│   └── select.js                       (було ui-select.js,      716 рядків)
│
├── actions/                            ← Система дій
│   ├── actions-main.js                 (було ui-actions.js,     482 рядки)
│   └── actions-batch.js                (було ui-batch-actions.js, 380 рядків)
│
├── ui-theme.js                         ← standalone (1 імпортер: main-core)
├── fab-menu.js                         ← standalone (1 імпортер: pagination)
│
├── avatar/                             ← без змін
├── editor/                             ← без змін
├── table/                              ← без змін
└── charms/                             ← без змін
```

### Чому саме ці групи

**modal/** — 4 файли з чіткою ієрархією залежностей:
```
modal-init → modal-main ← modal-confirm
                        ← modal-info
```
Всі побудовані навколо одного ядра (`modal-main`). Логічна підсистема.

**feedback/** — 3 незалежних файли без внутрішніх зв'язків
(окрім loading → toast). Об'єднані функцією: показати щось користувачу.
Не потребують -main/-state — вони вже є leaf-примітивами.

**forms/** — 2 незалежних файли. Обидва — елементи вводу.
`select.js` (716 рядків) — найбільший, може колись потребувати розбиття.

**actions/** — 2 файли, логічна пара:
- `actions-main.js` — обробка одиничних дій (кнопки в рядках)
- `actions-batch.js` — обробка масових дій (панель виділення)

**standalone** — `ui-theme.js` та `fab-menu.js` мають по 1 імпортеру.
Не варто створювати для них папки.

### Кількість імпортів для оновлення по групах

| Група | Файл | Імпортерів |
|-------|------|------------|
| modal | modal-main.js | 21 |
| modal | modal-confirm.js | 10 |
| modal | modal-init.js | 1 |
| modal | modal-info.js | 1 |
| feedback | toast.js | **38** |
| feedback | loading.js | 2 |
| feedback | tooltip.js | 7 |
| forms | dropdown.js | 11 |
| forms | select.js | 12 |
| actions | actions-main.js | 12 |
| actions | actions-batch.js | 8 |
| **Всього** | | **~123** |

### Стратегія виконання

1. Створити нові папки і перемістити файли (git mv)
2. Масова заміна імпортів через search-replace
3. Перевірити що все працює
4. Одна папка за раз — modal → feedback → forms → actions

---

## ФАЗА 3: Стандартизація entry points сторінок

**Мета:** Всі сторінки мають однакову структуру: `-main.js` (entry point) + `-state.js` (стан).
**Залежність:** Фаза 2 (бо шляхи компонентів вже стабільні).
**Ризик:** Середній — треба акуратно виділити стан.

### Поточна невідповідність

| Модуль | Entry point | Є -main? | Є -state? | Що треба |
|--------|------------|----------|-----------|----------|
| tasks | tasks-main.js | **Так** | **Так** | — (еталон) |
| brands | brands-main.js | **Так** | **Так** | — (еталон) |
| mapper | mapper-init.js | Є, але інша роль | **Так** | Об'єднати init→main |
| glossary | glossary-init.js | Ні | Ні | Перейменувати, створити state |
| price | price-init.js | Ні | Ні | Перейменувати, витягти state |
| keywords | keywords-init.js | Ні | Ні | Перейменувати, витягти state |
| banned-words | banned-words-init.js | Ні | Ні | Перейменувати, витягти state |

### 3.1 glossary/ (475 рядків, 7 файлів)

Найпростіший модуль — починаємо з нього для відпрацювання паттерну.

```
glossary-init.js (27 рядків) → перейменувати в glossary-main.js
glossary-data.js (83 рядки)  → витягти стан (glossaryData, glossaryTree,
                                glossaryMap) в glossary-state.js
glossary-events.js (11 рядків) → перейменувати: це DOM-кеш, не events
```

Результат:
```
glossary/
├── glossary-main.js      ← перейменований init
├── glossary-state.js     ← NEW: стан з glossary-data
├── glossary-data.js      ← API-виклики (без стану)
├── glossary-articles.js  ← рендеринг статей
├── glossary-search.js    ← пошук
├── glossary-tree.js      ← дерево категорій
└── glossary-modals.js    ← модальне вікно
```

### 3.2 price/ (2,262 рядки, 8 файлів)

```
price-init.js (167 рядків) містить:
- priceState (об'єкт стану) → витягти в price-state.js
- refreshPriceTable()       → залишити в main
- ініціалізація             → залишити в main
- дублікат initDropdowns()  → виправити

Перейменувати price-init.js → price-main.js
```

Результат:
```
price/
├── price-main.js         ← перейменований init (без стану)
├── price-state.js        ← NEW: priceState
├── price-data.js         ← API (623 рядки — великий, але поки ОК)
├── price-table.js        ← таблиця
├── price-events.js       ← події
├── price-ui.js           ← UI
├── price-import.js       ← імпорт
├── price-edit-modal.js   ← модальне вікно редагування
└── price-aside.js        ← бічна панель
```

### 3.3 keywords/ (1,106 рядків, 6 файлів)

```
keywords-init.js (109 рядків) містить:
- keywordsState → витягти в keywords-state.js
- ініціалізація → залишити в main

Перейменувати keywords-init.js → keywords-main.js
```

Результат:
```
keywords/
├── keywords-main.js      ← перейменований init
├── keywords-state.js     ← NEW: keywordsState
├── keywords-data.js      ← API
├── keywords-crud.js      ← CRUD модалки (550 рядків — великий)
├── keywords-table.js     ← таблиця
├── keywords-events.js    ← події
└── keywords-ui.js        ← UI
```

### 3.4 banned-words/ (4,076 рядків, 11 файлів)

```
banned-words-init.js (231 рядків) містить:
- bannedWordsState (70 рядків об'єкт стану) → витягти в state
- cache-утиліти (getCachedCheckResults, etc.) → витягти в state або utils
- ініціалізація → залишити в main

Перейменувати banned-words-init.js → banned-words-main.js
```

Результат:
```
banned-words/
├── banned-words-main.js            ← перейменований init (без стану/кешу)
├── banned-words-state.js           ← NEW: стан + cache-утиліти
├── banned-words-state-persistence.js ← вже існує
├── banned-words-data.js            ← API
├── banned-words-events.js          ← події
├── banned-words-ui.js              ← UI
├── banned-words-tabs.js            ← табуляція
├── banned-words-manage.js          ← управління списками
├── banned-words-check.js           ← перевірка (624 рядки)
├── banned-words-batch.js           ← масові операції
├── banned-words-product-modal.js   ← модалка продукту
└── banned-words-aside.js           ← бічна панель
```

### 3.5 mapper/ — виправити подвійний entry point

```
Зараз: mapper-main.js (77) — тільки плагіни
       mapper-init.js (269) — справжній entry point

Об'єднати: перенести логіку з mapper-init.js в mapper-main.js
Видалити mapper-init.js
```

### Імпорти для оновлення в Фазі 3

Для кожного перейменування *-init.js → *-main.js треба оновити:
- Відповідний `main-*.js` entry point (1 файл кожен)
- Внутрішні імпорти модуля (файли що імпортують з init)
- Зовнішні імпорти (інші модулі що імпортують стан)

---

## ФАЗА 4: Розбиття великих файлів

**Мета:** Жоден файл > 500 рядків. Кожен файл — одна відповідальність.
**Залежність:** Фаза 3 (entry points вже стабільні).
**Ризик:** Високий — треба розуміти логіку кожного файлу.

### Пріоритет за розміром

| # | Файл | Рядків | Модуль | Що робити |
|---|------|--------|--------|-----------|
| 1 | `mapper-data.js` | 1,996 | mapper | Розбити по сутностям |
| 2 | `mapper-import.js` | 1,847 | mapper | Виділити під-модулі |
| 3 | `mapper-marketplaces.js` | 1,541 | mapper | Виділити data/table/crud |
| 4 | `mapper-characteristics.js` | 1,218 | mapper | Виділити data/table/crud |
| 5 | `mapper-categories.js` | 1,129 | mapper | Виділити data/table/crud |
| 6 | `mapper-options.js` | 1,077 | mapper | Виділити data/table/crud |
| 7 | `brands-crud.js` | 1,058 | brands | Розбити на brands-crud + brands-crud-modal |
| 8 | `mapper-import-wizard.js` | 903 | mapper | Можливо залишити (wizard = одна відповідальність) |
| 9 | `mapper-table.js` | 853 | mapper | Перевірити чи можна розбити |
| 10 | `tasks-cabinet.js` | 632 | tasks | Виділити cabinet-stats, cabinet-ui |
| 11 | `banned-words-check.js` | 624 | tasks | Виділити check-results рендеринг |
| 12 | `price-data.js` | 623 | price | Виділити CRUD операції |
| 13 | `ui-select.js` | 716 | forms | Виділити select-search, select-multi |
| 14 | `keywords-crud.js` | 550 | keywords | Виділити модальну логіку |
| 15 | `banned-words-product-modal.js` | 547 | banned-words | Перевірити чи можна |
| 16 | `tasks-data.js` | 547 | tasks | Перевірити чи можна |

### 4.1 mapper-data.js (1,996 рядків) — Найбільший файл

Цей файл обслуговує 7+ типів сутностей. Розбити на:

```
mapper/
├── data/
│   ├── mapper-data-categories.js
│   ├── mapper-data-characteristics.js
│   ├── mapper-data-options.js
│   ├── mapper-data-marketplaces.js
│   ├── mapper-data-mappings.js
│   └── mapper-data-common.js        ← спільні утиліти
```

Або якщо не хочемо вкладеність — плоско з префіксом:
```
mapper/
├── mapper-data-categories.js
├── mapper-data-characteristics.js
├── mapper-data-options.js
├── mapper-data-marketplaces.js
├── mapper-data-mappings.js
└── mapper-data-common.js
```

### 4.2 mapper entity файли (categories, characteristics, options, marketplaces)

Кожен з них 1,000-1,500 рядків і містить: data + table rendering + CRUD modals.
Можна розбити кожен на -table і -crud, або залишити як є якщо це єдина відповідальність
(одна сутність = один файл).

**Рішення:** Потребує обговорення. Якщо кожна сутність — окрема папка:
```
mapper/
├── categories/
│   ├── categories-main.js
│   ├── categories-table.js
│   └── categories-crud.js
├── characteristics/
│   ├── ...
```

Або залишити плоско але розбити найбільші на 2 файли кожен.

### 4.3 brands-crud.js (1,058 рядків)

Містить CRUD для брендів. Можна розбити:
- `brands-crud.js` — основна CRUD логіка
- `brands-modal.js` — рендеринг і поведінка модального вікна

---

## ФАЗА 5: Стандартизація tasks-main.js та brands-main.js

**Мета:** Зменшити bloated -main.js файли (tasks: 443 рядки, brands: 265 рядків).
**Залежність:** Фаза 4.
**Ризик:** Низький.

### tasks-main.js (443 рядки)

Містить занадто багато:
- 4 aside-ініціалізатори
- admin panel rendering
- cabinet stats rendering
- auth state rendering
- error state rendering
- refresh/add button setup

Виділити:
- aside-ініціалізатори → в плагіни або tasks-aside.js
- rendering states → в tasks-ui.js

### brands-main.js (265 рядків)

Аналогічно — tab switching, aside, auth/error rendering.
Менш критично ніж tasks.

---

## ФАЗА 6 (опціонально): Система плагінів для решти модулів

**Мета:** Всі модулі використовують однаковий hook/plugin паттерн.
**Залежність:** Фази 3-4.
**Ризик:** Низький, але багато роботи.

Зараз тільки tasks, brands, mapper мають `-plugins.js` з хуками.
Для повної консистентності:
- glossary → додати plugins (мінімальний)
- price → додати plugins
- keywords → додати plugins
- banned-words → додати plugins

**Чи потрібно:** Залежить від того, чи будуть ці модулі рости.
Glossary (475 рядків) — скоріш за все ні.
Banned-words (4,076 рядків) — скоріш за все так.

---

## Порядок виконання (чеклист)

```
ФАЗА 1: Утиліти                              Складність: ●○○○○
├── [ ] Перевірити util-loader vs template-loader
├── [ ] Перемістити polling.js → utils/
├── [ ] Перемістити util-lazy-load.js → utils/lazy-load.js
├── [ ] Об'єднати або видалити дублікат loader
└── [ ] Оновити ~5 імпортів

ФАЗА 2: UI компоненти → тематичні папки      Складність: ●●●○○
├── [ ] Створити components/modal/, перемістити 4 файли
├── [ ] Оновити ~33 імпорти для modal/
├── [ ] Створити components/feedback/, перемістити 3 файли
├── [ ] Оновити ~47 імпортів для feedback/
├── [ ] Створити components/forms/, перемістити 2 файли
├── [ ] Оновити ~23 імпорти для forms/
├── [ ] Створити components/actions/, перемістити 2 файли
├── [ ] Оновити ~20 імпортів для actions/
└── [ ] Smoke test після кожної групи

ФАЗА 3: Entry points сторінок                Складність: ●●○○○
├── [ ] glossary: init→main, створити state
├── [ ] price: init→main, витягти state
├── [ ] keywords: init→main, витягти state
├── [ ] banned-words: init→main, витягти state
├── [ ] mapper: об'єднати init в main
└── [ ] Оновити main-*.js entry points

ФАЗА 4: Розбиття великих файлів              Складність: ●●●●●
├── [ ] mapper-data.js (1,996) → розбити по сутностям
├── [ ] mapper entity файли (4 файли 1,000+) → обговорити підхід
├── [ ] mapper-import.js (1,847) → виділити під-модулі
├── [ ] brands-crud.js (1,058) → розбити
├── [ ] tasks-cabinet.js (632) → виділити stats/ui
├── [ ] price-data.js (623) → виділити CRUD
├── [ ] keywords-crud.js (550) → виділити модалки
└── [ ] Інші файли 500+ → за потребою

ФАЗА 5: Очищення bloated -main.js            Складність: ●●○○○
├── [ ] tasks-main.js (443) → виділити aside/rendering
└── [ ] brands-main.js (265) → виділити aside

ФАЗА 6: Плагіни (опціонально)                Складність: ●●●○○
├── [ ] banned-words → додати plugins/hooks
├── [ ] price → додати plugins/hooks
├── [ ] keywords → додати plugins/hooks
└── [ ] glossary → оцінити необхідність
```

---

## Що НЕ чіпаємо (вже добре структуроване)

| Модуль | Файлів | Рядків | Чому ОК |
|--------|--------|--------|---------|
| `js/` root entry points | 10 | 194 | Тонкі launcher-и |
| `config/` | 1 | 41 | Тільки конфіг |
| `auth/` | 2 | 542 | Чиста структура |
| `layout/` | 9 | 976 | Має -main/-state, плагіни |
| `components/avatar/` | 8 | 1,648 | Має -main/-state/-config |
| `components/editor/` | 16 | 2,732 | Має -main/-state, charm/plugin |
| `components/table/` | 11 | 3,349 | Має -main/-state, добре розбито |
| `components/charms/` | 8 | 845 | Чистий, малий |
| `generators/` (всі 6) | 60 | 5,083 | Зрілі модулі з -main/-state |

---

## Цільова структура після всіх фаз

```
js/
├── main-core.js, main-*.js        ← entry points (без змін)
├── theme-init.js                  ← FOUC prevention (без змін)
├── config/
│   └── spreadsheet-config.js
├── auth/
│   ├── auth-google.js
│   └── auth-drive-token.js
├── utils/
│   ├── api-client.js
│   ├── google-sheets-batch.js
│   ├── text-utils.js
│   ├── common-utils.js
│   ├── template-loader.js
│   ├── event-handlers.js
│   ├── polling.js               ← NEW (з components/)
│   └── lazy-load.js             ← NEW (з components/)
├── layout/                       ← без змін
├── components/
│   ├── modal/                    ← NEW група
│   │   ├── modal-main.js
│   │   ├── modal-init.js
│   │   ├── modal-confirm.js
│   │   └── modal-info.js
│   ├── feedback/                 ← NEW група
│   │   ├── toast.js
│   │   ├── loading.js
│   │   └── tooltip.js
│   ├── forms/                    ← NEW група
│   │   ├── dropdown.js
│   │   └── select.js
│   ├── actions/                  ← NEW група
│   │   ├── actions-main.js
│   │   └── actions-batch.js
│   ├── ui-theme.js               ← standalone
│   ├── fab-menu.js               ← standalone
│   ├── avatar/                   ← без змін
│   ├── editor/                   ← без змін
│   ├── table/                    ← без змін
│   └── charms/                   ← без змін
├── generators/                   ← без змін
└── pages/
    ├── glossary/
    │   ├── glossary-main.js      ← renamed
    │   ├── glossary-state.js     ← NEW
    │   └── ...
    ├── price/
    │   ├── price-main.js         ← renamed
    │   ├── price-state.js        ← NEW
    │   └── ...
    ├── keywords/
    │   ├── keywords-main.js      ← renamed
    │   ├── keywords-state.js     ← NEW
    │   └── ...
    ├── tasks/                    ← minor cleanup
    ├── brands/                   ← minor cleanup
    ├── banned-words/
    │   ├── banned-words-main.js  ← renamed
    │   ├── banned-words-state.js ← NEW
    │   └── ...
    └── mapper/
        ├── mapper-main.js        ← merged init+main
        ├── mapper-state.js
        ├── mapper-data-categories.js    ← split
        ├── mapper-data-characteristics.js
        ├── mapper-data-options.js
        ├── mapper-data-marketplaces.js
        ├── mapper-data-mappings.js
        ├── mapper-data-common.js
        └── ... (решта файлів)
```

---

## Відкриті питання (обговорити перед Фазою 4)

1. **mapper entity файли** — розбивати кожну сутність (categories, characteristics,
   options, marketplaces) на окремі -table/-crud файли, чи залишити як є?
   Кожен ~1,000-1,500 рядків.

2. **mapper/ підпапки** — робити `mapper/import/`, `mapper/categories/` і т.д.,
   чи залишити все плоско з префіксами?

3. **select.js (716 рядків)** — розбивати на select-core + select-search +
   select-multi, чи залишити як єдиний компонент?

4. **Чи потрібні плагіни для glossary?** — модуль дуже малий (475 рядків),
   plugins можуть бути зайвими.
