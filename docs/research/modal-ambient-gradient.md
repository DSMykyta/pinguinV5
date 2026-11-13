# Дослідження: рухливий градієнт поверх розмитого фону Dialog

**Дата:** 2026-11-13. **Гілка:** `work`. **Стан:** дослідження та контрольна браузерна проба; **жодних production-змін** у Dialog/AnimatedGradient у межах цього дослідження.

## Початкові обмеження Pinguin

Прочитано фактичний стан `src/ui/dialog/dialog.js`, `src/ui/dialog/dialog.css`, `src/ui/animated-gradient/animated-gradient.js`, `src/ui/animated-gradient/animated-gradient.css` і `docs/research/dialog-performance.md` у `work`.

- `showModal()` створює top layer, власний `::backdrop` та браузерну інертність сторінки. Звичайний Dialog: native `::backdrop` з `backdrop-filter:blur(8px)`.
- Великий `Workspace`: native `::backdrop` **без** blur, а розмиваються лише чотири видимі смуги навколо майже повноекранної панелі. Це цілеспрямоване виправлення сильної повільності редактора, яке НЕ можна скасувати декоративним ефектом.
- Фонові CSS-анімації `#app` паузяться через `body:has(> .pg-dialog[open]) #app`. Для JS rotation placeholders використовується `pg:modal-change`; треба зберегти.
- Чинний `AnimatedGradient`: `main` як базовий колір, `secondary` та `tertiary` у двох незалежних `::before/::after` із `inset:-50%`, анімація лише `transform` (та `opacity` для Pulse), без Canvas і noise. Напис `pinguinV6` можна вимкнути через `text:null`.

## Підсумок технічних рекомендацій

**Можливо**, але розташування шарів визначає продуктивність. Якщо рухати градієнт **під** повноекранним `backdrop-filter`, пікселі, які має розмивати браузер, змінюються кожен кадр — саме це може повернути затримки. Значно краще розташувати **статично розмиту сторінку** під **незалежним прозорим анімованим градієнтом**. Нативний `::backdrop` у цьому разі залишити для **затемнення**, не застосовувати на ньому ще один full-screen blur.

Спрощена композиція:

```text
[top layer]  Native Dialog (sharp, interactive)
             ::backdrop — translucent static dim ONLY
[body]       ambient gradient — fixed, pointer-events:none, aria-hidden
[body]       #app — paused animations, static blur IF measured acceptable
```

**Важливо:** звичайний DOM елемент у body перебуває *під* браузерним `::backdrop` незалежно від свого `z-index`. Тому його кольори будуть приглушені затемненням `::backdrop`. Щоб при цьому розмиття не обробляло рухливий шар, для ambient-режиму blur має бути на застиглому `#app`, а native `::backdrop` — лише dim. Інакше фоновий gradient стає частиною live blur input.

## Локальна браузерна проба

Окремий, **не інтеграційний** сценарій Playwright + системний headless Chromium у поточному контейнері. Viewport 1440×900, фоновий макет із 420 плитками, стандартний Dialog 440×420 і Workspace 1408×868; два незалежні `radial-gradient`-поля під нативним top-layer. 1,8 секунди після відкриття кожного режиму. CDP Performance + `requestAnimationFrame`; час кадру — **наближений графік** у тестовому браузері, а не фактичний GPU FPS.

| Схема | Середній rAF-інтервал — Standard | Workspace | Інтерпретація |
| --- | ---: | ---: | --- |
| Лише static `::backdrop` dim, без gradient | 16,7 мс | 16,7 мс | Контрольний випадок |
| Static `::backdrop blur(8px)`, без gradient | 17,1 мс | 18,5 мс | Без руху все ще прийнятно у цій пробі |
| **Повноекранний `::backdrop blur(8px)` + рухливий gradient знизу** | **39,6 мс** | **37,5 мс** | ~25–27 кадрів/с; не рекомендувати |
| **Static blur(8px) на `#app` + рухливий gradient вище + `::backdrop` dim** | **16,8 мс** | **16,8 мс** | Найкращий кандидат для компактних модалок |
| **Blur лише чотирьох крайових смуг + рухливий gradient + dim** | **16,8 мс** | **16,8 мс** | Не погіршує старе рішення Workspace у макеті |
| Лише dim + gradient без blur | 16,7 мс | 16,7 мс | Найдешевший адаптивний fallback |

