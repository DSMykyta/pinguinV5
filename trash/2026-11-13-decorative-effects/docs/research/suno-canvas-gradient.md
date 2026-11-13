# Suno Discover — дослідження рухомого Canvas-градієнта

**Дата:** 2026-11-13. **Сторінка:** https://suno.com/discover  
**Перевірений JS:** https://suno.com/_next/static/immutable/chunks/3y3ct1n6m_u0o.js

## Підтверджена реалізація

У завантаженому HTML знайдено декоративний canvas всередині контейнера data-testid="create-module-background". Контейнер має ширину 130%, висоту 120%, overflow hidden, а форма поверх нього має більший z-index. Canvas не перехоплює pointer events. На деяких варіантах сторінки цей блок відсутній, але його код знайдено в JavaScript-збірці.

Ефект реалізований через **WebGL 1**, без Three.js. Vertex shader відображає прямокутник з 4 вершин (TRIANGLE_STRIP), fragment shader розраховує колір для кожного пікселя. Uniforms — time (секунди) та resolution (ширина й висота canvas).

## Математика рухомої хмари

~~~glsl
vec2 p = (uv - 0.5) * 2.0;
float n1 = sin(p.x + time * 0.8) * cos(p.y * 0.75 + time * 0.6);
float n2 = sin(p.x * 1.5 - time * 0.5) * cos(p.y * 1.25 - time * 0.7);
float thermal = ((n1 + n2 * 1.15) / 2.15) * 0.5 + 0.5;
~~~

Thermal множиться на концентричну маску (hotspotSize 0.50, smoothstep 0.9 -> 0.5) та рухому маску sin(p.x*1.5 + time*0.3) × cos(p.y*1.5 - time*0.4) з вагою 0.3 + 0.7. Інтенсивність змішування з фоном — 0.76, сила плівкового зерна — 0.01; віньєтка smoothstep(0.3,1.0,length(uv*2.0-1.0)) прибирає тверду крайку. Великий CSS blur для цього ефекту не використовується.

| Палітра Suno | Холодний | Теплий | Гарячий | Фон |
| --- | --- | --- | --- | --- |
| Темна | #310042 | #A14111 | #16003C | #101012 |
| Світла | #B7A4FF | #FFB27B | #D7CDFF | #F7F4EF |

Ці кольори **належать референсу**, їх не потрібно переносити в Pinguin.

## Життєвий цикл Suno

JavaScript отримує контекст webgl, компілює шейдери, щокадру змінює time/resolution через requestAnimationFrame та виконує drawArrays. IntersectionObserver зупиняє цикл, коли canvas поза екраном. Є статичний CSS radial-gradient fallback. Код не доводить однакової продуктивності на різних GPU.

## Адаптація для Pinguin

Окремий [CloudGradient](../ui/cloud-gradient.md) відтворює тип плавного руху через ті самі частоти хвиль і віньєтку, але має **один семантичний колір** з --pg-tone-tertiary-base поверх --pg-color-page. У Pinguin немає Suno-specific палітри, не додаємо пакетів, не копіюємо CSS-кнопки/форми з Suno. Для інших випадків компонент допускає main або secondary tone.

Наявний [AnimatedGradient](../ui/animated-gradient.md) лишається окремим CSS-патерном з двома псевдошарами. Це різні renderer-и й різні сценарії використання, обидва глобальні в src/ui.

При реалізації потрібно підтримати тему, resize, offscreen pause, reduced-motion, visibilitychange, WebGL context loss, CSS fallback та dispose.
