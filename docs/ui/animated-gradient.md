# Animated Gradient — три рухливі legacy-пресети

**Гілка:** `work` · **Оновлено:** 2026-11-13.

## API

Єдиний компонент і DOM API збережено:

```js
const gradient = createAnimatedGradient({
  text: 'pinguinV6',  // null = без напису
  preset: 'dawn',     // light | storm | dawn
});
gradient.getPreset();     // 'dawn'
gradient.setPreset('storm');
```

Складові: `src/ui/animated-gradient/animated-gradient.js`, `color-field.js`, `animated-gradient.css`. Жодного нового Dialog, глобального AnimationManager або бібліотеки.

## Колір: рецепти саме з legacy

[Оригінал](https://github.com/DSMykyta/pinguinV5/blob/legacy/css/root.css) `--gradient-light / --gradient-storm / --gradient-dawn`, 6 stop-ів для світлої й темної теми.

- **Light:** шість ступенів `secondary` з домішкою білого (у dark — чорного), як у legacy.
- **Storm:** три затемнення `main` → суміш `main/secondary` → два висвітлення `secondary` (dark — затемнення), як у legacy.
- **Dawn:** два `secondary/white` → `secondary/tertiary` → `tertiary/black` (dark — відповідні темні stop-и), як у legacy.
- Від **legacy збережено колірні формули шести stop-ів**, але замість старих вертикальних смуг кольори розподілені по шести плавних 2D-центрах. Кольори з `--pg-tone-main-base`, `--pg-tone-secondary-base`, `--pg-tone-tertiary-base`; змінюються із темою сайту. Назва `pinguinV6` лишається читабельною на Light.

## Рух і витрати

1. При mount, зміні пресета/теми чи resize внутрішній `color-field.js` **одноразово** малює два Canvas-полотна із різною органічною композицією, за 6 legacy-stop-ами кожного пресета. Роздільність полотен обмежена **192–300 px** для кожної осі. `putImageData` не викликається щокадру.
2. Два цілісні **непрозорі** полотна збільшені до 164% площі й центровані з запасом 32% по всіх краях. Вони рухаються тільки за допомогою CSS `transform:translate3d/scale` на циклах **26 с** і **34 с**; друге плавно проявляється/згасає за **21 с**. Усі keyframes мають однакові значення на 0% та 100%: немає стрибка на повторенні й немає прямокутних країв усередині вікна.
3. Шум посилений: **статичний зернистий Canvas** 192×192, створений один раз при відкритті, `opacity:.38` + `mix-blend-mode:overlay`. Жодних анімованих SVG-фільтрів, grain RAF або важкого `blur()` на великій площі.
4. `prefers-reduced-motion` залишає обидві статичні композиції, без циклічної анімації. `IntersectionObserver` і `visibilitychange` призупиняють анімацію при приховуванні, `pg:modal-change` — коли градієнт за активним Dialog. Від'єднання елемента прибирає спостерігачі й слухачі.

**Продуктивність:** у нормальному стані **немає JS animation loop**; браузер має шанс виконувати `transform`/`opacity` на compositor. Це не гарантує конкретних FPS на пристрої користувача; GPU texture memory вища за одну текстуру.

## Демонстрація

`src/features/tools/animated-gradient-demo.js` використовує `showDialog({presentation:'edge-to-edge'})` і **наявний** `createButtonGroup` (`Light`, `Storm`, `Dawn`) із `onChange -> gradient.setPreset()`. Напис **pinguinV6**, три кнопки внизу поверх полотна, стандартна кнопка закриття зверху. Геометрія кнопок у `src/features/tools/animated-gradient-demo.css`, їхні hover/selected/кольори — виключно у спільному `Button` і `ButtonGroup`.

## Перевірка

`tests/e2e/animated-gradient.spec.js`: три пресети, distinct Canvas pixels, відсутність швів, CSS-loop 0%=100%, незмінні пікселі в часі (лише `transform` рухається), посилений grain, dark mode, reduced motion, background pause, native Dialog і Escape.

Дослідження способів: [legacy та compositor](../research/animated-gradient.md).
