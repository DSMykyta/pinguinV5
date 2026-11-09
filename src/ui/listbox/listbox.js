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
  element.append(frame.field,holder,panel,support);
  const controller = new AbortController();
  let items = [];
  let optionsDOM = [];
  let selected = new Set();
  let active = -1;
  let opened = false;
  let destroyed = false;

  function visibleIndices() {
    return items.map((item,i) => !item.disabled && !optionsDOM[i].hidden ? i : -1).filter(i=>i>=0);
  }
  function selection() { return items.filter(item=>selected.has(item.value)).map(item=>item.value); }
  function updateValue() {
    display.replaceChildren();
    holder.replaceChildren();
    const chosen = items.filter(item=>selected.has(item.value));
    if (!chosen.length) {
      display.classList.add('pg-listbox__value--placeholder');
      display.textContent = String(placeholder);
    } else {
      display.classList.remove('pg-listbox__value--placeholder');
      if (multiple) {
        chosen.slice(0,3).forEach(item=>{
          const chip=document.createElement('span');
          chip.className='pg-listbox__chip';
          chip.textContent=item.label;
          display.append(chip);
        });
        if (chosen.length>3) {
          const extra=document.createElement('span');
          extra.className='pg-listbox__chip';
          extra.textContent='+'+(chosen.length-3);
          display.append(extra);
        }
      } else display.textContent=chosen[0].label;
    }
    if (name!==undefined) selection().forEach(val=>{
      const input=document.createElement('input');
      input.type='hidden';
      input.name=String(name);
      input.value=val;
      input.disabled=Boolean(disabled);
      holder.append(input);
    });
    frame.setFilled(chosen.length>0);
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
  function open() {
    if(opened||destroyed||trigger.disabled)return;
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
  }
  function close(restore=false) {
    if(!opened)return;
    opened=false;
    if(hasPopover && panel.matches(':popover-open'))panel.hidePopover();
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    element.dataset.pgOpen='false';
    frame.setActive(false);
    activate(-1);
    if(restore)trigger.focus();
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
  },{signal:controller.signal});
  document.addEventListener('pointerdown',event=>{
    if(opened&&!element.contains(event.target))close();
  },{signal:controller.signal});
  window.addEventListener('resize',position,{signal:controller.signal});
  dismissOnOutsideScroll({
    popup: panel, isOpen: () => opened, dismiss: () => close(),
    signal: controller.signal,
  });
  setOptions(options);
  setValue(value);
  setError(error);
  return Object.freeze({
    element, trigger, getValue:selection,setValue,setOptions,setError,open,close,
    focus(){trigger.focus();},
    destroy(){
      destroyed=true;close();controller.abort();searchField?.destroy();frame.destroy();element.remove();
    },
  });
}
