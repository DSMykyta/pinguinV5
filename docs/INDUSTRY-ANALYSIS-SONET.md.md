# pinguin-v5 — Аналіз ринку та порівняння з галузевими системами

> Глибинне дослідження організації JS-коду

---

## Зміст

| # | Розділ |
|---|--------|
| 01 | Суть системи pinguin-v5 — механізм, що стоїть за кодом |
| 02 | Addy Osmani / Yahoo / Google — класичні enterprise-патерни |
| 03 | WordPress Hook System — найближчий аналог у масовому виробництві |
| 04 | Vite + Rollup Plugin API — сучасна plugin-система |
| 05 | VSCode Extension API — найзріліший plugin-контракт у JS |
| 06 | Feature-Sliced Design — методологія рівнів і шарів |
| 07 | Micro-frontends: Module Federation, Single-SPA |
| 08 | Монорепо: Google Bazel, Meta Buck, Turborepo, Nx |
| 09 | Зведена таблиця порівняння |
| 10 | Де pinguin-v5 перевершує — і де є сліпі зони |
| 11 | Висновки та інженерні рекомендації |

---

## 01 / Суть системи pinguin-v5

pinguin-v5 — це не просто набір правил написання коду. Це **операційна система для команди** і **механізм примусового проектування**. Система вирішує конкретну проблему: у великих фронтенд-кодебейсах кожен розробник будує «на свій розсуд», і через 6 місяців ніхто не знає, де шукати логіку, хто за що відповідає, і чому видалення одного файлу ламає три несвязаних модулі.

### Три закони — це три антипатерни

Кожен закон є відповіддю на конкретний патерн хаосу:

| Закон | Антипатерн, який він забороняє | Наслідок без закону |
|-------|-------------------------------|---------------------|
| I — Один файл — одна роль | God Object: файл на 1000 рядків, що робить все | Неможливо тестувати, merge conflicts на кожному кроці |
| II — Плагін не знає про інших | Tight coupling: прямий import між features | Видалення будь-якого модуля ламає решту |
| III — Система не падає | Promise.all fail-fast: один збій зупиняє все | Продакшн недоступний через один баговий плагін |

### Чотирирівнева архітектура

Ядро системи — чотири типи файлів із чіткими контрактами. Важливо розуміти, що це не просто «де що лежить». Це **система з enforcement**: якщо код не відповідає контракту — він лежить не в тому місці.

| Файл | Метафора | Може | Не може |
|------|----------|------|---------|
| `-main.js` | Диригент оркестру | Завантажувати плагіни, створювати state, вставляти HTML | Реалізовувати фічі, маніпулювати DOM напряму |
| `-state.js` | Спільна шина даних | Зберігати стан, реєструвати хуки, кешувати DOM | Завантажувати плагіни, маніпулювати DOM |
| `-template.js` | HTML-фабрика | Генерувати рядок розмітки | Вставляти в DOM, слухати події, знати про state |
| `-core.js` | Базовий слухач | DOM-логіка, тригерити runHook() в ключових точках | Знати про конкретні плагіни, реалізовувати фічі |
| `plugin-*.js` | LEGO-блок | `export function init(state)`, реагувати через registerHook | Імпортувати інші плагіни, зберігати дані поза state |

### Шарми — нульовий JS на рівні сторінки

Система шармів є **інфраструктурним рівнем поведінок**. Замість того, щоб кожен раз писати JS для кнопки очищення пошуку чи пагінації — достатньо HTML-атрибуту. Ініціалізація відбувається глобально через делегування подій. Це *attribute-based programming* — той самий патерн, що використовує Alpine.js, Stimulus та Vue Directives.

---

## 02 / Addy Osmani, Yahoo, Google — Enterprise-патерни

У 2011 Addy Osmani (AOL, Google Chrome team) сформулював архітектуру великомасштабного JS на основі того, що вже використовувалось у **Yahoo** та **Google Gmail**. Ця система базується на трьох класичних патернах, скомбінованих разом.

### Три патерни, що утворюють Enterprise-систему

#### 1. Mediator Pattern — «диспетчер авіапорту»

