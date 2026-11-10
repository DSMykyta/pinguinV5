> **Current implementation:** Listbox uses `createFieldFrame` for its trigger and composes a normal `createInput({ variant: 'search' })` for internal filtering. Its trigger visually stays active while the popup is open. It shares the common compact 40px desktop / 44px coarse-pointer outer-field geometry and focus styling with Number Field and Input.

> **Current design decision (2026-11-09):** Listbox has a permanent label above its 40px desktop / 44px touch trigger surface; the native-like placeholder stays visible. The earlier floating/notch details below are archival and superseded by [field.md](field.md).

# Listbox — independent single/multiple select with search
Design contract · 2026-11-09. Reference only: the uploaded MiniMax bundle's `src/ui/listbox` and its screenshots; rejected Brands feature is excluded.

- Existing native `Select` remains the default for short finite lists. `Combobox` owns editable single selection. `Listbox` owns a curated list, multi-selection, removable selection by toggling, optional filtering, and select-all of the **currently visible enabled** options. Do not combine their implementations.
- Popover opens by button, option collection has `role=listbox`; individual options use `role=option`, `aria-selected`; `aria-multiselectable` when multi. Keyboard ArrowUp/Down, Home/End, Enter/Space, Escape; disabled options are skipped. When filtering, keep a labeled search input and communicate matches.
- Trigger uses the shared compact outlined field (40px desktop, 44px coarse pointer) and permanent label above the border. Although a native button cannot be associated by `label[for]`, it explicitly gets its accessible name via `aria-labelledby` from the visible label + value.
- Selected values use stable option keys and are form-submitted through repeated hidden inputs when `name` is present.
- `createListbox({label,options,value?,multiple?,searchable?,selectAll?,name?,placeholder?,description?,error?,disabled?,onChange?})` returns `{element,trigger,getValue,setValue,setError,open,close,focus,destroy}`.
- Independently disposable per-instance listeners and observers; no global menu manager, no feature data, no Brands dependencies. Tests cover keyboard, selected chips, filtered select-all, disabled options, duplicate labels, outside click, form values and responsive height.

## Selected chips overflow (approved 2026-11-09)

