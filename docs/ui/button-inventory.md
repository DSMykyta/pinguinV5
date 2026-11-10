# Pinguin Next — інвентар фактично наявних кнопок

Дата аудиту: 2026-11-10. Джерела: JS/CSS `work/src`, `legacy/css/components/buttons/button-icon.css`, наявні E2E. **Назва DOM-класу компонента не означає нового типу кнопки.** У таблиці наведено діючу роль і тип спільного оформлення.

| Існуючий елемент / hook | Де використано | Канонічна візуальна основа | Особливість |
| --- | --- | --- | --- |
| `pg-icon-button` | Shell, Dialog, collection actions | `createIconButton`, базовий 40px | Іконка, aria-label, tooltip |
| `pg-icon-button--corner` | Sidebar, Header, основний та footer FAB | Модифікатор спільного icon button | Особлива анімація кута; стан у Shell |
| `pg-mini-button` | Edit, `⋯`, **pin Aside** | `createIconButton({variant:'mini'})` або модифікатор trigger Menu, 32px круглий | Візуал legacy `btn-icon`, pressed/open |
| `pg-aside__pin` (колишній) | Aside | **Скасований окремий CSS**; застосувати mini | Тільки дія `aside-pin`, aria-pressed |
| `pg-fab__trigger`, `pg-fab__face` | Два FAB з `createAsideFab` | Icon/corner + існуюча **одна** FAB композиція | Зберегти pop-out, значення 10/25/... і анімацію |
| `pg-fab__item` | FAB choices/links | Частина **спільного FAB** | Складений label + symbol, не звичайна кнопка |
| `pg-menu__trigger` | Menu, колекція, Tools | `pg-button--outline`; у колекції `pg-mini-button` | Назва **структурної ролі**, не окремий skin |
| `pg-menu__item` | Список Menu | Спільний базовий button; меню володіє list-item layout | role menuitem/menuitemcheckbox, keyboard navigation |
| `pg-dialog__button` primary/secondary/destructive | Confirm, Dialog, Form Dialog | `pg-button--primary/secondary/destructive` | Busy/confirm/dismiss належать Dialog |
| `pg-dialog__close` | Dialog header | `createIconButton()` | Тільки розміщення у header |
| `pg-selection-actions__action` | Колекція, header actions | `pg-button--pill` | Позиціювання через RevealPanel |
| `pg-pagination__button` | Номери сторінок | `pg-button--page` | `aria-current`, footer layout |
| `pg-number-field__step` | Number Field | `pg-button--step` | Значення +/− та обмеження визначає Number Field |
| `pg-rich-text-editor__action` | Editor toolbar | `pg-button--tool` | `aria-pressed`, відновлення selection |
| `pg-rich-text-editor__mode-switch` | Редактор/HTML | **`createSegmentSwitch`**, нативні radios | Один адаптер стану, без власної кнопки або CSS |
| `pg-image-field__choose/replace/remove` | Image Field | `pg-button--outline` (compact) | Локальна поведінка відкриття file picker |
| `pg-toast__action`, `pg-toast__close` | Toast | `pg-button--quiet`, компактна icon кнопка зі зворотною палітрою через токени | Інверсний контраст Toast; локальна поведінка закриття |
| `pg-listbox__select-all` | Listbox panel | `pg-button--secondary` компактний | Дія на вибір, не нова модель selection |
| `pg-listbox__chip-remove`, `pg-listbox__more` | Chips, tray у Listbox | Малі інтерактивні controls у складі Listbox | Micro-target у chip та незалежне розкриття +N |
| `pg-listbox__trigger` | Listbox | Спільна `pg-field__control` / Field | **Button за семантикою**, але візуально **поле**, не дія |
| `pg-collection-view__sort` | Заголовки таблиці | Text-ghost button в межах sortable header | Сортує, не повинен створювати власний button-skin |
| `pg-tabs__tab` | Shell Tabs | Спільний компонент Tabs з нативною tab-семантикою | Відмінний control, не довільна кнопка |
| `pg-segment-switch__label` | Table/Tiles, Editor/HTML | Label + нативний radio, **не** button | Єдина plate-анімація, не стилізовані кнопки |
| `pg-select__control`, `pg-combobox__input` | Поля | Native select / combobox, **не** action button | 56px рамка через Field |
| `pg-section-navigator` controls | Навігація секцій | Наявний gesture/scroll механізм | Не створювати другу фабрику кнопок навігації |
| `pg-tools-field-demo__help` | Tools / Field Demo | `pg-button--step` | Лише структурний hook; окремий CSS скасовано |
| `pg-tools-*__*` demo actions | Tools | Використовувати спільні button/field styles | Feature має лише компонувати |

## Чіткі межі

1. **Візуальні сімейства, доступні для перевикористання:** icon (40), mini (32 круглий), corner, text (primary/secondary/outline/destructive/quiet), compact, pill, page, step, tool, list-item, chip-remove/chip-more, plain та square. Варіанти залишаються у **`src/ui/button/button.css`**; новий skin можливий тільки за реальної відмінності загального сценарію, не за назвою feature.
2. Ролі `pg-menu__trigger`, `pg-dialog__button`, `pg-pagination__button`, `pg-rich-text-editor__action` — не оформлення. Їх залишати для DOM, клавіатури, anchor/focus та локального компонування, **без повторення загального CSS**.
3. **Справжні відмінності компонентів:** FAB — складена кнопка з відкриванням; Listbox — native-like поле та невеликі дії chip; Tabs/Segment — навігаційні та radio патерни. Тут допустима тільки поведінка й специфічна геометрія композиції, не копія базових hover/focus/disabled.
4. Під час рев'ю шукати дублікати `border`, `border-radius`, `background`, `color`, `:hover`, `:focus-visible`, `:disabled` у CSS компонентів для звичайного button. Виправляти у спільному `button.css` або через наявний модифікатор, **не додавати ще один**.
5. Перевірити `npm run check` і E2E: menu trigger (звичайний/mini), pressed pin, Dialog, FAB, pagination, select/listbox, темна тема, keyboard, reduced motion.
