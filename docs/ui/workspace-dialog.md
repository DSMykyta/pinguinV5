# Workspace Dialog — великі редактори (рішення, 2026-11-10)

**Статус (2026-11-10):** workspace-режим реалізований через чинний Dialog/FormDialog, макет `src/ui/workspace-layout` і наявний `SectionNavigator`. Приклад відкривається кнопкою редагування рядка у вкладці «Макети даних»; дані тестові, без backend. Актуальні рішення нижче мають пріоритет над історичним розділом дослідження.

## Мета

Великі редактори окремої сутності (бренд, товар, категорія) мають поводитися як невеликий робочий простір усередині модального вікна, без переходу з поточної сторінки. Вони використовують спільні Pinguin UI, геометрію сторінок, навігаційні принципи та **ті самі кутові кнопки**, але не підключають глобальну навігацію сайту, глобальний aside, сторінковий Router або стани Shell.

Вимоги з прикладу:
- ліворуч — секційна навігація, яка згортається/розгортається; займає всю доступну висоту між шапкою й підвалом;
- зверху — постійна шапка; знизу — постійний підвал; між ними — незалежно прокручуване робоче полотно;
- праворуч — вузька структурна смуга для кутових дій;
- чотири стабільні кути: **верхній лівий — Оновити**, **верхній правий — Закрити**, **нижній лівий — Видалити**, **нижній правий — Зберегти**;
- стиль, геометрія, tooltip, loading, hover і motion — від існуючих Pinguin Button / Corner; не створювати нову FAB чи інший skin.

## Висновки з перевірки work

1. `src/shell/shell.js`, `src/shell/shell.css`: зовнішня сторінка має власні header, sidebar, content, footer (56 px), aside та кутові дії. У Shell є глобальні fixed-позиції, Router, стан панелей, пошук і localStorage. **Не можна монтувати його вдруге всередині dialog:** зіткнуться viewport-fixed кнопки, global id, маршрути й стани.
2. `src/ui/dialog/dialog.js`: існують native `<dialog>` + `showModal()`, черга, focus/close guard, анімація та blur backdrop. Це єдиний власник модальності; не створювати окремий overlay або ручний focus trap.
3. `src/ui/dialog/dialog.css`: `size: editor` уже має 90vw × 90dvh, `max 1100px` і фіксовані header/footer із прокруткою `body`. Він **не має** секційного aside, чотирьох кутів і незалежних прокруток. Не заміняти цей режим без перевірки наявних викликів.
4. `src/ui/form-dialog/form-dialog.js`: спільний adapter містить `validate`, `save`, `isDirty`, `closeGuard`. Це потрібна точка композиції для нового режиму, не ще один save-controller.
5. `src/ui/button/button.js`: `createIconButton({variant:'corner'})`, `setButtonLoading()`, `setButtonColor()` вже забезпечують єдині доступні стани. `src/ui/button/button.css` задає круглі кутові 40×40 та існуючий рух іконки. Не дублювати.
6. `src/shell/sidebar/sidebar.js` прив'язаний до глобальних маршрутизованих сторінок і теми. Секції редактора — **локальна навігація**, не посилання на маршрути. Перевикористати принцип і загальні UI-кнопки, але не створювати другий глобальний Sidebar.
7. У `work` немає окремої production-функції «Бренди»; скриншот використовується як геометричне завдання, а не доказ наявності цього маршруту у перевіреній гілці.

## Порівняння підходів

| Підхід | Переваги | Недоліки | Висновок |
| --- | --- | --- | --- |
| Ще ширший поточний FormDialog із локальним flex | Мало змін | Немає незалежних зон і навігації, складно підтримати кути | Відхилити |
| Повторно змонтувати Shell усередині dialog | Зовні схожий вигляд | Глобальна маршрутизація, fixed-позиції, ідентифікатори, стан, дублювання | **Заборонено** |
| Окрема сторінка-редактор | Добре для великих багатоконтекстних сценаріїв і deep-link | Втрачається запитаний модальний контекст без переходу | Альтернатива для складніших сценаріїв |
| **Workspace Dialog:** один native Dialog + спільна layout-геометрія, scoped slots | Зберігає контекст, перевикористовує UI, ізольовані зони, компактний код | Потрібен обережний новий layout variant і тести | **Обрано** |

**Межа:** це рішення для редагування **однієї сутності** з її локальними розділами. Якщо редактор перетвориться на кілька незалежних робочих процесів із власними URL, замість «сторінки всередині діалогу» використовувати справжню сторінку. Primer прямо радить сторінку, якщо потрібна повноцінна бокова навігація; для обмеженого локального редактора прийнята свідома адаптація вимоги користувача.

## Геометрія та композиція

