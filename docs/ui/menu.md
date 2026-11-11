# Menu — actions, not value selection
Design contract · 2026-11-09. Reference: old MiniMax action/appearance example, but no Brands page or inline global selectors.

- Trigger is a native button with `aria-haspopup=menu`, expanded/controls. Popup is a `role=menu` containing native buttons with menuitem or menuitemcheckbox semantics.
- Arrow keys, Home/End and type-to-select operate on non-disabled items; Enter/Space activate; Escape restores trigger focus; outside click dismisses. Focus is managed on items, not on a text input.
- Checkable menu entries are actions with checked state; their selection is not a replacement for native Select or Switch. Destructive actions use a clearly distinct label/style, not automatic irreversible operation.
- `createMenu({label,items,disabled?,align?,onSelect?})` returns `{element,trigger,open,close,destroy}`. Item type `action`, `navigation` or `check` and `value,label,disabled,checked,danger`.
- Mount/destroy is local; floating menu has viewport-safe position with narrow mobile fallback. Do not hardcode page names.

## Вкладені дії — підменю збоку (2026-11-11)

Це **розширення існуючого `createMenu()`**, не новий компонент. Джерело візуальної поведінки — наданий власником скриншот контекстного меню ChatGPT: наведення на рядок із стрілкою відкриває сусідню панель праворуч; біля правого краю екрана підменю автоматично відкривається ліворуч, не обрізається скрол-контейнером.

API:

```js
createMenu({
  label: 'Дії',
  items: [
    { label: 'Редагувати', value: 'edit' },
    { label: 'Плагіни', items: [
      { label: 'Open Notion page', value: 'open-notion' },
    ] },
  ],
  onSelect: (value, item, event) => { /* власник виконує реальну дію */ },
});
```

- Опційна властивість `items: [...] ` на окремому пункті робить його `menuitem` із `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` та стрілкою (наявний `createIcon('chevron-right')` або еквівалентний Material Symbol). Сам пункт **не викликає `onSelect`**; викликає його лише кінцевий листок. Підтримуються кілька рівнів без нових інстанцій `Menu`.
- Mouse/pen: `pointerenter` відкриває підменю; короткий grace-period між рядком і вкладеною панеллю запобігає мерехтінню при переході через проміжок. Наведення на інший пункт закриває попереднє підменю. Touch: натискання відкриває дочірню панель. Порожні / disabled пункти не відкриваються.
- Keyboard: `Right` / `Enter` / `Space` на пункті з підменю відкривають його й фокусують перший доступний пункт; `Left` повертає до батьківського; `Escape` спершу закриває поточний підрівень, потім кореневе меню; `Up`, `Down`, `Home`, `End` діють **лише всередині поточного рівня**, `Tab` закриває весь ланцюг. Повернення фокусу кореневого меню — на trigger. Листкові check/danger/navigation зберігають поточний контракт.
- Позиціонування належить **лише** `positionPopup()`, який отримує опційне `placement: 'inline'`, із viewport clamp/flip та maxHeight. Стара вертикальна поведінка зберігається за умовчанням. Використовується той самий Popover Top Layer (`popover="manual"`), а не новий popup manager, вручну задана ширина чи залежність від Shell.
- Одна інстанція `createMenu()`: один `AbortController`, один зовнішній click / resize / scroll-dismiss життєвий цикл; усі відкриті підменю закриваються при виборі листка, закритті кореня й destroy. Стилі лише в `menu.css` із поточними border/shadow/tokens/button skin; у демо — лише приклад використання, без копій CSS.
- Не створюємо реальний Notion-конектор із тестового пункту: у `/tools` приклад тільки показує вибрану дію. Реальні інтеграції належать feature-власнику.

Критерії: open on hover, stable traversal between panels, mouse switch, touch click, keyboard hierarchy, close outside, Escape, long labels, viewport flip, nested items, independent existing row action menus, popup scrolling, cleanup. Браузерні тести потрібні перед production-висновком.

Джерела: [WAI-ARIA Menu and Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/), [Radix Dropdown Menu SubTrigger/SubContent](https://www.radix-ui.com/primitives/docs/components/dropdown-menu), [MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API).
