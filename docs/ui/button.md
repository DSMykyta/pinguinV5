# Shared icon and mini buttons — canonical contract

**Рішення 2026-11-10.** Джерело: `legacy/css/components/buttons/button-icon.css` (`.btn-icon`) і `legacy/css/components/forms/checkbox.css`. Споживач: `work/src/ui/button/button.css`. Це адаптація до чинних токенів, не копія CSS з `legacy`.

## Дослідження legacy

- `.btn-icon`: **32×32px**, `border: none`, `border-radius: 50%`, прозорий фон у спокої, іконка **16px**. `hover` і `.active`: акцентний фон (`color-mix(... main 20%, transparent)`), акцентний колір і м'яка тінь `0 2px 8px`. Базові кнопки стискаються до `scale(.98)` при натисканні.
- Legacy-checkbox: **24×24px** видимий квадрат, на hover та checked округлюється до кола. Це **input**, не button.
- Старий варіант `work` mini (квадрат 20×20px усередині 28×28px) **скасований**. Не відтворювати цей варіант у feature CSS або у Menu.

## Новий єдиний контракт

- `.pg-icon-button` лишається великим спільним контролом (його геометрію не змінюємо). `.pg-mini-button` — **існуючий модифікатор** того самого `createIconButton()` або `createMenu().trigger`, не нова фабрика.
- `pg-mini-button`: кругла інтерактивна ціль **32×32px**; без видимого border/background у спокої; іконка **16px** через спільне `.pg-icon` із `createIcon()`. Hover: коло, фон `color-mix(in srgb, var(--pg-color-accent) 20%, transparent)`, `color: var(--pg-color-accent)`, м'яка тінь через `--pg-color-shadow`. Active/open/pressed утримує чітку акцентну індикацію. Focus-visible має доступний outline. Disabled не показує активного hover.
- `pg-checkbox`: **однакова геометрія скрізь** — видимий квадрат **24×24px** всередині постійного **32×32px** `.pg-checkbox__hit`; unchecked квадрат зі скругленням, checked/mixed — коло з відміткою або мінусом. `showLabel` впливає тільки на видимість підпису. Немає окремого компактного/звичайного skin або 44px розміру checkbox. Підпис та опис можуть збільшувати загальну висоту текстового рядка, не контролу. Checkbox має реальний `input type=checkbox`, працює Space та має native `indeterminate`.
- Ці контролі узгоджені за **зовнішнім розміром** у таблиці, заголовку та плитках; жодного копіювання в `src/features`, Shell або CSS Menu. Порядок checkbox→Edit, Menu в останньому стовпці, вибір 0/1/2+ та пагінація не змінюються.

## Перевірка

Playwright: однакова геометрія 32×32px mini і спільного checkbox; видимі 24×24px чекбокси; hover колір/фон/тінь; menu open/close, focus-visible, dark theme, reduced motion, table→tiles; незмінні наявні E2E вибору. Запустити `npm run check` і `npm run test:e2e`. Зелений CI не підтверджує візуальну оцінку без браузерного огляду.

## Помилка консистентності: pin у Aside (2026-11-10)

**Дефект:** `src/shell/aside/aside.js` правильно викликав `createIconButton()`, однак додавав `pg-aside__pin`, а `aside.css` повторював власну геометрію (28×28, radius 8px), розмір іконки та `aria-pressed` стиль. Це була **локальна кнопка за виглядом**, хоча фабрика спільна. Так само назва `pg-menu__trigger` до рефакторингу визначала і функціональну роль, і повний окремий button-skin. Обидва підходи порушують reuse-by-contract. Помилку не виправляє просте перейменування класу.

**Рішення:** `pin` — `createIconButton({ variant: 'mini' })`, із уже затвердженим `pg-mini-button` та глобальним станом `aria-pressed`. Ніякого нового `pg-pin-button`. `pg-aside__pin` не має окремих стилів і не потрібен навіть як DOM-hook: існує `[data-pg-action="aside-pin"]`. `pg-menu__trigger` може лишатися структурним DOM-класом для логіки й тестів, але його вигляд задає `pg-button` + `pg-button--outline` або `pg-mini-button`. Спільні основні стани (idle / hover / pressed / expanded / focus-visible / disabled / reduced motion) належать виключно `src/ui/button/button.css`.

**Запобіжник:** перед будь-яким новим `button` перевіряти [реєстр кнопок](button-inventory.md), застосовувати наявний клас вигляду та фабрику. `src/features`, `src/shell` і CSS інших UI-компонентів можуть лише позиціонувати/обмежувати вміст наявного контролу; розміри, рамка, радіус, кольори та стани **не дублюються**. Виняток — справжня складова поведінка, як FAB з власним pop-out меню або native label/radio, яка задокументована в реєстрі.

