# Pinguin Next — база спільного UI

> **Спільні правила для наступних змін:** [зведений контракт, погоджена геометрія та реєстр помилок](../project-rules.md); [процес інтеграції](../project-rules.md#8-процес-і-якість). При суперечності старих описів із новими рішеннями перевіряти актуальний компонент і прямі уточнення власника; зокрема labels тепер постійні над полями ([field.md](field.md)), а footer приймає контекстну пагінацію ([pagination.md](pagination.md)).

Статус: робочий стандарт гілки `work`, деталізує [канонічні правила](../conventions.md), [зведені правила UI й реалізації](../project-rules.md). Погоджений скелетон Shell не змінюється під час створення компонентів.

## Відповідальність і розміщення

- `src/ui/<component>/<component>.js` — поведінка й DOM одного універсального компонента. Інструменти імпортують UI, але UI не імпортує інструменти.
- `src/ui/<component>/<component>.css` — **тільки** стилі цього компонента, його елементів та станів. Інші CSS-файли не змінюють його вигляд.
- `src/ui/<component>/<component>.test.js` — ізольована перевірка логіки, якщо її можна тестувати без браузера.
- `tests/e2e/<component>.spec.js` — відтворювана перевірка браузерної взаємодії, позиціювання, адаптивності та доступності.
- `src/styles/tokens.css` — семантичні кольори для світлої/темної теми, спільні відступи, типографіка й часові токени. Сирі кольори в CSS компонентів заборонено.
- `docs/ui/<component>.md` — призначення, порівняння з legacy, вивчена практика, рішення, API, стани, edge cases, критерії готовності.

Назви компонентів і класів: lowercase kebab-case, `pg-` + BEM; поведінковий стан — `data-pg-state`; Google Material Symbols Rounded зберігаються локально в `src/ui/icon/material-symbols.js` і створюються тільки через `src/ui/icon/icon.js` ([контракт](icons.md)). Візуальний стан не є бізнес-станом. У файлів є шапка з призначенням, залежностями, API та принципами.

## Компонентний контракт

Підключувані поведінки та lifecycle: [дослідження шармів legacy](../legacy-behavior-research.md). Насамперед перевикористовуємо готові компоненти й native browser APIs; поведінки отримують елемент та callbacks явно.

1. Видимість і поведінка визначені одним джерелом істини; не читати стан із CSS і не зав'язувати логіку на DOM вигляд.
2. Компонент не створює глобальних `window.*` API; глобальне монтування — явне в `src/main.js` або Shell, з повним очищенням при HMR.
3. API зрозумілий і стабільний; не переносимо назви та хаотичні параметри зі старого V5 без розгляду.
4. `textContent` для повідомлень та користувацьких текстів; жодної небезпечної ін'єкції `innerHTML`.
5. Клавіатура, видимий фокус, скринридер, мобільна ширина й `prefers-reduced-motion` перевіряються окремо.
6. Тимчасові компоненти не змінюють сітку Shell, його відступи чи місця чотирьох кутових кнопок.
7. Перед новим компонентом звірити `legacy`, канонічні правила, існуючі `src/ui` та актуальні стандарти.
8. Документацію й контракт створити **перед** кодом, потім прогнати `npm run check` та `npm run test:e2e`. Preview підтверджується окремо.

## Реєстр UI

| Компонент | Місце | Стан |
| --- | --- | --- |
| Іконки | `src/ui/icon` | [Google Material Symbols Rounded, локальні SVG](icons.md) |
| Кнопки | `src/ui/button` | Є |
| Tooltip | `src/ui/tooltip` | Є, збережено корисну поведінку legacy |
| Tabs | `src/ui/tabs` | Є |
| Page view | `src/ui/page` | Є |
| Data row | `src/ui/data-row` | Є |
| Collection View | `src/ui/collection-view` | [Dense table and optional tiles](collection-view.md) |
| View Switch | `src/ui/view-switch` | Contextual header mode control; [collection contract](collection-view.md) |
| Toast | `src/ui/toast` | [Специфікація](toast.md), перший новий компонент |
| Dialog / Confirm | `src/ui/dialog` | [Специфікація](dialog.md): native modal + blur |
| Input / Search field | `src/ui/input` | [Дослідження, контракт та реалізація](input.md): floating, standard, search; supports flexible adornments |
| Shared Field | `src/ui/field` | [One plain outline, static label above, leading/trailing slots](field.md) |
| Native Select | `src/ui/select` | Native browser choice with shared floating label; [contract](selection-fields.md) |
| Combobox | `src/ui/combobox` | Editable selection, async search and keyboard listbox; [contract](selection-fields.md) |
| Listbox | `src/ui/listbox` | [Single/multiple listbox with chips, search and select-all](listbox.md) |
| Menu | `src/ui/menu` | [Keyboard action/check menus](menu.md) |
| Image Field | `src/ui/image-field` | [Local image preview, drag/drop and URL cleanup](image-field.md) |
| Tag Field | `src/ui/tag-field` | Independent tag collection, paste parsing, two-step removal, undo; [contract](tag-field.md) |
| Form Dialog | `src/ui/form-dialog` | Shared Dialog composition with validation and dirty close guard; [contract](form-dialog.md) |
| Section navigator | `src/ui/section-navigator` | [Дослідження, API та жести](section-navigator.md): незалежні блоки, boundary scroll, ручки й кнопки |
| Rich Text Editor | `src/ui/rich-text-editor` | [WYSIWYG ↔ редагований HTML, один документ, модульний toolbar і stats](rich-text-editor.md); [дослідження](../research/rich-text-editor.md) |
| Textarea | `src/ui/textarea` | [Multiline native editor, auto-height and count](textarea.md) |
| Number Field | `src/ui/number-field` | [Native numeric steps, units and validation](number-field.md) |
| Checkbox | `src/ui/checkbox` | [Native two-state and mixed-state control](choice-controls.md) |
| Switch | `src/ui/switch` | [Native on/off semantics, async rollback](choice-controls.md) |
| Radio Group | `src/ui/radio-group` | [Native exclusive selection with fieldset/legend](choice-controls.md) |

Не ставити кнопки-пустушки на затверджений скелетон для демонстрації UI. Тестові сценарії повинні використовувати ізольовані перевірки й не вдавати готові інструменти.

**Тимчасовий виняток, прямо погоджений власником (2026-11-05):** на тестовій сторінці `/tools` дозволено одну діючу кнопку виклику Toast у робочому блоці. Її розміщено в ізольованому [toast-demo](toast.md#8-тимчасова-кнопка-перевірки-2026-11-05); вона не є частиною Shell або готового інструмента, не використовує випадкові inline стилі й легко прибирається.


## Незалежні вкладки та Dialog

`Таблиці` та `Текст` мають **окремі DOM-панелі та власні елементи createPageView**. Перемикання не змішує стан інструментів; активна панель видима, інша прихована. Toast демонструється тільки у «Таблицях», Dialog/Confirm — тільки у «Тексті». Обидва блоки легко видалити без змін Shell.

Для Dialog: [специфікація](dialog.md), `src/ui/dialog/dialog.js`, `src/ui/dialog/dialog.css`, `tests/e2e/dialog.spec.js`. Тло розмиває native `::backdrop` з `backdrop-filter: blur(8px)`; дані й фокус ізольовані браузерним `showModal()`. Кольори в `src/styles/tokens.css`.

| Pagination | `src/ui/pagination` | [Shared numbered pages, ellipsis and page size](pagination.md) |
| Segmented Switch | `src/ui/segment-switch` | [Native radio choice with sliding plate](segment-switch.md) |