У тесті з `blur(8px)` поверх рухливого шару `RecalcStyleCount` був ~44–46 за 1,8 с; з окремим blur застиглого `#app` — ~105–106. Це не суперечність: **колірні перемальовування/compositing** та layout не відображаються одним показником. Важливі спостережені rAF інтервали. Експеримент тестував принцип, **не** гарантовану швидкість сайту на Windows; реальний Pinguin має інші DOM і ефекти. Раніше, до цього дослідження, повноекранне розмиття у реальному Workspace вже було виправлене й у контрольних прогонках 2026-11-13 дало ~297 мс замість >600 мс (див. [dialog-performance.md](dialog-performance.md)).

## Як інтегрувати БЕЗ нового компонента (після окремої вказівки)

1. Додати до **існуючого** менеджера `Dialog` опціональний параметр backdrop-style (назва контракту на узгодження), не робити другу modal/overlay систему. За замовчуванням залишити поточну поведінку, доки A/B перфоманс не підтвердить зміни.
2. Повторно використовувати **той самий** `createAnimatedGradient({text:null,preset:'light'})` як decorative `body`-sibling поза `#app`, створювати перед `showModal()` і прибирати у `finish()`, `destroy()`, `catch`. Це єдиний власник lifecycle, без глобальних event listeners. `pointer-events:none`, `aria-hidden=true`; native `showModal()` зберігає focus trap.
3. В ambient-режимі **окремо** та без анімації розмити `#app` (один CSS `filter:blur(8px)`, лише якщо профілювання підтвердить швидкість). Ambient gradient розташувати поверх `#app`, але під native `::backdrop`; в `::backdrop` залишити static translucent dim. Не розмивати сам animated layer.
4. Зберегти кольори `main/secondary/tertiary`, але знизити інтенсивність декоративного шару до орієнтовно `opacity:.10–.18` (початкова гіпотеза, не затверджене значення). Для ambient — повільніша анімація `transform` за потреби, без нового JS ticker. Чіткий фокус на Dialog; ні елементів керування, ні тексту на задньому плані.
5. **Workspace:** повноекранний blur категорично не повертати. Лишити чотири вузькі розмиті смуги. Декоративний градієнт у настільки вузьких полях мало помітний і може марно споживати GPU пам'ять. Початкове правило — **ambient animation OFF для Workspace** (можливий static tint по краях), і окремий opt-in лише після цільового тесту.
6. **Доступність:** `prefers-reduced-motion` → статичний градієнт; `prefers-reduced-transparency` → без blur, приглушений статичний fallback; прозорість ніколи не знижує контраст всередині Dialog. Фонові анімації/таймери залишаються паузованими.
7. **Обмеження великих GPU текстур:** поточний CSS градієнт містить *два 200%-псевдошари*. На 1440×900 один 200%-шар теоретично ~20,7 МіБ сирого RGBA, два ~41,5 МіБ без додаткових render surfaces; на 1920×1080 — ~31,6 МіБ на шар. Не покладатися на `will-change` скрізь; для backdrop краще використовувати менш агресивний overscan або простіший статичний варіант після перевірки відсутності швів. Ці цифри приблизні, **не** точні дані GPU-профайлера.

## Критерії приймання

- Без регресій у **Dialog**: showModal/native inert, Escape, backdrop click, focus restoration, queue, dirty-guard, async save, HMR cleanup.
- Без регресій у **Workspace**: той самий edge-only blur, час перемикання секцій та редагування не погіршився.
- Chrome DevTools Performance: Paint flashing, Frames, raster/composite activity, Main-thread long tasks; порівняння без gradient і з ним при Standard і Workspace у 390px/1440px, light/dark, 60 Гц.
- Компактний Dialog: невелика напівпрозора колірна хвиля позаду, контент на передньому плані лишається читабельним, без руху елементів інтерфейсу під ним.
- Під `prefers-reduced-motion/transparency` ефект вимикається/спрощується без збоїв.

## Джерела

- [MDN: HTMLDialogElement.showModal()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) — top layer, ::backdrop, native inert.
- [MDN: dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) — стиль ::backdrop й native interaction.
- [web.dev: How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — compositor transform/opacity, небезпеки paint і will-change.
- [web.dev: Why are some animations slow?](https://web.dev/articles/animations-overview) — paint/rasterization/compositing, layer costs.
- [Локальний аудит Pinguin](dialog-performance.md) — попередня реальна регресія повноекранного blur Workspace.

**Межі:** лише дослідження та документація. Ніякої зміни production UI і жодного Vercel deployment.
