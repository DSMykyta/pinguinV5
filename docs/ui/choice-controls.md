# Choice controls — Checkbox, Switch, Radio Group

Status: contracts before implementation, 2026-11-08.

## Sources
- [W3C checkbox APG](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/): checkbox can be unchecked, checked or partly checked; Space toggles. Native input.indeterminate provides the partial state.
- [W3C switch APG](https://www.w3.org/WAI/ARIA/apg/patterns/switch/): switch denotes ON/OFF only; label must not change on toggle. Native checkbox with role=switch keeps Space behavior and form serialization.
- [W3C radio APG](https://www.w3.org/WAI/ARIA/apg/patterns/radio/): same-name native radios in fieldset/legend automatically provide the appropriate keyboard navigation and exclusive selection.
- These choices use regular visible labels next to the control: the floating outline is intended for editable fields, not checkboxes, switches or radio options.

## Contracts
`createCheckbox({label,description?,name?,value?,checked?,indeterminate?,required?,disabled?,onChange?})` returns `{element,input,getState,setChecked,setIndeterminate,focus,destroy}`; `onChange(checked)` on user action.
`createSwitch({label,description?,name?,value?,checked?,disabled?,onChange?})` returns `{element,input,getChecked,setChecked,setBusy,focus,destroy}`. An async `onChange` can reject or return false; pending disables competing input; failure rolls back and shows a local status. Programmatic setChecked has no callbacks.
`createRadioGroup({label,name?,options,value?,required?,disabled?,description?,onChange?})` returns `{element,getValue,setValue,setOptions,focus,destroy}`; options are `{value,label,disabled?,description?}`. Native fieldset/legend group; blank value means no selected radio. Do not invent a roving-tabindex layer.

## General
- Each instance owns its state and an AbortController.
- Native form semantics, keyboard, disabled, two instances, small viewport and dark mode verified in E2E.
- Errors from business saves remain feature responsibility. No global registry and no UI cross-import of sibling choice controls.
