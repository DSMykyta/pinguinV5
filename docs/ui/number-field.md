# Number Field — quantities and increments, not identifiers

Status: design contract before implementation, 2026-11-08.

## Sources and decisions
- [MDN native number input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/number): built-in spinbutton, min/max/step validation, form serialization. The default step is 1; decimal fields require explicit step, e.g. 0.01.
- [W3C spinbutton](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/): step buttons are optional; ensure keyboard interaction stays native, and accessible value is preserved.
- IDs, barcodes, ZIP codes and phone numbers are text, even if they contain digits. They must not be Number Fields.
- Quantities and prices can use decimal Number Field. Locale-format display/parsing is a *separate potential component* and is not silently added here.

## Public API
`createNumberField({label,name?,value?,min?,max?,step?,unit?,leading?,trailing?,showSteppers?,required?,disabled?,readOnly?,description?,error?,onInput?,onChange?})` returns `{element,input,getValue,getRawValue,setValue,setError,focus,destroy}`.

## Behavior
- Native number input is the single source of editable value; `getValue()` returns finite number or null. Raw input is available separately.
- Optional step buttons are real buttons with accessible 'Зменшити ...'/'Збільшити ...', min/max disabled states, no redundant role=spinbutton or custom arrow key handlers.
- Native `stepUp`/`stepDown` avoid floating-point accumulation; buttons dispatch input/change only after an actual value change.
- Empty state is distinct from zero; no silent coercion to a business default. Native validity is not replaced by a fabricated parser.
- Same border-notch floating label and DOM slots as Input; all focus, error, dark theme and reduced-motion styles inherit shared field.
- No global wheel prevention, no server/persistence logic and no surprise automatic clamping of manually typed values.
