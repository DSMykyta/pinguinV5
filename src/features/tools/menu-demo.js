/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MENU DEMO                                                                            ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Menu preview. The example callback only updates its own status text.                   ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/menu/menu.js                                                                   ║
 * ║ ПУБЛІЧНИЙ API: createMenuDemo()                                                                     ║
 * ║ ПРИНЦИП: Лише приклад; оформлення спільних компонентів не дублюється.                               ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createMenu } from '../../ui/menu/menu.js';

export function createMenuDemo() {
  const element=document.createElement('section');
  element.className='pg-tools-menu-demo';
  const title=document.createElement('h3');
  title.textContent='Меню дій';
  const note=document.createElement('p');
  note.textContent='Наведіть на «Плагіни»: підменю розгорнеться праворуч. Клавіатура: → відкрити, ← повернутися, Escape закрити.';
  const row=document.createElement('div');
  row.className='pg-tools-menu-demo__row';
  const status=document.createElement('span');
  status.className='pg-tools-menu-demo__status';
  status.setAttribute('role','status');
  const actions=createMenu({label:'Дії',items:[
    {label:'Редагувати',value:'edit'},
    {label:'Дублювати',value:'duplicate'},
    {label:'Плагіни',value:'plugins',items:[
      {label:'Open Notion page',value:'notion-demo'},
      {label:'Інші інструменти',value:'more',items:[
        {label:'Приклад третього рівня',value:'third-level-demo'},
      ]},
    ]},
    {label:'Видалити',value:'delete',danger:true},
  ],onSelect:(value)=>{status.textContent='Обрана дія: '+value;status.dataset.pgMenuResult=value;}});
  const appearance=createMenu({label:'Вигляд',align:'end',items:[
    {label:'Компактний',value:'compact',type:'check',checked:true},
    {label:'Звичайний',value:'standard',type:'check'},
    {label:'Розширений',value:'expanded',type:'check'},
  ],onSelect:(value)=>{status.textContent='Змінено параметр: '+value;status.dataset.pgViewResult=value;}});
  const unavailable=createMenu({label:'Недоступно',disabled:true,items:[{label:'Дія',value:'none'}]});
  row.append(actions.element,appearance.element,unavailable.element,status);
  element.append(title,note,row);
  return {element,destroy(){actions.destroy();appearance.destroy();unavailable.destroy();element.remove();}};
}
