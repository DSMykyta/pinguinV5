# Split Button — Material 3 Expressive

Дата: 2026-11-27. Реалізація на основі наданого референсу: дві частини однієї капсули; права частина при відкритті перетворюється на коло, іконка повертається на 180°. Обидві дії незалежні. Кольори Pinguin, спільна висота 40px, проміжок 2px, внутрішні кути 4px, спільні motion tokens, без нової палітри.

## API

```js
import { createSplitButton } from './src/ui/split-button/split-button.js';

const split = createSplitButton({
  label: 'Зберегти', icon: 'save', menuLabel: 'Варіанти збереження',
  items: [
    { label: 'Зберегти як', value: 'save-as', icon: 'pencil' },
    { label: 'Створити копію', value: 'copy', icon: 'layers' },
    { label: 'Експортувати', value: 'export', icon: 'external-link' },
  ],
  onAction: event => { /* основна дія власника */ },
  onSelect: (value, item, event) => { /* додаткова дія власника */ },
});
host.append(split.element);
```

- `label`, `items`, `onAction` — обов'язкові; `icon`, `menuLabel`, `onSelect` — опційні.
- `disabled`, `primaryDisabled`, `menuDisabled` — початкові незалежні стани; `setDisabled({ primaryDisabled: true })` змінює лише передані стани. Вимкнення trigger закриває меню.
- Повертає `element, primary, trigger, open, close, setDisabled, destroy`. Дії/дані належать feature. `destroy()` видаляє слухачі й Menu.
- Реальні native buttons, group label, aria-haspopup/expanded/controls, Escape/стрілки/typeahead, outside dismissal; дію в меню викликає спільний Menu.
- `anchorGroup: true` у Menu дає CSS Anchor Positioning для всього split (не тільки стрілки), з існуючим JS fallback. Не вводить другого механізму.
- Відкриття не змінює ширину чи висоту групи. Стрілка та кути анімуються; prefers-reduced-motion вимикає переходи. Меню використовує спільний surface, відмінність лише у геометрії кутів.
- Демо: /tools → Елементи → Спільні кнопки. Дії демо змінюють статус, не зберігають реальний файл.

## Перевірка

tests/e2e/split-button.spec.js: незалежні дії, зміна форми, поворот, Escape, повернення фокусу, прив'язка до всієї групи, disabled. Потрібні npm run check і npm run test:e2e перед production.

## Джерела

- [Material 3 Split button (Android Developers)](https://developer.android.com/develop/ui/compose/components/split-button)
- [Material Components SplitButton](https://github.com/material-components/material-components-android/blob/master/docs/components/SplitButton.md)
- [MDN CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning)
- [Спільний Menu](menu.md), [позиціонування](anchor-positioning.md), [motion](motion.md).
