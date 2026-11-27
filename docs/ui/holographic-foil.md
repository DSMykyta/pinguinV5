# Holographic Foil — інтерактивна фольга

Єдиний глобальний власник: `src/ui/holographic-foil/`. Демо — /tools → Ефекти. Не створювати окрему реалізацію для квитків, карток чи інших поверхонь. CloudGradient, PhotoCharm та припаркований AnimatedGradient мають інші призначення.

## Дослідження та виправлення 27.11.2026

На скриншотах власника видно повторюваний градієнт 115°, п'ять кольорів, поле 300% ширини та color-dodge. У відео нахил і рух фольги синхронізовані; власник уточнив, що потрібен рух **від курсора**, без самостійного циклу. Повний оригінальний код відео не встановлено.

- [MDN background-position](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-position): відсоткова позиція зміщує саме зображення на різницю розмірів контейнера та фону. Для 300% ширини відсоток 15..85 дає безперервний рух проти курсора без оголення краю.
- [Suhail Razzak, Building a holographic card](https://www.suhailrazzak.com/writing/holographic-cards): збільшений фон, color-dodge, окремі оптичні та інформаційні шари, рух від миші або нахилу.
- [Simon Goellner, Pokémon holo effects](https://simey.me/projects/pokemon-holo/): незалежні shine та glare, позиціонування за курсором; використано принцип, не копію коду.
- [MDN mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode), [isolation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/isolation): змішування тільки з основою картки. [W3C color-dodge](https://www.w3.org/TR/compositing-1/#blendingcolordodge): світліша основа дає сильніше освітлення.

Попередня версія рухала окремий елемент шириною 300% через transform; на скриншоті з'явилася вертикальна лінія та вихід кольору за округлену поверхню. Точну причину артефакту конкретного браузера не підтверджено; усуваємо саму проблемну конструкцію. Новий шар займає рівно 100% поверхні, успадковує радіус, не рухається і не масштабується. Рухаємо лише background-position у межах 15..85% / 25..75%, фон 300% × 200%. П'ять кольорів із референсу збережено в токенах; палітра Pinguin використовує наявні семантичні кольори. Другий м'який радіальний відблиск з'являється лише під курсором. Текст знаходиться над оптичними шарами, не бере участі в color-dodge.

## API

```js
const foil = createHolographicFoil({ palette: 'spectrum', base: 'medium' });
foil.content.append(existingContent);
host.append(foil.element);
foil.setOptions({ interactive: true, tilt: true, intensity: .85, angle: 115 });
foil.destroy();
```

palette theme/spectrum; base medium/dark/theme; intensity 0..1; angle 0..360; interactive, tilt, enabled — boolean. Раніші animated/duration замінено на interactive (єдиний споживач — демо). За замовчуванням картка нерухома без курсора, реагує на мишу/перо; touch не перехоплює прокрутку і лишається статичним. Координати вимірюються від зовнішньої нерухомої області, а не від поверхні, яка обертається. Нахил ±10/12°; фон рухається у протилежному напрямку. Один requestAnimationFrame на групу pointermove, без нескінченного циклу. При виході курсора, pointercancel, втраті фокусу або вимкненні механізму — плавне повернення через спільні motion tokens. Reduced motion — статична фольга. Destroy скасовує кадр і слухачі. Контраст довільного контенту залишається відповідальністю споживача.

Демо: одна картка PINGUIN із текстом, без панелі налаштувань. Активна палітра theme: три чинні токени main → secondary → tertiary → main, рівномірні переходи через 0/10/20/30% одного періоду; автоматично враховує світлу та темну теми. Нейтральна сіра основа, color-dodge, відблиск та реакція на курсор збережені. Палітра spectrum і програмний setOptions лишаються в глобальному API для інших споживачів. Немає окремого FAB, нового механізму анімацій чи бібліотеки. [Реєстр](mechanism-registry.md).
