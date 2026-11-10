# Shared Tooltip — show text hints only when clipped

The existing delegated `initTooltips()` owns all text/icon hints and converts native `title` values to its accessible tooltip presentation without introducing a second tooltip system.

**Global text rule (2026-11-10):** a string from `title`, `data-tooltip`, or `data-pg-tooltip` displays only when its owning element is actually clipped (`scrollWidth > clientWidth` or `scrollHeight > clientHeight`, with small pixel-rounding tolerance). A fully visible table name, file name, or label never displays an unnecessary tooltip. The text must be laid out within its actual available width before measuring it; `text-overflow: ellipsis` alone is not sufficient.

**Explicit exceptions:** icon-only controls (their label is not otherwise displayed) use the existing `data-pg-tooltip-always` attribute; collapsed Sidebar uses its existing `data-pg-tooltip-collapsed`. These continue to appear even when the hit target itself is not clipped. Never infer `always` from the presence of a native `title` attribute.

The shared Tooltip delegates hover/focus handling, keyboard feedback, hiding and lifecycle to one instance. It does not mutate component geometry, invent a new CSS class for hover cards, or display unrelated business-specific text.

Regression scenarios: fully visible brand/file name => no tooltip; constrained ellipsis name => delayed shared tooltip; explicit icon-only action => tooltip; collapsed sidebar => unchanged; text selection and click behavior => unchanged.


## Active native modal (2026-11-10)

Native `dialog.showModal()` sits in the browser **top layer**; ordinary `z-index: 10000` does not place a body-level tooltip above it. The **same** shared Tooltip now detects `dialog:modal`, inserts the tooltip as its descendant and promotes it with `popover="manual"` / `showPopover()` into the top layer. It remains `pointer-events: none` and does not become an independently focusable overlay. No separate modal tooltip implementation or copy of its visual skin exists.

`Dialog` dispatches the lightweight DOM `pg:modal-change` notification on open and close. The Tooltip cancels pending timers and immediately removes stale hints; a background element is rejected while a modal is active. Shell ignores backdrop keyboard/pointer behavior while the native modal handles user input. Pointer hover delay is 140 ms, keyboard-focus delay 70 ms (previous legacy values were 500/250 ms); pointer-follow positioning is scheduled at most once per animation frame. These timings apply globally, not as a special workspace-only override.

Verification: tooltip inside large Workspace Dialog is visible above the modal and has `:popover-open`; hovering the inert background produces no hint; dismissing the dialog restores ordinary Shell tooltips. Reduced-motion behavior and existing truncated-text guards are unchanged. See `tests/e2e/workspace-dialog.spec.js` and `tooltip.spec.js`.
