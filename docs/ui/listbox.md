# Listbox — independent single/multiple select with search
Design contract · 2026-11-09. Reference only: the uploaded MiniMax bundle's `src/ui/listbox` and its screenshots; rejected Brands feature is excluded.

- Existing native `Select` remains the default for short finite lists. `Combobox` owns editable single selection. `Listbox` owns a curated list, multi-selection, removable selection by toggling, optional filtering, and select-all of the **currently visible enabled** options. Do not combine their implementations.
- Popover opens by button, option collection has `role=listbox`; individual options use `role=option`, `aria-selected`; `aria-multiselectable` when multi. Keyboard ArrowUp/Down, Home/End, Enter/Space, Escape; disabled options are skipped. When filtering, keep a labeled search input and communicate matches.
- Trigger uses the shared 56px outlined field and real notch. Although a native button cannot be associated by `label[for]`, it explicitly gets its accessible name via `aria-labelledby` from the visible label + value.
- Selected values use stable option keys and are form-submitted through repeated hidden inputs when `name` is present.
- `createListbox({label,options,value?,multiple?,searchable?,selectAll?,name?,placeholder?,description?,error?,disabled?,onChange?})` returns `{element,trigger,getValue,setValue,setError,open,close,focus,destroy}`.
- Independently disposable per-instance listeners and observers; no global menu manager, no feature data, no Brands dependencies. Tests cover keyboard, selected chips, filtered select-all, disabled options, duplicate labels, outside click, form values and responsive height.
