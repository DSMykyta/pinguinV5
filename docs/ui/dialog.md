# Pinguin Next — Dialog / Confirm

Статус: специфікація модального вікна, погоджено розмитий фон. Власник замовив дослідження до реалізації і окремі UI-файли. [База Pinguin UI](overview.md).

## Призначення

Dialog — модальна взаємодія, що вимагає уваги: повідомлення, рішення, підтвердження небезпечної дії. Confirm — **спеціалізація того самого Dialog**, а не другий незалежний набір DOM/CSS/обробників.

## Перевірені зовнішні джерела

- [MDN — HTMLDialogElement.showModal()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal): браузер піднімає діалог у top layer, створює ::backdrop, робить фонові елементи inert. Не потрібне ручне дублювання focus trap.
- [W3C WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): фокус залишається в діалозі, Escape закриває, під час закриття фокус повертається до ініціатора; для незворотної дії початковий фокус на менш ризикованій дії.
- [MDN — CSS backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter): CSS filter розмиває елементи **позаду** backdrop, потрібна напівпрозорість.
- [MDN — dialog HTML element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): використовувати showModal()/close(), а не вручну перемикати open-атрибут.

## Аналіз legacy — тільки джерело існуючих практик, не канонічний стандарт

- legacy/js/components/modal/modal-main.js: спільний оркестратор і різні сценарії Confirm/Info.
- legacy/js/components/modal/modal-core.js: шаблони HTML, обробники backdrop/Escape, повернення з анімацією; великі глобальні слухачі і небезпечні insertions HTML.
- legacy/css/components/overlays/modal.css: плавна поява, центрування, розмірний ряд small/medium/full, blur backdrop.
- legacy/templates/modals/modal-confirm.html: зрозумілі заголовок, текст, дві дії.

**Зберігаємо:** затемнення + розмиття тла, лаконічну панель, прості кнопки підтвердження/відміни. **Не переносимо:** HTML-шаблони через fetch, global click delegation, arbitrary HTML у заголовках/повідомленнях, фіксовані ширини з legacy, зайву кількість DOM-рівнів.

## Власна реалізація Pinguin

- Файл логіки: src/ui/dialog/dialog.js. Файл стилів: src/ui/dialog/dialog.css. Браузерні тести: tests/e2e/dialog.spec.js. Усі кольори — тільки src/styles/tokens.css.
- Одне HTML-діалогове вікно через showModal() із role dialog/native aria-modal, aria-labelledby і aria-describedby.
- ::backdrop — напівпрозоре затемнення **та blur(8px)**. Сама панель залишається чіткою, фон перестає приймати натискання. Для prefers-reduced-transparency: reduce — непрозоріший fallback без blur.
- Центр екрана, ширина до 440px для простих повідомлень, мобільна максимальна ширина viewport - 32px, max-height viewport - 32px і внутрішня прокрутка.
- Тема визначається семантичними змінними, не дублюємо CSS кольорів. Плавна поява без bounce; prefers-reduced-motion вимикає анімацію.
- При відкритті фокус у діалозі; для Confirm небезпечної дії початковий фокус на кнопці «Скасувати». Tab циклічний завдяки native showModal; Escape, кнопка закриття, клік поза панеллю — скасування, не підтвердження.
- Підтвердження — тільки явною натиснутою кнопкою, результат promise. Якщо діалог закрито з іншої причини — cancel/false. Кнопки блокуються під час закриття, результат завершується рівно раз.
- Текст лише через textContent, сторонній HTML не приймаємо. Одночасно лише одне активне модальне вікно; інші виклики очікують у черзі.
- При HMR/component cleanup все закриваємо й повертаємо фокус/завершуємо promise з результатом cancel.

## API