Одна CSS Grid, без абсолютного позиціонування основних зон і без `position: fixed` для локальних кутів:

    grid-template-columns: var(--pg-workspace-nav-width) minmax(0, 1fr) var(--pg-workspace-rail-width);
    grid-template-rows: var(--pg-header-height) minmax(0, 1fr) var(--pg-workspace-rail-width);
    grid-template-areas:
      "header header right"
      "nav    canvas right"
      "footer footer right";

- **header** займає перші дві колонки й містить назву, контекстний статус, верхньоліву кнопку «Оновити» в 56px кутовому резерві; заголовок не накривається кнопкою.
- **nav** — лівий aside для розділів редактора, від низу header до верху footer. Спочатку розгорнуті 228px; компактні 56px (використати ті самі токени ширини, що й Shell). Навігація має власний вертикальний overflow. Розгортання не пересоздає форму й не змінює її дані.
- **canvas** — справжній робочий простір з `min-width: 0; min-height: 0; overflow: auto`. Ніякої прокрутки всього dialog разом із header/footer. Вміст отримує власні відступи з існуючих токенів. Секції можуть прокручуватися або перемикатися, але це одна й та сама модель даних.
- **footer** — постійні 56px, може показувати статус «Не збережено» / «Збережено» / помилку; нижньоліва кнопка «Видалити» в кутовому резерві. Немає дубльованих стандартних кнопок «Скасувати / Зберегти» праворуч.
- **right** — 56px смуга на всю висоту редактора; зверху «Закрити», знизу «Зберегти». Між ними немає удаваного aside або фіктивного контенту; можна залишити порожньою.
- Фізичні кутові кнопки — 40×40 із рівними оптичними відступами 8px у структурному резерві 56px. Вони є **дочірніми елементами native dialog**, а не fixed-віконними глобальними діями.
- Для редактора додати окремий `workspace` варіант розміру: орієнтир desktop `inline-size: min(1440px, calc(100dvw - 32px)); block-size: calc(100dvh - 32px)`. Не змінювати чинний `editor` розмір. На вузькому екрані — fullscreen, без подвійних рамок, зі safe-area inset.
- Поточна адаптація — `@media (max-width: 700px)` із повноекранним editor і локальним overlay навігації; container queries можливі як подальше вдосконалення.
- `prefers-reduced-motion` вимикає transitions; `prefers-reduced-transparency` вимикає backdrop blur. Немає власних дубльованих CSS-анімацій; за можливості використати наявні motion tokens та RevealPanel.
- Будь-яке користувацьке змінювання ширини навігації **не вводити за замовчуванням**: перший контракт — compact/expanded, як у Shell. Якщо окремо буде потрібен drag-resize, він матиме власну клавіатурну доступність і тест.

## Чотири дії: контракт

| Розташування | Команда | Контракт |
| --- | --- | --- |
| Ліворуч угорі | Оновити | Повторно отримати дані поточної сутності, не перезавантажувати сторінку. Незбережені правки вимагають підтвердження. |
| Праворуч угорі | Закрити | Єдиний `requestDismiss` + dirty guard. Escape проходить тим самим шляхом. |
| Ліворуч унизу | Видалити | Деструктивне підтвердження в межах активного native Dialog; успіх видаляє тестовий запис і закриває editor. |
| Праворуч унизу | Зберегти | Єдиний шлях `validate → save` із FormDialog. Shared loading; помилка залишає редактор відкритим. |

Не розміщувати кнопку «розгорнути навігацію» поверх «Оновити»: toggle належить самому left nav, а не п'ятій кутовій команді. Tooltip + доступна `aria-label` на кожній іконці. Клавіатурний Ctrl/Cmd+S — окрема майбутня можливість, наразі не реалізовано.

**Виявлений ризик:** manager `Dialog` допускає лише одне активне вікно, а нові запити ставить у чергу. Наївний `await showConfirmDialog(...)` усередині `onDelete` відкритого editor чекає в черзі за тим самим editor — потенційне взаємне блокування. Варіанти: (а) локальна confirmation-phase у межах активного editor з повторно використаним візуальним Confirm контрактом; (б) окремо досліджений стек вкладених native dialogs у спільному manager з коректним focus return. **Реалізовано (а):** локальний confirmation стан усередині активного `Dialog`; другий глобальний manager не створюється.

**Виправлено:** глобальні обробники Escape/pointerdown у Shell ігнорують взаємодії під час `dialog:modal`. Native modal сам утримує фокус, а Tooltip не дозволяє фонового hover під модалкою.

## Межі компонентів / запропонований API

