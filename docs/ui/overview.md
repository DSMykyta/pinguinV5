# Pinguin Next — база спільного UI

> **Спільні правила для наступних змін:** [погоджені правила UI, геометрії та реєстр помилок](../approved-ui-rules.md); [процес інтеграції](../implementation-rules.md). При суперечності старих описів із новими рішеннями перевіряти актуальний компонент і прямі уточнення власника; зокрема labels тепер постійні над полями ([field.md](field.md)), а footer приймає контекстну пагінацію ([pagination.md](pagination.md)).

Статус: робочий стандарт гілки `work`, деталізує [канонічні правила](../conventions.md), [погоджені правила UI](../approved-ui-rules.md) та [правила реалізації](../implementation-rules.md). Погоджений скелетон Shell не змінюється під час створення компонентів.

## Відповідальність і розміщення

- `src/ui/<component>/<component>.js` — поведінка й DOM одного універсального компонента. Інструменти імпортують UI, але UI не імпортує інструменти.
- `src/ui/<component>/<component>.css` — **тільки** стилі цього компонента, його елементів та станів. Інші CSS-файли не змінюють його вигляд.
- `src/ui/<component>/<component>.test.js` — ізольована перевірка логіки, якщо її можна тестувати без браузера.
- `tests/e2e/<component>.spec.js` — відтворювана перевірка браузерної взаємодії, позиціювання, адаптивності та доступності.
- `src/styles/tokens.css` — семантичні кольори для світлої/темної теми, спільні відступи, типографіка й часові токени. Сирі кольори в CSS компонентів заборонено.
- `docs/ui/<component>.md` — призначення, порівняння з legacy, вивчена практика, рішення, API, стани, edge cases, критерії готовності.

Назви компонентів і класів: lowercase kebab-case, `pg-` + BEM; поведінковий стан — `data-pg-state`; Google Material Symbols Rounded зберігаються локально в `src/ui/icon/material-symbols.js` і створюються тільки через `src/ui/icon/icon.js` ([контракт](icons.md)). Візуальний стан не є бізнес-станом. У файлів є шапка з призначенням, залежностями, API та принципами.

## Глобальне виділення тексту (браузерний `::selection`)

- Єдине правило для всіх сторінок, полів і rich text editor розташоване у `src/styles/foundation.css`. Компоненти не дублюють його.
- Світла тема: непрозорий темно-синій фон `#113855`, білий текст `#ffffff` — як у `legacy/css/foundation/selection.css` та `legacy/css/root.css`.
- Темна тема: непрозорий блакитний фон `#7bbad4`, чорний текст `#000000` за тією самою логікою legacy.
- Контракт: `--pg-color-selection-bg` та `--pg-color-selection-text` у `src/styles/tokens.css`; `::selection` задає **і фон, і текст**. Не використовувати напівпрозорий `--pg-color-accent-soft` для виділення.
- Перевірка: виділити текст мишею та клавіатурою у звичайному контенті, input/textarea й редакторі в обох темах; перевірити контраст і відсутність компонентних перевизначень.

## Семантичне перефарбування

[Єдина палітра tone × appearance](semantic-colors.md) повертає ролі `main`, `secondary`, `tertiary`, `danger`, `warning`, `success`, `info` з legacy. Вона не створює нові види кнопок: кольорові атрибути `data-pg-tone` / `data-pg-appearance` працюють через спільний `src/ui/button/button.css` з існуючими Button, Menu, Dialog та Selection Actions. Звичайні елементи без `tone` не перефарбовуються. Розміри й анімації належать їхнім наявним власникам.

## Спільний Motion Physics

