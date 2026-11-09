# Shared Field — permanent labels above controls

Approved on 2026-11-09. Supersedes the floating-label and notched-outline experiments.

## Visual and architectural contract

- Every editable field has a real, permanently visible label **above the border**, not inside or overlapping it. The label does not move, shrink or change position on hover, focus, blur or nonempty value.
- No decorative `fieldset` / `legend`, no mask/background patch, no opacity trick hiding a label. Simple `border: 1px solid ...` on `.pg-field__surface`.
- Shared `src/ui/field/field.js` generates the label, an editing surface, and optional independent leading/trailing DOM slots. It is used by Input, Select, Combobox, Tag Field, Number Field, Textarea and Listbox.
- The native input/select/textarea or accessible trigger retains a proper associated label, focus, keyboard operation, disabled and error states.
- Single-line surface height is 56px. Multiline and token collection surfaces may grow. Width is responsive to their parent; a grid neighbor's helper text must not stretch a control.
- Error uses the same red border and error-colored label; focus uses the same focus token. State belongs to the component, not the form page.
- Search Input also exposes its real label above the surface; placeholders and adornments do not replace labels.
- No global layout manager, feature imports or observers needed for a permanent label.

## DOM

```text
.pg-field
  label.pg-field__label[for=controlId]
  .pg-field__surface
    .pg-field__leading (optional DOM slot)
    .pg-field__edit
      input | select | textarea | button | token collection
    .pg-field__trailing (optional DOM slot)
```

The `frame.field` return value is the full label-and-surface block. `frame.label`, `frame.edit`, `leadingSlot`, `trailingSlot`, and setters remain available to owners. The legacy `floating` Input variant remains accepted for API compatibility but now renders the same static label.

## Verification

Browser tests verify accessible label names, label geometry above the surface during focus and changes, zero legends/notches, differing parent backgrounds, consistent 56px surfaces, dark/light, reduced-motion, responsive widths, programmatic values, token operations and selection behavior.

Prior floating/notch specifications have been retired. If floating labels are reconsidered later, they require a separate explicit design decision and no partial background hacks.
