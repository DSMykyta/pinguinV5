# Pinguin Next — Canonical conventions v1.0

**Статус: обов'язковий контракт для гілки work.** Застосовується до всіх майбутніх модулів. Не переносимо старі назви з legacy автоматично.

## 0. Основні принципи

1. Одна сутність — одна канонічна назва. Не допускаються одночасно table, tbl, gt, tab для того самого поняття.
2. Назви описують **призначення**, а не випадковий вигляд, історію або інструмент розробки.
3. Спільний UI належить тільки src/ui; функціональний код — src/features; оболонка — src/shell; інфраструктура — src/core та src/services.
4. Одна відповідальність на файл. Не дробити файл лише за кількістю рядків. Ділити за незалежною логікою, змінами і тестами.
5. Видимі українські назви — у UI. Ідентифікатори коду — англійською.
6. Конвенції діють також для коду, згенерованого AI. Жодних варіантів назв на власний смак без оновлення цього документа.

## 1. Словник предметної області (обов'язковий)

| Терміни в коді | Значення | Не використовувати |
| --- | --- | --- |
| app | точка запуску й маршрутизація застосунку | application, main-app |
| shell | структура інтерфейсу сайту | layout-v2, frame |
| ui | універсальні візуальні компоненти | widget, shared-controls |
| feature | автономний інструмент | generator, page-module, plugin-feature |
| module | зареєстрована feature з manifest | addon, subapp |
| table-generator | створення HTML/BR із рядків складу | gt, tables-generator, composition-editor |
| data-row | перевикористовувана візуальна оболонка рядка | content-bloc, table-item |
| entry | одна семантична одиниця даних у генераторі | DOM-row, input-bloc |
| aside | контекстна панель поточного модуля | sidebar-right, second-nav |
| sidebar | основна ліва навігація | nav-left, rail-menu |
| exporter | перетворює модель на формат виводу | html-builder, output-magic |
| parser | перетворює вхідний текст на модель | magic, auto-tool |
| adapter | інтеграція із зовнішнім сервісом | bridge, connector-helper |

Словник розширюємо лише після обговорення значення; не перейменовуємо вже опубліковані API без міграції.

## 2. Папки і файли

- **Тільки lowercase kebab-case**, ASCII: table-generator, html-exporter.js, data-row.css, start-here.md.
- Папка має назву поняття, а не технології чи автора. Не створювати feature-1, test-new, code-final, updated-table або gt-v2.
- Основні каталоги: src/app, src/shell, src/ui, src/core, src/services, src/features, src/styles, docs, scripts, tests.
- У межах feature — короткі файли за відповідальністю: manifest.js, index.js, model.js, editor.js, parser.js, html-exporter.js, br-exporter.js, table-generator.css.
- В UI-компоненті: src/ui/data-row/data-row.js, data-row.css, data-row.test.js.
- Тести розміщуємо поруч із кодом як name.test.js; інтеграційні — tests/integration/name.test.js. End-to-end — tests/e2e/name.spec.js.
- Лише стандартні кореневі винятки: README.md, .gitignore, .editorconfig, package.json, index.html, vercel.json і звичайні config-файли (напр. vite.config.js).
- Для нової сутності спочатку обираємо одну стабільну назву; префікси на кшталт gt-, gm-, gse- заборонені.
- Не відтворювати дерево legacy тільки заради знайомої структури.

Приклад майбутнього модуля:

~~~text
src/
  app/
    bootstrap.js
    module-registry.js
  shell/
    sidebar/
      sidebar.js
      sidebar.css
    aside/
      aside.js
      aside.css
  ui/
    data-row/
      data-row.js
      data-row.css
      data-row.test.js
  features/
    table-generator/
      manifest.js
      index.js
      model.js
      editor.js
      parser.js
      html-exporter.js
      br-exporter.js
      table-generator.css
      table-generator.test.js
  styles/
    tokens.css
    foundation.css
~~~

Це *приклад*, а не вимога створити всі файли заздалегідь.

## 3. JavaScript: функції, змінні, класи, API

