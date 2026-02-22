# План: Динамічна форма характеристик товару

## Проблема

При викладці товарів треба заповнювати характеристики. Характеристики мають різні типи (текст, число, селект, textarea, чекбокси), різну ширину (повний рядок vs 3 дрібних інпути в ряд), і їх неможливо прописувати вручну — форма має генеруватись автоматично з конфігурації.

## Дослідження

Проаналізовано підходи: Rozetka, Shopify, Magento (EAV), Akeneo PIM, Saleor, Prom.ua, commercetools, JSON Forms.

**Ключові висновки:**
- Всі платформи використовують **config-driven rendering**: тип атрибуту → віджет
- Групування в секції: Magento (Attribute Sets → Groups), Akeneo (Families → Attribute Groups) — рендеряться як таби/секції
- **"3 інпути в рядку"** — жодна платформа не підтримує нативно, крім JSON Forms (`HorizontalLayout`). Всі роблять через CSS grid
- Найближчий до нас підхід: **Akeneo** (config-driven, groups → attributes, field provider pattern) + **commercetools** (`inputHint` для підказки рендеру)

## Що вже є

| Компонент | Статус |
|-----------|--------|
| 9 типів характеристик (TextInput, Decimal, TextArea, List, ComboBox, ListValues, CheckBoxGroup, MultiText, Integer) | Є в `Mapper_Characteristics` |
| Опції для List/ComboBox типів | Є в `Mapper_Options` |
| Прив'язка до категорій (`category_ids`, `is_global`) | Є |
| Блоки (block_number 1-9) = секції форми | Є |
| CSS grid система (form-grid-2/3/4) | Є |
| Custom select компонент | Є |
| Модальна система (fullscreen + sidebar nav) | Є |

## Що треба додати

### Крок 1: Нова колонка `display_width` в Google Sheets

Додати колонку **L** до аркуша `Mapper_Characteristics`.

**Значення:**
| display_width | Ширина | CSS grid-column | Приклад |
|---------------|--------|-----------------|---------|
| `4` (default) | Повний рядок | `span 4` | TextArea, опис |
| `2` | Половина рядка | `span 2` | Звичайні текстові поля, селекти |
| `1` | Чверть рядка | `span 1` | Білок%, Вуглеводи%, Жири% |

Грід завжди 4 колонки. Поля автоматично заповнюють рядки за рахунок CSS grid auto-flow.

**Приклад: "Харчова цінність"**
```
[ Білок (1) ][ Вуглеводи (1) ][ Жири (1) ][ Калорійність (1) ]
```

**Приклад: "Звичайні поля"**
```
[ Вага (2)              ][ Розмір порції (2)      ]
[ Опис складу (4)                                  ]
```

**Зміни в коді:**

`mapper-data.js` — розширити range до `A:L`, додати `display_width` в addCharacteristic / updateCharacteristic / loadCharacteristics.

`mapper-characteristics.js` — додати поле `display_width` у форму редагування характеристики (select: 1, 2, 4).

`mapper-characteristic-edit.html` — додати select для display_width поряд з unit/filter.

---

### Крок 2: Модуль рендерингу форми `product-char-form.js`

Новий файл: **`js/product/product-char-form.js`**

#### Головна функція

```js
/**
 * Рендерить форму характеристик для товару
 * @param {HTMLElement} container — куди вставити
 * @param {string} categoryId — ID категорії товару
 * @param {Object} values — поточні значення {charId: value}
 * @returns {Object} API: getValues(), setValues(), validate()
 */
export function renderCharacteristicsForm(container, categoryId, values = {})
```

#### Алгоритм рендерингу