## Універсальні button-класи після аудиту 2026-11-10

`createIconButton({ label, icon, action?, onClick?, variant? })` використовує `variant = 'default' | 'mini' | 'corner'`. Mini — спільна кругла кнопка 32×32 px, **включно з кнопкою pin в Aside**, а `aria-pressed` утримує позначений стан. Для `Menu` лишено структурний клас `pg-menu__trigger`, але вигляд дає `pg-button pg-button--outline`; контекстне `⋯` додає `pg-mini-button`, яке пріоритетніше за outline. `pg-aside__pin` та його CSS прибрано.

`src/ui/button/button.css` містить один набір модифікаторів текстової кнопки: `pg-button--outline`, `--secondary`, `--primary`, `--destructive`, `--compact`, `--pill`, `--page`, `--step`, `--tool`, `--list-item`, `--chip-remove`, `--chip-more`, `--plain`, `--quiet`, `--square`. **Це не окремі компоненти чи фабрики**: тільки варіанти вже наявного style owner. Класи на кшталт `pg-dialog__button`, `pg-pagination__button`, `pg-toast__action` залишаються для структури та поведінки.

Кольори для Toast із темною інверсною поверхнею передаються через змінні `--pg-button-quiet-ink` і `--pg-button-quiet-hover`, а не копіювання окремого CSS. Редактор перемикає «Редактор/HTML» через `createSegmentSwitch` (native radio), не через додаткові style buttons. Геометрія FAB, Tabs і нативних Field контролів залишається власністю відповідних **спільних механізмів**, а не нових одноразових кнопок.

Контроль: у `scripts/check-conventions.mjs` право на класи `pg-button`, `pg-mini-button` та `pg-icon-button` закріплене за `src/ui/button/button.css`; новий `pg-aside__pin` CSS заборонено. Повні ролі та межі описані в [інвентарі](button-inventory.md).

### Регресія 2026-11-10 — FAB обрізався після зміни позиції

**Помилка:** координати двох FAB порівнювалися лише за bounding box, без перевірки фактичного hit target і обрізання батьківським `overflow: hidden`. Нижній FAB належить до footer, а глобальний — до правого rail. При 8px gap елемент нижнього FAB частково виходить за межі workspace; зміщення самого елемента без дозволу overflow обрізає його.

**Правило:** одна фабрика `createAsideFab`, один `src/shell/aside/fab.css` керує розташуванням інстансів. Footer не створює власного кнопкового стилю. Workspace дозволяє overflow, але `Main`, table scroll та інші власники scroll залишаються ізольованими. На ширині до 1080px rail зникає, тому footer FAB резервує місце для global FAB. E2E перевіряє реальний край hit target, відсутність обрізання, 8px gap та доступність дій у відкритому меню. **Проблему не можна «виправляти» підганянням тільки числових порівнянь тестів.**


## Семантичне перефарбування (2026-11-10)

Новий [колірний контракт](semantic-colors.md) встановлює `tone` незалежно від геометрії (`variant`, compact, mini, pill) і `appearance` (`soft`, `solid`, `outline`, `ghost`). Публічний API: `setButtonColor(element, { tone, appearance })`, `createIconButton({ ..., tone?, appearance? })`; ті самі `data-pg-tone` / `data-pg-appearance` для текстових кнопок Menu, Selection Actions і Dialog. Одне джерело числових кольорів — `src/styles/tokens.css`, єдиний style owner — `src/ui/button/button.css`. Старий `--pg-color-accent` залишається для нефарбованих елементів, геометрія й анімації незмінні.

## Icon + Text і Loading — універсальні механізми (2026-11-10)

**Icon + Text:** у чинному `pg-button` уже є `inline-flex`, `align-items:center` і `gap:8px`. Для `pg-icon` у звичайній текстовій кнопці розмір зафіксовано як **18×18px**; порядок icon/label визначається порядком DOM-елементів (іконка ліворуч або праворуч). **Жодного** `--icon-left` чи `--icon-right` модифікатора не потрібно. Виняток: `pg-button--square` з 16px іконкою зберігає чинну геометрію.

**Loading — стан, не нова кнопка.** `setButtonLoading(button, true|false)` діє на `pg-button` і `pg-icon-button`, включно з mini/corner та FAB. Стан `data-pg-loading='true'`, `aria-busy='true'`, `aria-disabled='true'`; повторний click (включно з Enter/Space) блокується capture-обробником, але фокус і попередній native `disabled` не змінюються. Повернення до попередніх aria-значень відбувається при завершенні. `withButtonLoading(button, asyncTask)` використовує `try/finally` для відновлення і після resolve, і після reject. Не змінювати текст, іконку та розміри в процесі.

