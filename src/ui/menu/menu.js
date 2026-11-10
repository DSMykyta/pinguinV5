/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MENU                                                                                 ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Реалізація menu із самостійним контрактом.                                             ║
 * ║ ЗАЛЕЖНОСТІ: ../position/position-popup.js, ../position/dismiss-on-scroll.js                         ║
 * ║ ПУБЛІЧНИЙ API: createMenu()                                                                         ║
 * ║ ПРИНЦИП: Ізольована поведінка, без зв'язків між features.                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { positionPopup } from '../position/position-popup.js';
import { dismissOnOutsideScroll } from '../position/dismiss-on-scroll.js';

/**
 * PINGUIN NEXT — INDEPENDENT ACTION MENU
 * Native button + ARIA menu keyboard model. No feature state/global registry.
 */
let sequence = 0;
const allowed = new Set(['action','navigation','check']);

export function createMenu({label,id,items=[],align='start',disabled=false,onSelect}={}) {
  if(typeof label!=='string'||!label.trim())throw new TypeError('Menu label is required');
  if(!['start','end'].includes(align))throw new TypeError('Invalid menu alignment');
  if(!Array.isArray(items)||!items.length)throw new TypeError('Menu needs items');
  const entries=items.map((item,i)=>{
    if(!item||typeof item.label!=='string'||!item.label.trim())throw new TypeError('Menu item needs label');
    const type=item.type||'action';
    if(!allowed.has(type))throw new TypeError('Invalid menu item type');
    return {label:item.label,value:String(item.value??i),type,disabled:Boolean(item.disabled),
      danger:Boolean(item.danger),checked:Boolean(item.checked)};
  });
  const uid=id||'pg-menu-'+(++sequence);
  const element=document.createElement('div');
  element.className='pg-menu';
  element.dataset.pgAlign=align;
  const trigger=document.createElement('button');
  trigger.className='pg-menu__trigger pg-button pg-button--outline';
  trigger.type='button';
  trigger.disabled=Boolean(disabled);
  trigger.textContent=label;
  trigger.id=uid+'-trigger';
  trigger.setAttribute('aria-haspopup','menu');
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-controls',uid+'-panel');
  const panel=document.createElement('div');
  panel.className='pg-menu__panel pg-scrollbar';
  panel.hidden=true;
  panel.id=uid+'-panel';
  panel.setAttribute('role','menu');
  panel.setAttribute('aria-label',label);
  const supportsPopover=typeof panel.showPopover==='function';
  if(supportsPopover)panel.setAttribute('popover','manual');
  const controller=new AbortController();
  const buttons=[];
  let openState=false,disposed=false;
  entries.forEach((item,i)=>{
    const action=document.createElement('button');
    action.type='button';
    action.className='pg-menu__item pg-button pg-button--list-item';
    action.textContent=item.label;
    action.dataset.pgValue=item.value;
    action.disabled=item.disabled;
    action.setAttribute('role',item.type==='check'?'menuitemcheckbox':'menuitem');
    if(item.type==='check')action.setAttribute('aria-checked',String(item.checked));
    if(item.danger)action.dataset.pgDanger='true';
    action.tabIndex=-1;
    action.addEventListener('click',event=>{
      if(item.disabled)return;
      if(item.type==='check') {
        item.checked=!item.checked;
        action.setAttribute('aria-checked',String(item.checked));
      }
      onSelect?.(item.value,{...item},event);
      close(true);
    },{signal:controller.signal});
    buttons.push(action);
    panel.append(action);
  });
  element.append(trigger,panel);
  function enabledButtons(){return buttons.filter(button=>!button.disabled);}
  function position(){
    if (!openState || !supportsPopover) return;
    // Width follows the longest action rather than the small trigger.
    // Dialog/popup positioning and viewport clamping stay in one shared helper.
    const width=Math.max(170,...buttons.map(button=>button.scrollWidth+12));
    positionPopup({
      anchor:trigger,popup:panel,maxHeight:320,
      matchWidth:false,minWidth:170,maxWidth:360,preferredWidth:width,align,
    });
  }
  function focusItem(index){
    const enabled=enabledButtons();
    if(!enabled.length)return;
    enabled[(index+enabled.length)%enabled.length].focus({ preventScroll: true });
  }
  function open(){
    if(openState||disposed||trigger.disabled)return;
    openState=true;
    panel.hidden=false;
    trigger.setAttribute('aria-expanded','true');
    element.dataset.pgOpen='true';
    if(supportsPopover)panel.showPopover();
    position();
    focusItem(0);
    scrollDismiss.arm();
  }
  function close(restore=false){
    if(!openState)return;
    openState=false;
    scrollDismiss.disarm();
    if(supportsPopover&&panel.matches(':popover-open'))panel.hidePopover();
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    element.dataset.pgOpen='false';
    if(restore)trigger.focus();
  }
  trigger.addEventListener('click',()=>openState?close(true):open(),{signal:controller.signal});
  trigger.addEventListener('keydown',event=>{
    if(!openState && ['ArrowDown','ArrowUp','Enter',' '].includes(event.key)){
      event.preventDefault();open();
      if(event.key==='ArrowUp')focusItem(enabledButtons().length-1);
    }
  },{signal:controller.signal});
  panel.addEventListener('keydown',event=>{
    const key=event.key;
    const enabled=enabledButtons();
    const i=enabled.indexOf(document.activeElement);
    if(key==='Escape'){event.preventDefault();close(true);}
    else if(key==='ArrowDown'||key==='ArrowUp'){
      event.preventDefault();focusItem(i+(key==='ArrowDown'?1:-1));
    } else if(key==='Home'||key==='End'){
      event.preventDefault();focusItem(key==='Home'?0:enabled.length-1);
    } else if(key==='Tab')close();
  },{signal:controller.signal});
  document.addEventListener('pointerdown',event=>{
    if(openState&&!element.contains(event.target))close();
  },{signal:controller.signal});
  window.addEventListener('resize',position,{signal:controller.signal});
  const scrollDismiss = dismissOnOutsideScroll({
    popup: panel, isOpen: () => openState, dismiss: () => close(),
    signal: controller.signal,
  });
  return Object.freeze({
    element,trigger,open,close,
    destroy(){disposed=true;close();controller.abort();element.remove();},
  });
}
