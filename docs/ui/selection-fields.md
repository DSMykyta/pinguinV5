# Selection fields — design contract (2026-11-08)

Status: specification before implementation. Scope: `src/ui/select`, `src/ui/combobox`; never import a feature from shared UI.

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
