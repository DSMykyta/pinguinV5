# Дослідження: legacy-градієнти й вартість рухомої підкладки

**Дата:** 2026-11-13. **Гілка:** `work`. **Статус:** дослідження, жодних змін у production renderer у межах цього дослідження.

## Знахідки в legacy

Перевірено **реальну гілку `legacy`**, а не лише попередню документацію:

| Тип | Файл | Що реалізовано |
| --- | --- | --- |
| `--gradient-light` | [`css/root.css`](https://github.com/DSMykyta/pinguinV5/blob/legacy/css/root.css#L189-L214) | Вертикальний `linear-gradient` із варіаціями `secondary`/white |
| `--gradient-storm` | той самий `root.css` | `main`/black → `secondary`, вертикальний |
| `--gradient-dawn` | той самий `root.css` | `secondary` → `tertiary`, вертикальний |
| Складений `radial-gradient` | [`design-system.html`](https://github.com/DSMykyta/pinguinV5/blob/legacy/design-system.html#L14-L22) | Два кольорові акценти у різних точках поверх `surface` |

Перші **три — названі пресети** світлої/темної теми; четвертий — **окремий прийом компонування**, а не четвертий `--gradient-*` токен.

Додатково виявлено два анімовані приклади:
- [`css/components/feedback/loading.css`](https://github.com/DSMykyta/pinguinV5/blob/legacy/css/components/feedback/loading.css): `loadingTextShimmer` змінює `background-position` текстової заливки, `stripeMove` — позицію повторюваних діагональних смуг Progress.
- [`css/utilities/animations.css`](https://github.com/DSMykyta/pinguinV5/blob/legacy/css/utilities/animations.css): `stripeMove` визначено також тут. Це **історичне дублювання**, не приклад для перенесення.

Готового оптимізованого анімованого «живого кольорового полотна» у знайдених legacy-файлах немає. Пресети й radial-композиція корисні для палітри та форми початкової текстури.

## Чи дешевше рухати вже намальовану підкладку?

**Як правило, так — якщо рух лише через `transform` і, за потреби, `opacity`.** Це дає браузеру шанс виконати анімацію на compositor без повторного JS, layout і paint. Не всі GPU або браузери гарантують compositor-only на будь-якому шарі: великі шари витрачають пам'ять.

| Стратегія | Що виконується кожен кадр | Ризики |
| --- | --- | --- |
| Поточний Canvas 2D `color-field.js`, до 24 FPS | JS рахує ваги 6 полів для кожного з до 140×140 пікселів, `putImageData` завантажує нову текстуру | CPU та пересилання пікселів, але справжня незалежна зміна кольорів |
| **Заздалегідь намальоване полотнище + CSS `transform`** | Переважно compositing готової текстури; JS-пікселі не перераховуються | Рух усієї текстури — лише панорамування; потрібен запас за всіма краями |
| **Два заготовлені кадри + `transform`/`opacity`** | Compositing двох текстур, без перерахунку пікселів щокадру | Зростає використання пам'яті GPU, але зміна кольорової композиції жвавіша |
| Legacy `background-position` | Може запускати перефарбовування і перерахунок стилів | Частіші main-thread paint, для великого фону не рекомендується |
| Кілька DOM `radial-gradient` блоків | Compositing/paint багатьох прямокутних шарів | **Повернення швів**, що вже видно на скріншоті від 13.11; кольори домінують через порядок alpha-композиції |

### Локальна контрольна проба (не production benchmark)

Окремий **headless Chromium** у поточному container-runtime, viewport 440×420, інтервал 2,7 с. Декоративні тестові приклади відтворюють принципи, але **не є ідентичним піксельним зображенням**; `TaskDuration`/ `ScriptDuration` з CDP Performance не вимірюють сумарне навантаження GPU.

| Варіант | Main-thread `TaskDuration` за 2,7 с | `ScriptDuration` | `RecalcStyleCount` |
| --- | ---: | ---: | ---: |
| Canvas із малюванням 140×140 (~57 кадрів) | 279 мс | 250 мс | 0 |
| Велика CSS-текстура, анімується `transform` | **4 мс** | **0 мс** | 1 |
| Анімація `background-position` | 59 мс | 0 мс | 162 |

Ці значення корисні тільки для **відносного порівняння механізмів** у цьому браузері, не для прогнозування FPS на Windows/GPU користувача. Технічні джерела: [web.dev — Why are some animations slow?](https://web.dev/articles/animations-overview), [web.dev — How to create high-performance CSS animations](https://web.dev/articles/animations-guide), [MDN — Animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate).

## Архітектурна пропозиція для Pinguin

Залишити єдиний `createAnimatedGradient({ text })` та наявний `Dialog(presentation:'edge-to-edge')`. Кандидат для наступної реалізації:

1. **Зберегти нормалізоване змішування** `main/secondary/tertiary` з поточного `src/ui/animated-gradient/color-field.js`, яке усунуло прямокутні шви CSS-шарів.
2. Створити **одну або дві статичні текстури** при mount/theme/resize, без щокадрового `putImageData`. Двокадрова композиція має більшу візуальну різноманітність; почати з одного кадру як baseline.
3. Підкладку зробити **приблизно 160% розміру видимої поверхні**, центрованою з запасом 30% з кожного боку. Обмежити CSS `translate` так, щоб жоден край текстури не потрапляв у `overflow:hidden` вікна. Якщо використано дві, обидві повинні **повністю перекривати** площу й мати однаковий alpha/opaque baseline.
4. Рухати через **`transform:translate3d(...)`** на одному/двох внутрішніх шарах; для другого додати дуже повільний `opacity` crossfade (не `background-position`). Жодного JS animation loop, окрім одноразового створення/оновлення за умовами.
5. `prefers-reduced-motion`: статична текстура. `Dialog` відкритий → фонова сторінка паузиться наявною логікою; відкритий градієнт активний. `IntersectionObserver` для паузи поза видимою областю, якщо це необхідно для конкретного екземпляра.
6. Контроль: автоматичний Playwright тест, що градієнт не має швів у будь-якому кадрі, а 3 semantic roles видимі й у світлій, й у темній темі; Chrome DevTools Performance у реальному модальному вікні, не лише мікробенчмарк.

**Компроміс:** одна рухлива текстура дешевша, але лише «пливе» цілком. Для ефекту «живий колір без форм» рекомендовано **дві заготовлені цілісні текстури** з незалежним compositor-transform і м'яким crossfade. Перевірити два варіанти в одному тимчасовому тесті перед заміною current Canvas. Не створювати другого компонента чи паралельну логіку палітри.

## Межі цього дослідження

Production-файли `src/ui/animated-gradient/*`, `src/features/tools/*`, `src/ui/dialog/*` **не змінювалися** під час цього дослідження. Без дозволу користувача не виконувати міграцію renderer. Vercel не використовувати.


## Оновлена реалізація за відеореференсом — 2026-11-13

**Попередні пропозиції Canvas 2D і двох texture layers вище — історія дослідження, не чинний стан.** За новим прямим запитом користувача реалізацію спрощено до техніки зі скріншотів:

- `src/ui/animated-gradient/animated-gradient.css`: головна поверхня `background: var(--pg-tone-main-base)` (**primary/main**).
- **Один** псевдоелемент `::before` із `inset:-20%`: дві накладені `radial-gradient`-плями у `--pg-tone-secondary-base` та `--pg-tone-tertiary-base`, що зникають у прозорість приблизно до 35%, `filter:blur(60px)` (параметри можуть змінюватися за пресетом).
- `animation: ... ease-in-out infinite alternate` рухає тільки `transform: translate3d/rotate/scale` однієї готової розмитої підкладки. **Ні JS-піксельного рендерингу, ні Canvas, ні шуму, ні декількох DOM blob-контейнерів.**
- Існуючий компонент `createAnimatedGradient({text,preset})` зберігає `getPreset/setPreset`, назву `pinguinV6`; три кнопки Light/Storm/Dawn змінюють виключно розташування/розмір/м'якість/темп кольорових плям, залишаючи однаковий `main` фон та `secondary`/`tertiary` кольори.
- `src/ui/animated-gradient/color-field.js` видалено як невикористовуваний код. Єдиний `Dialog` та спільний `ButtonGroup` збережено.
- Локально перевірено **статичний візуальний прототип** у Chromium за параметрами Dawn 440×420: відсутні прямокутні шви, а синя й помаранчева плями плавно перетікають у темно-синій фон. Це не повний browser E2E тест сайту; тести додано у `tests/e2e/animated-gradient.spec.js` і вони потребують виконання.

Залишкова вартість `filter:blur()` можлива під час rasterization; рух `transform` зазвичай може виконуватися на compositor, але реальні GPU/FPS слід профілювати на цільовому ПК. Бібліотек або додаткових фонових таймерів немає.