Модулі не говорять між собою напряму. Всі повідомлення **йдуть через Mediator** (centralised controller). Mediator знає про всі модулі, але модулі не знають одне про одного.

> **Аналогія в pinguin-v5** — `state` виконує роль Mediator: єдиний канал між плагінами через хуки. Плагін не знає про існування іншого плагіна.

#### 2. Facade Pattern — «спрощений інтерфейс»

Facade приховує внутрішню складність модуля за простим API. Зовнішній код бачить лише **`init()`** — все інше ізольоване.

> **Аналогія в pinguin-v5** — кожен плагін має єдиний публічний метод `init(state)`. Вся внутрішня логіка — приватна. Це класичний Facade.

#### 3. Module Pattern — «ізольований контейнер»

Кожен модуль існує незалежно, може бути «dropped into» інший проєкт без змін, і **продовжує працювати якщо інший модуль зламався**.

### Ключові вимоги Osmani до enterprise-архітектури

| Вимога | pinguin-v5 відповідає? | Реалізація |
|--------|----------------------|------------|
| Модулі лише публікують/підписуються на події | ✅ Так | `registerHook / runHook` |
| Система продовжує працювати при збої модуля | ✅ Так | `Promise.allSettled` + `try/catch` в `runHook` |
| Центральний орган управляє модулями | ✅ Так | `-main.js` як єдина точка входу |
| Модулі можна видалити безпечно | ✅ Так | `PLUGINS` array, dynamic import |
| Безпека на рівні модулів (що може робити кожен) | ⚠️ Частково | Контракт лише конвенційний, не примусовий |
| Можливість замінити framework-рівень | ❌ Немає | Прив'язка до vanilla JS — це одночасно сила і межа |

---

## 03 / WordPress Hook System — найближчий аналог

WordPress займає понад **40% всього веб**. Його архітектурний хребет — **Event-Driven Architecture через Hooks**. Ця система існує з 2003 року і виявилась настільки успішною, що стала стандартом для CMS/plugin-екосистем по всьому світу.

### Як працює WordPress Hook System

- **`do_action()`** — аналог `state.runHook()`. Ядро «оголошує подію» в ключових точках виконання.
- **`add_action()`** — аналог `state.registerHook()`. Плагін «підписується» на подію.
- **`apply_filters()`** — відсутній у pinguin-v5 аналог. Дозволяє плагіну *модифікувати значення*, яке повертається іншому.

### Порівняння архітектур

| Аспект | WordPress Hooks | pinguin-v5 Hooks |
|--------|----------------|-----------------|
| Реєстрація | `add_action("init", fn, $priority)` | `state.registerHook("onUpdate", fn)` |
| Виклик | `do_action("init")` | `state.runHook("onUpdate")` |
| Пріоритет виклику | Числовий пріоритет (10 за замовч.) | Порядок реєстрації (FIFO) |
| Модифікація даних | `apply_filters()` — повертає змінене значення | Відсутній (тільки side effects) |
| Ізоляція плагіна | Плагін — окремий файл/папка | Плагін — окремий JS файл |
| Падіння одного плагіна | Може покласти весь сайт | `try/catch` захищає систему |
| Видалення плагіна | Безпечне (деактивація) | Безпечне (прибрати з `PLUGINS` array) |
| Комунікація між плагінами | Тільки через хуки (best practice) | Тільки через state (enforced) |

> **Критична різниця: filters vs pure actions.** WordPress має `apply_filters()` — механізм трансформації даних, де плагін ПОВЕРТАЄ модифіковане значення. У pinguin-v5 хуки є чисто side-effect: вони викликають callbacks, але не передають повернене значення. Це спрощує систему, але знімає можливість «ланцюжкової трансформації».

### Чому WordPress-модель масштабувалась на 40% веб

- Будь-який розробник може розширити ядро, не чіпаючи core-код
- WooCommerce додає E-commerce поверх CMS через хуки — без fork
- Теми змінюють вигляд через хуки — без зміни ядра
- Ядро оновлюється незалежно від плагінів (Закон II pinguin-v5 — те саме)

---

