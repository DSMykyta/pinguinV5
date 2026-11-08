# Шарми legacy та компактні поведінки Pinguin Next

Дослідження: **2026-11-08**. Legacy зафіксовано на `718aad5d7a1524cff7162061ead766f46f3985b5`, нову систему — на `b025148faa94142e993e58ed02db2b3b998debf5`. Це дослідження вихідного коду й сучасних первинних джерел; вимірювання швидкодії на пристроях не проводилося. Наступні зміни паралельних розробників потрібно звіряти окремо.

## Висновок

У legacy вже є придатна для нової системи ідея: **маленька поведінка підключається до переданого елемента, виконує одну роботу й може бути прибрана окремо**. Саме так задумано шарми. Зберігаємо цю композицію, окремий стан екземпляра та явні контракти; переносимо поведінки через чинні `create*` / `mount*` API.

Основні можливості скоротити код: використовувати готовий Input для пошуку/очищення, native dialog для модальності, native AbortController для життєвого циклу слухачів, CSS для представлення й browser observers для вимірювання. Новий глобальний registry шармів, універсальний event bus або обов'язкові чотири файли для кожної дрібної функції зараз не потрібні. Це проєктне рішення з огляду на наявний ES modules / Vite код.

## Що перевірено

Повністю прочитано ключові реалізації wizard, section navigation, refresh, scroll fade, search clear, search/columns, required, dropzone, morph search, virtual scroll, generic hooks та editor state; простежено підключення через page/editor bootstrap і адаптер пагінації. Реалізації інших редакторів переглянуто вибірково для порівняння контрактів. Жодна оцінка нижче не означає аудиту всього legacy.

Статичний підрахунок у зафіксованій версії:

| Область | Файлів JS | Фізичних рядків, з коментарями |
| --- | ---: | ---: |
| `js/components/charms`, включно з pagination | 12 | 1505 |
| `modal-wizard.js` | 1 | 318 |
| `layout-plugin-nav-sections.js` | 1 | 111 |
| `page-plugins.js` | 1 | 63 |

Це розмір джерел, без висновку про розмір bundle, навантаження CPU чи кількість потрібних можливостей. Простий wizard і новий навігатор із touch/wheel/guards мають різний обсяг відповідальності, тому пряме порівняння їхніх LOC було б оманливим.

Відтворити інвентаризацію: `git ls-tree -r --name-only 718aad5d7a1524cff7162061ead766f46f3985b5 -- js/components/charms`; розміри рахувати з `git show <sha>:<path>` через `splitlines()`. Текстовий `.txt` у цій папці до кількості JS не входить.

## Як була влаштована система шармів

[Архітектурний задум legacy](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/docs/PROJECT-OVERVIEW.md) розділяє bootstrap, state/hooks, DOM core, template і додаткові плагіни. Шарм — невелика опційна поведінка, часто позначена HTML-атрибутом. Наприклад, `refresh`, `scroll-fade`, `pagination`, `data-clear-for`.

Цінні частини задуму: поведінки не повинні знати сусідів; дані мають власника; додаткову можливість можна прибрати; помилка опційного декору не має ламати редактор. У новій системі це вже підтримують feature manifest, `mount(host, context)`, передані callbacks, локальні фабрики UI та cleanup.

Код місцями відхиляється від цього задуму. Це конкретні точки для адаптації:

| Спостереження у коді | Наслідок для перенесення |
| --- | --- |
| `charm-columns.js:20` та `charm-search.js:27` імпортують `findToolbarGroup` із refresh charm | Спільний пошук toolbar опинився у конкретній поведінці. У Next власник передає action host явно; за потреби спільний toolbar стає окремим UI. |
| Refresh, scroll-fade і virtual-scroll заводять окремі MutationObserver на `document.body` | Кожний спостерігає широкий потік змін. Next монтує поведінку там, де вже створено DOM; локальний observer додається лише для фактичних змін вмісту. |
| `page-plugins.js` має priority, editor-state — `{ plugin }`, link plugins — власний реєстр | Контракти різняться; нові модулі не повинні повторювати ці реєстри. Для одного власника досить callbacks. |
| `page-plugins.js:24` не повертає unsubscribe; editor public `destroy` очищає HTML, а refresh listener стоїть на батьківській section | Самого видалення DOM недостатньо для зовнішніх підписок. Усі ресурси прибирає власник екземпляра. |
| Pagination зберігає instances у `navContainer._navState.instances`, а destroy не видаляє звідти instance | Спільна навігація може утримувати старий екземпляр. Стан передається через явний handle й закривається разом із ним. |
| Частина docs описує morph через `data-morph-search`, фактичний JS шукає `.morph-search` | Під час міграції джерелом поведінки є перевірений код, а контракт Next документується окремо. |

