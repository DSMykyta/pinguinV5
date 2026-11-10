/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED FIELD FRAME                                                                   ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Permanent label above a plain border; independent leading/trailing slots.              ║
 * ║ ЗАЛЕЖНОСТІ: ../icon/icon.js і стандартні DOM API.                                     ║
 * ║ ПУБЛІЧНИЙ API: createFieldFrame()                                                                   ║
 * ║ ПРИНЦИП: No notch, floating animation, background masking, or DOM observers.                        ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

function slotNodes(value) {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : [value];
  // Shared Google Material Symbols are SVGElements, not HTMLElements.
  if (items.some(item => !(item instanceof HTMLElement || item instanceof SVGElement))) {
    throw new TypeError('Field slots accept HTML or SVG elements only');
  }
  return items;
}

export function createFieldFrame({ label, control, controlId, leading, trailing } = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Field label is required');
  if (!(control instanceof HTMLElement)) throw new TypeError('Field control must be an HTMLElement');
  if (typeof controlId !== 'string' || !controlId.trim()) throw new TypeError('Field controlId is required');

  const field = document.createElement('div');
  field.className = 'pg-field';
  field.dataset.pgFilled = 'false';

  const caption = document.createElement('label');
  caption.className = 'pg-field__label';
  caption.htmlFor = controlId;
  caption.textContent = label;

  const surface = document.createElement('div');
  surface.className = 'pg-field__surface';
  const edit = document.createElement('div');
  edit.className = 'pg-field__edit';
  control.id = controlId;
  control.classList.add('pg-field__control');
  edit.append(control);
  const lead = document.createElement('div');
  lead.className = 'pg-field__leading';
  const trail = document.createElement('div');
  trail.className = 'pg-field__trailing';

  function setSlot(slot, value) {
    // The literal 'caret' is a shared decorative dropdown accessory.
    // Unlike an interactive trailing button it must never capture clicks.
    const decorative = slot === trail && value === 'caret';
    const contents = decorative ? [createIcon('expand-more')] : slotNodes(value);
    if (decorative) {
      contents[0].classList.add('pg-field__caret');
      contents[0].setAttribute('aria-hidden', 'true');
    }
    slot.classList.toggle('pg-field__trailing--decorative', decorative);
    slot.replaceChildren(...contents);
    slot.hidden = slot.childElementCount === 0;
  }
  setSlot(lead, leading);
  setSlot(trail, trailing);
  surface.append(lead, edit, trail);
  field.append(caption, surface);

  return Object.freeze({
    field, surface, edit, label: caption, leadingSlot: lead, trailingSlot: trail,
    setLeading(value) { setSlot(lead, value); },
    setTrailing(value) { setSlot(trail, value); },
    setFilled(value) { field.dataset.pgFilled = String(Boolean(value)); },
    setActive(value) { field.dataset.pgActive = String(Boolean(value)); },
    setDisabled(value) { field.dataset.pgDisabled = String(Boolean(value)); },
    setReadOnly(value) { field.dataset.pgReadonly = String(Boolean(value)); },
    setError(value) { field.dataset.pgState = value ? 'error' : 'ready'; },
    destroy() {},
  });
}