## 04 / Vite + Rollup Plugin API — сучасний plugin-контракт

Vite — домінуючий build tool 2024 (замінює Webpack у нових проєктах). Його plugin-система є **найбільш вивіреним JS plugin API у build-world**. Vite extends Rollup's plugin interface — тому один плагін може працювати в обох системах.

### Контракт Rollup/Vite плагіна

```js
export default function myPlugin(options) {
  return {
    name: 'my-plugin',         // обов'язково — для дебагу
    enforce: 'pre' | 'post',   // порядок виконання
    apply: 'build' | 'serve',  // коли активний

    // Lifecycle hooks:
    buildStart(options) {},     // старт build
    transform(code, id) {},     // трансформація файлу
    load(id) {},                // завантаження файлу
    buildEnd(error?) {},        // кінець build
    closeBundle() {},           // після запису output
  }
}
```

### Порівняння з pinguin-v5 plugin-контрактом

| Аспект | Vite/Rollup Plugin | pinguin-v5 Plugin |
|--------|-------------------|------------------|
| Публічний API | Об'єкт з lifecycle hooks | Один метод: `export function init(state)` |
| Ін'єкція залежностей | Через options при реєстрації + `this`-контекст | Через `state`-параметр при виклику `init` |
| Порядок виконання | `enforce: "pre" \| "post" \| default` | FIFO (порядок у `PLUGINS` array) |
| Умовна активація | `apply: "build" \| "serve" \| function()` | Немає (можна додати умово в `PLUGINS`) |
| Назва для дебагу | Обов'язкове поле `name` | Ім'я файлу (немає явної назви) |
| Async initialization | `buildStart()` може бути async | `init()` може бути async |
| Повернене значення | `transform()` повертає код/sourcemap | `init()` нічого не повертає |
| Composability | Плагіни-пресети (array of plugins) | Flat `PLUGINS` array |

> **Що pinguin-v5 може запозичити від Vite Plugin API** — поле `name` на плагіні. Зараз при помилці в `runHook()` логується `[MyModule] Error` — без конкретики. Якщо плагін декларує своє ім'я при реєстрації (`state.registerHook("onUpdate", fn, { name: "formatting" })`), дебаг стає в рази легшим.

---

## 05 / VSCode Extension API — найзріліший plugin-контракт у JS

VSCode має понад **40,000 розширень** у Marketplace. Його Extension API — **еталон того, як будують plugin-системи** у довгостроковій перспективі. Архітектура розроблялась з 2015 року і вирішує ті самі проблеми, що й pinguin-v5.

### Activation Events — lazy loading плагінів

VSCode завантажує розширення **лише коли потрібно**. Якщо відкрили Markdown-файл — активується лише Markdown-плагін.

| Activation Event | Що активує |
|-----------------|------------|
| `onLanguage:javascript` | Відкрили JS-файл |
| `onCommand:myExt.doSomething` | Викликали команду |
| `workspaceContains:.editorconfig` | Знайшли файл у проєкті |
| `onView:myTreeView` | Розгорнули панель |
| `*` (зірка) | При старті VSCode (**антипатерн** — уникати) |

### Disposable Pattern — керування ресурсами

Все що може «зупинитись» у VSCode — **Disposable**. Event listeners, команди, status bar items — реєструються і зберігаються в `context.subscriptions`. При деактивації розширення все автоматично `dispose()`-ується.

```ts
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('myExt.hello', () => {
    // ...
  });
  context.subscriptions.push(disposable); // авто-cleanup при деактивації
}

export function deactivate() { /* cleanup */ }
```

### onDid/onWill Naming Convention

VSCode API має суворий naming convention для подій: `onDidChangeActiveTextEditor`, `onWillSaveTextDocument`. **`onDid`** — вже відбулось, **`onWill`** — збирається відбутись (можна скасувати).

> **Що pinguin-v5 може запозичити від VSCode:**
> - Naming convention для хуків: `onDidUpdate` vs `onWillUpdate` — дає семантику без читання коду
> - Disposable pattern для cleanup: якщо модуль знищується — всі підписки автоматично знімаються. Сьогодні в pinguin-v5 немає механізму cleanup-хуків.

