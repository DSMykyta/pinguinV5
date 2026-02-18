# Промпти для Claude Code — PinguinV5 UI Рефакторинг
# Виконувати по порядку. Кожен промпт — окрема задача.
# Після кожного — тестувати що нічого не зламалось.
# Репозиторій: https://github.com/DSMykyta/pinguinV5

---

## ФАЗА 1 — Нові компоненти (нічого не чіпає існуюче)

---

### Промпт 1.1 — switch.css (pill-shaped замість квадратного)

```
Переробити css/components/forms/switch.css. Зараз switch квадратний (border-radius: 4px) з solid --color-main fill на активному стані. Потрібно зробити pill-shaped і тихий.

Зміни:
- Контейнер .switch: background: var(--color-outline), border-radius: 20px, padding: 3px, gap: 2px
- Лейбли .switch-label: border-radius: 17px, padding: 6px 14px
- Активний стан input:checked + .switch-label: background: var(--color-surface), color: var(--color-on-surface), box-shadow: var(--shadow-1). БЕЗ solid --color-main fill.
- Hover на неактивному: color: var(--color-on-surface), без зміни фону
- Модифікатор .switch-bordered: border-radius: 20px, background: transparent, border: 1px solid var(--color-outline). Активний стан в bordered: background: var(--color-main), color: var(--color-on-main) — тут solid fill лишається бо це акцентний контекст.
- Модифікатори .switch-fit і .switch-sm залишити працюючими. switch-sm: padding: 3px 10px, font-size: 12px.
- HTML структура БЕЗ ЗМІН. Той самий HTML має працювати.

Перевір що switch працює на styleguide.html (3 варіанти: base, bordered, fit+sm), в index-mobile.html (Текст/Код), в templates/aside/aside-image-tool.html (Зображення/Полотно), в templates/modals/brand-edit.html (Неактивний/Активний), і в templates/partials/table-row.html (Строка/Поле).
```

---

### Промпт 1.2 — speech-bubble.css (комікс-бульба для аватарів)

```
Створити новий компонент css/components/feedback/speech-bubble.css — комікс-бульба для тексту який "каже" аватар.

Використання: коли на сторінці є аватар (empty state, confirm modal, login, error) — текст відображається не як підпис під картинкою, а як speech bubble поруч з аватаром, як в коміксах.

HTML структура:
<div class="avatar-speech">
  <div class="avatar-speech-image">
    <img src="..." alt="">
  </div>
  <div class="speech-bubble">Текст фрази</div>
</div>

CSS:
- .avatar-speech: display: flex, align-items: center, gap: 16px, justify-content: center
- .avatar-speech-image: flex-shrink: 0

- .speech-bubble: position: relative, background: var(--color-surface), border-radius: 16px, padding: 12px 20px, box-shadow: var(--shadow-1), max-width: 280px, font-size: 13px, color: var(--color-on-surface), line-height: 1.5
- .speech-bubble::after — хвостик-трикутник зліва, направлений на аватар. border-trick: width: 0, height: 0, position: absolute, left: -8px, top: 50%, transform: translateY(-50%). border-top: 8px solid transparent, border-bottom: 8px solid transparent, border-right: 8px solid var(--color-surface).
- Тінь хвостика: використати ::before з тими самими розмірами але кольором тіні, зсунутий на 1px вліво і 1px вниз, або використати filter: drop-shadow на контейнері замість box-shadow.

Модифікатори:
- .speech-bubble-right: хвостик справа замість зліва (для випадків коли аватар справа). ::after міняє border-right на border-left, позиція right: -8px замість left.
- .speech-bubble-top: хвостик зверху (для випадків коли аватар над бульбою). ::after міняє бордери для трикутника вгору.
- .avatar-speech-vertical: flex-direction: column, .speech-bubble-top автоматично.

Додай компонент в підключення CSS (перевір як підключаються інші компоненти з feedback/).

Не змінюй існуючі avatar компоненти — це новий компонент який використовується ПОРУЧ з аватаром.
```

---

### Промпт 1.3 — bubble-nav.css (навігація бульками)

