# UI Actions System - Архітектура та Використання

> Універсальна система обробки дій для кнопок в таблицях та списках

## Зміст

1. [Огляд](#огляд)
2. [Архітектура](#архітектура)
3. [API Reference](#api-reference)
4. [Приклади використання](#приклади-використання)
5. [Зареєстровані контексти](#зареєстровані-контексти)
6. [Шаблон для нових файлів](#шаблон-для-нових-файлів)
7. [Міграція зі старого коду](#міграція-зі-старого-коду)

---

## Огляд

### Що це?

`ui-actions.js` — централізована система для обробки кліків на action-кнопках (редагувати, видалити, переглянути тощо). Замість того щоб на кожну кнопку вішати окремий `addEventListener`, система використовує **делегування подій** та **data-атрибути**.

### Переваги

- **Єдиний підхід** — всі файли використовують однакову логіку
- **Менше коду** — немає повторюваних `querySelectorAll().forEach(addEventListener)`
- **Автоматичний loading** — кнопка показує спінер під час виконання
- **Легко тестувати** — можна викликати дії програмно через `executeAction()`
- **Типізовані дії** — стандартні іконки та підписи для edit, delete, view, unlink, unmap

### Принцип роботи

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLOW DIAGRAM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. РЕЄСТРАЦІЯ (при завантаженні модуля)                        │
│     registerActionHandlers('context', { action: handler })       │
│                           ↓                                      │
│  2. ГЕНЕРАЦІЯ HTML (при рендерингу таблиці)                     │
│     actionButton({ action: 'edit', rowId: '123' })              │
│                           ↓                                      │
│  3. ІНІЦІАЛІЗАЦІЯ (після рендерингу)                            │
│     initActionHandlers(container, 'context')                     │
│                           ↓                                      │
│  4. КЛІК (користувач клікає на кнопку)                          │
│     Event delegation знаходить кнопку з data-action             │
│                           ↓                                      │
│  5. ВИКОНАННЯ                                                    │
│     handler(rowId, data) → await edit(rowId)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Архітектура

### Файлова структура

```
js/
├── common/
│   └── ui-actions.js          # Ядро системи
├── mapper/
│   ├── mapper-table.js        # Реєструє: mapper-categories, mapper-characteristics,
│   │                          #           mapper-options, mapper-marketplaces
│   ├── mapper-categories.js   # Реєструє: category-characteristics
│   ├── mapper-characteristics.js # Реєструє: characteristic-options, mp-characteristic-mapping
│   └── mapper-options.js      # Реєструє: option-dependent-chars, mp-option-mapping
├── brands/
│   ├── brands-table.js        # Реєструє: brands
│   └── lines-table.js         # Реєструє: brand-lines
├── keywords/
│   └── keywords-table.js      # Реєструє: keywords
├── banned-words/
│   ├── banned-words-manage.js # Реєструє: banned-words-manage
│   └── banned-words-check.js  # Реєструє: banned-words-check-{tabId}
├── glossary/
│   └── glossary-articles.js   # Реєструє: glossary
└── products/
    └── main-products.js       # Реєструє: products
```

### Ключові компоненти

#### 1. Action Registry (Реєстр обробників)

```javascript
// Структура:
const actionRegistry = new Map();
// { 'context-name': Map { 'action': handler } }

// Приклад вмісту:
{
  'mapper-categories': {
    'edit': (rowId) => showEditCategoryModal(rowId),
    'view': (rowId) => showViewMpCategoryModal(rowId)
  },
  'brands': {
    'edit': (rowId) => showEditBrandModal(rowId)
  }
}
```

#### 2. Data Attributes (HTML)

```html
<button class="btn-icon"
        data-action="edit"           <!-- Назва дії -->
        data-row-id="123"            <!-- ID елемента -->
        data-context="brands"        <!-- Контекст (опціонально) -->
        data-mapping-id="456"        <!-- Додаткові дані -->
        data-tooltip="Редагувати">   <!-- Підказка -->
    <span class="material-symbols-outlined">edit</span>
</button>
```

#### 3. Event Delegation

```javascript
// Один обробник на весь контейнер
container.addEventListener('click', async (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;      // 'edit'
    const rowId = button.dataset.rowId;        // '123'
    const context = button.dataset.context;    // 'brands'

    const handler = findHandler(context, action);
    await handler(rowId, data);
});
```

---

## API Reference

### `registerActionHandlers(context, handlers)`

Реєструє обробники для контексту.

```javascript
registerActionHandlers('mapper-characteristics', {
    edit: async (rowId, data) => {
        const { showEditCharacteristicModal } = await import('./mapper-characteristics.js');
        await showEditCharacteristicModal(rowId);
    },
    delete: async (rowId, data) => {
        if (confirm(`Видалити ${data.name}?`)) {
            await deleteCharacteristic(rowId);
        }
    },
    view: async (rowId) => {
        await showViewModal(rowId);
    }
});
```

**Параметри:**
- `context` (string) — унікальний ідентифікатор контексту
- `handlers` (object) — об'єкт `{ action: handler }`

**Handler приймає:**
- `rowId` (string) — ID елемента з `data-row-id`
- `data` (object) — всі `data-*` атрибути (camelCase)
- `context` (string) — контекст

---

### `initActionHandlers(container, defaultContext, options?)`

Ініціалізує делегування подій на контейнері.

```javascript
const cleanup = initActionHandlers(tableContainer, 'brands', {
    onBeforeAction: (action, rowId) => {
        console.log(`Starting ${action}...`);
        return true; // false скасує дію
    },
    onAfterAction: (action, rowId) => {
        console.log(`Finished ${action}`);
    },
    onError: (error, action, rowId) => {
        showToast(error.message, 'error');
    }
});

// Очистка (опціонально):
cleanup();
```

**Параметри:**
- `container` (HTMLElement) — контейнер для делегування
- `defaultContext` (string) — контекст за замовчуванням
- `options.onBeforeAction` — callback перед дією
- `options.onAfterAction` — callback після дії
- `options.onError` — callback при помилці

**Повертає:** функцію для видалення обробника

---

### `actionButton(options)`

Генерує HTML для кнопки дії.

```javascript
// Простий варіант
actionButton({ action: 'edit', rowId: '123' })
// → <button class="btn-icon" data-action="edit" data-row-id="123" data-tooltip="Редагувати">
//       <span class="material-symbols-outlined">edit</span>
//   </button>

// З додатковими опціями
actionButton({
    action: 'unlink',
    rowId: '123',
    context: 'category-characteristics',
    icon: 'link_off',
    tooltip: 'Відв\'язати характеристику',
    data: { name: 'Колір', categoryId: '456' },
    className: 'btn-danger'
})
```

**Опції:**
| Параметр | Тип | Опис |
|----------|-----|------|
| `action` | string | Назва дії (edit, delete, view, unlink, unmap) |
| `rowId` | string | ID елемента |
| `icon` | string | Material icon (за замовчуванням з ACTION_ICONS) |
| `tooltip` | string | Підказка (за замовчуванням з ACTION_LABELS) |
| `context` | string | Контекст (якщо відрізняється від default) |
| `data` | object | Додаткові data-атрибути |
| `className` | string | Додаткові CSS класи |
| `label` | string | Текст кнопки (замість іконки) |
| `extraClass` | string | Alias для className |
| `title` | string | Alias для tooltip |

---

### `actionButtons(rowId, actions, options?)`

Генерує групу кнопок.

```javascript
actionButtons('123', ['edit', 'delete'])
// → <button data-action="edit" ...>...</button>
//   <button data-action="delete" ...>...</button>

actionButtons('123', [
    'edit',
    { action: 'unlink', data: { name: 'Test' } }
], { context: 'mapper-characteristics' })
```

---

### `executeAction(context, action, rowId, data?)`

Виконує дію програмно.

```javascript
await executeAction('brands', 'edit', '123', { name: 'Nike' });
```

---

### `hasActionHandler(context, action)`

Перевіряє наявність обробника.

```javascript
if (hasActionHandler('brands', 'delete')) {
    // ...
}
```

---

### Константи

```javascript
import { ACTION_ICONS, ACTION_LABELS } from '../common/ui-actions.js';

ACTION_ICONS.edit    // 'edit'
ACTION_ICONS.delete  // 'delete'
ACTION_ICONS.view    // 'visibility'
ACTION_ICONS.unlink  // 'link_off'
ACTION_ICONS.unmap   // 'link_off'

ACTION_LABELS.edit   // 'Редагувати'
ACTION_LABELS.delete // 'Видалити'
ACTION_LABELS.view   // 'Переглянути'
ACTION_LABELS.unlink // 'Відв\'язати'
```

---

## Приклади використання

### Приклад 1: Проста таблиця з edit

```javascript
// brands-table.js
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

// 1. РЕЄСТРАЦІЯ (на верхньому рівні модуля)
registerActionHandlers('brands', {
    edit: async (rowId) => {
        const { showEditBrandModal } = await import('./brands-crud.js');
        await showEditBrandModal(rowId);
    }
});

// 2. ГЕНЕРАЦІЯ (в конфігурації таблиці)
tableAPI = createPseudoTable(container, {
    columns: getColumns(),
    rowActionsCustom: (row) => actionButton({
        action: 'edit',
        rowId: row.brand_id,
        context: 'brands'
    }),
    // 3. ІНІЦІАЛІЗАЦІЯ (після рендерингу)
    onAfterRender: (container) => initActionHandlers(container, 'brands')
});
```

### Приклад 2: Таблиця з кількома діями

```javascript
// keywords-table.js
registerActionHandlers('keywords', {
    edit: async (rowId) => {
        const { showEditKeywordModal } = await import('./keywords-crud.js');
        await showEditKeywordModal(rowId);
    },
    view: async (rowId) => {
        const { showGlossaryModal } = await import('./keywords-crud.js');
        await showGlossaryModal(rowId);
    }
});

// В rowActionsCustom:
rowActionsCustom: (row) => {
    const hasGlossary = row.glossary_text?.trim();
    const extraClass = hasGlossary ? 'severity-low' : 'severity-high';

    return `
        ${actionButton({ action: 'view', rowId: row.local_id, context: 'keywords', extraClass })}
        ${actionButton({ action: 'edit', rowId: row.local_id, context: 'keywords' })}
    `;
}
```

### Приклад 3: Кнопка з додатковими даними

```javascript
// mapper-options.js
registerActionHandlers('mp-option-mapping', {
    unmap: async (rowId, data) => {
        const mappingId = data.mappingId;
        if (mappingId) {
            await deleteOptionMapping(mappingId);
            showToast('Маппінг видалено', 'success');
        }
    }
});

// В HTML:
actionButton({
    action: 'unmap',
    rowId: item.id,
    context: 'mp-option-mapping',
    data: { mappingId: item._mappingId }
})
```

### Приклад 4: Динамічний контекст

```javascript
// banned-words-check.js (для кожного табу свій контекст)
registerActionHandlers(`banned-words-check-${tabId}`, {
    view: async (rowId, data) => {
        const rowIndex = data.rowIndex;
        await showProductTextModal(rowId, sheetName, parseInt(rowIndex));
    }
});

// В rowActionsCustom:
actionButton({
    action: 'view',
    rowId: row.id,
    context: `banned-words-check-${tabId}`,
    data: { rowIndex: row._rowIndex }
})

// В onAfterRender:
initActionHandlers(container, `banned-words-check-${tabId}`);
```

### Приклад 5: Не-табличний контент (статті)

```javascript
// glossary-articles.js
registerActionHandlers('glossary', {
    edit: async (rowId) => {
        await loadKeywords();
        const { showEditKeywordModal } = await import('../keywords/keywords-crud.js');
        await showEditKeywordModal(rowId);
    },
    add: async (rowId) => {
        await loadKeywords();
        const { showEditKeywordModal } = await import('../keywords/keywords-crud.js');
        await showEditKeywordModal(rowId);
    }
});

// В HTML статті:
`<div class="section-name">
    <h2>${item.name}</h2>
    ${actionButton({ action: 'edit', rowId: item.id, context: 'glossary' })}
</div>`

// Після рендерингу:
dom.contentContainer.innerHTML = articlesHtml.join('');
initActionHandlers(dom.contentContainer, 'glossary');
```

---

## Зареєстровані контексти

| Контекст | Файл | Дії |
|----------|------|-----|
| `mapper-categories` | mapper-table.js | edit, view |
| `mapper-characteristics` | mapper-table.js | edit, view |
| `mapper-options` | mapper-table.js | edit, view |
| `mapper-marketplaces` | mapper-table.js | edit, view |
| `category-characteristics` | mapper-categories.js | edit, unlink |
| `characteristic-options` | mapper-characteristics.js | edit |
| `mp-characteristic-mapping` | mapper-characteristics.js | unmap |
| `option-dependent-chars` | mapper-options.js | edit |
| `mp-option-mapping` | mapper-options.js | unmap |
| `brands` | brands-table.js | edit |
| `brand-lines` | lines-table.js | edit |
| `keywords` | keywords-table.js | edit, view |
| `banned-words-manage` | banned-words-manage.js | edit |
| `banned-words-check-{tabId}` | banned-words-check.js | view |
| `glossary` | glossary-articles.js | edit, add |
| `products` | main-products.js | edit, variants |

---

## Шаблон для нових файлів

```javascript
// js/module-name/module-table.js

import { createPseudoTable } from '../common/ui-table.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('module-context', {
    edit: async (rowId) => {
        const { showEditModal } = await import('./module-crud.js');
        await showEditModal(rowId);
    },
    delete: async (rowId, data) => {
        if (confirm(`Видалити "${data.name}"?`)) {
            await deleteItem(rowId);
            renderTable();
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// РЕНДЕРИНГ ТАБЛИЦІ
// ═══════════════════════════════════════════════════════════════════════════

let tableAPI = null;

export function renderTable() {
    const container = document.getElementById('table-container');
    if (!container) return;

    tableAPI = createPseudoTable(container, {
        columns: [
            { id: 'id', label: 'ID' },
            { id: 'name', label: 'Назва' }
        ],
        rowActionsCustom: (row) => `
            ${actionButton({ action: 'edit', rowId: row.id, context: 'module-context' })}
            ${actionButton({ action: 'delete', rowId: row.id, context: 'module-context', data: { name: row.name } })}
        `,
        rowActionsHeader: ' ',
        onAfterRender: (container) => initActionHandlers(container, 'module-context')
    });
}
```

---

## Міграція зі старого коду

### Було (старий підхід):

```javascript
// Генерація кнопки
rowActionsCustom: (row) => `
    <button class="btn-icon btn-edit" data-id="${row.id}">
        <span class="material-symbols-outlined">edit</span>
    </button>
`,

// Обробка
function attachRowEventHandlers(container) {
    container.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            if (id) {
                await showEditModal(id);
            }
        });
    });
}

// Виклик після рендерингу
onAfterRender: attachRowEventHandlers
```

### Стало (новий підхід):

```javascript
// На верхньому рівні модуля
registerActionHandlers('my-context', {
    edit: async (rowId) => {
        await showEditModal(rowId);
    }
});

// В конфігурації таблиці
rowActionsCustom: (row) => actionButton({
    action: 'edit',
    rowId: row.id,
    context: 'my-context'
}),

onAfterRender: (container) => initActionHandlers(container, 'my-context')
```

### Чек-ліст міграції:

1. [ ] Додати import для `registerActionHandlers`, `initActionHandlers`, `actionButton`
2. [ ] Винести обробники в `registerActionHandlers()` на верхній рівень модуля
3. [ ] Замінити HTML кнопок на `actionButton()`
4. [ ] Замінити `attachRowEventHandlers` на `initActionHandlers` в `onAfterRender`
5. [ ] Видалити стару функцію `attachRowEventHandlers`

---

## Debugging

### Логування

Система автоматично логує реєстрацію:
```
📋 [Actions] Зареєстровано 2 дій для "brands"
```

Помилки при відсутності обробника:
```
[Actions] No handler for action "delete" in context "brands"
```

### Перевірка зареєстрованих дій

```javascript
import { getRegisteredActions } from '../common/ui-actions.js';

console.log(getRegisteredActions('brands')); // ['edit']
console.log(getRegisteredActions('keywords')); // ['edit', 'view']
```

### Виконання дії з консолі

```javascript
import { executeAction } from '../common/ui-actions.js';

await executeAction('brands', 'edit', '123');
```

---

## FAQ

**Q: Коли використовувати `context` в `actionButton()`?**

A: Коли в одному контейнері є кнопки з різними контекстами. Якщо всі кнопки мають один контекст — він передається в `initActionHandlers()` як `defaultContext`.

**Q: Як передати додаткові дані в обробник?**

A: Через параметр `data`:
```javascript
actionButton({
    action: 'delete',
    rowId: '123',
    data: { name: 'Test', categoryId: '456' }
})
// Обробник отримає: handler('123', { name: 'Test', categoryId: '456' })
```

**Q: Чи можна викликати дію без кліку?**

A: Так, через `executeAction()`:
```javascript
await executeAction('brands', 'edit', '123');
```

**Q: Як оновити обробники після перезавантаження даних?**

A: Обробники реєструються один раз при завантаженні модуля. `initActionHandlers()` потрібно викликати після кожного рендерингу, якщо контейнер пересоздається.

---

*Документація оновлена: 2026-01-31*