| Елемент | Формат | Приклад |
| --- | --- | --- |
| Змінна, параметр, поле об'єкта | camelCase | rowId, selectedEntry, isEditing |
| Функція | camelCase + дієслово | addRow(), removeRow(), parseNutritionText() |
| Boolean | is/has/can/should | isActive, hasUnsavedChanges, canExport |
| Клас / конструктор | PascalCase | TableModel, RowController |
| Стала (реально незмінна, спільна) | UPPER_SNAKE_CASE | MAX_ROWS, DEFAULT_ENTRY_KIND |
| Назва події / ID модуля | kebab-case | table-generator, row-added |
| JS-модуль/файл | kebab-case | module-registry.js |
| JSON-ключі та API DTO | camelCase | servingSize, rowKind, updatedAt |

Дієслівний словник (потрібно використовувати послідовно):
- createX — створює об'єкт/DOM без підключення в застосунок;
- mountX / unmountX — підключає/очищує UI і побічні ефекти;
- renderX — обчислює представлення без запису в сховище;
- parseX — текст/байти → структуровані дані;
- serializeX — модель → послідовне представлення;
- exportX — формує готовий результат певного формату;
- validateX — повертає результат перевірки, не показуючи toast;
- getX — читає, setX — змінює, updateX — оновлює частково;
- handleX — UI/DOM-обробник; onX — callback, переданий у конфігурації.

Не створювати одночасно processTable(), doTable(), manageTable() і handleTable() для тієї самої дії. Не використовувати назв data, tmp, fn, util, helper для публічних API без конкретного призначення.

### Контракт реєстрації

Кожний підключуваний інструмент має стабільний manifest.id (kebab-case) і публічні mount()/cleanup. Тільки реєстр вирішує, коли завантажувати модуль. Жодних імпортів feature → feature. Дані/права/сервіси передаються через визначений context.

~~~js
export const manifest = {
  id: 'table-generator',
  title: 'Таблиці',
  route: '/table-generator'
};

export function mount(host, context) {
  // Підключення UI цього інструмента.
  return () => {
    // Прибрати listeners, observers, subscriptions.
  };
}
~~~

## 4. Події, хуки, зберігання

- Публічні події формату **module-id:event-in-past-tense**: table-generator:row-added, table-generator:entry-updated.
- Callback у JS: onRowAdded, onEntryUpdated. Для перевірки до дії — явна функція canDeleteRow(), а не прихований before-hook.
- Події описують **те, що сталося**, а не команду; команди — методи/дії.
- Для локальної дії в HTML: data-pg-action="row-add". Модуль: data-pg-module="table-generator". Стани: data-pg-state="loading".
- Ключі сховища мають версію: pg:v1:table-generator:draft. Не використовувати випадкові або глобальні ключі tableData.
- Ідентифікатор запису — стабільний rowId/entryId, не індекс масиву і не DOM-id.

## 5. CSS: одна система стилів

- УСІ власні класи починаються з **pg-**. Клас компонента — .pg-button, .pg-menu, .pg-data-row.
- Частини компонента — BEM з подвійним підкресленням: .pg-data-row__actions, .pg-table-generator__editor.
- Візуальні варіанти — подвійний дефіс: .pg-button--primary, .pg-data-row--compact.
- Стан — data-pg-state="active"/"loading"/"error"; не використовуємо .active/.selected у випадкових модулях.
- Усі CSS custom properties починаються з **--pg-**. Семантичні design tokens — у src/styles/tokens.css: --pg-color-text-primary, --pg-space-3, --pg-radius-md, --pg-font-family-base.
- Не писати hex/rgb/hsl напряму в CSS-компонентах. Значення теми — тільки у tokens.css.
- Не створювати окремий button.css у кожній feature. Спільні кнопки, меню, поля, рядки — тільки src/ui.
- Feature CSS керує **розташуванням її блоків**, а не перевизначає спільні кнопки.
- Не використовувати !important, inline style у HTML, випадкові глобальні селектори, селектори через десятки вкладень або CSS-залежну бізнес-логіку.
- Тема належить оболонці й працює через data-theme; компоненти використовують семантичні токени.

### Особливо для таблиць

Клас .pg-data-row задає *вигляд* повторюваного рядка, а entry.kind (наприклад, heading, nutrient, separator) — *значення*. HTML/BR-експорт працює з entry.kind, не з CSS-класом і не читає текст із DOM.