```
Створити новий компонент css/components/navigation/bubble-nav.css — єдина система навігації бульками з ковзаючою калюжкою (sliding pill). Цей компонент замінить section-navigator, sidebar-navigator в модалках, і panel-left.

Дивись файл UI-SPEC-BUBBLE-NAV.md в кореневій папці проекту — там повна специфікація.

HTML структура:
<nav class="bubble-nav" data-bubble-nav>
  <div class="bubble-nav-pill"></div>
  <div class="bubble-nav-item is-active" data-section="назва">
    <button class="bubble-nav-btn">
      <span class="material-symbols-outlined">title</span>
    </button>
    <span class="bubble-nav-label">Назва</span>
    <span class="bubble-nav-count">3</span>
  </div>
  <div class="bubble-nav-item" data-section="фото">
    <button class="bubble-nav-btn">
      <span class="material-symbols-outlined">image</span>
    </button>
    <span class="bubble-nav-label">Фото</span>
    <span class="bubble-nav-count">12</span>
  </div>
</nav>

CSS — ВЕРТИКАЛЬНИЙ режим (за замовчуванням):
- .bubble-nav: display: flex, flex-direction: column, align-items: flex-start, gap: 8px, position: relative, overflow: visible, padding: 8px 14px 0
- .bubble-nav-pill: position: absolute, left: 14px, width: 44px, height: 44px, border-radius: 22px, background: var(--color-main-t-2), box-shadow: var(--shadow-1), pointer-events: none, z-index: 0, transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- .bubble-nav-item: position: relative, z-index: 1, width: 44px, height: 44px, flex-shrink: 0
- .bubble-nav-btn: width: 44px, height: 44px, border-radius: 50%, border: none, background: transparent, cursor: pointer, display: flex, align-items: center, justify-content: center, color: var(--color-on-surface-v), transition: color 0.2s
- .bubble-nav-btn .material-symbols-outlined: font-size: 20px
- .bubble-nav-item.is-active .bubble-nav-btn: color: var(--color-main)
- .bubble-nav-label: position: absolute, left: 48px, top: 50%, transform: translateY(-50%), font-size: 13px, font-weight: 500, color: var(--color-main), white-space: nowrap, opacity: 0, pointer-events: none, transition: opacity 0.2s
- .bubble-nav-count: position: absolute, top: 50%, transform: translateY(-50%), font-size: 11px, font-weight: 600, color: var(--color-on-surface-v), opacity: 0.4. Позиція left обчислюється JS (після label).
- .bubble-nav-item:hover .bubble-nav-label: opacity: 1

ГОРИЗОНТАЛЬНИЙ режим (.bubble-nav-horizontal):
- .bubble-nav-horizontal: flex-direction: row, padding: 0, gap: 4px
- Pill їде left замість top
- Label з'являється справа від іконки всередині pill
- Count після label

Створити також js/common/bubble-nav.js:
- Функція initBubbleNav(navElement) — ініціалізує навігацію
- На hover: pill їде до hovered елементу, розширюється під label+count
- На mouseout: pill повертається до active елементу, стискується до 44px
- На click: міняє is-active, pill фіксується
- Використовувати requestAnimationFrame × 2 для очікування reflow
- getBoundingClientRect для позиціонування
- Pill top/left обчислюється як різниця між позицією елементу і nav контейнера
- Pill width при hover: 44 + gap + label.offsetWidth + gap + count.offsetWidth (якщо є)
- Export функції для зовнішнього використання

Не замінюй існуючі навігатори поки що — просто створи компонент.
```

---

## ФАЗА 2 — Заміна навігації

---

### Промпт 2.1 — Витягнути panel-left в template

