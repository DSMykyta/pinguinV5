# Focus Carousel — фокусна карусель

## Дослідження
Референс власника: Code with Ania Kubow, десять кадрів відео. Картка 60% ширини, 3:4, scroll-snap-align: center, scroll-snap-type: x mandatory, animation-timeline: view(inline). На краях scale .85, opacity .7; у центральній зоні 30–70% scale 1, opacity 1. Повний keyframes не видно, тому .7 та симетричне плато — реконструкція з останніх кадрів, а не дослівна копія.
- [Chrome: Carousel Slide Effects](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-atoms/carousel-slide-effects) — масштаб від позиції, native CSS за підтримки.
- [MDN: view()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline/view) — прогрес видимості відносно найближчого scrollport.
- [MDN: scroll-snap-align](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-align) — центр snap target.
- [Material 3 Carousel](https://m3.material.io/components/carousel/overview) — hero centered як візуальний орієнтир. Повна M3 keyline/mask геометрія не є ціллю цього ефекту.

Перевірено реєстр work, Section Navigator та дерево legacy (за назвами carousel/slider/scroll-snap знайдено лише forms/slider.css). Section Navigator реагує на вертикальну межу й перемикає секції, Focus Carousel має один горизонтальний scrollport і безперервне положення карток. Не дублює існуючу поведінку. Повний пошук вмісту legacy не виконано.

## Контракт
`createFocusCarousel({ items, label }) → { element, goTo(index, { behavior }), destroy() }`. items — масив DOM-вузлів; власник передає готовий вміст. Немає бізнес-даних, Shell, FAB, нового пакета або автоматичного гортання. Перший/останній елементи центруються за допомогою симетричних flex-spacer. Внутрішній surface анімується, зовнішній snap target зберігає layout. Іменована view timeline на кожному target є еквівалентом view(inline) на його поверхні без зміни геометрії snap target.

Native: CSS view timeline, scale/opacity, 0–30–70–100%. Fallback: один кадр на scroll/resize, вимір незмінних target і та сама формула; без постійного циклу. Reduced motion: повний розмір і непрозорість, програмне гортання без анімації. Нативний touch і trackpad; миша — локальний drag після порогу 6px, snap відновлюється при завершенні; інтерактивний вміст не перехоплюється. Фокус scrollport, стрілки, Home/End. Вертикальне колесо не перехоплюється. Destroy знімає слухачі, ResizeObserver та кадр. Кольори демонстрації лише зі спільних tone tokens. Демо у /tools → Ефекти.