## 6. HTML, файли даних, маршрути

- HTML id тільки для унікальних точок монтування/зв'язку з aria: id="app", id="table-generator-title"; не використовувати ID як універсальні селектори стилізації.
- CSS-клас відповідає за вигляд; data-pg-* — за поведінку й стан; aria-* — за доступність.
- Назва маршруту: /table-generator, /products, /images (нижній регістр, kebab-case, без пробілів).
- API path: /api/product-import; метод у коді: importProducts(); ключ JSON: productId.
- Одну назву використовуємо в manifest, маршруті, дереві файлів та документації.

## 7. Архітектурні заборони

- Ніяких випадкових window.* globals, імпортів між features, циклічних залежностей.
- Ніякої ініціалізації через те, що хтось випадково імпортував JS-файл: запуск тільки через mount().
- Не дублювати одне джерело істини для назв кольорів, стилів, компонентів або бізнес-даних.
- Не маскувати відсутню функцію фальшивою кнопкою; не додавати новий модуль, доки попередній не перевірено.
- Не повертатися до архітектури префіксів на кшталт gt-*, btn-*, ui-* для файлів і несумісних неймінг-систем.

## 8. Перевірка й винятки

- npm run check:naming — автоматична перевірка шляхів, CSS-класів, CSS-змінних, кольорів, inline styles **і власності компонентних CSS-файлів**.
- npm run check — перевірка неймінгу + збірка.
- GitHub Actions запускає ці перевірки в гілці work і перед PR у main.
- Функції/змінні JavaScript, доменні терміни й якість API поки перевіряються на code review; **не** вважати, що скрипт перевіряє всі правила цього документа.
- Виняток можливий лише з обґрунтуванням у тому самому PR та зміною цього документа, якщо виняток стає правилом.
- Нові імена обираємо до створення файлів; не перейменовуємо хаотично вже реалізовані компоненти.

## 9. Шаблон короткого review перед кожною функцією

1. Чи є така сама сутність/компонент у src/ui або src/core?
2. Чи збігаються ID модуля, шлях, маршрут та назви подій?
3. Чи відповідає кожна функція одному зрозумілому дієслову?
4. Чи відокремлені модель, UI і формат експорту?
5. Чи є всі візуальні токени, стани й стилі спільними?
6. Чи проходить npm run check і чи реально працює Preview?

**Умова завершення:** цей стандарт діє з першого компонента Shell і першого модуля Table Generator. Його зміни обговорюються як зміни архітектури, а не як косметичні правки.

## 10. Єдиний шаблон сторінок

Усі маршрути використовують [п'ятизонний шаблон](universal-page-layout.md). H1 маршруту розміщено в Shell; H2 назви активної секції — у `src/ui/page`. Спільний gutter забезпечує однакову позицію заголовка, вкладок та робочого вмісту. Заборонені стилі конкретного інструмента в `src/shell/shell.css`.

## 11. Межі навігації та пошуку

- **Shell**: header, глобальний слот вкладок між header і main, праві дії та порожній hidden footer.
- **Sidebar**: тільки основні маршрути, кнопка згортання та перемикання теми. Локальні вкладки не належать sidebar.
- **UI tabs**: текстові вкладки, ARIA, перемикання клавіатурою й cleanup.
- **Search**: постійне поле у правій частині шапки, реальні результати з маніфесту й активного інструмента.
- **Page view**: заголовок H2 та модульний вміст без дублювання H1 чи відступів Shell.
- **Aside**: незалежне плаваюче меню з необов'язковим закріпленням без зміни власного вигляду.
- **Feature**: передає контекст через `mount(host, { localNavigation, setAsideContext, setSearchEntries, signal })`.

Немає сторінки «Огляд». `/` відкриває `/tools`.

## 12. Контроль реалізації та чесна перевірка

Порядок дослідження legacy, повторного використання UI, безпечного введення залежностей, обов'язкового тестування та звітування визначено в [правилах реалізації](implementation-rules.md). **Успішна збірка сама по собі не доводить коректність редактора або локального запуску.** Останній розділ цього документа — журнал виявлених помилок і їхнього статусу.