```
Зараз panel-left (ліва навігаційна панель) дублюється в кожному HTML файлі: index.html, products.html, brands.html, mapper.html, banned-words.html, keywords.html, price.html, tasks.html.

Створити templates/panel-left.html з bubble-nav замість старого sidebar:
- Використати компонент bubble-nav (вертикальний)
- Елементи навігації (з НОВИМИ іконками):
  - construction → index.html (Інструменти)
  - book_2 → glossary (Глосарій) — якщо є окрема сторінка
  - block → banned-words.html (Заборонені)
  - storefront → brands.html (Бренди)
  - key → keywords.html (Ключові слова)
  - attach_money → price.html (Прайс)
  - hub → mapper.html (Mapper)
- Внизу (margin-top: auto):
  - light_mode/dark_mode → перемикач теми
  - login → модалка входу

Додати автодетект активної сторінки в template-loader.js або окремому скрипті:
const currentPage = location.pathname.split('/').pop() || 'index.html';
const activeLink = document.querySelector(`.bubble-nav-item[data-page="${currentPage}"]`);
if (activeLink) activeLink.classList.add('is-active');

Кожен bubble-nav-item має атрибут data-page="filename.html".

Замінити panel-left HTML в КОЖНОМУ файлі на підключення шаблону (аналогічно як підключаються інші templates через template-loader.js).

Ширина panel-left: 72px фіксована. Без background-color, без border-right. Чисто бульки.
```

---

### Промпт 2.2 — Замінити section-navigator на bubble-nav

```
Замінити горизонтальний section-navigator на сторінках index.html і tasks.html на bubble-nav-horizontal.

Зараз section-navigator виглядає так:
<nav class="section-navigator">
  <a href="#section-table" class="nav-icon" aria-label="Таблиці">
    <span class="material-symbols-outlined">table_chart</span>
  </a>
  ...
</nav>

Замінити на:
<nav class="bubble-nav bubble-nav-horizontal" data-bubble-nav>
  <div class="bubble-nav-pill"></div>
  <div class="bubble-nav-item is-active" data-section="section-table">
    <button class="bubble-nav-btn">
      <span class="material-symbols-outlined">grid_on</span>
    </button>
    <span class="bubble-nav-label">Таблиці</span>
  </div>
  ...
</nav>

НОВІ іконки для index.html секцій:
- Таблиці: grid_on (замість table_chart)
- Текст: notes (замість edit_note)
- Сео: travel_explore (замість search)
- Переклад: translate (залишити)
- Сайти: language (залишити)
- Зображення: photo_camera (замість image)

Зберегти функціонал scroll-snap до секцій при кліку. Зараз це працює через href="#section-id" — переробити на JS: при кліку на bubble-nav-item скролити до секції з відповідним data-section id.

Ініціалізувати bubble-nav через initBubbleNav() з bubble-nav.js.

Також оновити IntersectionObserver або scroll listener щоб при скролі між секціями pill автоматично переміщувався до відповідної бульки.
```

---

### Промпт 2.3 — Замінити sidebar-navigator в модалках на bubble-nav

```
Замінити sidebar-navigator у всіх fullscreen модалках на bubble-nav (вертикальний).

Модалки які потрібно змінити:

1. product-edit-modal (templates/modals/product-edit.html):
   Секції з НОВИМИ іконками:
   - title → Назва
   - image → Фото
   - dashboard → Варіанти
   - science → Склад
   - change_history → Характеристики
   - article → Опис
   - package_2 → Фулфілмент
   - monitoring → SEO
   - cloud_upload → Публікація

2. brand-edit-modal (templates/modals/brand-edit.html):
   Секції з НОВИМИ іконками:
   - badge → Інформація
   - stacks → Лінійки
   - link → Посилання
   - hexagon → Маркетплейси
   - article → Опис

3. keywords-edit, task-edit, mapper-* модалки — аналогічно.

Для кожної модалки:
- Sidebar: 72px шириною, без background, без border-right
- Використати bubble-nav вертикальний
- Каунтери (кількість фото, варіантів, інгредієнтів) відображаються як bubble-nav-count
- При кліку на бульку — скрол до відповідної секції всередині модалки
- Ініціалізація через initBubbleNav() при відкритті модалки

Зберегти всю існуючу логіку: підрахунок каунтерів, навігацію між секціями, підсвічування активної секції при скролі.
```

---

## ФАЗА 3 — Іконки

---

### Промпт 3.1 — Єдина система іконок

