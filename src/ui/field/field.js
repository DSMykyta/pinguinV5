/**
 * PINGUIN NEXT — SHARED OUTLINED FIELD
 * One real label and one flexible editable area, with optional DOM slots.
 * Visual behavior lives only in field.css; the feature owns its value.
 */
function nodes(value) {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : [value];
  if (items.some(item => !(item instanceof HTMLElement))) {
    throw new TypeError('Field slots accept HTMLElements only');
  }
  return items;
}

export function createFieldFrame({
  label, control, controlId, floating = true, leading, trailing,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Field label is required');
  if (!(control instanceof HTMLElement)) throw new TypeError('Field control must be an HTMLElement');
  if (typeof controlId !== 'string' || !controlId.trim()) throw new TypeError('Field controlId is required');

  const field = document.createElement('div');
  field.className = 'pg-field' + (floating ? ' pg-field--floating' : '');
  field.dataset.pgFilled = 'false';
  const edit = document.createElement('div');
  edit.className = 'pg-field__edit';
  control.id = controlId;
  control.classList.add('pg-field__control');
  const caption = document.createElement('label');
  caption.className = 'pg-field__label';
  caption.htmlFor = controlId;
  caption.textContent = label;
  edit.append(control, caption);

  const lead = document.createElement('div');
  lead.className = 'pg-field__leading';
  const trail = document.createElement('div');
  trail.className = 'pg-field__trailing';

  function setSlot(slot, input) {
    slot.replaceChildren(...nodes(input));
    slot.hidden = slot.childElementCount === 0;
  }
  setSlot(lead, leading);
  setSlot(trail, trailing);
  field.append(lead, edit, trail);
  return Object.freeze({
    field, edit, label: caption, leadingSlot: lead, trailingSlot: trail,
    setLeading(value) { setSlot(lead, value); },
    setTrailing(value) { setSlot(trail, value); },
    setFilled(value) { field.dataset.pgFilled = String(Boolean(value)); },
    setDisabled(value) { field.dataset.pgDisabled = String(Boolean(value)); },
    setReadOnly(value) { field.dataset.pgReadonly = String(Boolean(value)); },
    setError(value) { field.dataset.pgState = value ? 'error' : 'ready'; },
  });
}