```
1. Отримати характеристики для категорії:
   - is_global === TRUE → завжди показувати
   - category_ids містить categoryId → показувати

2. Згрупувати по block_number → секції

3. Для кожної секції:
   3.1 Рендерити section-header з назвою блоку
   3.2 Створити form-grid (4 колонки)
   3.3 Для кожної характеристики в блоці:
       - Визначити віджет по type
       - Встановити grid-column: span {display_width}
       - Рендерити .group.column з label + widget
       - Якщо є unit → показати суфікс
       - Якщо є значення в values → заповнити
```

#### Маппінг type → widget

```js
const WIDGET_MAP = {
    TextInput:      (char) => `<input type="text" class="input-main">`,
    MultiText:      (char) => `<input type="text" class="input-main" data-multi-text>`,
    Decimal:        (char) => `<input type="number" step="0.01" class="input-main">`,
    Integer:        (char) => `<input type="number" step="1" class="input-main">`,
    TextArea:       (char) => `<textarea class="input-main" rows="3"></textarea>`,
    List:           (char, options) => renderSelect(char, options, false),
    ComboBox:       (char, options) => renderSelect(char, options, true),
    ListValues:     (char, options) => renderSelect(char, options, false, true),
    CheckBoxGroup:  (char, options) => renderCheckboxGroup(char, options)
};
```

#### Допоміжні рендери

```js
// Select (single / multi / з можливістю ввести своє)
function renderSelect(char, options, allowCustom, multiple) → HTML

// Група чекбоксів
function renderCheckboxGroup(char, options) → HTML

// Обгортка поля з label, unit suffix, grid-column
function renderField(char, widgetHtml) → HTML
```

#### API об'єкт (повертається з renderCharacteristicsForm)

```js
return {
    // Зібрати всі значення з форми
    getValues()   → { charId: value, ... },

    // Встановити значення (наприклад при завантаженні товару)
    setValues(values),

    // Валідація (required поля, числові діапазони)
    validate()    → { valid: boolean, errors: [] },

    // Знищити (cleanup listeners)
    destroy()
};
```

---

### Крок 3: CSS для 4-колоночного гріда

Додати в `css/components/forms/form-group.css` або окремий файл:

```css
/* Грід характеристик товару: 4 колонки */
.char-form-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    align-content: start;
}

.char-form-grid > [data-width="1"] { grid-column: span 1; }
.char-form-grid > [data-width="2"] { grid-column: span 2; }
.char-form-grid > [data-width="4"] { grid-column: span 4; }

/* Суфікс одиниці виміру */
.char-field-with-unit {
    display: flex;
    align-items: center;
    gap: 8px;
}

.char-field-with-unit .input-main {
    flex: 1;
}

.char-unit-suffix {
    color: var(--color-on-surface-v);
    white-space: nowrap;
}

/* Responsive: на мобільних — 1 колонка */
@media (max-width: 768px) {
    .char-form-grid {
        grid-template-columns: 1fr;
    }
    .char-form-grid > [data-width] {
        grid-column: span 1;
    }
}
```

---

### Крок 4: Секції блоків

Назви блоків (вже визначені в системі):

```js
const BLOCK_NAMES = {
    1: { name: 'Скільки там?', icon: 'scale',           desc: 'Вага, порції, капсули, розмір' },
    2: { name: 'Який він?',    icon: 'category',         desc: 'Вид, тип, матеріал, форма, склад' },
    3: { name: 'Кому це?',     icon: 'group',            desc: 'Стать, вік' },
    4: { name: 'Навіщо це?',   icon: 'target',           desc: 'Призначення, дія, особливості' },
    5: { name: 'Звідки це?',   icon: 'public',           desc: 'Країна, коди, сертифікати' },
    6: { name: 'Куди відправляти?', icon: 'local_shipping', desc: 'Упаковка, габарити' },
    8: { name: 'Варіант',      icon: 'palette',          desc: 'Смак, колір, EAN' },
    9: { name: 'Інше',         icon: 'more_horiz',       desc: 'Комплектація, системні поля' }
};
```

Рендер секції:

```html
<section id="section-block-{N}">
    <div class="section-header">
        <div class="section-name-block">
            <div class="section-name">
                <span class="material-symbols-outlined">{icon}</span>
                <h2>{name}</h2>
                <span class="word-chip">{count}</span>
            </div>
            <span class="body-s">{desc}</span>
        </div>
    </div>
    <div class="section-content">
        <div class="char-form-grid">
            <!-- Поля характеристик цього блоку -->
        </div>
    </div>
</section>
```

---

### Крок 5: Інтеграція

Форма характеристик може використовуватись де завгодно:

```js
import { renderCharacteristicsForm } from './product/product-char-form.js';

// В будь-якому модалі/сторінці
const container = document.getElementById('product-characteristics');
const formAPI = renderCharacteristicsForm(container, 'cat-000003', existingValues);

// При збереженні
const values = formAPI.getValues();
// → { "char-000001": "25", "char-000005": "opt-000012", ... }
```

---

## Приклад результату

Для категорії "Протеїн" форма автоматично згенерує:

```
╔══════════════════════════════════════════════════════════════╗
║  ⚖️ Скільки там?                                    [3]    ║
╠══════════════════════════════════════════════════════════════╣
║  [ Вага _______ г ]  [ Кількість порцій _______ шт ]       ║
║  [ Розмір порції _______ г ]  [ Кількість капсул ___ шт ]  ║
╠══════════════════════════════════════════════════════════════╣
║  🏷️ Який він?                                       [5]    ║
╠══════════════════════════════════════════════════════════════╣
║  [ Вид протеїну  ▾ ]         [ Форма випуску  ▾ ]          ║
║  [ Білок % ][ Вуглеводи % ][ Жири % ][ Калорійність kcal ] ║
║  [ Склад (textarea, на всю ширину)                        ] ║
╠══════════════════════════════════════════════════════════════╣
║  👥 Кому це?                                        [2]    ║
╠══════════════════════════════════════════════════════════════╣
║  [ Стать  ▾ ]                [ Вікова група  ▾ ]           ║
╠══════════════════════════════════════════════════════════════╣
║  🎯 Навіщо це?                                      [3]    ║
╠══════════════════════════════════════════════════════════════╣
║  [ ☑ Набір маси  ☑ Схуднення  ☐ Витривалість  ☐ Сила ]    ║
║  [ Особливості (textarea)                                 ] ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Порядок реалізації

| # | Задача | Файли | Залежності |
|---|--------|-------|------------|
| 1 | Додати `display_width` колонку в Sheets | Google Sheets (ручна дія) | — |
| 2 | Оновити mapper-data.js: range A:L, read/write display_width | `js/mapper/mapper-data.js` | #1 |
| 3 | Додати display_width в форму характеристики | `js/mapper/mapper-characteristics.js`, `templates/modals/mapper-characteristic-edit.html` | #2 |
| 4 | CSS для char-form-grid | `css/components/forms/form-group.css` або новий файл | — |
| 5 | Створити product-char-form.js (рендерер) | `js/product/product-char-form.js` (новий) | #2, #4 |
| 6 | Інтеграція в потрібне місце | залежить від контексту | #5 |

---

## Рішення по layout: `display_width`

Обрано підхід **display_width** (аналог `inputHint` в commercetools):

**Чому не display_group?**
- `display_width` + CSS grid auto-flow дає той самий ефект без додаткової колонки
- Поля з `display_width: 1` автоматично стають в ряд (до 4 штук)
- Простіше конфігурувати — один параметр замість двох
- Якщо потрібно явне групування — block_number вже це робить на рівні секцій

**Чому 4 колонки?**
- 4 ділиться на 1, 2, 4 — покриває всі кейси
- `1` = дрібні поля (%, калорійність) — до 4 в ряд
- `2` = стандартні поля — 2 в ряд (як зараз form-grid-2)
- `4` = textarea, довгий текст — повна ширина
- На мобільних — автоматично 1 колонка
