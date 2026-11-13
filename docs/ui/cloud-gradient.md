# CloudGradient — глобальний WebGL-ефект

**Гілка:** `work`. **Дослідження:** [Suno Canvas](../../trash/2026-11-13-decorative-effects/docs/research/suno-canvas-gradient.md). **Демо:** `/login-demo`.

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

Експериментальні AnimatedGradient, Aurora та Sparkles тимчасово збережені в `trash/2026-11-13-decorative-effects/`; вони не підключені до застосунку.

## Стабільна геометрія помилок

На сторінці `/login-demo` передбачено постійне місце під один рядок підтримки кожного спільного Input через `grid-template-rows` у CSS самої feature. Коли `setError()` змінює `hidden` повідомлення, висота обох полів та координати кнопки не змінюються. Спільний Input та його контракт залишаються незміненими. Регресійний E2E-тест порівнює координати до, після двох помилок і після очищення однієї.

## Стабільна форма під час валідації

Геометрією інпутів володіє спільний [Field](field.md): резервує місце під коротке повідомлення про помилку. Демосторінка не задає власну висоту Input. Підсумкове повідомлення після натискання кнопки позиціонується відносно форми, без зміни висоти трьох контролів та центрування. WebGL і його lifecycle не залежать від валідації.