```
Оновити іконки Material Symbols по всьому проекту для консистентності. Принцип: одна функція = одна іконка скрізь.

ГОЛОВНЕ МЕНЮ (panel-left):
- instant_mix → construction (інструменти)
- shopping_bag → storefront (бренди)
- receipt_long → attach_money (прайс)
- Залишити: block, key, hub

СЕКЦІЇ ІНСТРУМЕНТІВ (index.html section-navigator):
- table_chart → grid_on (таблиці)
- edit_note → notes (текст)
- search → travel_explore (SEO)
- image → photo_camera (зображення)
- Залишити: translate, language

СЕКЦІЇ РЕДАГУВАННЯ ТОВАРУ (product-edit modal sidebar):
- edit → title (назва)
- style → dashboard (варіанти)
- description → article (опис)
- local_shipping → package_2 (фулфілмент)
- search → monitoring (SEO)
- publish → cloud_upload (публікація)
- Залишити: image, science, change_history

СЕКЦІЇ РЕДАГУВАННЯ БРЕНДУ (brand-edit modal sidebar):
- info → badge (інформація)
- category → stacks (лінійки)
- storefront → hexagon (маркетплейси)
- Залишити: link, article

ТАБИ ТОВАРІВ (products.html):
- Товари: inventory_2
- Варіанти: dashboard
- Зв'язки: hub

ФІЛЬТРИ ТОВАРІВ:
- Всі: apps
- Активні: check_circle
- Чернетки: edit_note
- Приховані: visibility_off

Шукай іконки через grep -rn "material-symbols-outlined" по всіх HTML файлах і templates. Замінюй тільки ті що в списку вище. Не чіпай іконки яких немає в списку.

ПЕРЕВІР що всі нові іконки існують в Material Symbols набору (outlined варіант).
```

---

## ФАЗА 4 — Тихий дизайн (дрібні виправлення)

---

### Промпт 4.1 — Dropdown тихий

```
Зробити dropdown-menu тихішим в css/components/overlays/dropdown.css:

Зміни:
- .dropdown-menu: прибрати border: 1px solid var(--color-outline). Залишити тільки box-shadow: var(--shadow-2). Змінити border-radius з var(--radius-s) (8px) на 14px (більш pill-shaped).
- .dropdown-item: border-radius з 4px на 10px
- .dropdown-menu .panel-separator: background-color з var(--color-outline) на var(--color-outline-v) (тонший). Або opacity: 0.5.
- Перевірити що dropdown в table-row.html (меню рядка таблиці) працює нормально
- Перевірити filter-dropdown в pseudo-table
```

---

### Промпт 4.2 — Chip тихий

```
Зробити chip тихішим в css/components/feedback/chip.css:

Зараз .chip-active має background: var(--color-main) — solid fill який кричить.

Зміни:
- .chip-active (або .chip.active): background: var(--color-main-t) замість var(--color-main). Color: var(--color-main) замість var(--color-on-main).
- Hover на chip-active: background: var(--color-main-t-2) (трохи темніший)
- Лишити solid fill ТІЛЬКИ для .chip-error і .chip-success де колір несе семантичне значення
- border-radius залишити 16px — це вже pill

Перевір на styleguide.html, banned-words.html (chips слів), і всіх місцях де використовується .chip-active.
```

---

### Промпт 4.3 — Button groups (segment) тихий

```
Виправити css/components/buttons/button-groups.css:

Проблеми зараз:
1. .segment.active має background: var(--color-main) — solid fill
2. .segment:hover теж solid main — навіть hover кричить
3. .segment.active border-radius стрибає до 24px, а базовий 4px — різкий перехід

Зміни:
- .segment.active: background: var(--color-main-t) замість var(--color-main). Color іконки: var(--color-main) замість var(--color-on-main).
- .segment:hover (не active): background: var(--color-surface-c-high) замість var(--color-main). Color іконки залишити поточний.
- Прибрати стрибок border-radius. Зробити всі сегменти з однаковим radius (8px або 12px), без зміни при active.
- .connected-button-group-round зробити плавніший radius: всі сегменти 12px, перший 16px 12px 12px 16px, останній 12px 16px 16px 12px.

Перевір на mapper.html (геометричні фігури квадрат/трикутник/коло), styleguide.html, і confirm-модалках.
```

---

## ФАЗА 5 — Сторінка (квадрат)

