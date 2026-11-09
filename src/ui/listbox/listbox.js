/**
 * PINGUIN NEXT — LISTBOX (single or multiple)
 * Separate from native Select and editable Combobox; no feature ownership.
 */
import { createFieldFrame } from '../field/field.js';
import { createInput } from '../input/input.js';
import { positionPopup } from '../position/position-popup.js';
import { dismissOnOutsideScroll } from '../position/dismiss-on-scroll.js';
import { ensureOptionVisible } from '../position/ensure-option-visible.js';

let sequence = 0;
const normalized = text => String(text ?? '').toLocaleLowerCase('uk').trim();
function parseOptions(items) {
  if (!Array.isArray(items)) throw new TypeError('Listbox options must be an array');
  const seen = new Set();
  return items.map(item => {
    if (!item || typeof item.label !== 'string' || !['string','number'].includes(typeof item.value)) {
      throw new TypeError('Listbox options require label and value');
    }
    const value = String(item.value);
    if (seen.has(value)) throw new TypeError('Listbox option values must be unique');
    seen.add(value);
    return { value, label: item.label, disabled: Boolean(item.disabled) };
  });
}

export function createListbox({
  label, id, name, options = [], value = [], multiple = false, searchable = false,
  selectAll = false, placeholder = 'Оберіть значення',
  description = '', error = '', disabled = false, required = false, onChange,
} = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Listbox label is required');
  const uid = id || 'pg-listbox-' + (++sequence);
  const element = document.createElement('div');
  element.className = 'pg-listbox';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'pg-listbox__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', uid + '-options');
  trigger.disabled = Boolean(disabled);
  if (required) trigger.setAttribute('aria-required', 'true');
  const display = document.createElement('span');
  display.className = 'pg-listbox__value';
  display.id = uid + '-value';
  trigger.append(display);
  const caret = document.createElement('span');
  caret.className = 'pg-listbox__caret';
  caret.setAttribute('aria-hidden','true');
  const frame = createFieldFrame({label,control:trigger,controlId:uid,trailing:caret});
  frame.field.classList.add('pg-listbox__field');
  frame.label.id = uid + '-label';
  trigger.setAttribute('aria-labelledby', frame.label.id + ' ' + display.id);
  frame.setDisabled(disabled);
  // Removable chips must be sibling buttons, NEVER nested in the trigger button.
  const selectionText = document.createElement('span');
  selectionText.id = uid + '-selection-text';
  selectionText.className = 'pg-listbox__sr';
  if (multiple) {
    frame.field.classList.add('pg-listbox__field--multi');
    frame.edit.append(display);
    display.classList.add('pg-listbox__value--interactive');
    trigger.setAttribute('aria-labelledby', frame.label.id + ' ' + selectionText.id);
    frame.field.append(selectionText);
  }

  const panel = document.createElement('div');
  panel.className = 'pg-listbox__panel pg-scrollbar';
  panel.hidden = true;
  const hasPopover = typeof panel.showPopover === 'function';
  if (hasPopover) panel.setAttribute('popover', 'manual');
  // Compose the existing Input instead of inventing another styled input.
  // Only Listbox owns searching/filtering; the Input owns border, focus and label.
  const searchField = searchable ? createInput({
    label: 'Пошук', id: uid + '-search', variant: 'search',
    placeholder: 'Пошук…', autocomplete: 'off', clearable: false,
    onInput: query => filter(query),
  }) : null;
  const search = searchField?.input ?? document.createElement('input');
  if (searchField) {
    searchField.element.classList.add('pg-listbox__search-field');
    search.classList.add('pg-listbox__search');
    search.setAttribute('aria-label', 'Пошук у списку ' + label);
    search.setAttribute('role', 'combobox');
    search.setAttribute('aria-autocomplete', 'list');
    search.setAttribute('aria-controls', uid + '-options');
    search.setAttribute('aria-expanded', 'true');
    panel.append(searchField.element);
  }
  const all = document.createElement('button');
  all.className = 'pg-listbox__select-all';
  all.type = 'button';
  if (multiple && selectAll) panel.append(all);
  const list = document.createElement('ul');
  list.className = 'pg-listbox__options pg-scrollbar';
  list.id = uid + '-options';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-labelledby', frame.label.id);
  list.tabIndex = -1;
  if (multiple) list.setAttribute('aria-multiselectable','true');
  const empty = document.createElement('li');
  empty.className = 'pg-listbox__empty';
  empty.setAttribute('role','presentation');
  empty.textContent = 'Нічого не знайдено';
  empty.hidden = true;
  panel.append(list);
  const holder = document.createElement('div');
  holder.hidden = true;
  const support = document.createElement('div');
  support.className = 'pg-listbox__support';
  const hint = document.createElement('span');
  hint.id = uid + '-description';
  hint.textContent = String(description || '');
  hint.hidden = !hint.textContent;
  const problem = document.createElement('span');
  problem.id = uid + '-error';
  problem.className = 'pg-listbox__error';
  problem.setAttribute('role','status');
  problem.hidden = true;
  support.append(hint,problem);

  // Visually one expanding field: selected values are an attached, seamless
  // continuation of its border, placed above/below when the pointer hovers.
  const tray = document.createElement('section');
  tray.id = uid + '-selection-tray';
  tray.className = 'pg-listbox__selection-tray pg-scrollbar';
  tray.setAttribute('role', 'group');
  tray.setAttribute('aria-label', 'Усі вибрані значення: ' + label);
  tray.hidden = true;
  const trayPopover = typeof tray.showPopover === 'function';
  if (trayPopover) tray.setAttribute('popover', 'manual');
  const trayClose = document.createElement('button');
  trayClose.type = 'button';
  trayClose.className = 'pg-listbox__selection-close';
  trayClose.textContent = 'Згорнути';
  trayClose.setAttribute('aria-label', 'Згорнути вибрані значення');
  const trayHeading = document.createElement('span');
  trayHeading.className = 'pg-listbox__selection-heading';
  const trayChips = document.createElement('div');
  trayChips.className = 'pg-listbox__selection-chips';
  tray.append(trayHeading, trayClose, trayChips);
  element.append(frame.field,holder,panel,tray,support);
  const controller = new AbortController();
  let items = [];
  let optionsDOM = [];
  let selected = new Set();
  let active = -1;
  let opened = false;
  let trayOpened = false;
  let destroyed = false;

  function visibleIndices() {
    return items.map((item,i) => !item.disabled && !optionsDOM[i].hidden ? i : -1).filter(i=>i>=0);
  }
  function selection() { return items.filter(item=>selected.has(item.value)).map(item=>item.value); }
  function makeChip(item, inTray = false) {
    const chip = document.createElement('span');
    chip.className = inTray ? 'pg-listbox__selected-chip' : 'pg-listbox__chip';
    const text = document.createElement('span');
    text.className = 'pg-listbox__chip-text';
    text.textContent = item.label;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'pg-listbox__chip-remove';
    remove.dataset.pgRemove = item.value;
    // A drawn cross has a geometric center; the text glyph × sits low in some fonts.
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 16 16');
    icon.setAttribute('aria-hidden', 'true');
    const strokes = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    strokes.setAttribute('d', 'M4 4l8 8M12 4l-8 8');
    strokes.setAttribute('fill', 'none');
    strokes.setAttribute('stroke', 'currentColor');
    strokes.setAttribute('stroke-width', '1.7');
    strokes.setAttribute('stroke-linecap', 'round');
    icon.append(strokes);
    remove.append(icon);
    remove.setAttribute('aria-label', 'Видалити ' + item.label);
    remove.disabled = Boolean(disabled);
    chip.append(text, remove);
    return chip;
  }
  function updateValue() {
    display.replaceChildren();
    holder.replaceChildren();
    trayChips.replaceChildren();
    const chosen = items.filter(item => selected.has(item.value));
    selectionText.textContent = chosen.length
      ? chosen.map(item => item.label).join(', ') : String(placeholder);
    trayHeading.textContent = 'Вибрані (' + chosen.length + ')';
    if (!chosen.length) {
      display.classList.add('pg-listbox__value--placeholder');
      display.textContent = String(placeholder);
    } else {
      display.classList.remove('pg-listbox__value--placeholder');
      if (multiple) {
        chosen.slice(0, 3).forEach(item => display.append(makeChip(item)));
        if (chosen.length > 3) {
          const more = document.createElement('button');
          more.type = 'button';
          more.className = 'pg-listbox__chip pg-listbox__more';
          more.textContent = '+' + (chosen.length - 3);
          more.disabled = Boolean(disabled);
          more.setAttribute('aria-label', 'Показати всі вибрані значення');
          more.setAttribute('aria-controls', tray.id);
          more.setAttribute('aria-expanded', String(trayOpened));
          more.dataset.pgShowSelected = 'true';
          display.append(more);
        }
        chosen.forEach(item => trayChips.append(makeChip(item, true)));
      } else display.textContent = chosen[0].label;
    }
    if (name !== undefined) selection().forEach(val => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = String(name);
      input.value = val;
      input.disabled = Boolean(disabled);
      holder.append(input);
    });
    frame.setFilled(chosen.length > 0);
    const hasHidden = multiple && chosen.length > 3;
    element.dataset.pgHasOverflow = String(hasHidden);
    if (!hasHidden && trayOpened) hideTray();
    else if (trayOpened) positionTray();
  }
  function removeSelected(value, event, fromTray) {
    if (disabled || !selected.has(value)) return;
    const buttons = Array.from(
      (fromTray ? trayChips : display).querySelectorAll('.pg-listbox__chip-remove')
    );
    const oldIndex = buttons.findIndex(button => button.dataset.pgRemove === value);
    selected.delete(value);
    reflect();
    onChange?.(selection(), event);
    // Keep keyboard focus in the selected-values controls after a chip is removed.
    if (event.detail === 0 || event.type === 'keydown') {
      const remaining = Array.from(
        (fromTray ? trayChips : display).querySelectorAll('.pg-listbox__chip-remove')
      );
      const target = remaining[Math.min(Math.max(0, oldIndex), remaining.length - 1)];
      const next = trayOpened ? target : display.querySelector('.pg-listbox__chip-remove');
      (next || trigger).focus({ preventScroll: true });
    }
  }
  function onChipClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.pgRemove !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      removeSelected(button.dataset.pgRemove, event, tray.contains(button));
    } else if (button.dataset.pgShowSelected === 'true') {
      event.preventDefault();
      event.stopPropagation();
      showTray(true);
    }
  }
  function reflect() {
    optionsDOM.forEach((node,i)=>node.setAttribute('aria-selected',String(selected.has(items[i].value))));
    if (multiple && selectAll) {
      const shown=visibleIndices();
      const fully=shown.length>0 && shown.every(i=>selected.has(items[i].value));
      all.textContent=fully?'Зняти всі':'Вибрати всі';
      all.disabled=shown.length===0;
    }
    updateValue();
  }
  function setError(message='') {
    problem.textContent=String(message||'');
    problem.hidden=!problem.textContent;
    const ids=[!hint.hidden&&hint.id,!problem.hidden&&problem.id].filter(Boolean);
    if(ids.length)trigger.setAttribute('aria-describedby',ids.join(' '));
    else trigger.removeAttribute('aria-describedby');
    if(problem.hidden)trigger.removeAttribute('aria-invalid');
    else trigger.setAttribute('aria-invalid','true');
    support.hidden=ids.length===0;
    element.dataset.pgState=problem.hidden?(disabled?'disabled':'ready'):'error';
    frame.setError(!problem.hidden);
  }
  function activate(index) {
    if(active>=0) optionsDOM[active]?.classList.remove('pg-listbox__option--active');
    active=index;
    const node=optionsDOM[index];
    if(node) {
      node.classList.add('pg-listbox__option--active');
      list.setAttribute('aria-activedescendant',node.id);
      search.setAttribute('aria-activedescendant',node.id);
      ensureOptionVisible(panel, node);
    } else {
      list.removeAttribute('aria-activedescendant');
      search.removeAttribute('aria-activedescendant');
    }
  }
  function filter(query='') {
    const q=normalized(query);
    optionsDOM.forEach((node,i)=>{node.hidden=!!q && !normalized(items[i].label).includes(q);});
    const indices=visibleIndices();
    empty.hidden=optionsDOM.some(node=>!node.hidden);
    if(indices.length===0)list.replaceChildren(...optionsDOM,empty);
    activate(indices.includes(active)?active:(indices[0]??-1));
    reflect();
    // An open upward popup changes height when filtering: re-anchor immediately.
    if (opened) position();
  }
  function setValue(next) {
    const values=Array.isArray(next)?next:[next];
    const candidates=new Set(values.map(val=>String(val??'')));
    selected=new Set();
    for(const item of items) {
      if(candidates.has(item.value)&&!item.disabled) {
        selected.add(item.value);
        if(!multiple)break;
      }
    }
    reflect();
  }
  function setOptions(next) {
    const previous=selection();
    items=parseOptions(next);
    optionsDOM=[];
    list.replaceChildren();
    items.forEach((item,index)=>{
      const node=document.createElement('li');
      node.className='pg-listbox__option';
      node.id=uid+'-option-'+index;
      node.setAttribute('role','option');
      node.setAttribute('aria-selected','false');
      if(item.disabled)node.setAttribute('aria-disabled','true');
      node.textContent=item.label;
      optionsDOM.push(node);
      list.append(node);
    });
    list.append(empty);
    selected=new Set();
    setValue(previous);
    filter(searchable?search.value:'');
  }
  function choose(index,event) {
    const item=items[index];
    if(!item||item.disabled)return;
    if(multiple) {
      if(selected.has(item.value))selected.delete(item.value);
      else selected.add(item.value);
    } else selected=new Set([item.value]);
    reflect();
    onChange?.(selection(),event);
    if(!multiple)close(true);
  }
  function position() {
    if (!opened || !hasPopover) return;
    positionPopup({ anchor: frame.surface, popup: panel, maxHeight: 320 });
  }
  function positionTray() {
    if (!trayOpened) return;
    if (trayPopover) {
      const geometry = positionPopup({
        anchor: frame.surface, popup: tray, maxHeight: 240,
        // The expanded surface overlaps the compact row instead of duplicating it.
        gap: -frame.surface.getBoundingClientRect().height,
      });
      element.dataset.pgTraySide = geometry.direction;
      tray.dataset.pgSide = geometry.direction;
    } else {
      const rect = frame.surface.getBoundingClientRect();
      const above = rect.top;
      const below = innerHeight - rect.bottom;
      const up = below < 190 && above > below;
      element.dataset.pgTraySide = up ? 'up' : 'down';
      tray.dataset.pgSide = up ? 'up' : 'down';
    }
  }
  function showTray(autofocus = false) {
    if (!multiple || disabled || destroyed || opened ||
        trayOpened || selected.size <= 3) return;
    trayOpened = true;
    tray.hidden = false;
    element.dataset.pgTray = 'true';
    frame.setActive(true);
    if (trayPopover) tray.showPopover();
    positionTray();
    display.querySelector('[data-pg-show-selected]')?.setAttribute('aria-expanded', 'true');
    if (autofocus) trayChips.querySelector('.pg-listbox__chip-remove')?.focus({ preventScroll: true });
    trayScrollDismiss.arm();
  }
  function hideTray(restore = false) {
    if (!trayOpened) return;
    trayOpened = false;
    trayScrollDismiss.disarm();
    if (trayPopover && tray.matches(':popover-open')) tray.hidePopover();
    tray.hidden = true;
    delete element.dataset.pgTray;
    delete element.dataset.pgTraySide;
    display.querySelector('[data-pg-show-selected]')?.setAttribute('aria-expanded', 'false');
    tray.removeAttribute('data-pg-side');
    frame.setActive(opened);
    if (restore) trigger.focus({ preventScroll: true });
  }
  function open() {
    if(opened||destroyed||trigger.disabled)return;
    hideTray();
    opened=true;
    panel.hidden=false;
    trigger.setAttribute('aria-expanded','true');
    element.dataset.pgOpen='true';
    frame.setActive(true);
    if(hasPopover)panel.showPopover();
    searchField?.setValue('');
    filter('');
    position();
    (searchable?search:list).focus({ preventScroll: true });
    scrollDismiss.arm();
  }
  function close(restore=false) {
    if(!opened)return;
    opened=false;
    scrollDismiss.disarm();
    if(hasPopover && panel.matches(':popover-open'))panel.hidePopover();
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    element.dataset.pgOpen='false';
    frame.setActive(false);
    activate(-1);
    if(restore)trigger.focus({ preventScroll: true });
  }
  function move(direction) {
    const indices=visibleIndices();
    if(!indices.length)return;
    const position=indices.indexOf(active);
    const next=direction>0?indices[(position+1)%indices.length]
      :indices[(position<=0?indices.length:position)-1];
    activate(next);
  }
  function keyboard(event) {
    const key=event.key;
    if(key==='Escape') {event.preventDefault();close(true);}
    else if(key==='ArrowDown'||key==='ArrowUp') {event.preventDefault();move(key==='ArrowDown'?1:-1);}
    else if(key==='Home'||key==='End') {event.preventDefault();const idx=visibleIndices();activate(key==='Home'?(idx[0]??-1):(idx[idx.length-1]??-1));}
    else if((key==='Enter'||key===' ')&&active>=0) {event.preventDefault();choose(active,event);}
  }
  trigger.addEventListener('click',()=>opened?close(true):open(),{signal:controller.signal});
  display.addEventListener('click', onChipClick, { signal: controller.signal });
  tray.addEventListener('click', onChipClick, { signal: controller.signal });
  tray.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      hideTray(true);
    }
  }, { signal: controller.signal });
  const belongsToSelection = target =>
    target instanceof Node && (frame.field.contains(target) || tray.contains(target));
  // Only +N reveals hidden values, not hovering the whole input.
  display.addEventListener('pointerover', event => {
    const more = event.target.closest('[data-pg-show-selected]');
    if (more && (event.pointerType === 'mouse' || event.pointerType === 'pen')) showTray();
  }, { signal: controller.signal });
  display.addEventListener('focusin', event => {
    if (event.target.closest('[data-pg-show-selected]')) showTray(true);
  }, { signal: controller.signal });
  trayClose.addEventListener('click', () => hideTray(true), { signal: controller.signal });
  // Moving the pointer into the top-layer popover may produce a transient
  // pointerout with relatedTarget=null. Only real movement OUTSIDE closes it.
  document.addEventListener('pointermove', event => {
    if (trayOpened && !belongsToSelection(event.target)) hideTray();
  }, { signal: controller.signal });
  element.addEventListener('focusout', event => {
    if (!trayOpened || belongsToSelection(event.relatedTarget)) return;
    hideTray();
  }, { signal: controller.signal });

  trigger.addEventListener('keydown',event=>{
    if(!opened && ['ArrowDown','Enter',' '].includes(event.key)) {
      event.preventDefault();open();
    }
  },{signal:controller.signal});
  list.addEventListener('keydown',keyboard,{signal:controller.signal});
  search.addEventListener('keydown',event=>{
    if(event.key===' ' && event.target===search)return;
    keyboard(event);
  },{signal:controller.signal});
  // The shared Input's onInput callback already forwards queries to filter().
  list.addEventListener('click',event=>{
    const option=event.target.closest('[role="option"]');
    if(!option)return;
    const index=optionsDOM.indexOf(option);
    if(index>=0)choose(index,event);
  },{signal:controller.signal});
  list.addEventListener('pointermove',event=>{
    const option=event.target.closest('[role="option"]');
    if(option) {
      const i=optionsDOM.indexOf(option);
      if(i>=0&&!items[i].disabled)activate(i);
    }
  },{signal:controller.signal});
  all.addEventListener('click',event=>{
    const eligible=visibleIndices();
    const already=eligible.length>0&&eligible.every(i=>selected.has(items[i].value));
    eligible.forEach(i=>already?selected.delete(items[i].value):selected.add(items[i].value));
    reflect();onChange?.(selection(),event);
  },{signal:controller.signal});
  panel.addEventListener('keydown',event=>{
    if(event.target===all&&event.key==='Escape'){event.preventDefault();close(true);}
  },{signal:controller.signal});
  document.addEventListener('focusin',event=>{
    if(opened&&!element.contains(event.target))close();
    if(trayOpened&&!belongsToSelection(event.target))hideTray();
  },{signal:controller.signal});
  document.addEventListener('pointerdown',event=>{
    if(opened&&!element.contains(event.target))close();
    if(trayOpened&&!belongsToSelection(event.target))hideTray();
  },{signal:controller.signal});
  window.addEventListener('resize', () => {
    position();
    positionTray();
  }, { signal: controller.signal });
  const scrollDismiss = dismissOnOutsideScroll({
    popup: panel, isOpen: () => opened, dismiss: () => close(),
    signal: controller.signal,
  });
  const trayScrollDismiss = dismissOnOutsideScroll({
    popup: tray, isOpen: () => trayOpened, dismiss: () => hideTray(),
    signal: controller.signal,
  });
  setOptions(options);
  setValue(value);
  setError(error);
  return Object.freeze({
    element, trigger, getValue:selection,setValue,setOptions,setError,open,close,
    focus(){trigger.focus();},
    destroy(){
      destroyed=true;close();hideTray();controller.abort();searchField?.destroy();frame.destroy();element.remove();
    },
  });
}