### Ізоляція розширень через окремий процес

VSCode запускає розширення в **Extension Host — окремому Node.js процесі**. Це означає, що якщо розширення кидає uncaught exception — VSCode не падає. Комунікація між Extension Host та редактором відбувається через *message passing*.

pinguin-v5 вирішує ту саму задачу через `try/catch` у `runHook()` та `Promise.allSettled` при завантаженні — простіший механізм, але з тим самим результатом: система не падає через один плагін.

---

## 06 / Feature-Sliced Design — методологія рівнів

FSD (Feature-Sliced Design) — найсистематизованіша методологія організації фронтенд-коду станом на 2024. Використовується у фінтех, банківських і b2b-компаніях.

### Сім шарів FSD (зверху вниз)

| Шар FSD | Зона відповідальності | Аналог в pinguin-v5 |
|---------|----------------------|---------------------|
| `app/` | Routing, providers, глобальні стилі, bootstrap | `-main.js` (entry point) |
| `processes/` *(deprecated)* | Складні міжсторінкові сценарії | — |
| `pages/` | Повні сторінки, прив'язані до routing | — |
| `widgets/` | Великі самодостатні UI-блоки з логікою | Модуль (`editor/`, `table/`, `avatar/`) |
| `features/` | Цілісні фічі що несуть бізнес-цінність | Плагіни (`formatting`, `sorting`, `filters`) |
| `entities/` | Бізнес-сутності: User, Product, Order | `-state.js` (бізнес-дані) |
| `shared/` | Базові утиліти без прив'язки до проєкту | `-template.js`, шарми |

### Головне правило FSD

**Модуль на шарі N може імпортувати лише шари < N.** Pages можуть використовувати widgets, features, entities, shared — але не навпаки. Shared нічого не знає про жодний інший шар.

> **Аналогія в pinguin-v5** — плагін не знає про `-main.js`, не імпортує `-core.js`, не чіпає `-template.js`. Він знає тільки `state`. Це реалізація того самого однонаправленого потоку залежностей, що у FSD — але виражена через runtime (хуки), а не через import-дерево.

### Де FSD сильніший за pinguin-v5

- **Public API через `index.js`** — кожен slice має `index.js` з явним переліком того, що він експортує зовні. Внутрішні файли — не видно. pinguin-v5 не має явного Public API на рівні модулів.
- **Машинна перевірка через ESLint + steiger** — FSD має linter-плагін, що перевіряє правила автоматично. У pinguin-v5 правила — конвенційні, не автоматизовані.
- **Масштабування** — FSD явно описує що робити при зростанні проєкту. pinguin-v5 описує рівень «одного модуля».

---

## 07 / Micro-frontends: Module Federation та Single-SPA

Micro-frontend архітектура — **мікросервіси для фронтенду**. Замість монолітного фронтенд-застосунку — кілька незалежних застосунків, що разом утворюють єдиний UI. Актуальна для великих команд (50+ розробників).

### Module Federation (Webpack 5 / Vite)

Module Federation дозволяє **JS-модулям завантажуватись між застосунками у runtime**. Host-застосунок підтягує компоненти з Remote-застосунку без build-time залежності.

