# Slider — Material 3

## Призначення й джерела

Один горизонтальний слайдер вибирає числове значення. Окремий спільний компонент
`src/ui/slider`; feature передає значення й callbacks, компонент не знає про Shell.

- [Google M3: специфікація](https://m3.material.io/components/sliders/specs)
- [Google M3: взаємодія](https://m3.material.io/components/sliders/guidelines)
- [Офіційна реалізація Android](https://github.com/material-components/material-components-android/blob/master/docs/components/Slider.md)
- [Опис оновлення Google/Flutter](https://docs.flutter.dev/release/breaking-changes/updated-material-3-slider)

У `work` аналога немає. `legacy/css/components/forms/slider.css` оформляв
глобальний `input[type=range]` тонкою смугою й круглою ручкою. Новий scoped
компонент зберігає нативну семантику range і відтворює наданий відеореференс.

## Геометрія (стандартний XS)

| Частина | Розмір у вебі |
| --- | --- |
| Шкала | 16 px |
| Ручка | 4 × 44 px |
| Ручка при утриманні / видимому клавіатурному фокусі | 2 × 44 px |
| Чистий проміжок від краю ручки до кожної частини шкали | 6 px |
| Зовнішні / внутрішні заокруглення | 8 / 2 px |
| Кінцева крапка | 4 px, центр за 8 px від кінця шкали |
| Зона взаємодії | щонайменше 48 px заввишки |

Усі три візуальні частини використовують одну нормалізовану CSS-властивість
`--pg-slider-position`. Нативний input є єдиним джерелом значення; він же
обмежує діапазон і округлює до кроку. Візуальний простір збігається з центром
нативної ручки: по 2 px з країв. Проміжок рахується від **краю** ручки,
тому при звуженні ручки його чиста ширина лишається 6 px. Біля меж короткі
частини шкали обрізаються до нуля; крапка обрізається разом із неактивною частиною.

## API

```js
import { createSlider } from '../../ui/slider/slider.js';

const slider = createSlider({
  label: 'Гучність', name: 'volume', value: 50,
  min: 0, max: 100, step: 1,
  formatValue: value => `${value}%`,
  onInput: (value, event) => preview(value),
  onChange: (value, event) => commit(value),
});
host.append(slider.element);
```

Опції: `label` (обов'язковий), `id`, `name`, `description`, `min`, `max`,
`step` (додатне число або `'any'`), `value`, `disabled`, `formatValue`,
`onInput`, `onChange`. Діапазон скінченний, `max > min`.

Повертає `element`, `input`, `getValue()`, `setValue(number)`,
`setDisabled(boolean)`, `focus()`, `destroy()`. `setValue` синхронізує
представлення без виклику callbacks. Зовнішнє пряме редагування input потребує
стандартної події `input`. Нативний form reset відновлює початкове значення.

## Взаємодія та доступність

Кольори походять із палітри проєкту: `--pg-color-accent` для активної частини,
ручки, крапки й числа; `--pg-color-accent-soft` для неактивної частини.
Окремої Material-палітри або локальних кольорових значень немає. Тема змінює
компонент через ті самі токени, що й решту інтерфейсу.

- Миша й дотик: натиснути шкалу або перетягнути ручку; нативний range веде жест.
- Клавіатура: Tab, стрілки, Home/End — стандартна поведінка браузера.
- `input` викликає `onInput` під час зміни, `change` — `onChange` при її фіксації.
- Постійний label, числовий output над шкалою, description через `aria-describedby`;
  форматоване значення передається також через `aria-valuetext`.
- Disabled виключений із tab-порядку; видимий focus ring охоплює зону керування.
- Значення рухається без затримок; лише звуження/відновлення ручки має короткий
  transition. Клавіатура й `prefers-reduced-motion` вимикають цей transition.
- Підтримуються RTL і forced colors (у forced colors показується нативний range).
- Кожна інстанція має власний стан та AbortController. `destroy` знімає listeners.

## Інтеграція й перевірка

Демонстрація — у наявному блоці «Складні поля та вибір» вкладки «Текст»:
звичайний і disabled приклади. Стилі підключає `src/main.js`.
Діапазон з двома ручками, вертикальний режим і розміри S–XL не входять у цей API.

Браузерні сценарії в `tests/e2e/slider.spec.js`: реальна інтеграція, геометрія
проміжків і меж, drag, клавіатура, крок/мінімум, незалежність, form reset,
disabled, destroy, RTL, мобільний дотик, теми й reduced motion.