References: [MUI Autocomplete limitTags](https://mui.com/material-ui/api/autocomplete/) and
[Ant Design maxTagCount/maxTagPlaceholder](https://ant.design/components/select/) support compact tags and a visible overflow summary. The disclosure button semantics follow [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).

- A compact multi-selection field displays up to 3 removable chips and a `+N` button when additional selections are hidden.
- Chip geometry (2026-11-10): 26px-high rounded rectangles with 6px corners, not pills. Chip insets are derived from the shared Field size: 7px on 40px desktop controls and 9px on 44px touch controls, equal along the left/top/bottom edges. The expanded tray preserves the same first-chip alignment and the `+N` control has the same 26px height. Empty placeholder text keeps the standard Field's 14px text inset. Both states reuse the same chip CSS and shared remove button; the caret's trailing space remains reserved.
- No `+N` means hovering/focusing the field does **not** open a selection tray.
- Hovering `+N` previews the full selection. Clicking or keyboard-focusing `+N` also reveals it. Use `aria-expanded` and `aria-controls` on the actual `+N` button.
- The expanded tray **covers the original compact chip row**, rather than duplicating the visible chips underneath. It is one expanded visual surface with the same width and border, anchored over the field and growing up or down according to viewport space. The external label stays above.
- Only the expanded tray's chip buttons are visible while expanded. The compact row is visually hidden. Each selected option retains a genuine `button` labeled "Видалити …" (not a button nested inside the trigger button).
- Moving outside or scrolling the host dismisses the tray; Escape restores focus to the main trigger. On keyboard opening, the non-destructive tray group receives initial focus; never auto-focus a destructive `×`. There is no redundant header, selected count or explicit collapse button. The first chip row aligns with the compact field, with new rows extending downwards or upwards depending on available space.
- Removing selections keeps stable value keys, repeated hidden form values and `onChange`. If the count drops to 3 or fewer, the tray collapses automatically. Selecting options remains a separate action of the trigger/option popup.
- The main Listbox open state is independent of the selected-values tray. Do not mix the two `aria-expanded` values.

Native `disabled` inputs are not focusable and never receive user input (per [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled)). Disabled styling also prevents the mouse from presenting a text-insertion cursor.


## Валідація та колір помилки (2026-11-10)

- Помилковий Listbox використовує один стан `frame.setError(true)` і єдиний спільний Field для червоного підпису, рамки, caret і **тексту всередині, включно з placeholder**. Не додавати окремий колірний skin в `listbox.css` або у демонстрації. Важливий контраст із поверхнею має зберігатися для світлої/темної теми.
- Вибір першого доступного значення (клік або клавіатура) скидає видиму помилку; `aria-invalid` та помилковий `aria-describedby` забираються синхронно до `onChange`. Те саме при `setValue` на коректне значення.
- Для `required: true` після взаємодії, коли користувач зніме останнє обране значення через chip, toggle або «Зняти всі», стан помилки має відновитися. До першої взаємодії помилка показується лише якщо явно передана опція `error`. Текст для повторної помилки — початковий `error` або стандартне повідомлення.
- `setError(message)` залишається доступним для зовнішньої валідації; фокусування, фільтрація, hover або відкриття popup **самі по собі** не повинні очищувати повідомлення.
- Програмна зміна порожнього значення без взаємодії не створює помилки; вибір валідного значення відновлює нейтральний колір тексту/рамки. Припустимий placeholder має початковий нейтральний вигляд тільки в стані без помилки.
- Перевірки: single/multiple, click/Enter, select all, removal, programmatic setValue, error/ready ARIA, світла/темна тема й відсутність змін геометрії.


## Погоджено й реалізовано: пошук та тристановий Checkbox (2026-11-10)

- У popup Listbox верхній рядок утворюють **наявні** Input/Search і `createCheckbox({showLabel:false})`; новий вигляд чекбокса, окрема кнопка чи анімація **не створюються**. Залишено вже існуючий `pg-listbox__toolbar` з flex.
- Чекбокс використовує спільні 32px hit area, 24px видимий квадрат, hover та morph у галочку/мінус із `src/ui/checkbox/checkbox.css`. Search зберігає `labelPresentation:'sr-only'`. Коли немає selectAll, елемент відсутній; single-режим не змінено.
- Стан обчислюється тільки за **видимими доступними** опціями: none → пусто; частина → мінус; усі → галочка; немає доступних результатів → disabled. Натискання на мінус знімає вибрані видимі (правило Pinguin), а на пустий чекбокс обирає всі видимі.
- Пошук не скидає приховані вибрані значення. Доступний напис чекбокса й делегований Tooltip змінюються за дією: «Вибрати всі», «Зняти вибір», «Зняти всі», «Вибрати знайдені» або «Зняти знайдені». Візуально напис прихований.
- Розширено лише **спільний** Checkbox методами `setLabel()` / `setDisabled()`, а наявні `setChecked()` / `setIndeterminate()` перевикористано. Меню не вкладене в `role=option`, тому нативний input не порушує семантику Listbox.
- Перевірити Playwright `tests/e2e/listbox-toolbar.spec.js` та `tests/e2e/listbox-validation.spec.js`, `npm run check`. Самі коміти не підтверджують, що тести виконані.
- **Виправлення внутрішнього фокусу (2026-11-10):** нативний, візуально прихований `input[type=checkbox]` може спричинити автоматичне прокручування при кліку/фокусуванні. Listbox використовує спільний `dismissOnOutsideScroll`, який зазвичай закриває popup на зовнішній scroll. Внутрішня взаємодія з чекбоксом тепер повторно запускає вже наявний захисний період `scrollDismiss.arm()` на pointerdown/focus/Space, не вимикаючи зовнішнє закриття назавжди. `aria-expanded` залишається `true` після вибору/зняття, а реальне прокручування сторінки після захисного періоду закриває popup. Всі зміни ізольовані в Listbox: стилі Checkbox та анімації не дублюються.

## Скасовано: пошук і звичайна кнопка в одному рядку (2026-11-10)

- У popup Listbox верхня панель — **один горизонтальний рядок**: ліворуч наявний пошуковий `createInput({variant:'search'})`, праворуч **звичайна компактна кнопка** `pg-button--secondary pg-button--compact` для `selectAll`. Ніяких checkbox для масового вибору, нових фабрик кнопок чи нових анімацій. Порядок DOM: search → button → options.
- Вбудований пошук **не показує окремий видимий напис «Пошук» над полем**. Він зберігає справжній підпис для assistive technology через opt-in `labelPresentation:'sr-only'` на спільному Field, який передає існуючий Input. Звичайні поля продовжують показувати label постійно.
- Кнопка діє **тільки на видимі, не disabled** опції (після фільтра). Якщо жоден видимий пункт не вибрано, кнопка вибирає видимі; якщо є хоча б один, кнопка знімає вже вибрані видимі, не добирає решту. Підписи: `Вибрати всі`, `Зняти вибір` (частково), `Зняти всі` (усі); під фільтром — `Вибрати знайдені` / `Зняти знайдені`. Нуль доступних пунктів: disabled.
- Search-only Listbox показує одну повноширинну search-поверхню. Select-all-only Listbox показує компактну кнопку у toolbar без порожнього поля. Single Listbox без `selectAll` не отримує кнопки. Не вмикати пошук автоматично, якщо викликач задав `searchable:false`.
- Попередню пропозицію замінити кнопку на чекбокс вважати **скасованою**. Пункти `role=option` і їхні індикатори не змінювати, фокус/keyboard і stable selected Set залишаються наявними.
- Для щільних мобільних контейнерів зберегти мінімальну читабельність та не допускати горизонтального overflow. Підтримувати light/dark, reduced motion, aria-invalid validation, фільтр, вибір усіх і скасування.

## UX-дослідження меню вибору (попередня пропозиція, замінена погодженим рішенням)

**Архів попередніх варіантів; актуальне погоджене рішення вище.** Вимога: прибрати візуальний зайвий заголовок «Пошук» усередині popup та переосмислити велику кнопку «Вибрати всі». Не переписувати Listbox, Input, Checkbox чи Popup до погодження.

### Порівняння зовнішніх систем

- [PatternFly Select design guidelines](https://v5-archive.patternfly.org/components/menus/select/design-guidelines/): окремі single, checkbox, multi й typeahead режими; для понад ~10 пунктів рекомендовано typeahead, для 5 і менше можна показати чекбокси/радіо без dropdown; multi з chips для форм, checkbox selection — для вузького простору.
- [Material UI Autocomplete](https://mui.com/material-ui/react-autocomplete/): множинний вибір, візуальні checkbox indicators, `disableCloseOnSelect`, обмежені видимі tags; відокремлення selection та фільтрації.
- [Ant Design Select](https://ant.design/components/select/): `showSearch`, `mode="multiple"`, selected indicator, `maxTagCount`, варіативні popup, не треба дублювати Search як заголовок.
- [React Spectrum Selection](https://react-spectrum.adobe.com/selection): stable keys/set, окремий select-all стан; важливо свідомо визначити scope всіх/видимих/завантажених.
- [WAI-ARIA APG Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/): `role=option` не призначений для вкладених інтерактивних checkbox/button; окремі візуальні індикатори з `aria-selected`, один keyboard model. Якщо справжні чекбокси у кожному пункті — це вже інша семантична структура і значний рефакторинг.
- [WAI-ARIA Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/): узгоджений тристановий чекбокс для групи (empty / mixed / all).

### Пропозиція для Pinguin

1. **Single Listbox:** одна клікабельна опція на рядок; вибрана позначена іконкою справа, без checkbox «Вибрати всі». Обране значення — у головному контролі. Без search, якщо лише 6 варіантів.
2. **Multi Listbox:** кожний `li[role=option]` зберігає наявний клік та `aria-selected`, візуально показує *неінтерактивний* checkbox-like індикатор зліва. Не вкладати реальний `input` у `role=option`, щоб не ламати читачі екрану й навігацію. Колір/розмір індикатора узгодити зі спільним `pg-checkbox`, не створювати другий checkbox factory.
3. **Select all:** існуючу окрему `pg-listbox__select-all` кнопку прибрати з візуального контракту на користь **одного** `createCheckbox()` з `indeterminate`, розміщеного *поза* `ul[role=listbox]`, між search і опціями; без обрамлення кнопки. Зберегти одну модель stable IDs, `onChange` і selection state. Для mixed за погодженим правилом Pinguin клік знімає вибрані видимі, не добирає решту; none вибирає видимі; all знімає всі видимі. Текст у mixed/all має відбивати фактичну дію («Зняти вибір»), а не обіцяти «Вибрати всі».
4. **Search у popup:** короткий рядок з лупою, placeholder «Знайти маркетплейс…» / «Пошук у списку…», **без повторного видимого підпису «Пошук»**. Доступний label залишається у DOM як sr-only: це opt-in режим саме вкладеного фільтра, а не зміна правила постійних підписів звичайних форм. Використовувати наявний `createInput({variant:'search'})` і shared Field; якщо потрібен `labelPresentation='sr-only'`, додати тільки один узагальнений дозволений прапорець до Field, без локального дубля CSS. Search включати явним `searchable` або у майбутньому `searchable:'auto'` за порогом ~10+ доступних опцій, не переписувати явні налаштування.
5. **Контекст фільтра:** «Вибрати всі» та лічильник діють на *поточні видимі доступні* (enabled) результати, інші вибрані опції зберігаються. При активному пошуку назва «Вибрати знайдені», «Зняти вибір знайдених». Для серверних великих списків scope завжди визначати явно; не позначати «всі у всій базі», якщо завантажено лише частину.
6. **Геометрія:** без додаткового великого заголовка, кнопки/pill для select-all чи нової вкладки. Search з компактним вертикальним відступом, тонкий divider, select-all рядок із текстом та спокійним лічильником, потім рядки опцій. Існуючі surface, radius, shadow, scroll, popup positioning залишаються власністю `pg-field__popup` і `positionPopup`; не створювати паралельні CSS-скини.
7. **Динаміка:** single закривається після вибору, multi лишається відкритим; фільтр не скидає selected Set; keyboard ArrowUp/Down, Enter/Space, Escape, Tab/Shift+Tab мають лишатися робочими; focus не губиться при виборі, рефільтрації чи видаленні chip; disabled опції ігноруються. Пустий результат «Нічого не знайдено», без зайвої кнопки. Унікальна анімація popup не додається.
8. **Перевірки:** шість опцій без пошуку vs >10 з пошуком, explicit `searchable`, single/multi, none/mixed/all, пошук і вибір під фільтром, скасування вибору, chips `+N`, світла/темна теми, mobile/coarse pointer, focus, screen readers та reduced motion.

**Важливо:** поточна реалізація `listbox.js` вже має `searchable`, `selectAll`, `selected Set`, один `createInput`, `pg-field__popup` й візуальний check у `role=option`. Потрібний точковий рефакторинг, а не нова бібліотека або новий dropdown компонент.
