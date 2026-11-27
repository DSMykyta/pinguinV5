# Нативне позиціонування спливних елементів

Статус: CSS-first механізм у гілці work (2026-11-27). Власник геометрії — [positionPopup()](../../src/ui/position/position-popup.js). Наявні компоненти не дублюються.

## Рішення

- HTML Popover API вже піднімає панелі Menu, Listbox і Combobox у Top Layer. Збережено manual lifecycle, клавіатурну навігацію, фокус, hover grace, outside-click та outside-scroll dismissal.
- Для звичайного видимого popover браузер отримує унікальне anchor-name для фактичного DOM-якоря, position-anchor для панелі, anchor() для координат, anchor-size(width) для ширини поля та position-try-fallbacks для перевороту в доступний бік. Назва зберігається у WeakMap на час життя DOM-вузла; наявні anchor-name не стираються.
- JS передає асоціацію динамічних елементів і параметри існуючого API. Він читає підсумковий прямокутник для direction, стрілки підменю та перевірки безпечного viewport; нативні координати обчислює CSS.
- Для несумісного браузера, віртуальної точки контекстного меню, centered / окремого inlineAnchor, перекриття поля (negative gap) або якщо жодна CSS-позиція не відповідає контракту, застосовується попередній clamp/flip. Native declarations прибираються перед fallback. Нових залежностей немає.
- Tooltip, що слідує за курсором, залишається окремою поведінкою. Не змінювати його геометрію без окремого аудиту фокусу та hover. Не вводити новий popup manager або другий скін.

## Для наступних компонентів

Для простої статичної Split Button використовувати дві справжні кнопки, popovertarget та popover="auto", якщо не потрібні власний lifecycle, вкладені меню або розширена клавіатурна навігація. Для робочого Menu перевикористовувати createMenu/positionPopup; не дублювати розрахунок координат. Форма активної частини та поворот лише іконки — через :has() / :popover-open, анімація за спільними motion tokens. Split Button як окремий компонент у цьому коміті не створюється.

CSS-приклад (для статичного унікального якоря):

```css
.pg-split { anchor-name: --pg-split; }
.pg-split-popup {
  position: fixed;
  position-anchor: --pg-split;
  inset: auto;
  top: calc(anchor(bottom) + 4px);
  left: anchor(left);
  position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
}
```

Для повторюваних екземплярів потрібні унікальні назви або коректно scoped/implicit anchors. При відсутності місця з обох боків залишати доступну прокрутку і viewport clamp. Нативний Popover сам по собі не реалізує ARIA menu keyboard pattern.

## Перевірка

- Наявні unit-тести position-popup.test.js покривають резервну геометрію.
- tests/e2e/popup-position.spec.js: чинні перевірки відкриття вгору Listbox, Combobox і Menu; додані сценарії переміщення якоря без виклику JS-позиціонування та нативного перевороту вгору.
- Додатково перевіряти підменю праворуч/ліворуч, вузький viewport, прокрутку, діалоги, незалежність інстанцій, Escape і resize. npm run check та npm run test:e2e обов'язкові перед production-висновком.

## Джерела

- [CSS Anchor Positioning — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning)
- [Fallback options — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Try_options_hiding)
- [Popover API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [CSS Anchor Positioning — W3C](https://www.w3.org/TR/css-anchor-position-1/)
- [Material 3 Split buttons](https://m3.material.io/components/split-button/overview)
