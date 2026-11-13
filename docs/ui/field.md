# Shared Field — permanent labels above controls

Approved on 2026-11-09. Supersedes the floating-label and notched-outline experiments.

## Visual and architectural contract

- Every editable field has a real, permanently visible label **above the border**, not inside or overlapping it. The label does not move, shrink or change position on hover, focus, blur or nonempty value.
- No decorative `fieldset` / `legend`, no mask/background patch, no opacity trick hiding a label. Simple `border: 1px solid ...` on `.pg-field__surface`.
- Shared `src/ui/field/field.js` generates the label, an editing surface, and optional independent leading/trailing DOM slots. It is used by Input, Select, Combobox, Tag Field, Number Field, Textarea and Listbox.
- The native input/select/textarea or accessible trigger retains a proper associated label, focus, keyboard operation, disabled and error states.
- **Current geometry (2026-11-10):** every single-line surface is **40px for a precise pointer**, using the existing `--pg-control-size`; with `(pointer: coarse)` the *same shared token* makes it **44px** for touch. The actual input/select/button stays surface height minus the two 1px borders. Multiline and token-collection surfaces may grow. Width is responsive to the parent; helper text must not stretch adjacent controls.
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

Browser tests verify accessible label names, label geometry above the surface during focus and changes, zero legends/notches, differing parent backgrounds, consistent 40px desktop / 44px coarse-pointer surfaces, dark/light, reduced-motion, responsive widths, programmatic values, token operations and selection behavior.

Prior floating/notch specifications have been retired. If floating labels are reconsidered later, they require a separate explicit design decision and no partial background hacks.

## Consistent selection field composition (2026-11-09)

The same `createFieldFrame` and `.pg-field__surface` are used by Input, Search, Number Field, Select, Combobox and Listbox. Search inside Listbox is composed from the regular `createInput({ variant: 'search' })`, not an independently styled `input`. A Listbox uses a native button to select values (particularly multiple values), so its accessible semantics differ from an editable text input, **but its outer border, label, height, hover, focus, active, disabled and error styles are identical**. The shared frame provides `setActive(true/false)` to retain the active border while keyboard focus moves into an open popup. Variants `floating` and `standard` remain as compatibility arguments; neither changes the permanent-label geometry.


## Field density study and rationale (2026-11-10)

The preceding 56px field height was an implementation choice, not a requirement to preserve. It became disproportionately tall beside the approved compact mini controls and normal checkboxes. A single shared geometry replaces those numbers, without independent `size` variants per Input, Select, Combobox, Listbox, Number Field or Tag Field.

| Control (existing work) | Before | Current / contract |
| --- | --- | --- |
| Single-line Input, Search, Select, Combobox, Listbox, Number Field | 56px | 40px desktop; 44px coarse pointer |
| Empty Tag Field, including 30px removable chips | 56px minimum | 40px desktop; 44px coarse pointer; grows as tags wrap |
| Textarea | multiline | stays multiline; no forced 40px clip |
| Checkbox (усі контексти, з підписом або без) | 44px row у старому звичайному режимі / 32px compact | один 32px hit / 24px box; підпис може збільшувати лише текстовий рядок |
| Mini-action | 32px target | unchanged |
| Shared default button (`--pg-control-size`) | 40px | unchanged |
| Legacy `.input-main`, `.custom-select-trigger` | 40px min-height | reference for the desktop density |

The shared token is `--pg-field-control-size: var(--pg-control-size)` in `src/styles/tokens.css`, switched to 44px for coarse pointers. `src/ui/field/field.css` is the **only owner** of the surface and one-line control heights. The label remains **above**, outside the border; caret remains pass-through and uses the same shared popup presentation. Local components may set their uniquely necessary *content* minimum heights (multiline, token chips) but may not restyle an ordinary field into its own 56px variant. The Listbox overflow tray aligns its first compact chip with the row via the same token.

Research sources: `legacy/css/components/forms/input.css` (`.input-main` 40px min); `legacy/css/components/forms/custom-select.css` (`.custom-select-trigger` 40px); `legacy/css/components/forms/checkbox.css` (24px glyph); [MUI Text Field sizes](https://mui.com/material-ui/react-text-field/); [Radix Themes Select sizes](https://www.radix-ui.com/themes/docs/components/select); [W3C WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) (24px AA with exceptions); [Apple accessibility control sizes](https://developer.apple.com/design/human-interface-guidelines/accessibility) (default 44×44pt iOS, 28×28pt macOS). The 40/44px geometry is **Pinguin's design choice**, not a universal requirement from these sources.

Regression checks: shared height on all six form controls; both screen sizes and pointer capabilities; permanent labels, value and keyboard interaction, Select/Combobox/Listbox caret clicks, Number Field steppers, clipboard/placeholder, disabled/errors, long text, multiple selected chips and their expansion, dark/light, reduced motion. Changing Field must never resize global Shell, table rows, buttons or checkboxes.

## Стабільність геометрії при перевірці (2026-11-13)

Підтверджено джерело стрибка: навіть для однорядкового повідомлення support отримував `hidden`, тому висота батьківського контейнера й центрованої форми змінювалась при `setError()`. Це спільна поведінка кількох типів полів, а не проблема CloudGradient.

У `src/ui/field/field.css` визначено **одну загальну геометрію** для Input (крім пошукового поля в компактному popup), Select, Combobox, Listbox, Tag Field, Number Field та Textarea. Grid завжди резервує одну лінію під status/error; якщо задано постійний опис `description`, резервуються дві лінії для опису та одночасної помилки. Під час появи/зникнення короткої помилки **label, 40/44px surface, наступні поля та кнопки не зміщуються**. Довгі або локалізовані багаторядкові повідомлення можуть збільшувати висоту, щоб текст не обрізався — це свідомий компроміс доступності.

Підтримка `hidden`, `aria-describedby`, `aria-invalid`, `role=status` та вся валідаційна JS-логіка залишається незмінною. Заборонено повторювати `grid-template-rows` в окремих demo CSS. Пошуковий Input у Listbox не має validation support і зберігає компактну геометрію.

Перевірки: `tests/e2e/field-feedback-stability.spec.js` — сім типів полів, description/no description, помилка/очищення, доступні підписи і незмінні координати. Демо `/login-demo` додатково перевіряє кнопку й успішний status без переміщення форми.

**Власність CSS:** усі компоненти з повідомленнями підтримки додають `pg-field-layout` до кореневого елемента. Лише `src/ui/field/field.css` задає цей reusable grid; жоден CSS компоненту не стилізує сторонні класи. Компактні пошукові поля не вмикають цей режим, оскільки не мають валідаційного feedback.