Джерела: [columns](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/charms/charm-columns.js#L20), [search](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/charms/charm-search.js#L27), [generic hooks](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/page/page-plugins.js), [editor cleanup](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/editor/editor-main.js#L184), [pagination](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/charms/pagination/pagination-main.js#L122).

## Три різні механізми переходів

### Покроковий wizard

[modal-wizard.js](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/modal/modal-wizard.js) показує одну section, ховає інші, малює кнопки й точки в footer. Власник може фільтрувати та впорядковувати секції; Products саме так ставить варіанти й опис наприкінці через [products-crud-wizard.js](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/pages/products/products-crud-wizard.js).

Це найближчий попередник нового [Section Navigator](ui/section-navigator.md). У прочитаному legacy wizard **немає обробників wheel або touch**: його навігація кнопкова. Тому жест із попереднього завдання є доданою можливістю Next.

Переносимо саму послідовність кроків, порядок від власника та збереження вузлів. Next уже має generic items, labels, callbacks і постійні панелі. Новий `modal-wizard` поряд із ним дублював би керування секціями. Модалка може містити той самий Section Navigator; кнопки збереження лишаються у власника форми.

Старі залежності для адаптації: `_active/_container/_sections` на рівні модуля дозволяють лише один активний wizard; код шукає `.modal-footer` та `.modal-body > main`; save запускається пошуком ID та штучним click; refresh/destroy стирають `style.cssText`; завершення переходу залежить від transitionend. У Next стан локальний, вузли передані явно, збереження — прямий callback, а успіх зміни стану не залежить від CSS-анімації.

### Навігація по довгій сторінці

[layout-plugin-nav-sections.js](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/layout/layout-plugin-nav-sections.js) лишає всі секції видимими. Клік прокручує до якоря; IntersectionObserver оновлює активний пункт. Це scroll spy, для якого придатні звичайні посилання та один observer з локальним root.

Цей режим варто реалізовувати окремою невеликою поведінкою тоді, коли з'явиться довга форма з одночасно видимими блоками. Він не повинен приховано перемикати кроки. Передавати потрібно пари `{ link, target }`, без глобального getElementById чи припущень про `.btn-icon.expand`. При кількох видимих цілях активну визначати стабільним правилом у порядку секцій. Destroy прибирає observer **і** click listener; у legacy прибирається лише observer, а початковий listener тримає старий список посилань.

### Наявність вмісту за межею

[charm-scroll-fade.js](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/charms/charm-scroll-fade.js) показує градієнт і стрілки при переповненні; натискання прокручує поточний контейнер. Це підказка вмісту, без переходу до іншого редактора.

Зберігаємо ідею локального overflow feedback. Для Next достатньо CSS індикатора та вимірювання scrollTop/clientHeight/scrollHeight. ResizeObserver має відстежувати viewport і внутрішній content wrapper: висота самої scroll area може не змінитися після додавання тексту чи завантаження фото. Власник може викликати update після власного render; локальний MutationObserver потрібен для стороннього DOM, який власник не контролює. Обгортки, довільні `_scrollFadeCleanup` властивості та глобальний discovery не переносяться автоматично.

## Окремо: шари модальних вікон

У [modal-state.js](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/modal/modal-state.js#L65) є справжній стек відкритих модалок із push/pop/peek. На зафіксованій версії Next `mountDialogs()` використовує **FIFO-чергу та одну active modal**. Це важлива різниця: наявність native showModal сама по собі не означає, що чинний публічний сервіс уже підтримує довільні вкладені форми.

Коли потрібна форма з підтвердженням поверх неї, цей сценарій слід додати один раз у контракт спільного Dialog: зберегти DOM батьківської форми, верхній фокус, Escape для верхнього вікна та повернення фокусу. Feature не створює власний стек чи z-index систему. У цій адаптації модель черги не змінюється.

[modal-plugin-cascade.js](https://github.com/DSMykyta/pinguinV5/blob/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/modal/modal-plugin-cascade.js) повертає вибір щодо дочірніх записів: deleteChildren / moveTargetId. Це корисний приклад структурованого результату діалогу; правила каскадного видалення й перенесення даних належать feature та її repository.

## Карта інших шармів

| Legacy | Придатна ідея | Рішення для Next |
| --- | --- | --- |
| search + search-clear | Поле, іконка, очищення й native input event | Уже є `createInput({ variant: 'search' })`. Нової реалізації поля не потрібно. |
| refresh | Одна дія, busy state, очікування роботи | Власник передає async onRefresh. Кнопка/стан спільні; fetch та скидання даних належать feature. |
| columns | Налаштування видимості колонок | Конфігурація таблиці та спільний popover/menu, коли є таблиця; toolbar передається явно. |
| required | Узгоджена помилка й фокус першого поля | Native form validity + валідатор моделі + існуючий Input.setError. Без document-перехоплення кожної кнопки з `save` в ID. |
| dropzone | Окремо drag feedback, вибір файлу й upload | Generic file UI; onFilesSelected/onUrlSubmitted передаються власником. API-хости та збереження не належать dropzone. |
| morph-search | Компактне відкриття пошуку | Тільки якщо це потрібно конкретному інструменту. Поточний постійний пошук у Shell залишається чинним рішенням. |
| virtual-scroll | Обмеження DOM для довгих списків | Лише після вимірювання реальної проблеми. Для editable rows потрібні стабільні keys, фокус і вимірювання висот; старе перезаписування innerHTML під час scroll для цього непридатне. |
| pagination | Data adapter відокремлений від кнопок сторінок | Зберігаємо напрямок adapter → UI, стан у власника даних. Фільтри, кількість, active page не виводяться з CSS класів. |
| editor charms | Опційні find/stats/validation/cleanup | Кожна поведінка отримує обмежений editor API й власний cleanup. Спільні функції перетворення тексту — чисті функції. |

Шляхи всіх спільних шармів: [зафіксована папка](https://github.com/DSMykyta/pinguinV5/tree/718aad5d7a1524cff7162061ead766f46f3985b5/js/components/charms). Це карта перенесення, без твердження, що таблиця, dropzone або virtual list уже реалізовані в Next.

## Сучасні методи, які справді скорочують реалізацію

| Метод і первинне джерело | Застосування | Межа відповідальності |
| --- | --- | --- |
| [AbortController + addEventListener signal](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#signal) | Один controller на екземпляр; abort знімає групу його listeners, включно з anonymous callbacks. | Не прибирає самостійно timers, animation frames, observers або DOM; для них потрібне явне очищення. |
| [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) | Спостереження видимості секцій із явним root. | Видимість сама не є командою перейти до іншого кроку. |
| [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) | Локальне оновлення overflow після зміни геометрії. | Спостерігати потрібні вузли й викликати disconnect. Зміни стилів у callback не повинні створювати resize loop. |
| [CSS Scroll Snap](https://web.dev/articles/css-scroll-snap) | Нативна карусель/галерея з позиціями зупинки. | Для редактора з довільною висотою й canNavigate залишаємо Section Navigator; snap не є перевіркою збереження. |
| [scrollend](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event) | Оновлення після фактичного завершення прокручування, за feature detection. | Коли позиція не змінюється на межі, подія не замінює розпізнавання додаткового wheel наміру. |
| [Native dialog та APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Використовувати існуючий Dialog для top layer, модальності й фокусу. | Навігатор не створює власного modal stack або focus trap. |
| [APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | Чинний createTabs для незалежних панелей і клавіатури. | Tablist має власну семантику; пункти scroll spy не отримують role=tab автоматично. |
| [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) | Опційне оформлення підтвердженої зміни: оновлення DOM передається в update callback, після знімка попереднього стану. | Не визначає guards; feature detection і fallback виконують ту саму дію. Reduced motion вимикає декор; основна функція працює повністю. |
| [Vite / ESM](https://vite.dev/guide/features.html) | Малі source modules із явними імпортами, lazy loading на межі feature. | Кількість файлів не дорівнює кількості production requests. Runtime plugin loader для кожної кнопки зайвий. Версії залежностей цією роботою не оновлюються. |

Ці застосування — інженерні висновки для Pinguin, а не універсальна вимога стандартів. Сумісність нових API перевіряється під конкретну підтримку браузерів; основна робота форми не залежить від прогресивних анімацій.

## Мінімальний контракт підключуваної поведінки

Власник створює DOM і явно монтує потрібні поведінки. Одна поведінка не імпортує іншу. Маленька фабрика може лишатися одним файлом; чисту модель чи незалежну input-логіку відокремлюємо, коли вони мають власну роботу й перевірки. Чинні назви Next з [conventions.md](conventions.md) залишаються канонічними; старе слово «шарм» тут пояснює походження ідеї.

```js
function mountExample(element, { onActivate }) {
  const controller = new AbortController();
  element.addEventListener('click', onActivate, { signal: controller.signal });
  return () => controller.abort();
}

const dispose = mountExample(host, { onActivate: activate });
// При destroy власника:
dispose();
```

Це приклад контракту, не новий framework API. Для сигналу батьківської сторінки вже є `context.signal` у Page Outlet. Власний controller потрібен там, де екземпляр можна знищити раніше за сторінку. Після await все одно перевіряємо актуальність/aborted: abort не скасовує довільний Promise чи уже виконану зміну стану.

Розрізняємо три канали, щоб зменшити приховані залежності:

| Потреба | Найменший достатній контракт |
| --- | --- |
| Потрібен результат або дозвіл до дії | Прямий callback / Promise: canNavigate, onSubmit. Помилка відома власнику. |
| Потрібно повідомити незалежних слухачів про завершену дію | Локальний callback; EventTarget/CustomEvent лише коли справді є декілька незалежних слухачів. |
| Потрібно перетворити значення | Чисті функції в явному порядку; без побічних ефектів у «фільтрі». |

`Promise.allSettled` корисний для незалежних опційних завдань. Помилку обов'язкового завантаження редактора чи збереження не можна перетворювати на успіх загальним catch. Якщо з'явиться реальна потреба в багатьох runtime розширеннях, тоді один локальний реєстр із unsubscribe, cleanup та діагностикою замінить дублікати; зараз такого реєстру не додаємо.

## Послідовність перенесення

1. Спочатку знаходити вже реалізований UI: Search/Input, Tabs, Dialog, Tooltip, Section Navigator. Розширювати його контракт лише за реальною потребою.
2. Переносити по одній поведінці разом із прикладом і lifecycle-перевіркою. Не копіювати глобальний auto-discovery, singleton state та старі CSS-селектори.
3. Залишати бізнес-порядок секцій, валідацію, upload і persistence у feature. UI отримує дані й callbacks.
4. Спільну абстракцію створювати після появи щонайменше двох конкретних споживачів однакового контракту. Різні focus/ARIA/state правила не об'єднувати заради схожих назв.
5. Перевіряти destroy → mount, два екземпляри, пізні async результати, keyboard/touch і reduced motion. Для оптимізації фіксувати actual bundle та профіль, а не лише LOC.

## Перша обмежена адаптація після дослідження

Обрано native lifecycle listeners для вже наявних Tooltip та navigation gestures. Це два конкретні споживачі; кожен використовує власний AbortController напряму. Нова спільна бібліотека/шина не вводиться. Timers, frames, pointer capture та tooltip DOM очищаються їхніми чинними destroy/hide/reset методами. Вигляд, геометрія Shell і публічні API не змінюються.

Критерії приймання: після destroy жоден старий listener не реагує; pending tooltip/pull не виконується; повторний mount працює; два екземпляри не скасовують один одного; повний набір перевірок залишається зеленим. Цей розділ задає межі адаптації; підтвердження реалізації фіксується окремо після перевірок.

**Реалізація перевірена 2026-11-08:** naming/build, **29 Node tests** та **55 Chromium browser tests** пройшли. [Повний CI](https://github.com/DSMykyta/pinguinV5/actions/runs/42505894390) перевірив native iframe lifecycle, повторний mount/dispose, незалежність двох навігаторів, wheel/touch, фокус і попередні сценарії інтерфейсу. Native listeners знімаються через AbortSignal; тести перевіряють видиму поведінку й відсутність старих реакцій, без інспекції внутрішнього реєстру браузерних listeners. Фізичні пристрої та старі браузери окремо не перевірялися.

### Контроль розміру

Локальна production-збірка до/після: Node 24.22.1, Vite 7.3.7, однакові залежності й build options. Підрахунок source включає коментарі. JS — сума всіх `dist/assets/*.js`; gzip порахований для кожного файла окремо через Python gzip з mtime=0, потім підсумований. Source maps, CSS та тести в ці розміри не входять.

| Показник | До | Після |
| --- | ---: | ---: |
| Tooltip + navigation gestures, рядки | 447 | 438 |
| Ці два JS source, байти UTF-8 | 17586 | 17203 |
| Production JS, байти | 58511 | 58278 |
| Production JS, gzip байти | 20169 | 20164 |

Виміряний виграш у payload невеликий. Практична користь цієї адаптації — один native механізм зняття слухачів і менше парного коду, який потрібно підтримувати. Основний спосіб стримувати подальший ріст — повторно використовувати Input, Dialog і Section Navigator та додавати лише потрібні поведінки. Прискорення runtime цими числами не доведене.
