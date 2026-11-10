# Form Dialog / Editor — design contract (2026-11-08)

Status: implemented shared composition; reuses native `dialog` manager and never introduces a parallel focus trap.

## Sources

- [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): focus remains inside, Escape requests cancellation, restore triggering focus; initial focus in long forms should be visible near the beginning.
- [MDN requestClose](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/requestClose): close requests are cancelable. Keep native `cancel`, do not layer a fake global Escape key handler.
- [MDN showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal): real modal and `::backdrop`, no handwritten focus trap.

## Division of responsibility

- `src/ui/dialog` owns native modal, queue, display geometry, optional DOM content, header/footer fixed with scrolling body, left optional destructive action, status, pending states, close requests.
- `src/ui/form-dialog` is an adapter over `showDialog`. It owns `validate` before `save` and dirty close protection; neither function belongs to specific feature.
- Feature owns form values, validation rules, persistence and deletion semantics; `content` is an HTMLElement created/owned by the caller.
- Confirmation callback closes only when `validate() === true` and `save() === true`. Rejections stay visible; errors keep the modal open.
- Dismissal with dirty changes calls `closeGuard({reason})`; a false result keeps the dialog open and offers an explicit 'Відкинути зміни' action. Programmatic destruction bypasses this guard to resolve pending promises.
- Never treat 'cancel' as 'saved' or report success before save resolves. Busy state blocks competing actions.
- `editor` size: at most 90vw × 90dvh, min mobile margins; header/footer fixed, only body scrolls. `standard` dialog preserves its compact baseline.
- Actions are real buttons with safe text; no injected HTML strings. Existing showDialog/Confirm behavior is backward compatible.

## Current API

`showFormDialog({title,content,validate,save,isDirty?,closeGuard?,leftAction?,confirmText?,cancelText?,confirmTone?,confirmAppearance?}) -> Promise<'confirm'|'cancel'>`.

`validate` and `save` are independent async hooks. A feature can also provide `closeGuard` for extra checks; `isDirty` protects accidental Escape/backdrop/cancel.
The optional left action receives an explicit callback. It is never inferred from form DOM.

## Tests

Old compact Dialog and Confirm unaffected; empty/invalid form cannot close; save pending blocks repeats; save failure leaves content and focus; guard stops Escape/backdrop; discard explicitly closes; cancel after clean form; overflow only body; mobile/reduced-motion/dark; cleanup after pending requests.