---

### Промпт 5.1 — Квадрат сторінки (чотири кути)

```
Переробити layout сторінок щоб відповідав системі "чотирьох кутів":
- Лівий верхній: Logo (P, круглий, --color-main фон, посилання на головну)
- Правий верхній: Пошук (морф-кнопка, дивись промпт 5.2)
- Лівий нижній: Avatar користувача (круглий, відкриває user menu)
- Правий нижній: FAB (створення, дивись промпт 5.4)

Layout grid:
- grid-template-columns: 72px 1fr auto(aside)
- grid-template-rows: 64px 1fr 64px

Topbar (перший рядок, grid-column: 1 / -1):
- Зліва: Logo 44x44 круглий
- Далі: назва сторінки
- Далі: горизонтальні таби (bubble-nav-horizontal) — якщо на сторінці є таби
- Справа: морф-пошук 44x44 круглий

Bottombar (останній рядок, grid-column: 1 / -1):
- Зліва: Avatar 44x44 круглий (ініціали або зображення)
- Справа: FAB 56x56

Середній рядок:
- Ліва колонка 72px: bubble-nav вертикальний (panel-left)
- Центр: контент сторінки
- Права колонка: aside (якщо є)

Це ВЕЛИКИЙ рефакторинг. Почни з однієї сторінки — products.html. Переконайся що працює, потім застосуй патерн до інших.
```

---

### Промпт 5.2 — Морф-пошук (коло → інпут)

```
Створити компонент морф-пошуку — кругла кнопка яка розгортається в інпут при натисканні.

HTML:
<div class="morph-search" id="morph-search">
  <button class="morph-search-btn" aria-label="Пошук">
    <span class="material-symbols-outlined">search</span>
  </button>
  <div class="morph-search-field">
    <span class="material-symbols-outlined">search</span>
    <input type="text" placeholder="Пошук товарів...">
    <button class="morph-search-close" aria-label="Закрити">
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
</div>

CSS (новий файл css/components/forms/morph-search.css):

Закритий стан:
- .morph-search: position: relative, width: 44px, height: 44px
- .morph-search-btn: 44x44, border-radius: 50%, transparent background, color: var(--color-on-surface-v). Hover: background: var(--color-main-t), color: var(--color-main)
- .morph-search-field: position: absolute, right: 0, top: 0, width: 44px, height: 44px, border-radius: 22px, background: var(--color-surface-c-low), overflow: hidden. Всі внутрішні елементи opacity: 0.

Відкритий стан (.morph-search.is-open):
- .morph-search-btn: opacity: 0, pointer-events: none
- .morph-search-field: width: 360px (або 100% якщо в контейнері), border-radius: 14px, box-shadow: var(--shadow-1)
- Внутрішні елементи: opacity: 1, transition-delay: 0.15s
- Анімація: width 0.35s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.35s

JS:
- Клік на btn → додає .is-open, фокус на інпут через setTimeout(350)
- Клік на close або Escape → знімає .is-open, очищує інпут
- Інпут фільтрує таблицю (підключити до існуючої логіки пошуку)

Розмістити в правому верхньому куті topbar.
```

---

### Промпт 5.3 — "+" в заголовку табів

```
Додати контекстну кнопку "+" поруч з кожним табом на сторінках з табами.

На products.html:
- Таб "Товари" [+] → відкриває wizard створення товару (або product-edit-modal)
- Таб "Варіанти" [+] → відкриває створення варіанту
- Таб "Зв'язки" [+] → відкриває створення зв'язку

На mapper.html:
- Таб "Маркетплейси" [+] → створення маркетплейсу
- Таб "Категорії" [+] → створення категорії
- Таб "Характеристики" [+] → створення характеристики
- Таб "Опції" [+] → створення опції

CSS для кнопки "+":
- .tab-add: width: 28px, height: 28px, border-radius: 50%, border: none, background: transparent, color: var(--color-on-surface-vv)
- Прихована за замовчуванням (opacity: 0), з'являється при hover на таб або коли таб active
- Hover на саму кнопку: background: var(--color-main-t), color: var(--color-main)
- Іконка: add, font-size: 18px

Кнопка "+" відкриває ту саму модалку що й FAB speed dial — просто без вибору, одразу потрібний тип.
```

