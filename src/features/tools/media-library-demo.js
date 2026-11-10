/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MEDIA LIBRARY DEMO                                                                   ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Second independent collection for testing tabs, selection and pagination.              ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/collection-view/collection-view.js, ../../ui/input/input.js,                   ║
 * ║ ../../ui/select/select.js, ../../ui/dialog/dialog.js,                                               ║
 * ║ ../../ui/selection-actions/selection-actions.js                                                     ║
 * ║ ПУБЛІЧНИЙ API: createMediaLibraryDemo()                                                             ║
 * ║ ПРИНЦИП: Lightweight self-contained SVG thumbnails; no remote assets or backend.                    ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createCollectionView } from '../../ui/collection-view/collection-view.js';
import { createInput } from '../../ui/input/input.js';
import { createSelect } from '../../ui/select/select.js';
import { showDialog, showConfirmDialog } from '../../ui/dialog/dialog.js';
import { createSelectionActions } from '../../ui/selection-actions/selection-actions.js';
import { DEFAULT_PAGE_SIZES } from '../../ui/pagination/pagination.js';

const NAMES = Object.freeze([
  'Гірський ранок', 'Тепле узбережжя', 'Лінії міста', 'Зелені пагорби',
  'Після дощу', 'М’яке світло', 'Тиха затока', 'Піщані дюни',
  'Нічний горизонт', 'Лісова стежка', 'Ранковий туман', 'Геометрія',
  'Південне сонце', 'Хмари над містом', 'Синя година', 'Тиха ріка',
  'Вечірня арка', 'Осінній схил', 'Світло у вікні',
]);
const PALETTE = [
  ['#b9d7d3','#3e7375','#d8af80'],['#c6e4ef','#448ba8','#eed5aa'],
  ['#d1d6e0','#6b7691','#b29d8e'],['#cae0c7','#568868','#97b285'],
  ['#d0d9e0','#596f84','#d4a98c'],['#f0d6b6','#cd906e','#a96d6c'],
  ['#b7d6df','#3f8a91','#dfc19a'],['#ead6b4','#c29b71','#f0c48e'],
];
const EXAMPLES = NAMES.map((name,i)=>({
  id:'media-'+String(i+1).padStart(2,'0'),
  name,format:['WEBP','PNG','JPG'][i%3],
  dimensions:['1600 × 900','1200 × 1200','1920 × 1080'][i%3],
  motif:i%4,colors:PALETTE[i%PALETTE.length],
}));
const COLUMNS = Object.freeze([
  {key:'preview',label:'Зображення',sortable:false,render:renderTableThumbnail},
  {key:'name',label:'Назва',primary:true},
  {key:'format',label:'Формат'},
  {key:'dimensions',label:'Розмір'},
]);

function node(tag,part,text) {
  const result=document.createElement(tag);
  result.className='pg-media-library__'+part;
  if(text!==undefined)result.textContent=String(text);
  return result;
}

function thumb(row) {
  const [sky,mountain,highlight]=row.colors;
  const art=[
    '<circle cx="480" cy="98" r="48" fill="'+highlight+'"/>'+
      '<path d="M0 320 164 106 285 251 391 163 640 350V400H0Z" fill="'+mountain+'"/>'+
      '<path d="M0 340 160 245 280 318 462 220 640 311V400H0Z" fill="'+highlight+'" opacity=".75"/>',
    '<circle cx="175" cy="104" r="64" fill="'+highlight+'"/>'+
      '<path d="M0 251C113 214 210 287 340 258S521 231 640 281V400H0Z" fill="'+mountain+'"/>'+
      '<path d="M0 304C160 266 265 326 386 290S545 305 640 315" fill="none" stroke="white" stroke-width="12" opacity=".55"/>',
    '<rect x="95" y="138" width="100" height="262" fill="'+mountain+'"/>'+
      '<rect x="226" y="80" width="140" height="320" fill="'+highlight+'"/>'+
      '<rect x="392" y="174" width="140" height="226" fill="'+mountain+'"/>',
    '<circle cx="320" cy="195" r="128" fill="'+mountain+'"/>'+
      '<path d="M74 345 575 140" stroke="'+highlight+'" stroke-width="49"/>'+
      '<circle cx="484" cy="100" r="52" stroke="white" stroke-width="15" fill="none" opacity=".7"/>',
  ][row.motif];
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">'+
    '<rect width="640" height="400" fill="'+sky+'"/>'+art+'</svg>');
}

function renderTableThumbnail(row) {
  // The table and tile view reuse the same generated image source.
  const image=node('img','table-thumb');
  image.src=thumb(row);
  image.alt='Мініатюра: '+row.name;
  image.width=72;
  image.height=45;
  image.decoding='async';
  return image;
}

