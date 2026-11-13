# CloudGradient — глобальний WebGL-ефект

**Гілка:** work. **Дослідження:** [Suno Canvas](../research/suno-canvas-gradient.md). **Демо:** /login-demo (оригінальна хмарка), /tools → Таблиці → Aurora (триколірна версія).

## Контракт

- Універсальний декоративний компонент із src/ui/cloud-gradient. Немає залежності від Shell, сторінки входу, Dialog, Input чи Button.
- Два незалежні хвильові поля в GLSL формують рух однієї «хмари»; радіальна маска й віньєтка плавно прибирають межі. Великий CSS blur не використовується.
- Колір — лише з чинного semantic tone: --pg-tone-{tone}-base. База — --pg-color-page. Демо використовує tertiary у світлій і темній темі.
- Елемент aria-hidden, pointer-events:none; не блокує кліків, фокусу й заповнення форми.

## API

~~~js
import { createCloudGradient } from '../../ui/cloud-gradient/cloud-gradient.js';
const cloud = createCloudGradient({ tone: 'tertiary' }); // main | secondary | tertiary
container.append(cloud.element);
cloud.mount(); // після підключення до DOM
cloud.destroy(); // при закритті сторінки
~~~

WebGL контекст створюється лише на mount. На destroy відписуються observers/listeners, скасовується requestAnimationFrame та звільняються GPU-ресурси. При відсутності WebGL відображається статична CSS-підкладка з того самого кольору.

## Рух і продуктивність

requestAnimationFrame змінює тільки час шейдера. IntersectionObserver, visibilitychange та prefers-reduced-motion блокують непотрібні кадри; ResizeObserver оновлює розміри, MutationObserver слухає зміну data-theme. DPR обмежено 1.5. На reduced motion лишається нерухомий кадр. Для перевірки GPU/FPS потрібен профіль у реальному браузері; build сам по собі не підтверджує візуальну якість.

## Сценарій

Демо-сторінка /login-demo монтує рівно два вже наявні createInput (логін і пароль) та стандартну pg-button--primary по центру, поверх локальної інстанції CloudGradient розміром 130% × 120% сцени. Дія кнопки — тільки локальна валідація з повідомленням, без надсилання, збереження чи імітації автентифікації.

Наявний CSS-компонент [AnimatedGradient](animated-gradient.md) не замінюється й не змінюється.

## Aurora — опціональний триколірний режим (13.11.2026)

`createCloudGradient` тепер має **два варіанти одного й того самого компонента**:

```js
const cloud = createCloudGradient({ tone: 'tertiary' }); // default variant:'cloud'
const aurora = createCloudGradient({ variant: 'aurora' }); // 3 semantic tones
container.append(aurora.element);
aurora.mount();  // лише ПІСЛЯ вставлення в документ
const stats = aurora.getStats(); // variant, framesRendered, width, height, running, renderer
aurora.destroy(); // скасувати RAF, відписати listeners, звільнити WebGL
```

- `variant:'cloud'`: **оригінальний Suno-подібний шейдер і налаштування DPR збережено**; він продовжує малювати один `tone` поверх `--pg-color-page` на сторінці входу.
- `variant:'aurora'`: новий fragment shader **у тому самому WebGL рендерері**. `main` — фон, `secondary` і `tertiary` — широкі кольорові поля з незалежною хвильовою деформацією меж. Кольори надходять виключно з `--pg-tone-{main,secondary,tertiary}-base`. Жодного CSS `blur()`, WebGL-пакета, grain/noise, canvas-піксельного циклу JS або копії Dialog.
- Aurora рендерить **не частіше 30 кадрів/с** (draw викликається із throttle у звичайному `requestAnimationFrame` циклі); внутрішня роздільність не більша за **0,75 CSS-пікселя на один CSS-піксель**, і додатково обмежена **768×480**. Прискорення через GPU залежить від браузера/драйвера, тому FPS і пам'ять не можна вважати підтвердженими без реальних профілів.
- `IntersectionObserver`, `visibilitychange`, `prefers-reduced-motion` та **існуюча подія Dialog `pg:modal-change`** ставлять кадри на паузу. Хмарка під відкритим модальним вікном зупиняється; хмарка *всередині активного Dialog* продовжує рух. Після закриття повертається рух без стрибка часу.
- Для Aurora доступна **статична триколірна CSS-композиція** при відсутності WebGL. Не потрібно створювати статичні PNG або MP4.
- У `tests/e2e/cloud-gradient-aurora.spec.js` зафіксовано триколірний renderer, дозволену частоту, зменшену роздільність, modal pause, reduced motion, залишений `cloud` у login-demo та звільнення ресурсів.
- Звичайні діалоги та великі `workspace`-діалоги **не підключені до Aurora**. Наявний blur редактора не змінено, аби уникнути попередніх регресій. Демо Aurora використовує спільний `Dialog(presentation:'edge-to-edge')` і стандартну кнопку `Aurora` біля CSS-демо.
- Перевірки в Chromium на реальному сайті й GPU/FPS потрібні **перед** підключенням Aurora як напівпрозорого backdrop для звичайних Dialog.

## Стабільна геометрія помилок

На сторінці `/login-demo` передбачено постійне місце під один рядок підтримки кожного спільного Input через `grid-template-rows` у CSS самої feature. Коли `setError()` змінює `hidden` повідомлення, висота обох полів та координати кнопки не змінюються. Спільний Input та його контракт залишаються незміненими. Регресійний E2E-тест порівнює координати до, після двох помилок і після очищення однієї.

## Стабільна форма під час валідації

Геометрією інпутів володіє спільний [Field](field.md): резервує місце під коротке повідомлення про помилку. Демосторінка не задає власну висоту Input. Підсумкове повідомлення після натискання кнопки позиціонується відносно форми, без зміни висоти трьох контролів та центрування. WebGL і його lifecycle не залежать від валідації.
