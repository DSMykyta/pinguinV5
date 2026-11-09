> **Current implementation:** Listbox uses `createFieldFrame` for its trigger and composes a normal `createInput({ variant: 'search' })` for internal filtering. Its trigger visually stays active while the popup is open. It shares the 56px outer-field geometry and focus styling with Number Field and Input.

> **Current design decision (2026-11-09):** Listbox has a permanent label above its 56px trigger surface; the native-like placeholder stays visible. The earlier floating/notch details below are archival and superseded by [field.md](field.md).

# Listbox — independent single/multiple select with search
Design contract · 2026-11-09. Reference only: the uploaded MiniMax bundle's `src/ui/listbox` and its screenshots; rejected Brands feature is excluded.

- Existing native `Select` remains the default for short finite lists. `Combobox` owns editable single selection. `Listbox` owns a curated list, multi-selection, removable selection by toggling, optional filtering, and select-all of the **currently visible enabled** options. Do not combine their implementations.
- Popover opens by button, option collection has `role=listbox`; individual options use `role=option`, `aria-selected`; `aria-multiselectable` when multi. Keyboard ArrowUp/Down, Home/End, Enter/Space, Escape; disabled options are skipped. When filtering, keep a labeled search input and communicate matches.
- Trigger uses the shared 56px outlined field and permanent label above the border. Although a native button cannot be associated by `label[for]`, it explicitly gets its accessible name via `aria-labelledby` from the visible label + value.
- Selected values use stable option keys and are form-submitted through repeated hidden inputs when `name` is present.
- `createListbox({label,options,value?,multiple?,searchable?,selectAll?,name?,placeholder?,description?,error?,disabled?,onChange?})` returns `{element,trigger,getValue,setValue,setError,open,close,focus,destroy}`.
- Independently disposable per-instance listeners and observers; no global menu manager, no feature data, no Brands dependencies. Tests cover keyboard, selected chips, filtered select-all, disabled options, duplicate labels, outside click, form values and responsive height.

## Selected chips overflow (approved 2026-11-09)

References: [MUI Autocomplete limitTags](https://mui.com/material-ui/api/autocomplete/) and
[Ant Design maxTagCount/maxTagPlaceholder](https://ant.design/components/select/) support compact tags and a visible overflow summary. The disclosure button semantics follow [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).

- A compact multi-selection field displays up to 3 removable chips and a `+N` button when additional selections are hidden.
- No `+N` means hovering/focusing the field does **not** open a selection tray.
- Hovering `+N` previews the full selection. Clicking or keyboard-focusing `+N` also reveals it. Use `aria-expanded` and `aria-controls` on the actual `+N` button.
- The expanded tray **covers the original compact chip row**, rather than duplicating the visible chips underneath. It is one expanded visual surface with the same width and border, anchored over the field and growing up or down according to viewport space. The external label stays above.
- Only the expanded tray's chip buttons are visible while expanded. The compact row is visually hidden. Each selected option retains a genuine `button` labeled "Видалити …" (not a button nested inside the trigger button).
- Moving outside or scrolling the host dismisses the tray; Escape restores focus to the main trigger. A safe `Згорнути` button receives initial keyboard focus; never auto-focus a destructive `×` when opening.
- Removing selections keeps stable value keys, repeated hidden form values and `onChange`. If the count drops to 3 or fewer, the tray collapses automatically. Selecting options remains a separate action of the trigger/option popup.
- The main Listbox open state is independent of the selected-values tray. Do not mix the two `aria-expanded` values.

Native `disabled` inputs are not focusable and never receive user input (per [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled)). Disabled styling also prevents the mouse from presenting a text-insertion cursor.
