> **Current design decision (2026-11-09):** Select and Combobox have static labels above their plain 56px surface. The earlier floating/notch details below are archival and superseded by [field.md](field.md).

# Selection fields — design contract (2026-11-08)

Status: specification before implementation. Scope: `src/ui/select`, `src/ui/combobox`; never import a feature from shared UI.

## Clickable Select caret (fix 2026-11-10)

`createSelect()` remains a **native HTML `<select>`**; do not replace it with a custom popup, custom event bus, or a duplicate component. Its entire 56px outlined surface, including the visible trailing chevron, must be one pointer target for the select. The chevron is decorative (`aria-hidden`) and must not intercept clicks; the shared trailing slot must not reserve a separate interactive strip. Keep padding for the selected text so it cannot overlap the chevron.

**Implementation:** only in `src/ui/select/select.css`, position the Select-specific trailing adornment over the right edge with `pointer-events: none`, let the native select fill the editing width, and preserve its keyboard, disabled, selected value, label, validation, and mobile picker semantics. Do **not** change `createFieldFrame` globally: other trailing slots may contain interactive buttons. The actual target must be verified by a real pointer click at the chevron's center on desktop and narrow screens (including dark theme); a browser E2E test must also confirm keyboard use and disabled behavior.

## Research and decisions

- [HTML select (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select): native select provides keyboard, form and mobile-platform behavior. For finite known choices, use native `<select>` as the progressive baseline, not a fabricated menu.
- [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/): an **editable** combobox is a separate component. Input retains DOM focus; `role=combobox`, `aria-controls`, `aria-expanded`, `aria-autocomplete=list`, `aria-activedescendant` track the suggestion popup. ArrowDown/ArrowUp navigate, Enter accepts, Escape dismisses without committing.
- [W3C Editable Combobox Example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/): ensure the active option scrolls into view. The popup stays out of the Tab order.
- [Popover API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API): useful for future floating content, but it does **not** supply listbox semantics or arrow-key navigation.

## API

`createSelect({label, options, value?, placeholder?, required?, disabled?, description?, error?, onChange?})`
- `options: [{value,label,disabled?} | {label,options:[...]}]`; explicit stable values.
- Return `{element,select,getValue(),setValue(),setOptions(),setError(),focus(),destroy()}`.
- Native changes fire `onChange(value, event)`. Programmatic changes do not fire callbacks.
- Placeholder is a disabled empty option. Unavailable value resolves to empty (or first enabled option if no placeholder). Error uses `aria-invalid` and `aria-describedby`.

`createCombobox({label,options?,loadOptions?,value?,required?,disabled?,placeholder?,description?,onChange?})`
- Local options: `[{value,label,disabled?}]`; `loadOptions(query,{signal})` returns same array asynchronously.
- Selection is restricted to an option value. Typing filters only, never silently commits.
- Return `{element,input,getValue(),setValue(),setOptions(),setError(),focus(),destroy()}`.
- The popup lives beside the field in component DOM; positioning is scoped to the component, not the Shell; long lists scroll within max height.
- Abort obsolete async work and reject stale results by request generation, including after destroy. Loading/empty/error statuses are visible and accessible.
- Pointer selection must retain the correct option despite blur. IME composition never confirms a choice.
- Explicit cleanup of listeners, pending requests and DOM. No global managers and no feature dependencies.

## Non-goals / safeguards

Do not replace native Select for short finite lists. Do not make a single universal Select+Search+Multi+Tags component. Multi-selection belongs to a later separately researched contract. Never deduce a stored value from translated display text. Do not assume CSS Popover support solves accessibility.

## Verification

Keyboard and pointer selection, Escape preservation, disabled values, duplicate labels with different values, empty results, async races/unmount, input composition, light/dark/reduced motion, narrow containers, two independent instances and native form data.

## Unified outlined floating-label shell (approved 2026-11-08)

All Select, Input, Combobox, and complex future inputs share `src/ui/field`.
- Empty and idle: a real label rests **inside** the outlined field.
- Focus or nonempty value: it scales down and moves to the **top outline itself**, with a background-colored notch under the label; it must never simply hover above the field.
- Label retains `for` association and stays readable while filled. The border notch is visual only, never replaces the DOM label.
- Leading and trailing slots are true flexible-width DOM slots. Text/labels align within the **editing portion**, independent of icon, unit, suffix, password toggle, clear button, spinner, or future actions.
- All variants share a 56px floating outline, consistent radius, state colors and transitions from tokens; additional local CSS may control only unique behavior. Standard and search input retain their deliberately different label modes.
- Complex inputs can place multiple DOM nodes into their slots. Accessory actions remain keyboard accessible; interaction never changes field value unless the owner explicitly handles it.
- Select remains native for its options and keyboard. Placeholder should not visually collide with the resting label.
- Label follows `prefers-reduced-motion`, supports narrow containers, long labels, light/dark themes and user zoom.
