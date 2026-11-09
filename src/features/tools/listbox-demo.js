/**
 * Functional Listbox preview. Data and selected values belong only here.
 */
import { createListbox } from '../../ui/listbox/listbox.js';

const PLATFORMS = [
  {value:'prom',label:'Пром.ua'}, {value:'rozetka',label:'Rozetka'},
  {value:'promua',label:'Prom.ua (UA)'}, {value:'amazon',label:'Amazon'},
  {value:'etsy',label:'Etsy'}, {value:'meta',label:'Meta (недоступний)',disabled:true},
];

export function createListboxDemo() {
  const element=document.createElement('section');
  element.className='pg-tools-listbox-demo';
  const title=document.createElement('h3');
  title.textContent='Спадні списки';
  const intro=document.createElement('p');
  intro.textContent='Одиничний вибір, пошук, мультивибір і «вибрати всі» — окрема поведінка списку.';
  const grid=document.createElement('div');
  grid.className='pg-tools-listbox-demo__grid';
  const controls=[
    createListbox({label:'Маркетплейс',name:'demo-marketplace',options:PLATFORMS,
      description:'Одиничний вибір.'}),
    createListbox({label:'Маркетплейси',name:'demo-marketplaces',options:PLATFORMS,
      value:['prom','rozetka'],multiple:true,searchable:true,selectAll:true,
      description:'Пошук, мультивибір і чіпи.'}),
    createListbox({label:'Обов’язкове поле',options:PLATFORMS,
      error:'Оберіть хоча б один маркетплейс.'}),
  ];
  controls.forEach(control=>grid.append(control.element));
  element.append(title,intro,grid);
  return {element,destroy(){controls.forEach(x=>x.destroy());element.remove();}};
}