1. `src/ui/dialog` залишити власником native `dialog`, backdrop, lifecycle, черги, focus, guarded dismiss. Додати опціональний layout `workspace` без зміни `standard`/`editor`.
2. Невеликий **спільний layout primitive** (умовно `src/ui/workspace-layout`) визначає тільки геометрію слотів `header / nav / content / footer / rightRail`. Сам по собі не знає про маршрути, бренди чи модальність. Глобальний Shell може поступово пере-використовувати цей примітив лише після перевірки його наявної геометрії; не перебудовувати Shell заради першого демо.
3. `src/ui/form-dialog` компонує `workspace` із наявними `validate/save/isDirty`, приймає optional `sections`, `onRefresh`, `onDelete`. Усі callbacks та дані надає feature. Закриття після save, guard і статуси залишаються одноканальними.
4. Локальна навігація секціями **повторно використовує** `createSectionNavigator({items, onChange})` зі спільними `navigation-gestures.js`/анімацією. Навігація в лівому Aside викликає `navigator.navigate()`; `onChange` синхронізує `aria-current`. Зовнішній scroll container — `pg-workspace-layout__canvas`, без окремого колеса/таймера/режиму секцій. Немає Router або глобальних Sidebar preferences.
5. `createIconButton({variant:'corner'})` для всіх чотирьох дій; існуючий `setButtonColor` для семантичного danger, `setButtonLoading` для асинхронного стану. ЖОДНОГО нового skin, FAB, toast або власної анімації.
6. Не додавати другий режим глобального `Shell`, окремий app-root, другу систему popup, збереження draft у localStorage або нестандартні scroll-манеджери.

Реалізований виклик (feature надає HTML-секції та callbacks):

    showFormDialog({
      title: 'Редагування бренду',
      layout: 'workspace',
      content: brandEditorElement,
      sections: [
        { id: 'general', label: 'Основне', element: generalSection },
        { id: 'channels', label: 'Канали продажу', element: channelsSection },
        { id: 'settings', label: 'Налаштування', element: settingsSection },
      ],
      validate,
      save,
      isDirty,
      onRefresh,
      onDelete,
    });

## Тести — критерії готовності

- Geometry Playwright: header/footer залишаються в тих самих координатах, коли canvas прокручується; nav має власну прокрутку; праві кутові кнопки не зміщуються при nav expanded/collapsed; однакові 8px зазори; немає горизонтального overflow.
- Дві ширини desktop і mobile fullscreen; при narrow overlay навігації не перекриває системні дії; зв'язок `aria-expanded/aria-controls`, активний розділ і клавіатура.
- Чотири команди з реальними `data-pg-action`, tooltip, фокусом, loading; жодної додаткової 5-ї кутової кнопки або дубля Save/Delete.
- Dirty form: close, Escape, backdrop, refresh, delete. Деструктивне рішення має явно підтверджуватися; втрати тексту без підтвердження немає.
- Save: invalid → фокус на помилці; pending → без повторного запиту; rejected → залишається; success → коректне завершення.
- Delete: доступна лише для існуючого запису; локальне підтвердження не потрапляє в чергу менеджера й не блокує UI.
- Native modal: focus trap, restore focus, inert background, scrollbar/modal keyboard, reduced motion/transparency, dark theme, HMR dispose.
- Regression: `tests/e2e/dialog.spec.js`, `form-dialog.spec.js`, `page-layout.spec.js`, `shell.spec.js`; не змінювати small Dialog/Confirm і глобальні чотири кути.

## Вивчені джерела

- [WAI-ARIA APG: Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — фокус, Escape, неактивний фон, незворотні дії.
- [W3C H102: native HTML dialog](https://www.w3.org/WAI/WCAG22/Techniques/html/H102) — native focus confinement, inert, повернення фокуса.
- [MDN: HTMLDialogElement.showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) — browser top layer, backdrop та inert.
- [Chrome Modern Web: dialog](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-components/dialog) — requestClose, guarded dismiss, не рухати destructive controls.
- [GitHub Primer: Dialog guidelines](https://primer.style/product/components/dialog/guidelines/) — зони header/body/footer, responsive fullscreen; обмеження для великої навігації, guarded backdrop.
- [GitHub Primer: PageLayout](https://primer.style/product/components/page-layout/) — слотна навігація та адаптивна бічна панель.
- [Chrome Modern Web: Size Aware Styling](https://developer.chrome.com/docs/modern-web-guidance/guides/css/size-aware-styling) — container queries для ізольованих компонентів.
- [MDN: CSS minmax](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/minmax) — grid із minmax(0, 1fr).

**Реалізація:** `src/ui/dialog/dialog.js`, `src/ui/form-dialog/form-dialog.js`, `src/ui/workspace-layout/workspace-layout.js`, `src/ui/section-navigator/section-navigator.js`, `src/features/tools/data-views-demo.js`. Підказки над активним native Dialog належать спільному `src/ui/tooltip` і розміщуються у браузерному top layer як `popover=manual`; підказки фону скасовуються на `pg:modal-change`. Перевірки: `tests/e2e/workspace-dialog.spec.js` і чинні `dialog`, `form-dialog`, `section-navigator`, `tooltip` тести. Це локальний приклад, а не production-операції з Брендами.
