# Shared outlined field — architecture and visual behavior

Approved 2026-11-08. Implements the user's specified label on the upper stroke of the outline.

## Rationale and external references

- Material Design outlined text input and outlined select use the same floating-label/notch pattern:
  https://github.com/material-components/material-web/blob/main/docs/components/select.md
  https://github.com/material-components/material-components-web/blob/master/packages/mdc-textfield/README.md
- Adobe Spectrum requires a real associated label; never rely on placeholder alone:
  https://opensource.adobe.com/spectrum-web-components/components/field-label/
- The prefix/suffix must not break label alignment. Keep an edit-area wrapper between flexible leading/trailing slots; preserve the outline across the entire control.

## One outline — many controls

`createFieldFrame({label,control,controlId,leading?,trailing?,floating?})` produces a reusable:
```text
.pg-field.pg-field--floating
  .pg-field__leading (optional independent DOM slot)
  .pg-field__edit
    input | select | textarea | other control
    label[for=controlId].pg-field__label
  .pg-field__trailing (optional independent DOM slot)
```

Only `src/ui/field/field.css` owns common outline, focus, label geometry and transition. Per-component CSS owns only unique details, such as tag chips, select caret and combobox listbox.
`setFilled(boolean)` updates `data-pg-filled`, and all owners synchronize on input/change/selection and programmatic setters.

### Geometry
- Floating field outline: 56 CSS px minimum height, 10px radius, 14px inner inline text padding.
- Idle empty: label visually inside; active or filled: small label is centered exactly over the top border with an opaque surface background to produce a legible notch.
- No label truncation when the field is narrow: ellipsis allowed in resting state; tooltip/full text may be supplied separately if needed.
- Affixes are DOM slots and may be icons, text, units or buttons; label follows the available editable area, not the outer field's fixed left edge.
- Invalid/disabled/read-only and hover states use the same tokens regardless of input type.
- Search input is an explicit exception: an accessible visually hidden label with search icon, not floating.
- Standard input is an explicit exception: an above-field permanent label when complex forms require it.

### Test contract
Compare the *actual bounding boxes* of Input/Select/Combobox/Tag labels before and after focus/value, including adornments, dark theme and mobile width. Focused label center must coincide with field's top border (tolerance <=3 CSS px). No duplicate visible label/placeholder at idle. Test programmatic setValue/setOptions, disabled variants and composability with leading/trailing controls.

## Notched outline and fixed one-line geometry (2026-11-09)

A true decorative `fieldset` + `legend` interrupts the outline physically. The only visible text is the actual associated `label`; the legend text is CSS-generated from `data-pg-label` (hidden from assistive technology). **No label background color, masking patch or translucent rectangle** is used. This works over mixed card/page/gradient surfaces. It follows the [Material UI outlined input notch principle](https://mui.com/material-ui/migration/v5-component-changes/#replace-labelwidth-prop).

`Input`, native `Select`, editable `Combobox` and `Number Field` have a 56px one-line outline. Textarea and Tag Field can grow. The controls are aligned to the top of grid cells rather than stretching to a neighbor's helper text. The notch accounts for optional leading accessories using a local `ResizeObserver`; frame `destroy()` must be called when the owner component is destroyed. Regression tests check the notch and equal heights.
