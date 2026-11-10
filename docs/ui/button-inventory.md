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
| `pg-listbox__chip-remove`, `pg-listbox__more` | Chips, tray у Listbox | `pg-button--chip-remove` / `pg-button--chip-more` | Micro-target у chip та незалежне розкриття +N |
| `pg-input__clear` | Input/Search | `createIconButton({variant:'mini'})` | Саме поле має власний lifecycle |
| `pg-tag-field__remove` | Tag Field | `pg-button--quiet pg-button--square` | Малі дії біля тегів; keyboard/undo належать Tag Field |
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

## Дослідження відсутніх можливостей (2026-11-10)

**Факт:** у `src/ui/button/button.css` наразі 19 документованих типів і модифікаторів в **одному** CSS-файлі. Це не 19 JS-фабрик: `button.js` надає одну `createIconButton(default|mini|corner)`, а текстові дії використовують спільні CSS-класи на нативному `<button>`.

Джерела: `legacy/css/components/buttons/button-base.css`, `button-ghost.css`, `button-groups.css` (у legacy видалений), `button-icon.css`, `button-option.css`, `button-outline.css`, `button-primary.css`, `button-secondary.css`, `fab.css`; [Radix Button](https://www.radix-ui.com/themes/docs/components/button), [Radix IconButton](https://www.radix-ui.com/themes/docs/components/icon-button), [Material Web](https://github.com/material-components/material-web/blob/main/docs/components/button.md), [W3C APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

| Потреба | Уже покрито | Рішення та пріоритет |
| --- | --- | --- |
| **Loading / Busy** при асинхронній дії | Немає загального стану у `pg-button`/`createIconButton`; споживачі можуть блокувати свої кнопки | **P1:** єдиний стан `aria-busy`, блокування повторного натискання, spinner без зміни геометрії, керування фокусом. **Не нова кнопка** |
| **Toggle / pressed** | `pg-mini-button` та `--tool` підтримують `aria-pressed`, загальної схеми для текстових варіантів немає | **P1:** спільний контракт стану без нової фабрики. W3C радить стабільне доступне ім'я toggle |
| **Text + leading/trailing icon** | `pg-button` має gap 8px, але немає задокументованого API та розміру іконок | **P1:** контракт композиції icon+label; не створювати новий CSS-тип |
| **Ghost** (неакцентна текстова дія з тонованим hover) | `--plain` для сортування та `--quiet` для Toast/Tag покривають частину сценаріїв, але це не повний `legacy .btn-ghost` | **P2, умовно:** спочатку застосувати наявний варіант; новий стиль тільки за повторюваної потреби |
| **Touch / hit target** | `pg-mini-button` 32×32, `--chip-remove` 20×22 | **P1:** перевірити spacing і фактичну hit-area на мобільному; WCAG 2.2 AA: щонайменше 24×24 CSS px або допустимі винятки. Розміри не змінювати навмання |
| **Tonal/elevated/outlined icon** | Icon за замовчуванням прозорий; текстові primary/secondary/outline уже є | **Відкласти:** в Material/Radix вони існують, але у Pinguin не доведено потребу |
| **Split action + dropdown** | Існують Menu і звичайна button | **Відкласти:** компонувати існуючі елементи до появи реального сценарію |
| **Connected group** | У legacy `button-groups.css` видалено; у work вже є Tabs і SegmentSwitch | **Не створювати** ще один компонент для вибору режиму; використовувати радіосегменти |
| **Extended FAB** | Один `createAsideFab` обслуговує обидві FAB; label є в меню | **Відкласти:** не створювати третю FAB/фабрику без вимоги |
| **Icon danger / drag / reveal / touch** | Такі charms були в `legacy .btn-icon`, але зараз немає затверджених загальних контрактів | **Умовно:** додавати стан/поведінку до icon сімейства лише при реальному use-case, не окрему фабрику |

### Як дозволяти нові варіанти

1. Надати конкретний сценарій із UI та довести, чому жоден із 19 існуючих типів не підходить. Спочатку перевірити композицію, стан і токени.
2. Змінювати тільки **один** `src/ui/button/button.css`, а не створювати окремий CSS-файл на кнопку. Для кожного нового типу обов'язкова власна шапка **ТИП / ПРИЗНАЧЕННЯ / НАВІЩО / ДЕ / ГЕОМЕТРІЯ / СТАНИ / МЕЖА**.
3. Оновити схвалений реєстр `scripts/check-conventions.mjs` після огляду. Перевіряти клавіатуру, focus-visible, disabled, pressed, loading, темну тему, reduced motion і mobilе hit target. Автоматична перевірка підтверджує структуру, а не якість рішення.
4. Не перетворювати `pg-tabs`, `pg-select`, `pg-listbox`, `pg-checkbox`, `pg-segment-switch` чи комплексний `createAsideFab` на нові типи стандартної кнопки без обґрунтування.


## Семантичний колір (2026-11-10)

Після аудиту введено `tone`/`appearance`, а не нові сімейства кнопок. Будь-яка наявна звичайна, compact, pill чи mini action може використовувати [спільний контракт кольорів](semantic-colors.md); `setButtonColor()` лише задає атрибути. Menu `danger` відповідає `danger/ghost`, підтвердження видалення — `danger/solid`, bulk delete — `danger/soft`. Style owner незмінний: `button.css`.
