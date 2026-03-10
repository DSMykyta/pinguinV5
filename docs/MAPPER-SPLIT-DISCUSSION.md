# Обговорення розділення Mapper — чернетка

## Контекст

Розділити `mapper.html` на 2 окремі сторінки:
- `marketplaces.html` — список маркетплейсів + імпорт їх даних
- `entities.html` — таби Категорії, Характеристики, Опції

## Рішення 1: Дві окремі папки

Як brands і products — повністю незалежні ЛЕГО модулі:
- `js/pages/marketplaces/` — свій main, state, data, table, plugins
- `js/pages/entities/` — свій main, state, data, table, plugins

## Рішення 2: Спільний data layer

Entities — спільний ресурс для 3+ сторінок (brands, products, marketplaces).
Якщо кожна page імпортує з сусідньої page — це погано (ланцюжок залежностей).

Тому **виносимо дані в `js/data/`**:
```
js/data/
├── entities-data.js      — load/get категорій, характеристик, опцій
├── mp-data.js            — load/get МП даних
├── mappings-data.js      — load/get маппінгів
└── marketplaces-data.js  — load/get списку маркетплейсів
```

Будь-яка сторінка імпортує з `js/data/`, не з сусідньої page.

## Рішення 3: Table boilerplate — генерік

Зараз кожна page-table.js (products-table.js, brands-table.js, mapper-table.js) має ~274 рядки,
з яких реальна конфігурація — ~50 рядків. Решта — копіпаста:

1. **Columns** (~8 рядків) — `col('id', 'ID', 'tag')` — це унікальне для сторінки, ОК
2. **dataTransform** (~30 рядків) — підготовка даних (brandMap, catMap) — унікальне, ОК
3. **Batch actions** (~80 рядків) — copy/delete/deactivate — повторюваний патерн
4. **Action handlers** (~10 рядків) — edit → відкрити модалку — повторюваний патерн
5. **Boilerplate** (~50 рядків) — renderTable(), resetTableAPI(), init() — КОПІПАСТА скрізь

Ідея: зробити **генерік table factory** — файл поруч з `js/components/table/`,
який забирає boilerplate. Сторінка тільки передає конфіг (columns, actions, batch).

## Рішення 4: CRUD — генерік?

CRUD патерн теж повторюється:
1. Відкрити модалку
2. Заповнити поля з даних
3. Зібрати дані з форми
4. Викликати API (add/update/delete)
5. Оновити таблицю

Ідея: зробити **генерік CRUD factory** поруч з `js/components/editor/` або `js/components/modal/`.

**Проблема**: CRUD модалки бувають дуже різні (products має фото, варіанти, SEO).
Можливо генерік CRUD — тільки для простих сутностей (категорії, характеристики, опції, маркетплейси).

## Відкрите питання (зупинились тут)

Якщо зробити table factory і CRUD factory генеріками — це будуть:
- 2 нові файли в `js/components/` (поруч з table/ і editor/)
- Чи 2 нові папки?
- Чи це over-engineering?

По архітектурі PROJECT-OVERVIEW:
- `-plugin-manage` = CRUD таблиця
- `-plugin-batch` = масові операції
- `-plugin-data` = API запити

Ці ролі вже визначені. Питання — чи їх boilerplate можна винести в генерік,
щоб plugin-manage зводився до чистого конфігу колонок.

## Наступні кроки

1. Домовитись чи table factory і CRUD factory — це файли чи папки
2. Домовитись що саме генерік, а що залишається в page
3. Оновити MAPPER-SPLIT-PLAN.md з фінальною архітектурою
4. Почати реалізацію