function renderTile(row) {
  const card=node('article','card');
  const image=node('img','image');
  image.src=thumb(row);
  image.alt='Ілюстрація: '+row.name;
  image.loading='lazy';
  const caption=node('div','caption');
  caption.append(node('strong','name',row.name),
    node('span','meta',row.format+' · '+row.dimensions));
  const preview=node('div','preview');
  preview.dataset.pgTileOpenTarget='';
  preview.append(image);
  card.append(preview,caption);
  return card;
}

export function createMediaLibraryDemo() {
  let records=EXAMPLES.map(item=>({...item}));
  let copyId=0;
  const element=node('section','root');
  const controls=node('div','aside-controls');
  const details=node('p','aside-detail','Локальна тестова медіатека.');
  details.setAttribute('role','status');
  const sortBy=createSelect({
    label:'Сортувати за',placeholder:null,value:'name',
    options:COLUMNS.filter(col=>col.sortable!==false).map(col=>({label:col.label,value:col.key})),
    onChange:key=>collection.setSort(key),
  });
  controls.append(sortBy.element,details);
  const headerActions=node('div','header-actions');
  const selectedActions=createSelectionActions({
    single:[{value:'duplicate',label:'Дублювати'}],
    multiple:[{value:'remove',label:'Прибрати'}],
    onClear:()=>collection.clearSelection(),
    onAction:action=>{void selectedAction(action).catch(console.error);},
  });
  const rename=async row=>{
    const input=createInput({label:'Назва зображення',value:row.name,required:true});
    try {
      await showDialog({
        title:'Редагування зображення',content:input.element,size:'editor',
        confirmText:'Зберегти',cancelText:'Скасувати',
        validate:()=>{
          const valid=Boolean(input.getValue().trim());
          input.setError(valid?'':'Вкажіть назву');
          return valid;
        },
        onConfirm:()=>{
          const name=input.getValue().trim();
          records=records.map(item=>item.id===row.id?{...item,name}:item);
          collection.setRows(records);
          details.textContent='Змінено: '+name;
          return true;
        },
      });
    } finally {input.destroy();}
  };
  const duplicate=row=>{
    const copy={...row,id:'media-copy-'+(++copyId),name:row.name+' (копія)'};
    records=[...records,copy];
    collection.setRows(records);
    details.textContent='Дубльовано: '+copy.name;
  };
  const collection=createCollectionView({
    label:'Медіатека',rows:records,columns:COLUMNS,
    getRowId:row=>row.id,renderTile,
    modes:['tiles','table'],initialMode:'tiles',
    initialSort:{key:'name',direction:'asc'},
    selectable:true,pageSize:10,
    onEditRow:row=>{void rename(row).catch(console.error);},
    rowActions:[
      {value:'details',label:'Переглянути дані'},
      {value:'duplicate',label:'Дублювати'},
    ],
    onRowAction:(action,row)=>{
      if(action==='details')details.textContent=row.name+' · '+row.format+' · '+row.dimensions;
      else if(action==='duplicate')duplicate(row);
    },
    onSortChange:state=>sortBy.setValue(state.key),
    onSelectionChange:ids=>selectedActions.setSelection(ids),
  });
  async function selectedAction(action) {
    const ids=collection.getSelectedIds();
    if(action==='duplicate'&&ids.length===1) {
      const row=records.find(record=>record.id===ids[0]);
      if(row)duplicate(row);
      collection.clearSelection();
    } else if(action==='remove'&&ids.length>1) {
      const accepted=await showConfirmDialog({
        title:'Прибрати зображення?',
        message:'Зміна стосується лише тестової медіатеки.',
        confirmText:'Прибрати',cancelText:'Скасувати',destructive:true,
      });
      if(!accepted)return;
      const current=new Set(collection.getSelectedIds());
      records=records.filter(row=>!current.has(row.id));
      collection.setRows(records);
      collection.clearSelection();
      details.textContent='Прибрано: '+current.size;
    }
  }
  headerActions.append(collection.headerActions,selectedActions.element);
  element.append(collection.element);
  return Object.freeze({
    element,headerActions,footerContent:collection.footerContent,
    getCollection:()=>collection,
    getAsideContext:()=>({title:'Медіатека',controls}),
    getSearchContext:()=>({
      placeholder:'Пошук зображень',label:'Шукати в медіатеці',
      value:collection.getQuery(),onQuery:value=>collection.setQuery(value),
    }),
    getPageFabContext:()=>({
      items:DEFAULT_PAGE_SIZES.map(value=>({
        value:String(value),symbol:value===0?'∞':String(value),
        label:value===0?'Усі зображення':value+' зображень',
        selected:()=>collection.getPagination().pageSize===value,
      })),
      onSelect:value=>collection.setPageSize(Number(value)),
    }),
    destroy() {
      selectedActions.destroy();collection.destroy();sortBy.destroy();
      controls.remove();headerActions.remove();element.remove();
    },
  });
}
