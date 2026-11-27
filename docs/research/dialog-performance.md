# Діалоги: аудит і оптимізація відгуку (2026-11-12)

**Обсяг:** тільки наявні `Dialog`, `WorkspaceLayout` і перевикористовуваний `SectionNavigator` у гілці `work`. Ніякого другого Modal, навігатора або незалежного animation engine.

## Підтверджені причини з коду (не виміри FPS)

1. `src/ui/section-navigator/section-navigator.js`: два **послідовні** awaited WAAPI-ефекти **170 мс вихід + 270 мс вхід = 440 мс**. У редакторі вони блокують наступний перехід (`busy`), тому навіть на швидкому ПК інтерфейс сприймається повільним. Це незалежно від FPS.
2. `src/ui/workspace-layout/workspace-layout.css`: `grid-template-columns` анімується **340 мс** при згорнутому/розгорнутому меню, отже спричиняє layout для всієї сітки. Для модальної форми з багатьма полями це дорожче за compositor-only перехід.
3. `src/ui/dialog/dialog.css`: весь Dialog рухається + масштабується `translateY(14px) scale(.975)` за **190 мс** поверх `::backdrop {backdrop-filter:blur(8px)}`. Особливо великому Workspace доводиться переміщувати великий складний шар. Розмиття залишається затвердженим, але анімувати великий шар необов'язково.
4. `src/ui/dialog/dialog.js`: закриття має **мінімальну** затримку `setTimeout(190)` навіть якщо анімація візуально майже завершена.

**Гіпотези, не доведені профілюванням:** вартість GPU blur, texture uploads і регулярного relayout на конкретному пристрої. Для їх підтвердження потрібен браузерний Performance trace. Самі фіксовані 440/340/190 мс видно без запуску.

## Рішення

- **Той самий SectionNavigator**, ті самі 2 стадії, напрямок, збереження фокусу, wheel/touch thresholds і `prefers-reduced-motion`. Новий параметр `motion:'standard'|'responsive'`; standard продовжує використовувати 170/270, responsive — **80/130 мс (разом 210 мс)** лише коли споживач-редактор просить швидшу реакцію. Немає другого navigator і нового ефекту.
- **Той самий WorkspaceLayout:** ширина nav так само змінюється у сітці (зберегти координати й пропорції), проте період layout transition скорочено до наявного `--pg-motion-spatial-fast-duration` (150 мс замість 340); етикетки синхронізовані з наявним fast token. `--pg-sidebar-width`, collapse state і mobile overlay лишаються.
- **Той самий Dialog:** зменшити entrance/exit до **140 мс для звичайних**, **120 мс для великого Workspace**. Для великого Workspace анімується лише opacity (без transform/scale), що зменшує роботу композиції, не змінюючи розміри чи розташування; для стандартного невелике translate/scale залишається. `::backdrop` має той самий 8px blur і колір.
- `requestAnimationFrame` відкривання, `showModal`, native focus trap, черга, Promise-семантика, dirty-guard, валідація, збереження, FAB, тултіпи, popover, секції й вибір залишаються чинними.
- **Важлива межа:** індикатор та `aria-busy` під час async-операцій і перевірок не змінюються. Прискорюємо лише рух, а не штучно завершуємо запити.
- Не додаємо глобального `will-change` на весь повноекранний діалог: великі постійні GPU layers можуть погіршити ситуацію на слабших пристроях.

## Перевірки

- `tests/e2e/dialog-performance.spec.js`: перевірити computed durations, transforms, `::backdrop`, fast motion для workspace і standard для незалежного `SectionNavigator`. Зберегти фокус, активну секцію, контент, native modal, анімацію навігації, reduced motion.
- `npm run check` та `npm run test:e2e` повинні бути реально виконані перед твердженням про проходження; статус Vercel READY означає збірку, не браузерний UX.
- Chrome DevTools → Performance: записати click→перший видимий frame, animation duration, FPS, Layout/Paint/Compositing, у 390px і 1440px, light/dark, довга форма, reduced motion. Порівняти з наявним baseline.


## Вимірювання й остаточна корекція — 2026-11-13

**Уперше перевірено в реальному Chromium:** клон `work` у тимчасовому Vercel sandbox (Chromium Headless 158, 1456×900, Linux, software rendering, не GPU користувача). `npm run check` завершився успішно. **12 браузерних тестів** `dialog-performance.spec.js` та `workspace-dialog.spec.js` пройшли для версії **до** обмеження blur.

Під час шести послідовних переходів у модальному редакторі (Playwright click→`aria-busy=false`) медіани в повторних серіях:

| Render mode | Медіанний результат |
|---|---:|
| Нативний повноекранний `dialog::backdrop { backdrop-filter:blur(8px) }` | 631–904 мс |
| Та сама повна розмитість через `#app {filter: blur(8px)}` | 486–556 мс |
| Обмеження blur тільки маскою або `clip-path` на **повноекранному backdrop** | 679–715 мс |
| **Чотири окремі blur(8px) смуги лише у видимих краях Workspace** | **342 мс** |
| Без blur (контроль) | 299–303 мс |

**Причина:** жива фільтрація прихованої за непрозорим fullscreen Workspace значної площі змушувала Chromium витрачати час на композицію фону під час анімації секцій. Маскування без зміни розміру шару не усуває вартість. Контрольний браузерний прогін підтверджує різницю, але **не гарантує** конкретних FPS на пристрої користувача.