---

### Промпт 5.4 — FAB speed dial

```
Реалізувати FAB speed dial на сторінках. Використати патерн з існуючого css/components/navigation/pagination-fab.css як основу.

Створити css/components/navigation/fab-speed-dial.css:

Головна кнопка (.fab):
- width: 56px, height: 56px, border-radius: 16px
- background: var(--color-main), color: white
- box-shadow: var(--shadow-2)
- При відкритті: border-radius: 50%, іконка "+" повертається на 45°

Speed dial елементи (.fab-dial-item):
- Вилітають вгору від FAB з staggered animation (transition-delay: 0.05s, 0.1s, 0.15s...)
- Кожен: display: flex, align-items: center, gap: 10px
- Кнопка: 44x44, border-radius: 50%, background: var(--color-surface), color: var(--color-main), box-shadow: var(--shadow-1)
- Label: padding: 6px 14px, border-radius: 14px, background: var(--color-surface), box-shadow: var(--shadow-1), font-size: 13px

Backdrop при відкритті:
- position: fixed, inset: 0, background: rgba(0,0,0,0.15), backdrop-filter: blur(2px)
- Клік на backdrop або Escape закриває

Де додати:
- products.html: "Товар" (inventory_2), "Варіант" (dashboard), "Зв'язок" (hub)
- brands.html: "Бренд" (storefront), "Лінійка" (stacks)
- mapper.html: "Маркетплейс" (hexagon), "Категорія" (square), "Характеристика" (triangle), "Опція" (circle)
- keywords.html: одна дія → extended FAB з текстом "+ Ключове слово" (без speed dial)
- tasks.html: "Задача", "Нотатка", "Скрипт"

Розмістити FAB в правому нижньому куті bottombar.
```

---

## ФАЗА 6 — Модалка

---

### Промпт 6.1 — Чотири кути модалки

```
Переробити layout fullscreen модалок щоб відповідав системі чотирьох кутів.

Модалка fullscreen (100vw × 100dvh):
- grid-template-columns: 72px 1fr
- grid-template-rows: 64px 1fr 64px

Topbar модалки (grid-column: 1 / -1):
- Лівий верхній кут: кнопка "← назад" (закрити модалку), corner 44x44, border-radius: 50%, transparent
- Центр: назва товару/бренду/задачі
- Між назвою і save: switch Активний/Неактивний (новий pill-shaped)
- Правий верхній кут: кнопка Save (●), 44x44, border-radius: 50%, background: var(--color-main), color: white, box-shadow: var(--shadow-1)

Ліва колонка (72px): bubble-nav вертикальний з каунтерами

Контент: overflow-y: auto, padding: 8px 40px 40px. Контент центрований, max-width для форм.

Bottombar модалки (grid-column: 1 / -1):
- Лівий нижній кут: кнопка Delete, 44x44, border-radius: 50%, transparent, color: var(--color-on-surface-vv). Hover: color: var(--color-error), background: rgba(error, 0.08). Ледь помітна.
- Правий нижній кут: кнопка Refresh/Reload, corner 44x44.

Без border між зонами. Без background-color різниця між topbar/sidebar/content. Один суцільний фон.

Застосувати до product-edit-modal, brand-edit-modal, keywords-edit, task-edit. Зберегти всю існуючу функціональність (збереження, навігація, каунтери).
```

---

### Промпт 6.2 — Wizard flow для створення товару

