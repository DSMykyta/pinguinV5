> **Current design decision (2026-11-09):** Tag Field has a permanent label above the plain outline; the token collection can expand. The earlier floating/notch details below are archival and superseded by [field.md](field.md).

# Tag Field — design contract (2026-11-08)

Status: specification before implementation; general UI, unrelated to Brands business logic.

## Research

- [WAI-ARIA APG keyboard patterns](https://www.w3.org/WAI/ARIA/apg/): each removable token needs an accessible name and keyboard-reachable remove action.
- [WCAG 2.2 target size](https://www.w3.org/TR/WCAG22/#target-size-minimum): touch actions need adequate hit targets (minimum 24×24 CSS px, preferably 32+).
- [WAI-ARIA status](https://www.w3.org/WAI/ARIA/apg/patterns/alert/): announce meaningful additions/removals/errors without moving input focus.
- Existing Pinguin Input is single-value text, not a collection. Tag Field owns values and its keyboard model; no coupling to Input internals.

## Model and API

`createTagField({label,values?,placeholder?,description?,disabled?,required?,maxTags?,separators?,onChange?})`
returns `{element,input,getValues(),setValues(),setError(),focus(),destroy()}`.

Each value is a normalized nonempty string; collapse edge whitespace; compare via locale-aware case-insensitive key, preserve original capitalization; deduplicate both initial and pasted input.

- Enter commits typed text unless IME composition is active.
- Paste with comma, semicolon or newline splits values; a single simple paste is left in the editing field.
- Empty input + Backspace once arms the last token; second Backspace removes it. Escape cancels the arm. ArrowLeft/Right on an empty field navigates into token removal buttons.
- Removable tokens use real buttons, not clickable spans. Delete/Backspace remove the focused token and focus its neighbor/input. One-step Ctrl/Cmd+Z restores the last removed token when input is empty.
- `maxTags` blocks additional values and reports a local error. Duplicate tokens are ignored (not stored twice).
- Each instance owns its token list; no global mutable array. Programmatic setters do not emit onChange.
- IME, form, paste, error, aria-describedby, disabled and destruction are independently tested.

No direct persistence, server validation or brand naming belongs in this UI component.
