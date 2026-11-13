# CloudGradient — глобальний WebGL-ефект

**Гілка:** work. **Дослідження:** [Suno Canvas](../research/suno-canvas-gradient.md). **Демо:** /login-demo.

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
