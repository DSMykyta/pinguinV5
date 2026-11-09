> **Current design decision (2026-11-09):** Textarea has a permanent label above the border with no notch. The earlier floating/notch details below are archival and superseded by [field.md](field.md).

# Textarea — independent multiline outlined field

Status: design contract before implementation, 2026-11-08.

## Research and reasons
- Native [textarea](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/textarea) retains text editing semantics, selection, IME, form participation, undo, and keyboard support.
- User-approved [shared outlined field](field.md) defines one floating label on the top border, not a label above the component. Do not fork outline/label CSS.
- Unlike one-line input, an empty multiline field's label starts near its **top line**, not vertically centered over the whole editing area.
- The label always associates by `for` with the real textarea; placeholders supplement but never replace it. A text counter, when enabled, is visible and described without changing typed text.

## Public API
`createTextarea({label,id?,name?,value?,placeholder?,description?,error?,required?,disabled?,readOnly?,rows?,minRows?,maxRows?,autoResize?,maxLength?,showCount?,leading?,trailing?,onInput?,onChange?})`
returns `{element,textarea,getValue,setValue,setError,focus,destroy}`.

## Behavior and lifecycle
- `autoResize` clamps measured `scrollHeight` to min/max rows; shrinks after deleting text. Overflow scrolls only when max rows is reached. Native resize is allowed when autoResize=false.
- No global observers. Each instance measures on input and programmatic setValue and cleans listeners with AbortController.
- Separate description/error text with `aria-describedby`; `aria-invalid` reflects error only; native required/maxLength retained.
- The multiline component only imports `createFieldFrame` and a shared text support helper; it never knows the owning feature or form.
- Multiple instances, narrow containers, dark mode, reduced motion, IME, maxlength, focus and programmatic update require browser tests.
