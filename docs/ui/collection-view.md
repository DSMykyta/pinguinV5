# Data Collection — table and optional tiles

**Чинний погоджений контракт:** [П'ятизонний Shell, FAB, дії рядка, вибір і анімації](../approved-ui-rules.md). Нижче збережено дослідження й історію ітерацій; якщо старий опис суперечив новішій вимозі, застосовується погоджений контракт.

Status: interactive design review preview in Tools → «Макети даних», 2026-11-09. The outer Shell header, global search, context controls, navigation and tool tabs must **not be recreated**. The first screenshot defines a dense table/list below existing chrome; the second defines an optional card/tile layout for e.g. Brands.

## Architecture: one dataset, two presentations

- `src/ui/collection-view/`: shared `createCollectionView({ label, rows, columns, getRowId, renderTile?, modes?, initialMode?, onModeChange? })`; it renders a native semantic `<table>` and (if supported) a responsive card layout from the **same row objects**. Sorting is shared, not implemented twice. It owns neither persistence, navigation, business data nor the Shell.
- `src/ui/view-switch/`: the shared segmented radio switch with one sliding plate and SVG list/tile icons, supplied to the **existing** Shell header actions slot as needed. A page with table-only mode does not show a switch.
- `src/core/preferences.js`: existing Shell persistence is extended with generic JSON read/write and a validated stored-choice primitive. Feature IDs produce independent versioned keys (`pg:v1:tools-data-views:view`, future `pg:v1:brands:view`). The Shell sidebar and aside continue using their existing keys and contracts, now with the same primitive storage IO. No localStorage logic in UI components.
- `src/shell/page-outlet.js` exposes `setHeaderActions(node)` to a feature. The Shell supplies a single managed slot before existing search/context buttons and clears it on route changes. Tools removes these controls when a different tab is active. This is the only contextual header slot.
- `src/features/tools/data-views-demo.js` provides fictional sample Brands records; it does not ship a real Brands feature, backend, new page header or unrequested create/search buttons.

## Table style for many records

1. Native `table` with caption, `th scope=col` and `aria-sort` on the sorted header. Sorting buttons use full header text and toggle ascending/descending. A plain table, **not** `role=grid` (which would require keyboard focus management not used by this preview).
2. Compact, consistent row height (~46px), quiet 1px separators and restrained hover, primary name visually stronger, supporting text subdued. Right-align numeric columns, use `font-variant-numeric: tabular-nums`.
3. Sticky header inside a full-height scrollable table viewport; many columns scroll horizontally without clipping any data. The leading name column stays visible horizontally where supported. Keep keyboard-focus outlines and semantic headers.
4. Existing shared Menu and Checkbox supply real local record actions and selection. The Shell contains the single data-context search; aside provides sorting controls, while **bulk actions for selected records belong in the top Header**, to the left of the view switch.
5. Responsive narrow layout does not delete columns; horizontal scroll affords access to all. Do not fake table semantics with `div` grids.

## Optional tile style

- Same dataset and sort order. Responsive `repeat(auto-fill, minmax(...))` grid with neutral image placeholders / monograms, useful primary label, secondary category, count and status; no actual brand imagery is claimed.
- The tile renderer is a callback supplied by a feature, not a hardcoded Brands view in shared UI.
- The view switch sits in the **existing** header; native radio checked state identifies the selected mode. `table` is the default until the user chooses `tiles`. Each feature remembers its own choice; switching from another feature never changes it.
- Data set updates do not discard the mode. Preference persistence failure degrades to in-session selection with no errors.

## A11y and testing

- Sortable native tables: W3C [Table Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/). Do not use the interactive [Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) without full grid keyboard support.
- E2E covers tab isolation, switch appearing only on the new tab, sort, DOM re-use, horizontal scrolling, narrow view, preference restore on reload, blocked localStorage, independent preference keys and Shell controls remaining unchanged. Also test dark theme and reduced motion.

This is a **design alignment tab**. Final production Brands implementation, API integration, production bulk operations, column personalization, and virtualization are future work after visual approval.

## Approved full-workspace revision (2026-11-09)

The table **is the workspace**, not a card within a page. Remove the illustrative H2, explanatory paragraphs, meta text, extra 40px Shell content padding, inner border/radius, and nested maximum height. The table viewport occupies all available workspace space below the **existing** header/tabs, with one scrollable region retaining vertical and horizontal scroll and a sticky header. Tiles occupy the same space, scrolling within it, with internal gap between tiles. All pages use the **same** Shell and Tabs layout. A collection fills its parent; normal article pages obtain standard padding from the shared Page component. No workspace mode switching is involved.

Sidebar and aside scrollable areas reuse `.pg-scrollbar` (8px thin, arrowless); the contextual aside links no longer have redundant arrow decorations. The shared style remains owned by `src/ui/scrollbar`; no new scrollbar implementation.

## Single universal workspace (2026-11-09)

A special workspace `flush/fill` mode is **forbidden and removed**. Shell always uses one full-height, unpadded content area. Tabs always share the same layout and entry animation. Generic `.pg-page` supplies conventional article padding; collections already fill their parent. No context-specific workspace attributes, separate transition, or alternative Shell handling.

## Data-controls implementation (2026-11-09)

Shared `createCollectionView` now includes:

- Opt-in `selectable`: one compact circular native checkbox per row plus a
  header checkbox that is checked only when all **visible page** rows are selected,
  mixed (`indeterminate`) when partially selected, and empty otherwise.
  Selection uses stable row IDs and survives page changes; features own bulk actions.
- Optional `rowActions` with the **existing** shared `createMenu`; no second
  action-menu mechanism. The Tools demo's View/Duplicate/Archive examples operate
  on local example records only.
- The shared `createPagination` at the bottom, one state for both table and tiles.
  Default 25 per page, size selector, numbered pages and accessible navigation.
- Exposed `setSort`, `setQuery`, `getSelectedIds`, `clearSelection` API;
  one filtered and sorted dataset, no copied models for the two views.
- `createViewSwitch` is a thin adapter to the shared legacy-inspired
  `createSegmentSwitch`, never two custom view buttons.
- The existing Shell search field accepts a page-scoped `onQuery` handler and
  is hidden for tabs without searchable content. The existing aside accepts
  optional page-owned controls; for data tables, it holds the real sort Select,
  direction segmented control. **Selection count (only 2+) and bulk actions appear in the existing Header slot to the left of the view switch, not in aside.**
- There is **one** Shell workspace layout and **one** tab-panel animation.
  No page-specific `flush` mode, `fill` switch or duplicate header exists.

This remains a **UI alignment preview**, not a production Brands route.

## Legacy footer, menu and checkbox corrections

- Header checkbox `−` is a clear action: if **any** row on the current page is selected, clicking it deselects all visible selected rows; if none, clicking selects the visible page. The checked state also clears selection. Individual checkboxes keep the generic circular appearance.
- **Актуальний порядок:** перша клітинка — checkbox + окрема кнопка edit, далі всі колонки даних, **останній стовпець — «Дії» (`⋯`)**. Меню дій — sticky справа, якщо це підтримує таблиця; воно ніколи не стоїть між checkbox і назвою.
- Action Menu uses the existing `createMenu` and shared popup positioning. The panel measures text and fits the longest label without horizontal scrolling, and both hovered/focused items and the open trigger have visible state.
- Pagination is rendered in the existing Shell footer via one optional `setFooterContent` callback. It uses the same `createPagination` instance for table and tiles, not a clone and not a separate work-area mode. The shared footer remains empty on unrelated tabs.

## Shared FAB composition — актуальний стан

The global fourth-corner FAB stays in the **Aside rail** and keeps its original actions. A second instance from the **same existing factory** is mounted **inside the Footer pagination**, aligned to the **far right edge of Footer** and configured by `setPageFabContext`. The centered page numbers do not move, the Footer FAB is not in Aside, and the original FAB is never replaced. No duplicate FAB/dial implementation exists.

## Table row controls: explicit placement contract (2026-11-09)

- The first cell groups the native compact selection checkbox and a separate **Edit** icon button immediately to its right. The edit action is opt-in through `onEditRow(row)`, and it changes data only in the calling feature. In the Tools preview it opens the existing shared Dialog/Input and saves a new brand name to local preview records.
- The `rowActions` menu is the **last cell after all record fields**, with its own trailing header `Дії`; it never occupies the column between the checkbox and the record name.
- Both the edit button and the trailing action-menu trigger reuse the global `.pg-mini-button` style in `ui/button/button.css`: a round 32×32px button following legacy `.btn-icon` (transparent idle, accent-tinted background/ink and subtle shadow on hover, maintained active/open and visible focus). Compact native checkboxes share a 32×32px hit target around their 24×24px selection box. This is an appearance shared by action buttons; the native checkbox retains its distinct selection semantics.
- Keep the first cell and primary name visible during horizontal scrolling; keep the final action cell attached to the right edge. Do not add independent feature CSS copies of the mini-control style.

## Contextual selection actions in the existing header (2026-11-09)

The existing Shell header-actions slot hosts the view switch in normal flow, while the shared `createSelectionActions` strip is absolutely anchored **to its left**. Selection data stays in `createCollectionView`; the action strip only responds to `onSelectionChange(ids)`, and each feature supplies its own action policies and handlers. Do not place these actions in aside, the pagination footer, or a new floating FAB.

For the Tools → Макети даних preview only:

- Zero selected: strip is hidden, inert and non-interactive.
- Exactly one selected: show **Дублювати** only, without a count. It duplicates just that sample record.
- Two or more selected: hide duplication; show count and **Архівувати**, **Відновити**, **Видалити**. The latter requires confirmation through existing Dialog. There is no close/cross control in this strip; deselection remains in table checkboxes.
- All operations update local preview records only; they never call a production API.
- Actions are reusable controls with role/accessibility names. Old aside sort controls remain; the duplicated aside archive/count controls have been removed.
- The existing shared `createRevealPanel({ direction: 'top' })` owns the entrance/exit; selection-actions CSS adds no bespoke entrance animation or width transition. The actions are out of the flex flow, so selecting/deselecting never moves the view switch, search, or aside toggle. The single/multiple groups each reuse `createRevealPanel()` and occupy exactly the same absolutely positioned, 100%-width rectangle. Their appearance transitions vertically, never horizontally or by changing their intrinsic width.
- Selection survives ordinary sort/page navigation. When selected records disappear from `setRows`, `onSelectionChange` updates the header strip.

Unit checks: `tests/selection-actions.test.js`. The demo's scenarios are one item → duplicate without count; two items → count and archive/restore/delete with confirmation; deselect all in table → hidden.

### Invariant: stable header control positions

The selection action strip must remain outside the measured header flex flow. Do not animate width/max-width or place it between the fixed view switch and search. Reuse the universal `ui/reveal-panel` motion; content ownership belongs to `ui/selection-actions`, layout anchoring to the feature's existing header-actions host. Any new page using selection actions must keep its persistent header controls stationary.


## Плитки: вибір, дії, відкриття (2026-11-09)

Плитка використовує **той самий** `selected` Set і `rowActions`, що таблиця. Вона отримує незалежний нативний checkbox та той самий `createMenu` з «…»; `syncSelection` відображає стан в обох режимах, `cleanupRows` очищає усі екземпляри. Якщо передано `onEditRow`, прозора доступна кнопка перекриває лише тіло плитки й викликає редагування на натискання або Enter/Space. Checkbox та меню розташовані над цією кнопкою й не викликають редагування. Зміна режиму таблиця/плитки не скидає виділення.


## Дві незалежні колекції у вкладках (2026-11-09)

Вкладки «Макети даних» (бренди) та «Медіатека» (19 локальних ілюстрацій із 3 полями) мають різні `createCollectionView` інстанси, тому вибір, сторінка, кількість записів, сортування, пошук і режим плиток ізольовані. Shell перепідключає **існуючі** headerActions, footerContent і FAB контексти активної колекції, не створюючи додаткових пагінаторів або FAB. Обидві колекції тестують ту саму таблицю/плитки; дані медіатеки локальні, без завантаження мережевих картинок.

Плиткові checkbox і меню «…» користуються власним стилем спільних компонентів; зайві білі блоки під кнопками прибрано.


## Стабільність колонок і реакція плиток (2026-11-09)

Універсальна таблиця використовує `table-layout: fixed`, назви колонок і дані залишаються на однакових позиціях при сортуванні та пагінації; прев’ю отримало окрему сталу ширину 112px. `setSort` і `setQuery` викликають рівно один `renderData` (через подію пагінації або безпосередньо), без подвійного remount. Спільні `.pg-collection-view__tile` легенько нахиляються при hover/focus-within; для reduced-motion трансформації немає.


## Область відкриття та нахил плитки (2026-11-10)

- Нахил визначається наведенням вказівника або **видимим клавіатурним фокусом** (`:focus-visible` на вкладених контролах), а не будь-яким `:focus-within`. Після вибору/зняття checkbox і виведення курсора плитка повертається до нейтрального положення без додаткового кліку чи blur. Стан вибору не визначає нахил. При `prefers-reduced-motion: reduce` нахил вимкнено.
- За замовчуванням доступна кнопка `onEditRow` перекриває всю плитку, як раніше. Якщо feature-рендерер позначить внутрішній **контейнер** атрибутом `data-pg-tile-open-target`, спільний `createCollectionView` вставить **ту саму** кнопку відкриття тільки в цей контейнер. Розташування й overlay-стилі належать `src/ui/collection-view`; жодних додаткових кнопок, модалок або власної анімації у feature.
- «Медіатека» позначає контейнер зображення. Тому натискання фото відкриває наявний Dialog редагування, а підпис і метадані залишаються звичайним виділюваним текстом: клік або перетягування по них не відкриває модалку. Checkbox і меню «⋯» залишаються незалежними.
- Регресійний тест: hover → checkbox on → checkbox off → mouseleave при збереженому фокусі; перевірка геометрії hit area, виділення підпису, відкриття по фото та reduced-motion.


## Стабільний hover і єдиний контур вибору (2026-11-10)

- Зовнішня `.pg-collection-view__tile` залишається нерухомою областю hit testing. Лише внутрішня `.pg-collection-view__tile-surface` нахиляється через наявну transition. Так курсор не «випадає» з hover при переміщенні від фото до чекбокса, трикрапки, тексту й країв картки.
- Відкрите меню `⋯` зберігає нахил поверхні до закриття меню, зокрема коли пункти меню показано у native top layer. Закриття меню й відведення курсора скидають нахил. Фокус мишею після зняття checkbox нахил не утримує; клавіатурний `:focus-visible` працює як і раніше.
- Вибір оформлений **однією** псевдоелементною рамкою `2px` з однаковою товщиною на чотирьох сторонах і тим самим радіусом; вона перекриває звичайну внутрішню `1px` рамку, не додає layout-відступу й не перехоплює pointer events. Не накладати додатковий `outline` на поверхню.
- Regression e2e: стабільність hover на `⋯` і пунктах відкритого меню, втрата нахилу за mouseleave після checkbox, рівність чотирьох товщин вибраної рамки, незмінність розміру й reduced-motion.
 

## Колекція як єдина модель стану та ощадливий рендеринг (2026-11-10)

**Сумісність:** розширюємо лише `createCollectionView()`, `createSelectionActions()` та наявний `createMenu()`. Shell, перемикач режимів, FAB і загальний лейаут не змінюються.

1. `sortedRows()` кешує відсортовані відфільтровані записи. Кеш інвалідується лише під час `setRows`, `setQuery`, `setSort`, а не при кожній зміні checkbox. Публічний `getRows()` повертає копію масиву.
2. На поточній сторінці рендериться лише **активне** представлення: таблиця або плитки. В іншому DOM не залишаються приховані рядки, checkbox, кнопки й Menu. `setMode` не скидає вибір, сортування чи сторінку; при перемиканні рендериться той самий набір ID.
3. `getSelectionSummary()` повертає `{total,inResults,onCurrentPage,outsideResults,outsidePage}`. Перше число — всі вибрані; `inResults` — ті, що відповідають поточному пошуку; `onCurrentPage` — вибрані на відкритій сторінці. `onSelectionChange(ids, summary)` передає другий, необов'язковий аргумент, сумісний зі старими callbacks. Сам вибір не стирається при фільтрації/пагінації.
4. `createSelectionActions().setSelection(ids, summary)` показує приховану пошуком кількість **тільки для 2+** в наявному лічильнику. Для одного вибраного лише «Дублювати» (без нового видимого лічильника, хрестика або плаваючої панелі).
5. `setDataState('ready'|'loading'|'error', message?)` керує доступним статусом колекції в чинному `empty` вузлі. Порожній набір, фільтр без результатів, завантаження й помилка розрізняються без нових компонентів. `setRows()` повертає `ready`.
6. Перед перебудовою запам'ятовується клавіатурний фокус на checkbox, Menu, edit або open кнопці рядка. Після перебудови фокус повертається на відповідний контроль, або найближчий на цій сторінці при видаленні. Спільне Menu закривається до виклику `onSelect`, щоб фокус не повертався на вже видалений DOM.
7. CSS Container Queries реагують на ширину **самої колекції**, а не тільки вікна браузера. Наявні hover/keyboard focus, reduced motion та анімація плитки лишаються її спільним правилом.

**Свідомо не додано без конкретного виробничого сценарію:** нову панель вибору всього набору, кастомний ARIA Grid, серверну модель завантаження, окрему віртуалізацію для `∞`, drag&drop та редактор колонок. Для реальних API/тисяч записів потрібні окремі виміри навантаження; не підміняти їх штучним лімітом чи новим режимом Shell.

**Уточнення клавіатурного фокуса:** нахил — лише pointer hover або відкритий `⋯`. Після `Escape` та виходу курсора він припиняється, навіть якщо native focus залишається на trigger. `:focus-visible` використовує незалежний спільний контур кнопки; таким чином клавіатура не втрачає видимий фокус, а плитка не зависає нахиленою.

## Фокус пагінації і компактний лічильник (2026-11-10)

`createPagination()` повертає клавіатурний фокус на ту саму дію після заміни кнопок. Коли кнопка на останній сторінці стає недоступною, фокус переходить до поточної сторінки. `setTotal` не викликає зайвий рендер за незмінної кількості, тому Footer не миготить при зміні плиток. Коли вибрані записи приховані пошуком, наявний лічильник показує компактне `N вибрано · M приховано` із повним поясненням в `aria-label`; координати елементів Header не змінюються.


## Тимчасові стани й збереження сторінки (2026-11-10)

`setDataState('loading'|'error')` не змінює поточну сторінку, її розмір чи загальну кількість в пагінації. Під час завантаження або помилки обидва представлення приховані, а наявний status показує причину. `setRows()` повертає `ready` і коригує номер сторінки лише за потреби, якщо кількість записів справді зменшилася. Після заміни даних сповіщення про selection summary оновлюється і тоді, коли загальна кількість вибраних ID не змінилася.

Поки колекція має стан `loading`, її кореневий елемент позначений `aria-busy="true"`; у стані `error` або `ready` — `false`. Чинний Footer пагінатор тимчасово `inert` для обох неготових станів, щоб користувач не змінював невидиму сторінку; після `setRows()` він автоматично відновлюється. Додатковий CSS та окремі кнопки не використовуються.

## Rounded table corners without clipping the workspace (2026-11-10)

**Source of truth:** the latest direct owner requirement replaces the former rounded `.pg-shell__content` appearance. The shared Shell Main has `border-radius: 0` on **every** page; it is not a collection-specific `fill/flush` state. The shell continues to own height, padding (zero on content host), and overflow containment for existing tab/page behavior.

The existing `.pg-collection-view__table-scroll` remains the **single native horizontal/vertical scroll container**, with the same accessible region, sticky header, sticky selected/name/action columns, and shared `pg-scrollbar`; never nest another scroll-card or reimplement scrollbars. The existing `table` already uses `border-collapse: separate; border-spacing: 0`.

Rounding now belongs to the table **cells**, not the Shell or a full-height clipping card: the first/last `thead th` own the two top corners, and the first/last `tbody tr:last-child td` own the two bottom corners. The corners follow sorting, filtering, pagination, narrower columns and their native sticky positions, including the trailing action column. Use a shared radius token and logical corner properties; do not create a second table component or duplicate row action styles. The body can scroll past the viewport, so the bottom corners are visible when the actual final rendered row is in view; an empty or loading state has no fake last row.

Acceptance: `.pg-shell__content` has computed radius `0px` for table, tiles and article tabs; a visible collection table has its two top and two last-row corners on correct edge cells; the scroll host has no extra clipping radius; switching modes does not change Shell geometry; footer pagination and pinned action menu remain functional. Check horizontal and vertical scrolling, desktop/mobile, short filtered datasets, dark mode and actual bottom-right scrollbar corner. No page-specific CSS override.

## Контракт hover і редагування назви (2026-11-10)

Погоджене правило для **спільного** `createCollectionView()`:

- Колонка вибору не змінює ширину: при `hover: hover` checkbox у рядку показується на `:hover` або `:focus-within`, а checkbox у шапці — на hover/focus шапки. **Як тільки є хоча б одне вибране значення**, усі checkbox таблиці, включно з головним, залишаються видимими. На touch/non-hover контролі завжди видимі, і клавіатурний focus завжди відкриває керування. Не застосовувати новий вигляд checkbox, лише поведінку видимості.
- Остання колонка залишається для існуючого Menu (крайня справа), але її заголовок не має видимого напису «Дії»: використовується доступна назва `aria-label`. Кнопка меню проявляється при hover рядка, focus або розкритому меню; touch-керування залишається доступним. Не переносити й не дублювати меню.
- Якщо `onEditRow` задано, існуючий `createIconButton({ icon: 'pencil' })` розташовується **поруч із значенням основної колонки** (`primary: true`, наприклад «Бренд»; якщо primary не вказано — перша колонка даних). Кнопка має незалежну hit area та keyboard focus. Текст не робиться посиланням/кнопкою, **звичайне виділення й копіювання мишею не викликає редактор**. Жодної кнопки редагування в checkbox-колонці.
- Назви й інші текстові значення використовують спільний [Tooltip](tooltip.md): підказка тільки при фактичному обрізанні тексту. Значення, яке повністю вміщується у свою область, не викликає tooltip. Виняток — явно позначені командні/icon-only елементи з `data-pg-tooltip-always`, їхні назви не видно у самому інтерфейсі.

Геометрія Shell/Main, sticky-колонок, одна спільна анімація вкладок, сортування, пагінація та стан вибору **не змінюються**. Усі правила належать `src/ui/collection-view`, а не локальному `features/tools`.

## Уточнена взаємодія: 2026-11-10 — назва замість олівця, focus без «липких» checkbox

Це правило замінює старі згадки про кнопку edit у клітинці checkbox або біля бренду:

- **Жодного олівця.** Назва у `primary`-колонці є клікабельним, доступним із клавіатури текстом. Single click/Enter/Space відкривають той самий `onEditRow`; перетягування мишею та подвійне натискання дозволяють виділяти й копіювати назву без модального вікна. Не створювати інший Dialog або ще одну кнопку.
- Після закриття Native Dialog браузер повертає focus на текст назви. Цей focus **не вважається hover для checkbox або меню всього рядка**. На desktop при нульовому виборі checkbox показується від `:hover` рядка або `:focus-within` **власної selection-cell**. Аналогічно меню видно від hover рядка, focus **actions-cell** або якщо вже відкрите. Focus назви ніколи не робить ці контролі постійно видимими.
- Якщо вибрано хоча б один запис, checkbox усіх рядків і шапки залишаються видимими; на touch вони видимі постійно. Tab до checkbox/menu має відкривати відповідний контроль незалежно від hover. CSS не змінює ширину колонок при зміні видимості.
- Перша та остання колонки мають ширину **44px** і використовують чинні checkbox та Menu; вертикальної розділювальної тіні біля «Дій» немає. Жодного зарезервованого місця під кнопку редагування.
- Кнопки перегортання сторінок — **тільки наявний `createPagination()` у `Shell footer`**, незалежно від висоти списку/режиму. Контейнери таблиці й сторінки заповнюють доступну висоту; локальний Table scroll не тягне пагінацію за останнім рядком.


## Одна система плиток і таблиць для брендів та медіатеки (2026-11-11)

Аудит `work` підтвердив: **обидві вкладки вже були незалежними екземплярами `createCollectionView()`**, тобто спільні таблиця/плитки, сортування, виділення, меню, пагінація, scrollbar і перемикач `createViewSwitch()` існували раніше. Виявлене дублювання було у композиції демо і CSS. Усунуті такі розходження:

- **Одна карткова оболонка:** кожен `renderTile` додає `pg-collection-view__card`. Рамка, радіус, hover, shadow, transition і reduced-motion належать лише `src/ui/collection-view/collection-view.css`. Функції бренду/медіатеки продовжують відповідати виключно за зображення/монограму, підпис, метадані. У feature CSS більше немає копій card chrome.
- **Один хост дій у шапці:** `pg-collection-view__header-actions` фіксує відносне позиціонування для `createSelectionActions`. Контекстні дії залишаються за межами flex-flow, тому перемикач режимів і пошук не зміщуються. Без другого перемикача чи анімації.
- **Одна композиція контекстів демо:** `src/features/tools/collection-page-controls.js` лише з'єднує вже наявні UI `createSelect`, `createSegmentSwitch`, `createStoredChoice`, `DEFAULT_PAGE_SIZES`, `createSelectionActions`, `CollectionView`. Повертає існуючі header/aside/search/FAB контексти, які далі монтує Shell. Не створює нового `Shell`, FAB, Pagination або логіки вибору.
- **Обидва режими зберігаються окремо:** ключ брендів `pg:v1:tools-data-views:view` (дефолт `table`), медіатеки `pg:v1:tools-media-library:view` (дефолт `tiles`). Обидва використовують один `createStoredChoice`; у межах вкладок і після reload режими незалежні.
- **Єдина панель сортування:** обидві вкладки мають спільні `Сортувати за` + `Напрямок сортування` (`А–Я / Я–А`). Натискання на заголовок таблиці та зміна в Aside синхронізуються з одним `setSort` колекції.
- **Одна композиція пошуку/кількості рядків:** на рівні feature змінюються тільки текст підказок/лейблів і власний `CollectionView`. `Pagination` і Footer FAB залишаються єдиними інстансами на колекцію.

**Навмисні відмінності:** у брендів є поля категорії, статусу, числових товарів тощо та редактор Workspace; у медіатеки — локальні SVG-прев'ю й невеликий редактор назви. Натискання **на фото** у медіатеці відкриває редагування, але підпис залишається виділюваним; у брендів редагування з плитки не має такого обмеження. Початкова кількість 25/10 записів на сторінці лишається окремою конфігурацією. Групові дії `Архівувати/Відновити` застосовні лише до брендів.

**Перевірки:** `tests/selection-actions.test.js`, `tests/e2e/media-library.spec.js`, `tests/e2e/collection-view.spec.js`. Тести захищають однакові card styles, header anchoring, окреме збереження режимів і синхронізацію напрямку сортування.

**Межа:** helper знаходиться в `src/features/tools`, тому не переносить демо-дані та Shell-контексти в універсальний `src/ui/collection-view`. Універсальний компонент залишається незалежним від типу записів та місця монтування.


## Щільність CollectionView — 2026-11-12

Згідно з [окремим контрактом](collection-density.md), `createCollectionView({density='compact',onDensityChange})` тепер має `getDensity()`/`setDensity()`. Зміна `data-pg-density` застосовує CSS variables до таблиці й плиток без `renderData()` та без нового режиму Main. `compact` повторює затверджений вигляд, `comfortable` збільшує міжряддя й відступи. Виробничі checkbox/Menu та 44px sticky колонки не змінені.

У «Макетах даних» і «Медіатеці» один адаптер `createCollectionPageControls()` розміщує існуючий `createSegmentSwitch` у Aside, а `createStoredChoice` зберігає щільність незалежно від `view`. Стан сорт/пошук/вибір/пагінація не змінюється. Тести: `tests/e2e/collection-density.spec.js`.
