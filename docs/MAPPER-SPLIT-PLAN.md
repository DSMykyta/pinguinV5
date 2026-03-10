# План розділення Mapper на окремі модулі

## Поточний стан

Одна сторінка `mapper.html` з 4 табами (Категорії, Характеристики, Опції, Маркетплейси).
Все в одній папці `js/pages/mapper/` — 20+ файлів.

## Проблема

- Маркетплейси вантажать сутності, хоча не потрібні
- Сутності — це спільний ресурс для 3+ сторінок (brands, products, marketplaces)
- Порушується закон "один файл — одна роль" при такому масштабі

## Нова архітектура

### Спільний data layer: `js/data/`

Дані які потрібні кільком сторінкам — виносяться з pages в спільний шар.

```
js/data/
├── entities-data.js      — load/get для категорій, характеристик, опцій (власні)
├── mp-data.js            — load/get для МП даних (МП категорії, МП характеристики, МП опції)
├── mappings-data.js      — load/get для маппінгів (зв'язки власних ↔ МП)
└── marketplaces-data.js  — load/get для списку маркетплейсів (Rozetka, Epicentr, ...)
```

Імпортери (будь-яка сторінка):
```js
import { getCategories, loadCategories } from '../../data/entities-data.js';
import { getMpCategories } from '../../data/mp-data.js';
import { getMapCategories } from '../../data/mappings-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
```

### Сторінка Entities: `entities.html` + `js/pages/entities/`

3 таби: Категорії, Характеристики, Опції (власні дані + bindings до МП).

```
js/pages/entities/
├── entities-main.js       — точка входу, loadPlugins, tab switching, auth
├── entities-state.js      — стан сторінки (activeTab, selectedRows, visibleColumns)
├── entities-table.js      — рендеринг 3 таблиць (categories, characteristics, options)
├── entities-events.js     — обробники подій (refresh, bindings click)
├── entities-categories.js     — CRUD категорій + модалки
├── entities-characteristics.js — CRUD характеристик + модалки
├── entities-options.js        — CRUD опцій + модалки
├── entities-mapping-wizard.js              — wizard маппінгу категорій
├── entities-mapping-wizard-characteristics.js
├── entities-mapping-wizard-options.js
└── entities-polling.js    — фоновий polling маппінгів
```

Entry point: `js/main-entities.js`
```js
import { initCore } from './main-core.js';
import { initEntities } from './pages/entities/entities-main.js';
```

### Сторінка Marketplaces: `marketplaces.html` + `js/pages/marketplaces/`

Одна таблиця: список маркетплейсів + імпорт їх даних.

```
js/pages/marketplaces/
├── marketplaces-main.js    — точка входу, loadPlugins, auth
├── marketplaces-state.js   — стан сторінки
├── marketplaces-table.js   — рендеринг таблиці маркетплейсів
├── marketplaces-crud.js    — CRUD маркетплейсів + модалки
├── marketplaces-import.js         — імпорт даних
├── marketplaces-import-rozetka.js — адаптер Rozetka
├── marketplaces-import-epicentr.js — адаптер Epicentr
├── marketplaces-import-etalon.js  — адаптер Etalon
└── marketplaces-import-wizard.js  — wizard імпорту
```

Entry point: `js/main-marketplaces.js`
```js
import { initCore } from './main-core.js';
import { initMarketplaces } from './pages/marketplaces/marketplaces-main.js';
```

### Що видаляється

- `mapper.html` — замінюється на `entities.html` + `marketplaces.html`
- `js/main-mapper.js` — замінюється на `js/main-entities.js` + `js/main-marketplaces.js`
- `js/pages/mapper/` — вся папка (код мігрує в нові папки + js/data/)

### Що НЕ змінюється

- Модалки `templates/modals/mapper-*.html` — перейменувати чи залишити?
- CSS `css/components/mapper-*.css` — перейменувати чи залишити?
- `templates/aside/aside-mapper.html` — розділити на 2 aside шаблони

### Граф залежностей

```
js/data/  (спільний, без залежностей від pages)
   ↑               ↑               ↑
entities/      marketplaces/    products/    brands/
(свій state,    (свій state,     (імпортує    (імпортує
 table,          table,          entities-    entities-
 plugins)        plugins)        data.js)     data.js)
```

### Відкриті питання

1. Модалки — перейменувати `mapper-*` → `entities-*` / `marketplaces-*`?
2. CSS — перейменувати чи залишити `mapper-bindings.css`?
3. `mapper-data-helpers.js` (конфіг sheet names/GIDs) — розділити між entities-data і mp-data?
4. Aside шаблони — один `aside-entities.html` + один `aside-marketplaces.html`?
5. Навігація — додати обидві сторінки в nav menu?