| Концепція | Опис | Аналогія в pinguin-v5 |
|-----------|------|-----------------------|
| Host application | Основний застосунок, що споживає remote modules | `-main.js` + `PLUGINS` array |
| Remote application | Незалежний застосунок, що expose'ить модулі | Плагін (окремий файл) |
| Shared dependencies | React, lodash — один екземпляр між усіма | `-state.js` (спільний об'єкт) |
| Remote entry point | `remoteEntry.js` — маніфест що є доступним | `export function init(state)` |
| Runtime import | `import("remote/Button")` — lazy при необхідності | dynamic import у `Promise.allSettled` |

### Single-SPA — оркестратор мікрофронтендів

Single-SPA вирішує проблему **кількох різних JS-фреймворків в одному застосунку**. Це «диригент», який монтує/демонтує React, Angular або Vue додатки залежно від поточного URL.

| Single-SPA lifecycle | Що робить | Аналог pinguin-v5 |
|---------------------|-----------|------------------|
| `bootstrap()` | Одноразова ініціалізація | `init(state)` |
| `mount(props)` | Монтування при активному URL | Немає явного аналогу |
| `unmount(props)` | Демонтування при переході | Немає (cleanup не визначено) |
| `unload(props)` | Повне знищення, наступний bootstrap з нуля | Немає |

> **Масштаб vs складність.** Module Federation + Single-SPA вирішують задачу для команд 50+ людей, де кожна команда деплоїть свій фронтенд незалежно. Для pinguin-v5 це надлишково — система вирішує кращу задачу: організація коду всередині одного застосунку. Це різні рівні гранулярності.

---

## 08 / Монорепо: Google, Meta, Microsoft

Найбільші технологічні компанії зберігають весь свій код в **одному репозиторії**. Google має мільярди рядків коду в одному монорепо. Це вирішує задачу рівня «організація кодебейсу компанії», а не «організація модуля».

### Як великі компанії будують монорепо

| Компанія | Інструмент | Масштаб | Ключова особливість |
|----------|-----------|---------|---------------------|
| Google | Bazel + Piper (внутрішній VCS) | Мільярди рядків, 25,000+ engineers | Visibility rules: проєкт може бути "private" або "public" в межах репо |
| Meta | Buck + Mercurial | Один репо для backend і frontend | Atomic commits — один commit змінює BE + FE |
| Microsoft | Rush + Git | Windows, Office, Azure | Rush enforces versioning policy між пакетами |
| Open-source (Babel, Jest, React) | Lerna / Turborepo / Nx | Десятки пов'язаних пакетів | Shared packages без publish в npm для internal use |

### Монорепо-інструменти у JS-екосистемі

| Інструмент | Сильні сторони | Коли вибирати |
|-----------|---------------|--------------|
| Turborepo | Швидкий cache, простий setup, від Vercel | Next.js проєкти, невеликі команди |
| Nx | Dependency graph, code generation, module boundaries enforcement | Великі команди, Angular/React |
| Lerna | Публікація npm-пакетів, changelog | Open-source бібліотеки |
| pnpm workspaces | Нативний, найшвидший install | Будь-який проєкт — базовий рівень |
| Bazel | Cross-language, remote cache, incremental builds | Google-scale, polyglot |

> **Монорепо і pinguin-v5 — доповнення, не конкуренти.** Монорепо вирішує: «де зберігати всі пакети компанії». pinguin-v5 вирішує: «як організувати код всередині одного JS-застосунку». Це різні рівні. Можна мати монорепо з Turborepo і кожен app у ньому організований за pinguin-v5.

---

## 09 / Зведена таблиця порівняння

| Система | Рівень | Hook/Plugin механізм | Ізоляція | Enforcement | Масштаб |
|---------|--------|---------------------|----------|-------------|---------|
| pinguin-v5 | Модуль | `registerHook/runHook` | Конвенційна | Конвенційний | Один app |
| WordPress Hooks | App/Plugin | `add_action/do_action/apply_filters` | Файл/папка | Конвенційний | Цілий сайт |
| Vite Plugin API | Build tool | Lifecycle hooks (`buildStart`, `transform`...) | npm package | TypeScript types | Build pipeline |
| VSCode Extensions | Editor | `activationEvents` + disposables | Окремий процес | API contract + TS | Editor features |
| Feature-Sliced Design | App | Import rules (layers) | `index.js` Public API | ESLint steiger | Великий app |
| Module Federation | Multi-app | Shared modules at runtime | Окремий deploy | Webpack/Vite config | 50+ devs |
| Single-SPA | Multi-app | `bootstrap/mount/unmount` lifecycle | Окремий процес | Lifecycle API | 50+ devs |
| Monorepo (Nx/Turbo) | Компанія | Package boundaries | npm packages | CODEOWNERS, linter | Компанія |

---

## 10 / Де pinguin-v5 перевершує — і де є сліпі зони

### Сильні сторони

| Перевага | Чому це важливо | Що мають аналоги? |
|----------|----------------|-----------------|
| Нульовий когнітивний overhead при читанні | Будь-який файл зрозумілий до відкриття — шапка пояснює роль. Жоден аналог не має настільки явної self-documentation. | WordPress: нема стандарту. FSD: є конвенція, але не self-documented |
| `Promise.allSettled` + `try/catch` — вбудована fault-tolerance | Система фізично не може впасти через один плагін. WordPress — може. React без Error Boundaries — може. | VSCode extension host ізолює, але це окремий процес (складніше) |
| Нульовий JS на сторінці через шарми | HTML-атрибут замість JS-коду. Менше коду = менше багів. Alpine.js і Stimulus будують на тому ж принципі, але потребують framework. | Alpine.js/Stimulus — ближче, але важчі |
| Один шаблон для всіх модулів | Новий розробник дивиться один приклад і знає структуру ВСІХ модулів. FSD дає шар-модель, але всередині слайсу — свобода. | FSD: шари є, але внутрішня структура довільна |
| Dynamic imports без bundler-залежності | Native ES modules — без webpack/rollup конфіга. Чиста платформа. | Module Federation потребує Webpack config |

### Сліпі зони — що варто додати

| Проблема | Де в аналогах вирішено | Можливе рішення |
|----------|----------------------|----------------|
| Немає named plugins — дебаг складний | Vite: `name` field обов'язковий. VSCode: extension id. | `state.registerHook("onUpdate", fn, { plugin: "formatting" })` |
| Немає filters — плагін не може трансформувати значення | WordPress: `apply_filters()`. Rollup: `transform()` повертає код. | Додати `state.applyFilter("onRenderValue", defaultValue)` |
| Немає cleanup/dispose | VSCode: disposables + `context.subscriptions`. Single-SPA: `unmount()`. | `state.registerHook("onDestroy", cleanupFn)` |
| Немає автоматизованого enforcement | FSD: ESLint steiger перевіряє шари. Nx: module boundaries. | ESLint custom rule: plugin не може importувати plugin |
| Немає версіонування контракту | npm semver для пакетів. VSCode: `engines.vscode` version. | `SYSTEM_VERSION` константа в state |
| Немає pub/sub між різними екземплярами | EventEmitter, CustomEvent, BroadcastChannel | Глобальна шина через `window` CustomEvent для cross-module |

---

## 11 / Висновки та інженерні рекомендації

### Де стоїть pinguin-v5 у ландшафті

pinguin-v5 вирішує задачу **організації коду всередині одного app**, яку великі системи або не вирішують (монорепо, мікрофронтенди), або вирішують через важкі framework-залежності (React+Redux, Angular modules).

Найближчий промислово перевірений аналог — **WordPress Hook System**. Різниця: WordPress не дає fault-tolerance (один збій може покласти сайт), pinguin-v5 вирішує це через `allSettled + try/catch`.

### Три конкретні покращення з ринку

#### 1. Named plugins (від Vite)

Додати ім'я до `registerHook` для кращого дебагу:

```js
// Зараз:
state.registerHook('onUpdate', fn);

// Покращення:
state.registerHook('onUpdate', fn, { plugin: 'formatting' });
// runHook логуватиме: [editor/onUpdate] Error in plugin "formatting"
```

#### 2. Filter hooks (від WordPress `apply_filters`)

Окремий тип хуків що повертає трансформоване значення:

```js
// Плагін може модифікувати значення перед рендером:
state.registerFilter('onRenderCell', (value, rowData) => {
  return value === null ? '—' : value;
});

// Core викликає:
const displayValue = state.applyFilter('onRenderCell', rawValue, row);
```

#### 3. ESLint rule для enforcement (від FSD/Nx)

Автоматизувати перевірку Закону II — плагін не може importувати плагін:

```js
// .eslintrc: custom rule "no-plugin-imports-plugin"
// Файли що починаються з plugin- не можуть importувати plugin-*
// Одна правило = автоматичне enforcement без code review
```

---

*Система диктує код — не навпаки. pinguin-v5 стоїть поруч із найкращими промисловими системами організації JS-коду.*
