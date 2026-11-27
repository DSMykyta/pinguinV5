# Shared Tooltip — show text hints only when clipped

The existing delegated `initTooltips()` owns all text/icon hints and converts native `title` values to its accessible tooltip presentation without introducing a second tooltip system.

**Global text rule (2026-11-10):** a string from `title`, `data-tooltip`, or `data-pg-tooltip` displays only when its owning element is actually clipped (`scrollWidth > clientWidth` or `scrollHeight > clientHeight`, with small pixel-rounding tolerance). A fully visible table name, file name, or label never displays an unnecessary tooltip. The text must be laid out within its actual available width before measuring it; `text-overflow: ellipsis` alone is not sufficient.

**Explicit exceptions (revised 2026-11-27):** only intentionally opted-in icon controls with missing contextual information use `data-pg-tooltip-always`; collapsed Sidebar uses `data-pg-tooltip-collapsed`. `createIconButton()` does not create a visual hint unless `tooltip:true` is passed. The accessible `aria-label` is always preserved. Never infer `always` from the presence of a native `title` attribute.

The shared Tooltip delegates hover/focus handling, keyboard feedback, hiding and lifecycle to one instance. It does not mutate component geometry, invent a new CSS class for hover cards, or display unrelated business-specific text.

Regression scenarios: fully visible brand/file name => no tooltip; constrained ellipsis name => delayed shared tooltip; explicit icon-only action => tooltip; collapsed sidebar => unchanged; text selection and click behavior => unchanged.


## Active native modal (2026-11-10)

Native `dialog.showModal()` **and** native Listbox/Combobox/Menu popovers are in the browser **top layer**; ordinary `z-index: 10000` cannot put a body-level tooltip above them. The same shared Tooltip therefore uses `popover="manual"` / `showPopover()` **for every hint** when the browser supports it, so the hint is promoted after the already-open popup. When a dialog is active the tooltip stays a descendant of that dialog; otherwise it is attached to `body`. It remains `pointer-events: none`, does not become an independently focusable overlay and retains the existing CSS skin. In browsers without Popover API the previous fixed-position/z-index fallback remains.

`Dialog` dispatches the lightweight DOM `pg:modal-change` notification on open and close. The Tooltip cancels pending timers and immediately removes stale hints; a background element is rejected while a modal is active. Shell ignores backdrop keyboard/pointer behavior while the native modal handles user input. Pointer hover delay is 140 ms, keyboard-focus delay 70 ms (previous legacy values were 500/250 ms); pointer-follow positioning is scheduled at most once per animation frame. These timings apply globally, not as a special workspace-only override.

Verification: tooltip inside large Workspace Dialog is visible above the modal and has `:popover-open`; the `Вибрати всі` tooltip stays visibly above the open Listbox (`:popover-open`) instead of hiding behind it; hovering the inert background produces no hint; dismissing the dialog restores ordinary Shell tooltips. Reduced-motion behavior and existing truncated-text guards are unchanged. See `tests/e2e/workspace-dialog.spec.js` and `tooltip.spec.js`.

## Усунення надлишкових підказок (2026-11-27)

Глобальний Tooltip відкидає дублікати повністю видимого тексту навіть за legacy always, disabled/inert/hidden контролі та тригери з aria-haspopup, коли aria-expanded=true. Спостерігається лише поточна ціль, щоб при відкритті popup негайно прибрати вже показану підказку. Іконковий column filter з автоматичним hover-open використовує існуючу фабрику Button з tooltip:false, зберігаючи aria-label. Підказки справді обрізаного тексту, згорнутого Sidebar та неочевидних іконкових команд залишаються. Події pg:modal-change тепер також супроводжують відкриття/закриття внутрішнього підтвердження Workspace.


## Підказки лише за потреби — 2026-11-27

Звичайні хрестики закриття діалогів, очищення полів/пошуку, іконка видимості пароля, прості шеврони розгортання редактора та його навігації не потребують Tooltip. За замовчуванням `createIconButton({tooltip:false})`; `aria-label` не видаляється. Явно залишено контекстні іконки Shell, поточну тему, закріплення панелі, масовий вибір, пояснення `i`, команди форматування з гарячими клавішами або неочевидними символами, окремі операції збереження/видалення/оновлення запису та обрізаний текст. Підказки сегментів — тільки за обрізанням, без native title. Демо-дії з конкретним призначенням можуть явно підключати підказку. Новий icon button не повинен автоматично створювати її.
