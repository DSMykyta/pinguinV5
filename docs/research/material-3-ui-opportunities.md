# Дослідження: Material 3 Expressive → Pinguin Next

**Дата:** 2026-11-12. **Гілка:** `work`. **Тип:** порівняльний аудит і кандидатні рішення; жодної реалізації в цьому документі. Першоджерело дизайну: [m3.material.io](https://m3.material.io/).

## Статус реалізації 2026-11-12

- **Motion Physics — реалізовано:** [спільні spatial/effects токени](../ui/motion.md), сумісність старих тривалостей і анімацій FAB/Toast/RevealPanel. Реальний spring solver не додано: тут використано функціональну CSS-модель motion channels.
- **Information Density — реалізовано:** [компактно/комфортно для CollectionView](../ui/collection-density.md); один SegmentSwitch у контекстному Aside, збереження окремо для двох колекцій. Не створює Main layout mode.
- Додано Playwright-специфікації `tests/e2e/motion-system.spec.js` і `tests/e2e/collection-density.spec.js`. Наявність тестів у репозиторії не означає, що їхній браузерний прогін уже успішний.

## 1. Що перевірено

Офіційний каталог M3 і сторінки Button groups, Toolbars, Split button, Loading indicator, Progress indicators, Chips, Lists, Menus, Side sheets, Search, Carousel, FAB menu, Motion physics, Interaction states та Density.

Чинний Pinguin: `docs/approved-ui-rules.md`, `docs/implementation-rules.md`, `docs/shell.md`, `docs/ui/overview.md`, `docs/ui/collection-view.md`, `docs/ui/toolbar.md`, `docs/ui/rich-text-editor.md`, `docs/ui/toast.md`, `docs/ui/menu.md`, `docs/ui/listbox.md`, `docs/ui/dialog.md`, `docs/ui/reveal-panel.md`, `docs/ui/pagination.md` і вихідні файли цих компонентів, `src/shell/search/search.js`, `src/ui/button/button.js`, `src/styles/tokens.css`.

**Застереження:** аудит виконано за поточними файлами GitHub, а не за інтерактивною браузерною сесією локально запущеного `work`; тому це аудит архітектури та задокументованої поведінки. Візуальні дефекти, продуктивність і результат end-to-end тестів не підтверджено запуском браузера.

## 2. Вже є: копіювання заборонене

| M3-патерн | Поточний власник Pinguin | Рішення |
|---|---|---|
| Connected/standard Button groups | `src/ui/button-group` + `src/ui/tabs` | Розширювати існуючий компонент; для вкладок прозорі неактивні, усі неактивні кути 8px, лише вибрана pill |
| Floating/docked Toolbar | `src/ui/toolbar` + `src/ui/rich-text-editor` | Перевикористати, зберігши розкриття через `RevealPanel` |
| FAB menu | `src/shell/aside/fab.js` | Існуючі основний і footer FAB — інстанції одного механізму; не створювати новий |
| Dialog / confirmations | `src/ui/dialog`, `src/ui/form-dialog` | Без нової модалки або власної кнопки |
| Snackbar | `src/ui/toast` | Існуючий стек, FIFO, вихід униз; не підміняти нативним M3 Snackbar |
| Menus / submenus | `src/ui/menu`, `src/ui/position` | Є вкладені контекстні меню та спільний popup |
| Side sheet | `src/shell/aside` | Already floating/docked and mobile overlay; не створювати паралельний drawer |
| Forms: field, select, autocomplete, choice | `src/ui/field`, `input`, `select`, `combobox`, `listbox`, `checkbox`, `radio-group`, `switch` | Лейбли залишаються над полями, як затверджено |
| Chips for selected values | `src/ui/listbox`, `src/ui/tag-field` | Перевикористати їхні дані й видалення |
| Cards / table and tiles | `src/ui/collection-view` | Один стан вибору/пагінації; не додавати іншої карткової колекції |
| Slider | `src/ui/slider` | Не замінювати затверджену геометрію чи палітру |
| Navigation + reveals | `src/shell`, `src/ui/section-navigator`, `src/ui/reveal-panel` | Не дублювати анімацію, скрол або 5 зон Shell |
| Busy button | `setButtonLoading()` у `src/ui/button/button.js` | Стандартний стан асинхронної кнопки вже реалізований |

## 3. Кандидати для майбутньої розробки, у порядку цінності

| Пріоритет | Кандидат | Реальний сценарій | Рішення в архітектурі | Обмеження |
|---|---|---|---|---|
| **1** | **Progress indicators + loading** | Імпорт багатьох записів, перевірка контенту, обробка медіа, асинхронні дії | Новий `src/ui/progress-indicator` **лише якщо виникнуть реальні тривалі операції**; `role=progressbar`, визначений 0–100% і невизначений режими. Для коротких дій — існуючий `setButtonLoading` | Не імітувати проценти; не показувати decorative spinner без запущеної задачі |
| **2** | **Split button (основна дія + ∨)** | «Зберегти» і варіанти реальної операції, «Експорт» із форматами | Композиція **наявної кнопки + `createMenu`**; жодного нового button skin; стрілка обертається через спільну анімацію, коли меню відкрите | Додавати тільки за наявності двох і більше реальних споріднених дій; не вигадувати функції |
| **3** | **Filter chips для колекцій** | Часті локальні фільтри «без зображення», «неопубліковані», «вибрані» за підтримки моделлю | Окреме представлення **поточного filter state**, інтегроване у `CollectionView` / `Listbox`. Використати існуючі tokens/buttons/chip removal, а не новий масив фільтрів | Не створювати другу модель вибору; не рухати пошук у шапці чи інші затверджені елементи |
| **4** | **M3 interaction states matrix** | Узгодженість `hover + selected`, `focus + selected`, `pressed`, `disabled` для вкладок, списків, чекбоксів | Аудит `src/ui/button/button.css`, `tabs`, `collection-view`, `menu`; стан один, стилі спільні; зібрати наскрізні регресійні тести | Не додавати місцеві унікальні hover-анімації; перевіряти крайні кнопки |
| **5** | **Комфортна/компактна інформаційна щільність** | Довгі таблиці, медіатека, форми із великим обсягом даних | Лише при необхідності — на рівні **CollectionView**, параметр row density; однакова логіка таблиці та плиток | Це **не** новий режим Main `fill/flush`, не зміна Shell і не безумовне зменшення клікабельної площі; M3 рекомендує 48px hit area |
| **6** | **Expressive списки / вибраний елемент** | Довгі списки команд у Aside або Menu | Невелике точкове покращення ієрархії: ліві іконки, допоміжний текст, trailing state, стабільний hover | Оновити наявний `Menu`/Aside, не створювати новий listbox чи навігацію |
| **7** | **Контекстне меню за правою кнопкою** | Дії над зображенням у медіатеці | За окремим запитом відкрити **той самий** `createMenu` для image/tile hit area; native right-click зберегти для тексту | Не перехоплювати вторинний клік по виділюваному тексту та інпутах |
| **8** | **Пружні motion-токени** | Узгоджені переходи форми, положення й кольору для компонентів | Використати два класи руху M3 — `spatial` (форма/переміщення) і `effects` (opacity/color) — **тільки через наявні `--pg-duration-*` / `--pg-ease-*`**, без окремих анімацій у feature | Не змінювати затверджені FAB/Toast/SectionNavigator анімації; зберегти interruptible `RevealPanel` і `prefers-reduced-motion` |
| **9** | **Standard groups із взаємодією сусідів** | Невеликі набори споріднених дій із виразною первинною кнопкою | Опційно розширити вже наявний `button-group` (у M3 вибрана змінює ширину, сусіди компенсують) | **Не застосовувати у Tabs, Toolbar і шапці**, де пересування контролів заважає |
| **10** | **Carousel лише як медіаперегляд** | Серія фото одного товару всередині його редактора | Спочатку перевірити наявний legacy slider; якщо вистачає, розширити його, не додавати M3 carousel | Не створювати декоративну карусель замість табличної/плиткової медіатеки |

**Важливо:** приклади фільтрів чи дій вище — можливі сценарії. Це не твердження, що ці поля/операції вже є в даних сайту.

## 4. Не переносити

1. Новий drawer/side sheet поверх наявного закріплюваного Aside.
2. M3 Search з результатами, що розкриваються під глобальним полем: чинний контракт `src/shell/search/search.js` **явно забороняє popup**. Наявний пошук `Ctrl+K → Enter` залишити.
3. Ще один FAB, пагінацію, toast, Dialog, Slider, SegmentSwitch, Checkbox, Toolbar або таби.
4. Суцільне Material dynamic-color перефарбування: погоджена тема й `--pg-*` кольори мають пріоритет.
5. Величезні радіуси, великі картки чи декоративні parallax/wave на щільних таблицях: сайт — робочий редактор.
6. Застосування великих Expressive morph-ефектів до кожної кнопки. Важливий контраст — тільки для ключових взаємодій.
7. Підключення готової Web Expressive-бібліотеки без технічного аудиту: офіційний каталог для низки патернів (Split button, Side sheets, Expressive Search) явно вказує `Web: Unavailable`; офіційна документація — насамперед дизайн-специфікація.

## 5. Рекомендований порядок роботи

- Спочатку **аудит і тести взаємодії станів** у наявних кнопках/вкладках/колекціях, без зміни вигляду.
- Потім, коли підтверджено реальні асинхронні сценарії — контракт `ProgressIndicator` (дві моделі: determinate/indeterminate), документація, впровадження, unit/e2e.
- Далі, за наявності реальних споріднених дій — `SplitButton` як мінімальна композиція `Button + Menu`.
- Після цього — фільтри-чіпи поверх єдиної моделі колекції; не рухати затверджені header actions.
- Щільність і більш експресивні списки/групи — лише за конкретним користувацьким сценарієм і з перевіркою на 320/390 px, обох темах, клавіатурі та reduced-motion.

## 6. Офіційні джерела

- [Каталог компонентів](https://m3.material.io/components)
- [Button Groups — guidelines](https://m3.material.io/components/button-groups/guidelines)
- [Split button](https://m3.material.io/components/split-button/overview)
- [Loading indicator](https://m3.material.io/components/loading-indicator/overview)
- [Progress indicators](https://m3.material.io/components/progress-indicators/overview)
- [Chips](https://m3.material.io/components/chips/overview)
- [Lists](https://m3.material.io/components/lists/overview)
- [Menus](https://m3.material.io/components/menus/overview)
- [Side sheets](https://m3.material.io/components/side-sheets/overview)
- [Toolbars](https://m3.material.io/components/toolbars/overview)
- [Search](https://m3.material.io/components/search/overview)
- [Carousel](https://m3.material.io/components/carousel/overview)
- [Interaction states](https://m3.material.io/foundations/interaction/states)
- [Density](https://m3.material.io/foundations/layout/grids-spacing/density)
- [Motion physics](https://m3.material.io/styles/motion/overview/how-it-works)
