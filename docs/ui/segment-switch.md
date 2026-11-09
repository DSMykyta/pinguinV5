# Segmented switch — native radio group with moving selection plate

Implemented 2026-11-09 as the common replacement for two unrelated toggle buttons.

`createSegmentSwitch({label,options,value,variant,compact,fit,disabled,onChange})`
provides 2–6 options, a native `radiogroup` with checked radios, keyboard arrows
via the browser, and an animated selected plate behind the active option.

- `filled`: quiet material plate; `outline`: outlined body for denser contexts.
- `compact`: reduced height/padding; `fit`: natural width. These are combinations
  of one component, not separate implementations or inheritance classes.
- `iconOnly` is allowed per item; the native radio receives its accessible name
  explicitly. `createViewSwitch` only maps the two collection modes to this shared component.
- The underlying boolean `Switch` (single setting on/off), `Checkbox`
  (independent multiselection) and `Segmented switch` (one-of-N) remain distinct
  semantic components. Styling consistency must not erase semantics.
- A `prefers-reduced-motion` preference removes transitions. The entire control
  is independent of storage; page-level `createStoredChoice` persists the value.
- The Shell and Tabs do not know which mode is selected, and no workspace
  fill/flush mode exists.

Reference: inspected legacy forms Switch/Toggle styling and lifecycle.
Improvements: native radio semantics, ARIA labels, local lifecycle, one
transforming plate, shared semantic tokens, no global listeners.