**Індикатор (оновлений Material 3):** у **тому ж `button.css`** псевдоелемент `::after` показує сім фігур, які морфують у центрі кнопки; рамка більше не обертається. Мітка/іконка тимчасово приховані без зміни DOM або розмірів, а контрастний колір береться з поточного button skin. При `prefers-reduced-motion` фігура статична. SVG ring у `Section Navigator` зберігає окремий визначений прогрес жесту. **Не анімувати саму кнопку**: corner/FAB продовжують власну погоджену анімацію.

**Toggle:** не створювати новий тип і не вводити bounce для звичайних кнопок. `aria-pressed` вже відображає затиснений стан pin/editor-tool; він окремий від Loading. Нову анімацію для нього не додавати.

**Тестування:** у Tools → Текст існує приклад `createButtonDemo` з двома порядками Icon+Text і з Loading для text та mini. Playwright перевіряє gap, розміри іконки, відсутність зсувів, aria-стани, заборону повторної дії, відновлення після помилки, keyboard/focus, reduced-motion.

Джерела дослідження: [Radix Button](https://www.radix-ui.com/themes/docs/components/button), [Radix Spinner](https://www.radix-ui.com/themes/docs/components/spinner), [Chrome Modern Web Guidance — Spinner](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-components/spinner), [WAI-ARIA Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/).

## Спільні пункти Sidebar і Workspace (2026-11-11)

`pg-button--nav-item` — **наявне оформлення основного Sidebar, виділене в спільний owner**, без зміни візуального дизайну. Воно тепер однаково застосовується до глобального route link `a.pg-sidebar__link` і до локальної кнопки секції `button.pg-workspace-layout__nav-item`. Один CSS-опис відповідає за розмір 42px, відступи, іконку 18px, підсвічування hover/current і reduced motion. Навігаційні callbacks, Router та історія залишаються виключно в їхніх власників. Варіант внесено до перевірюваного реєстру після перевірки обох споживачів і зміни стилів без дублювання.


## Material 3 Expressive Loading — оновлення 2026-11-12

**Нова пряма вимога:** раніше індикатор обертався **навколо border**; тепер активний стан очікування показує **змінні фігури всередині кнопки**, центровані по її площі. Це [Material 3 Loading Indicator](https://m3.material.io/components/loading-indicator/guidelines) для коротких невизначених операцій, а не determinate [Progress Indicator](https://m3.material.io/components/progress-indicators/guidelines). Попередні описи border-orbit в цьому документі є історичними — застосовувати саме новий контракт.

- **Один чинний механізм:** лише `setButtonLoading(button, true|false)` та `withButtonLoading(button, task)` у `src/ui/button/button.js`; без другого компонента, overlay-сервісу або нової кнопки. Псевдоелемент `::after` у `src/ui/button/button.css` замінює конічний обвід на Material-inspired морфінг із **семи округлих фігур**, розташованих **посередині кнопки**. Фігури й обертання працюють незалежними CSS-анімаціями; розмір для текстової/звичайної іконкової кнопки 22 px, для mini 18 px.
- **У loading:** збережені всі геометричні параметри, original DOM, callbacks, focus, click guard, `aria-busy`, `aria-disabled`, вихідні inline styles та `aria-label`; текст/іконка лише візуально приховані на час запиту, без видалення з DOM; псевдоелемент не отримує події. Доступна назва кнопки підтримується і для кнопок, у яких до loading немає окремого `aria-label`.
- **Кольори:** форма бере **обчислений foreground тієї самої кнопки перед переходом**; це забезпечує контраст у primary, destructive, custom semantic tones і dark mode. Ніяких нових хардкодів кольору/палети. Стиль не змінює hover/selected FAB чи інших механізмів.
- **Reduced motion:** одна статична, центрована фігура, без циклічного morph/rotate; після завершення відновлюються первинні DOM, видимість, accessible name та стиль. Немає відсотків, бо коротке очікування є indeterminate.
- **Незмінний Section Navigator:** `stroke-dashoffset` його SVG кільця — точний **визначений прогрес жесту** біля краю робочої області, отже до нового кнопкового loading його не прив'язувати; навігацію й радіус кільця не чіпати.

**Тестування:** `tests/e2e/material-loading.spec.js`: форма всередині, жодного border-orbit, колір primary/outline/dark, стабільна геометрія й DOM, повторні кліки та клавіатура, aria й відновлення, reduced-motion. Цей документ не засвідчує проходження браузерних тестів без фактичного запуску.