**Виправлення:** `src/ui/dialog/dialog.js` монтує допоміжний **візуальний елемент у межах того самого Dialog manager** тільки для `size='workspace'`; CSS `src/ui/dialog/dialog.css` розмиває лише 4 смуги (верх/низ 16px, боки під реальну ширину `min(1440px, 100dvw-32px)`). Нативний `::backdrop` залишає затверджений dim, але без важкого full-screen blur. На mobile 700px і менше Workspace займає весь viewport — смуги не рендеряться. Елемент гарантовано прибирається через `finish/destroy/catch`. Звичайні Dialog/Confirm продовжують використовувати blur(8px) на нативному `::backdrop` без змін.

**Межі:** це **не** новий модальний компонент і не глобальний менеджер, не зміна форми, ширини або анімації секцій; Native focus trap, stack, close guard і дані без змін. `prefers-reduced-transparency` прибирає blur на смугах. Перевірити `dialog-performance.spec.js`, `workspace-dialog.spec.js` і Chrome Performance на реальному ПК після Pull.


### Контрольний прогін після виправлення

В окремому тимчасовому тестовому середовищі з актуального `work` (Chromium 158, viewport 1456×900):
- **`npm run check` — пройшов**, включаючи перевірки коду, unit tests і production Vite build.
- **16/16 цільових Playwright-тестів** із `dialog-performance.spec.js`, `workspace-dialog.spec.js`, `dialog.spec.js` — пройшли.
- **9 переходів** між «Основне», «Канали продажу», «Налаштування»: `[320,302,297,282,303,283,287,301,293]` мс, **медіана 297 мс**.
- Native `::backdrop` у Workspace: `backdrop-filter:none`; чотири реальні крайові смуги: `blur(8px)`; після close-guard і закриття DOM-вузли смуг видалено.
- Заповнення поля `Назва бренду` в автоматизованому сценарії — 15 мс. Це не вимірювання користувацького FPS або INP на його Windows-пристрої.

Широкий паралельний прогін **280** E2E-кейсів у невеликому 2-vCPU sandbox був перерваний після помилок в інших тестах (зокрема CollectionView, Field, RevealPanel); його **не вважати зеленим**. Окремі цільові 16 тестів пройшли. Для остаточної візуальної оцінки на Windows потрібен локальний браузер користувача після `Pull origin`.

## Єдиний статичний backdrop — 2026-11-27

Актуальний аудит коду: стандартні, editor та edge-to-edge Dialog досі використовували повноекранний blur(8px), Workspace — чотири blur-смуги. CSS-анімації Shell та rotating placeholders вже призупинялись; це не гарантує зупинки всіх JS/WebGL задач. Причину нинішнього зависання на конкретному Windows-пристрої не підтверджено trace.

Ізольований A/B у Chromium 144, Linux, headless, --disable-gpu, 1456×900, синтетичний фон із 240 клітинками, native dialog 90vw × 90vh, 80 полів, рух translateY і оновлення одного підпису на rAF, 900 мс, три черговані прогони на варіант. Це не повний Pinguin і не вимір GPU користувача:

| Backdrop | Кількість rAF-інтервалів | Медіана інтервалу |
| --- | --- | --- |
| Статичний dim | 54, 55, 54 | 16.7 мс |
| dim + backdrop-filter: blur(8px) | 30, 27, 29 | 33.3 мс |

Джерела: [WebKit: додаткові rendering passes](https://webkit.org/blog/3632/introducing-backdrop-filters/), [Chromium: backdrop filter + WebGL](https://issues.chromium.org/issues/414525204), [web.dev: dialog](https://web.dev/articles/building/a-dialog-component), [MDN: native dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

Рішення: універсальний статичний scrim через нативний ::backdrop, чинний theme token, без blur для всіх розмірів і без крайових DOM-смуг; непрозорий фон при reduced transparency. Немає нових JS-менеджерів, шарів, snapshot-залежностей. Native focus/close semantics, анімації панелі та фонова пауза лишаються. Історичні вимірювання вище збережені. Нові regression tests перевіряють відсутність blur/додаткових шарів і збереження dim. Повний прогін проєкту та Windows trace потрібні для підтвердження фактичного усунення зависань.

### Статична імітація матового скла

Після погодження власника додано два статичні theme-aware radial-gradient і локальну 64×64 SVG grain tile з готовою геометрією (без SVG-фільтрів). Розрахунок пікселів під діалогом не потрібен; збережено `backdrop-filter: none`. Це декоративне покриття, не знімок і не справжнє розмиття. Витрати на початковий paint/compositing залишаються; фактична продуктивність на пристрої користувача потребує перевірки. Контракт: [Dialog](../ui/dialog.md#pseudo-frosted-glass--2026-11-27).

Після візуального відгуку власника посилено декоративну вуаль (79/80% alpha), контраст статичних плям та зерно. Внутрішній decision overlay використовує ті самі декларації. Текстура зареєстрована у mechanism registry. Відсутність live blur залишається обов'язковою.

Для порівняння за запитом власника обидві теми отримали темну матову вуаль (76/82% alpha). Змінено лише колірні токени; той самий статичний фон, зерно та відсутність фільтра. Попередню світлу палітру збережено в історії Git (`f6a5641`). Нові показники продуктивності не вимірювалися.

### Atmospheric Glass — 2026-11-27

Розріджене зерно, чотири статичні градієнти, один нативний backdrop 2×2 viewport, цикл 80s тільки transform, вхід/вихід opacity. Вибір transform/opacity спирається на [web.dev](https://web.dev/articles/animations-overview): вони можуть композититися без повторного layout/paint, але великий шар має вартість пам'яті; повільна анімація не означає низьку частоту кадрів. Живого backdrop-filter немає. Нових замірів FPS поки немає. Reduced motion та transparency вимикають просторовий рух. [Контракт](../ui/dialog.md#atmospheric-glass--2026-11-27).
