# Choice controls — Checkbox, Switch, Radio Group

Status: contracts before implementation, 2026-11-08.

## Sources
- [W3C checkbox APG](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/): checkbox can be unchecked, checked or partly checked; Space toggles. Native input.indeterminate provides the partial state.
- [W3C switch APG](https://www.w3.org/WAI/ARIA/apg/patterns/switch/): switch denotes ON/OFF only; label must not change on toggle. Native checkbox with role=switch keeps Space behavior and form serialization.
- [W3C radio APG](https://www.w3.org/WAI/ARIA/apg/patterns/radio/): same-name native radios in fieldset/legend automatically provide the appropriate keyboard navigation and exclusive selection.
- These choices use regular visible labels next to the control: the floating outline is intended for editable fields, not checkboxes, switches or radio options.

## Contracts
`createCheckbox({label,showLabel?,description?,name?,value?,checked?,indeterminate?,required?,disabled?,onChange?})` returns `{element,input,getState,setChecked,setIndeterminate,focus,destroy}`; `onChange(checked)` on user action.
`createSwitch({label,description?,name?,value?,checked?,disabled?,onChange?})` returns `{element,input,getChecked,setChecked,setBusy,focus,destroy}`. An async `onChange` can reject or return false; pending disables competing input; failure rolls back and shows a local status. Programmatic setChecked has no callbacks.
`createRadioGroup({label,name?,options,value?,required?,disabled?,description?,onChange?})` returns `{element,getValue,setValue,setOptions,focus,destroy}`; options are `{value,label,disabled?,description?}`. Native fieldset/legend group; blank value means no selected radio. Do not invent a roving-tabindex layer.

## General
- Each instance owns its state and an AbortController.
- Native form semantics, keyboard, disabled, two instances, small viewport and dark mode verified in E2E.
- Errors from business saves remain feature responsibility. No global registry and no UI cross-import of sibling choice controls.

## Visual checkbox decision (2026-11-09)

The native checkbox remains the source of truth and keyboard/form control. A visually rendered rounded square morphs into a full circle when checked; the native `indeterminate` state uses a circular minus, as in the pre-existing MiniMax component references. Focus ring, error, disabled and reduced-motion states remain independent. No Brands page or global CSS imports.

## Єдина геометрія Checkbox (оновлено 2026-11-10)

Табличний checkbox є **єдиним стандартом для всіх місць** (таблиці, плитки, форми, діалоги, тестові демо). Немає `compact` / `normal` режимів і немає двох реалізацій. `src/ui/checkbox/checkbox.js` — єдина фабрика; `src/ui/checkbox/checkbox.css` — єдиний власник вигляду. `legacy/css/components/forms/checkbox.css` підтверджує 24×24px видимий квадрат, а спільний mini-розмір 32px узгоджує його з рядковими діями.

- `.pg-checkbox__hit`: завжди 32×32px із токена `--pg-compact-control-size`.
- `.pg-checkbox__box`: завжди 24×24px із токена `--pg-checkbox-box-size`. Idle — квадрат, hover/checked/mixed — коло. Focus-visible, error, disabled, reduced-motion — ті самі для всіх.
- `showLabel: true` за замовчуванням лише показує підпис/опис поруч; текст може природно збільшувати висоту **всього рядка**, але **не** 32px контролу. У таблицях/плитках `showLabel: false` візуально приховує підпис, залишаючи його доступним для `aria-labelledby`. Це вибір подання тексту, а не розміру Checkbox.
- Застосування `compact: true` скасовано. У feature CSS заборонено перевизначати геометрію `.pg-checkbox__hit`, `.pg-checkbox__box` і стани.
- Нативний input і нативне натискання Space, form value, `indeterminate`/mixed, зняття позначки головним checkbox не змінюються.

`32px` — ціль компонента; `24px` — видима частина **цього самого** checkbox, а не другий checkbox. Для форм із підписом увесь рядок додатково клікабельний завдяки нативному `label`.
