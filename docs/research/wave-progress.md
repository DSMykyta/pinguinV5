# Дослідження: хвилястий індикатор прогресу (2026-11-13)

## Джерело сценарію

На шести скриншотах користувача (демонстрація Code with Ania Kubow) показано горизонтальний **Wave Progress**: ліва частина — синусоїдальна хвиля, справа — пряма тонка доріжка з крапкою в кінці. Між ними 4 px. Довжина активної хвилі відображає реальне числове значення (`width = progress`, приклад 61%).

Фрагмент коду на скриншоті:
- вбудований у CSS `data:image/svg+xml` використовує `viewBox="0 0 20 10"` та `path d="M0 5 Q5 0 10 5 T20 5"`, `fill="none"`, `stroke-width="4"`, `stroke-linecap="round"`;
- маска `0 0 / 20px 100% repeat-x`;
- `@keyframes travel { to { mask-position: 20px 0; } }` із тривалістю 0,6 s та лінійним повтором;
- `rest` має висоту 4 px, радіус 2 px, `margin-left: 4px`, `flex: 1`, а `::after` малює 4 px круглу крапку справа.

**20 px — повний період:** половина на 10 px є верхнім гребенем, друга — нижнім. Рух на рівно 20 px повертає маску до тієї ж фази, без шва. 15 px зміщення дасть різкий стрибок під час циклу. `mask-size: 20px 100%` і `mask-repeat: repeat-x` не повинні змінюватися від відсотка; для прогресу змінюється лише ширина активної частини.

## Перевірена актуальна документація

- [MDN CSS Mask Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Masking/Mask_properties): mask-image, mask-position, mask-size, mask-repeat, позиціювання тайлів.
- [MDN mask-position](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-position): маска може повторюватися, `mask-position` є анімованою властивістю.
- [W3C CSS Masking Module Level 1](https://www.w3.org/TR/css-masking-1/): специфікація повторних зображень маски.
- [MDN ARIA progressbar](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role): відомий відсоток → `aria-valuenow`; невизначений → без `aria-valuenow`, обов'язкова доступна назва.

## Перевірка меж наявної системи

- `src/ui/button/button.js`/`button.css` уже реалізують Material 3 Expressive Shape Morph під час асинхронної **дії кнопки** (`setButtonLoading`). Новий Wave Progress його не змінює.
- `src/ui/slider` має нативний range та API `createSlider`; застосовуємо його для інтерактивного керування числовим прогресом на демонстраційній вкладці.
- `src/ui/page` та `src/features/tools/index.js` — власники звичайної робочої області та вкладок; не створюємо особливих режимів Shell.
- У `legacy/css/components/feedback/loading.css` був інший loading/progress; хвилястий періодичний CSS-mask не є перенесеним спільним компонентом.

## Висновок та обмеження

Реалізувати автономний `WaveProgress` у `src/ui` через один повторюваний SVG **data URL всередині CSS** (без SVG DOM-вузлів і бібліотек). Режим `determinate` отримує конкретні значення 0–100, `indeterminate` не оголошує відсоток і демонструє вільну хвилю. Для `prefers-reduced-motion` зупинити рух, залишити індикатор видимим. Значення/таймери належать зовнішньому сценарію; компонент ніколи не генерує фіктивний бізнес-прогрес.

Колір береться з чинних семантичних токенів, а не копіюється зі скриншота. Демонстрація на `/tools` може явно моделювати час завантаження, але не стверджує, що виконує реальне API-завантаження.