```
Створити wizard flow — послідовне створення товару крок за кроком. Використовується замість модалки коли створюється НОВИЙ товар (не редагується існуючий).

Wizard — це fullscreen модалка але з лінійною навігацією замість бульок:

Layout:
- Topbar: назва поточного кроку (наприклад "Назва"), по центру
- Контент: ТІЛЬКИ поля поточного кроку, нічого зайвого
- Bottombar: [← Назад] зліва, "1/7" по центру, [Вперед →] справа

Кроки:
1. Назва — тільки інпути назви (повна, бренд, продукт, варіант)
2. Фото — тільки drag-drop зона для фото
3. Варіанти — вибір існуючих смаків/розмірів
4. Склад — дані складу (content-line система)
5. Характеристики — блоки атрибутів
6. SEO — автозаповнення скриптом, можливість редагувати
7. Публікація — фінальний крок. Замість кнопки "Вперед" — кнопка "Викласти"

Поведінка:
- Кожен крок — один екран, один фокус
- "Вперед" неактивний поки не заповнені обов'язкові поля
- "Назад" завжди активний (крім кроку 1)
- На кроці 7 немає "Вперед", є "Викласти" (primary button)
- Escape = підтвердження закриття (з аватаром і speech bubble)
- Дані зберігаються між кроками (state в JS)

CSS: створити css/components/overlays/wizard.css
JS: створити js/common/wizard.js з класом Wizard

Wizard і modal — два різних шляхи. + створює wizard, клік на існуючий товар відкриває modal.
```

---

## ФАЗА 7 — Стиль

---

### Промпт 7.1 — Серіфний шрифт для заголовків

```
Додати серіфний шрифт для заголовків секцій.

В css/root.css додати:
--font-display: 'Playfair Display', serif;
(або інший серіфний: 'Cormorant Garamond', 'Lora', 'Source Serif Pro' — вибрати який найкраще поєднується з Geologica)

Підключити шрифт через Google Fonts в головних HTML файлах (або через @import в root.css).

Застосувати --font-display до:
- .section-upper (h2 заголовки секцій типу "ТАБЛИЦІ", "ТЕКСТ", "СЕО")
- .display-l, .display-m (великі заголовки)
- Заголовки модалок НЕ чіпати — там залишити Geologica

Серіф тільки для великих заголовків секцій — не для body, не для кнопок, не для labels.

Перевірити на всіх сторінках що серіф добре виглядає і з кирилицею (не всі серіфні шрифти мають хорошу кирилицю). Playfair Display має кирилицю.
```

---

## ФАЗА 8 — Aside фільтри

---

### Промпт 8.1 — Фільтри чіпсами замість селектів

```
В aside панелях на products.html зараз фільтри реалізовані через select (custom-select). Замінити на filter chips — круглі pill кнопки які toggle стан.

Зараз:
<label for="filter-category">Категорія</label>
<select id="filter-category" data-custom-select>
  <option value="">Всі</option>
  <option value="vitamins">Вітаміни</option>
  ...
</select>

Замінити на:
<div class="aside-label">Категорія</div>
<div class="filter-chips" data-filter="category">
  <button class="fchip active" data-value="">Всі</button>
  <button class="fchip" data-value="vitamins">Вітаміни</button>
  <button class="fchip" data-value="aminos">Амінокислоти</button>
  <button class="fchip" data-value="protein">Протеїн</button>
</div>

CSS (додати в існуючий chip.css або створити filter-chips.css):
- .filter-chips: display: flex, flex-wrap: wrap, gap: 6px, margin-bottom: 12px
- .fchip: height: 32px, padding: 0 14px, border-radius: 16px, border: 1px solid var(--color-outline), background: transparent, font-size: 12px, color: var(--color-on-surface-v), cursor: pointer, transition: all 0.2s
- .fchip:hover: border-color: var(--color-main), color: var(--color-main)
- .fchip.active: background: var(--color-main-t), border-color: transparent, color: var(--color-main), font-weight: 500

JS: підключити filter chips до існуючої логіки фільтрації таблиці. Toggle active клас при кліку. Фільтрувати дані відповідно.

Замінити фільтри на products.html: Статус, Категорія, Наявність, Вітрина.
Аналогічно для banned-words.html якщо є фільтри.
```

---

# ПРИМІТКИ

- Після кожного промпту тестуй на ВСІХ сторінках, не тільки на тій яку змінював
- Тестуй dark theme (перемикач теми) — всі кольори через CSS змінні, dark theme має працювати автоматично
- Не видаляй старий CSS поки новий не працює стабільно
- Комітити після кожної фази, не після кожного промпту
- Файли-прев'ю для референсу: /mnt/user-data/outputs/full-ui.html, switch-compare.html, morph-search.html, unified-v6.html