\`\`\`js
const disposeDialogs = mountDialogs(); // тільки app bootstrap

const result = await showDialog({
  title: 'Інформація',
  message: 'Операцію завершено.',
  confirmText: 'Зрозуміло',
});
// result === 'confirm' | 'cancel'

const approved = await showConfirmDialog({
  title: 'Видалити запис?',
  message: 'Цю дію не можна скасувати.',
  confirmText: 'Видалити',
  cancelText: 'Скасувати',
  destructive: true,
});
// approved === boolean
\`\`\`

На `/tools` є один виклик інформаційного Dialog у вкладці «Текст». Окремий демонстраційний виклик Confirm вилучено: його поведінка перевіряється реальним локальним видаленням 2+ вибраних записів у «Макетах даних» і «Медіатеці». Toast залишається окремою перевіркою у вкладці «Таблиці». Демо не створюють глобальних кнопок у Shell.

## Критерії готовності

1. CSS isolated, --pg-* токени, неймінг, build.
2. Blur і dim ::backdrop фактично обчислюються в браузері на desktop/mobile, фоновий Shell не інтерактивний.
3. Cancel/Confirm/клік поза/ESC повертають коректні значення та фокус.
4. Темна тема, reduced motion/transparency, мобільна ширина й довгі повідомлення.
5. Одне активне вікно, наступне відкривається після закриття; HMR cleanup без слухачів/таймерів.
6. Вкладки мають незалежні власні panel DOM, їхній контент змінюється, коли натискають вкладку. Тимчасові UI-дезоми не живуть поза panel DOM.

## Editor/Form composition (2026-11-08)

The shared Dialog additionally supports an `editor` size, caller-owned DOM `content`, async `validate` / `onConfirm`, `closeGuard`, an optional destructive left action, and a stationary header/footer around a scrollable body. `src/ui/form-dialog/form-dialog.js` composes these primitives and delegates business validation/persistence to the calling feature. Compact Dialog/Confirm remain unchanged. See [form-dialog.md](form-dialog.md).

## Актуалізація обробки дій (2026-11-10)

- Кнопки Dialog/Confirm/Form Dialog мають стандартні класи `pg-button` із варіантами `primary`, `secondary` або `destructive`. `pg-dialog__button` позначає лише структурну роль; локальних primary/secondary/danger skin немає.
- Під час асинхронного підтвердження або лівої дії лише натиснута кнопка отримує `setButtonLoading()` із спільного `button.js`; інші дії тимчасово недоступні. Після відмови, помилки чи завершення стан повертається.
- Зайву кнопку «Відкинути зміни» не створюємо для звичайних Dialog/Confirm. Вона існує тільки за переданого `closeGuard` і показується при відхиленій спробі закриття.
- `showFormDialog()` повторно використовує `validate/save` і, за потреби, наскрізні `confirmTone/confirmAppearance`. Особливі правила збереження та видалення залишаються власністю feature.

## Workspace Editor — компактна вертикальна композиція кутових дій (2026-11-10)

- **Верхній лівий кут:** уже наявна кнопка `createWorkspaceLayout` для розгортання/згортання списку розділів (`workspace-nav-toggle`), замість старої великої `refresh`. Окреме меню та повторний toggle не створюємо.
- **Верхній правий кут:** основна кнопка `Закрити діалог` (існуючий спільний `createIconButton(corner)`), безпосередньо під нею — стандартна менша `createIconButton(mini)` **Оновити**. Менша кнопка не використовує анімацію кутової кнопки, не змінює свого положення на hover.
- **Нижній правий кут:** вище — стандартна менша `createIconButton(mini)` **Зберегти**, яка перевіряє поля, викликає `onConfirm` і **залишає редактор відкритим**; внизу — головна `createIconButton(corner)` з Google Material Symbol `check`, `aria-label=Зберегти і закрити`, яка перевіряє/зберігає і закриває редактор тільки після успішного callback.
- **Нижній лівий кут:** чинне `Видалити`, без перенесення. Запити `onRefresh`, `onDelete`, dirty confirmation, `closeGuard`, validation та busy захищаються спільним Dialog, без дублювання save/refresh.
- Обидві Save-дії користуються **одним** асинхронним validation/persistence потоком. Feature-адаптер сам оновлює свій `baseline` тільки після успішного збереження без закриття, щоб `isDirty` не блокував наступне закриття помилково.
- Суміжні маленькі кнопки позиціонуються лише сіткою `WorkspaceLayout`, з наявним `pg-mini-button`; немає нового skin, анімації, FAB чи окремого менеджера меню.


## Продуктивність і відгук — 2026-11-12

Виявлені фіксовані очікування та дорогі для компонування анімації, рішення й обмеження задокументовані в [аудиті](../research/dialog-performance.md).

- Звичайний Dialog: 140 мс entrance/exit з м'якою transform-анімацією (раніше 190 мс).
- Великий Workspace Dialog: 120 мс лише opacity (без трансформації всієї великої форми); схвалений `::backdrop blur(8px)` та native `showModal()` збережено.
- Закриття через JS знімає вікно після відповідної тривалості й зберігає dirty-guard, чергу, повернення фокусу та Promise-результат.
- Дитячі секції використовують **той самий** `SectionNavigator` із коротшим `motion:'responsive'`; звичайний Section Navigator не змінено.
- Перевірки: `tests/e2e/dialog-performance.spec.js`. Синтаксична перевірка й статус build окремі від візуального профілю.
