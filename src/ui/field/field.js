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
  // This is a real interruption in the border, not an opaque label patch.
  const outline = document.createElement('fieldset');
  outline.className = 'pg-field__outline';
  outline.setAttribute('aria-hidden', 'true');
  const notch = document.createElement('legend');
  notch.className = 'pg-field__notch';
  const notchText = document.createElement('span');
  notchText.textContent = label;
  notch.append(notchText);
  outline.append(notch);
  field.append(outline, lead, edit, trail);

  // The text cutout sizes itself in CSS. Only the optional prefix width is measured.
  function syncLeadWidth() {
    if (lead.hidden) field.style.removeProperty('--pg-field-leading-size');
    else field.style.setProperty('--pg-field-leading-size', lead.getBoundingClientRect().width + 'px');
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(syncLeadWidth) : null;
  if (!lead.hidden) observer?.observe(lead);
  syncLeadWidth();
  return Object.freeze({
    field, edit, label: caption, leadingSlot: lead, trailingSlot: trail,
    setLeading(value) { setSlot(lead, value); observer?.disconnect(); if (!lead.hidden) observer?.observe(lead); syncLeadWidth(); },
    setTrailing(value) { setSlot(trail, value); },
    setFilled(value) { field.dataset.pgFilled = String(Boolean(value)); },
    setDisabled(value) { field.dataset.pgDisabled = String(Boolean(value)); },
    setReadOnly(value) { field.dataset.pgReadonly = String(Boolean(value)); },
    setError(value) { field.dataset.pgState = value ? 'error' : 'ready'; },
    destroy() { observer?.disconnect(); },
  });
}