[Два канали руху (spatial/effects)](motion.md) задані в `src/styles/tokens.css`; старі aliases збережено без зміни затверджених FAB, Toast і RevealPanel. Компоненти не створюють локальних анімацій заради нових режимів.

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
| Кнопки | `src/ui/button` | [Icon Button і Mini Button — контракт legacy `btn-icon`](button.md) |
| Tooltip | `src/ui/tooltip` | Є, збережено корисну поведінку legacy |
| Button Group | `src/ui/button-group` | [Material 3: connected/standard, ghost/tonal/filled, round/square](button-group.md) |
| Toolbar | `src/ui/toolbar` | [Material 3 floating/docked surfaces, no duplicate button state](toolbar.md) |
| Tabs | `src/ui/tabs` | [Локальні вкладки на спільному connected ghost Button Group](button-group.md) |
| Page view | `src/ui/page` | Є |
| Data row | `src/ui/data-row` | Є |
| Collection View | `src/ui/collection-view` | [Таблиця/плитки](collection-view.md) та [компактна/комфортна щільність](collection-density.md) |
| View Switch | `src/ui/view-switch` | Contextual header mode control; [collection contract](collection-view.md) |
| Toast | `src/ui/toast` | [Специфікація](toast.md), перший новий компонент |
| Dialog / Confirm | `src/ui/dialog` | [Специфікація](dialog.md): native modal + blur |
| Input / Search field | `src/ui/input` | [Спільний Input](input.md) + [opt-in Rotating Placeholder](rotating-placeholder.md); static label above, native autocomplete, flexible adornments |
| Shared Field | `src/ui/field` | [One plain outline, static label above, leading/trailing slots](field.md) |
| Native Select | `src/ui/select` | Native browser choice with shared static label above the field; [contract](selection-fields.md) |
| Combobox | `src/ui/combobox` | Editable selection, async search and keyboard listbox; [contract](selection-fields.md) |
| Listbox | `src/ui/listbox` | [Single/multiple listbox with chips, search and select-all](listbox.md) |
| Menu | `src/ui/menu` | [Keyboard action/check menus](menu.md) |
| Image Field | `src/ui/image-field` | [Local image preview, drag/drop and URL cleanup](image-field.md) |
| Tag Field | `src/ui/tag-field` | Independent tag collection, paste parsing, two-step removal, undo; [contract](tag-field.md) |
| Form Dialog | `src/ui/form-dialog` | Shared Dialog composition with validation and dirty close guard; [contract](form-dialog.md) |
| Workspace Dialog | `src/ui/dialog` + `src/ui/form-dialog` + `src/ui/workspace-layout` | [Спільний редактор з навігацією «Переходи»](workspace-dialog.md); приклад у «Макетах даних» |
| Section navigator | `src/ui/section-navigator` | [Дослідження, API та жести](section-navigator.md): незалежні блоки, boundary scroll, ручки й кнопки |
| Rich Text Editor | `src/ui/rich-text-editor` | [WYSIWYG ↔ редагований HTML, один документ, модульний toolbar і stats](rich-text-editor.md); [дослідження](../research/rich-text-editor.md) |
| Textarea | `src/ui/textarea` | [Multiline native editor, auto-height and count](textarea.md) |
| Number Field | `src/ui/number-field` | [Native numeric steps, units and validation](number-field.md) |
| Slider | `src/ui/slider` | [Material 3: native range, розділена шкала, вертикальна ручка](slider.md) |
| Wave Progress | `src/ui/wave-progress` | [Безшовна 20px CSS-маска, визначений/невизначений прогрес](wave-progress.md); демо у «Таблицях» |
| Password Input | `src/ui/input/password-input.js` | [Глобальне парольне поле](password-input.md) з reveal toggle, autofill та тихою доступною валідацією |
| Thinking Progress — «Думання» | `src/ui/thinking-progress` | [Тонкий безперервний градієнт із м’якими краями](thinking-progress.md); демо у «Таблицях» |
| Checkbox | `src/ui/checkbox` | [Native two-state and mixed-state control](choice-controls.md) |
| Switch | `src/ui/switch` | [Native on/off semantics, async rollback](choice-controls.md) |
| Radio Group | `src/ui/radio-group` | [Native exclusive selection with fieldset/legend](choice-controls.md) |

Не ставити кнопки-пустушки на затверджений скелетон для демонстрації UI. Тестові сценарії повинні використовувати ізольовані перевірки й не вдавати готові інструменти.

**Тимчасовий виняток, прямо погоджений власником (2026-11-05):** на тестовій сторінці `/tools` дозволено одну діючу кнопку виклику Toast у робочому блоці. Її розміщено в ізольованому [toast-demo](toast.md#8-тимчасова-кнопка-перевірки-2026-11-05); вона не є частиною Shell або готового інструмента, не використовує випадкові inline стилі й легко прибирається.


## Незалежні вкладки та Dialog

`Таблиці` та `Текст` мають **окремі DOM-панелі та власні елементи createPageView**. Перемикання не змішує стан інструментів; активна панель видима, інша прихована. Toast демонструється у «Таблицях», інформаційний Dialog — у «Тексті». Confirm/видалення тестуються без окремої дублюючої кнопки: через спільні дії вибраних записів у «Макетах даних» та «Медіатеці». Перелік актуальних універсальних механізмів і меж див. у [аудиті](cleanup-audit.md).

Для Dialog: [специфікація](dialog.md), `src/ui/dialog/dialog.js`, `src/ui/dialog/dialog.css`, `tests/e2e/dialog.spec.js`. Тло розмиває native `::backdrop` з `backdrop-filter: blur(8px)`; дані й фокус ізольовані браузерним `showModal()`. Кольори в `src/styles/tokens.css`.

| Pagination | `src/ui/pagination` | [Shared numbered pages, ellipsis and page size](pagination.md) |
| Segmented Switch | `src/ui/segment-switch` | [Native radio choice with sliding plate](segment-switch.md) |
