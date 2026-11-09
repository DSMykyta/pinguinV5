/**
 * PINGUIN NEXT — DATA COLLECTION DESIGN PREVIEW
 * Fictional Brands records. One shared UI collection, no Brands feature/backend.
 * Its persisted view mode is the same universal choice mechanism as Shell IO.
 */
import { createCollectionView } from '../../ui/collection-view/collection-view.js';
import { createStoredChoice } from '../../core/preferences.js';
import { createSelect } from '../../ui/select/select.js';
import { createSegmentSwitch } from '../../ui/segment-switch/segment-switch.js';

const BRAND_NAMES = [
  'Pinguin', 'Nimbus', 'Kraken', 'Aurora', 'Vento', 'Solstice',
  'Alpine Trail', 'Terra Motion', 'North Peak', 'Ocean Wave',
  'Astra Fit', 'Velora', 'Arcus', 'Ridge Runner', 'Athletica',
  'Lumen', 'Orbit Sports', 'Granite', 'Peakline', 'Nova Trail',
  'Mistral', 'Motion Lab', 'Blue Current', 'Sierra', 'Urban Pace',
  'Kinetic', 'Evergreen', 'Aero Pulse', 'Wild Coast', 'Trailcraft',
  'Helio', 'Pulse Gear',
];
const CATEGORIES = [
  'Біг та тренування', 'Взуття', 'Плавання', 'Туризм',
  'Спорядження', 'Одяг та аксесуари',
];
const COUNTRIES = ['Україна', 'Польща', 'Німеччина', 'Чехія', 'Італія'];
const OWNERS = ['М. Коваль', 'О. Левчук', 'І. Мельник', 'Д. Савчук'];
const STATUSES = ['Активний', 'Активний', 'Активний', 'Чернетка', 'Архівний'];
const MARKETS = ['Rozetka', 'Prom.ua', 'Магазин', 'Rozetka, Prom.ua'];

const EXAMPLE_BRANDS = Object.freeze(BRAND_NAMES.map((name, index) => {
  const modified = new Date(Date.UTC(2026, 9, 22 - (index % 20)));
  return Object.freeze({
    id: 'preview-brand-' + (index + 1),
    name,
    category: CATEGORIES[index % CATEGORIES.length],
    products: index === 0 ? 234 : (index * 53 + 27) % 610,
    skus: index === 0 ? 1458 : (index * 137 + 72) % 3200,
    marketplace: MARKETS[index % MARKETS.length],
    country: COUNTRIES[index % COUNTRIES.length],
    status: STATUSES[index % STATUSES.length],
    updated: modified.toISOString().slice(0, 10),
    updatedLabel: new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(modified),
    manager: OWNERS[index % OWNERS.length],
  });
}));

function node(tag, part, text) {
  const element = document.createElement(tag);
  element.className = 'pg-tools-data-views__' + part;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function renderStatus(brand) {
  const badge = node('span', 'status', brand.status);
  badge.dataset.pgStatus = brand.status === 'Активний' ? 'active'
    : brand.status === 'Чернетка' ? 'draft' : 'archived';
  return badge;
}

function renderTile(brand) {
  const card = node('article', 'card');
  const picture = node('div', 'tile-preview');
  picture.setAttribute('role', 'img');
  picture.setAttribute('aria-label', 'Умовна заглушка зображення для ' + brand.name);
  const monogram = brand.name.split(' ').map(word => word[0]).slice(0, 2).join('');
  picture.append(node('span', 'monogram', monogram));
  const content = node('div', 'tile-content');
  const firstLine = node('div', 'tile-head');
  firstLine.append(node('strong', 'tile-name', brand.name), renderStatus(brand));
  const category = node('p', 'tile-category', brand.category);
  const facts = node('div', 'tile-facts');
  facts.append(node('span', 'tile-fact', brand.products + ' товарів'),
    node('span', 'tile-fact', brand.country));
  content.append(firstLine, category, facts);
  card.append(picture, content);
  return card;
}

const COLUMNS = Object.freeze([
  { key: 'name', label: 'Бренд', primary: true },
  { key: 'category', label: 'Категорія', muted: true },
  { key: 'products', label: 'Товари', align: 'end' },
  { key: 'skus', label: 'SKU', align: 'end' },
  { key: 'marketplace', label: 'Канали продажу' },
  { key: 'country', label: 'Країна' },
  { key: 'status', label: 'Статус', render: renderStatus },
  { key: 'updated', label: 'Змінено', muted: true,
    render: brand => brand.updatedLabel, sortValue: brand => brand.updated },
  { key: 'manager', label: 'Відповідальний', muted: true },
]);

export function createDataViewsDemo() {
  let storage = null;
  try { storage = window.localStorage; } catch { /* Storage is optional. */ }
  const preference=createStoredChoice({
    storage,key:'pg:v1:tools-data-views:view',
    choices:['table','tiles'],defaultValue:'table',
  });
  const element=node('section','root');
  let records=EXAMPLE_BRANDS.map(item=>({...item}));
  let nextCopy=0;
  const controls=node('div','aside-controls');
  const sortBy=createSelect({
    label:'Сортувати за',placeholder:null,value:'name',
    options:COLUMNS.map(col=>({label:col.label,value:col.key})),
    onChange:key=>collection.setSort(key,direction.getValue()),
  });
  const direction=createSegmentSwitch({
    label:'Напрямок сортування',variant:'outline',compact:true,
    options:[{value:'asc',label:'А–Я'},{value:'desc',label:'Я–А'}],
    value:'asc',onChange:value=>collection.setSort(sortBy.getValue(),value),
  });
  const count=node('span','selected-count','Нічого не вибрано');
  count.setAttribute('role','status');
  const archive=document.createElement('button');
  archive.type='button';archive.className='pg-tools-data-views__bulk';
  archive.textContent='Архівувати вибрані';archive.disabled=true;
  const details=node('div','aside-detail','Оберіть дію біля запису.');
  details.setAttribute('role','status');
  controls.append(sortBy.element,direction.element,count,archive,details);
  const collection=createCollectionView({
    label:'Приклад списку брендів',rows:records,columns:COLUMNS,
    getRowId:row=>row.id,renderTile,modes:['tiles','table'],
    initialMode:preference.getValue(),
    initialSort:{key:'name',direction:'asc'},
    selectable:true,pageSize:25,
    rowActions:[
      {value:'details',label:'Переглянути деталі'},
      {value:'duplicate',label:'Дублювати'},
      {value:'archive',label:'Архівувати або відновити'},
    ],
    onModeChange:mode=>preference.setValue(mode),
    onSortChange:sort=>{
      sortBy.setValue(sort.key);direction.setValue(sort.direction);
    },
    onSelectionChange:ids=>{
      count.textContent=ids.length?'Вибрано: '+ids.length:'Нічого не вибрано';
      archive.disabled=ids.length===0;
    },
    onRowAction:(action,row)=>{
      if(action==='details') {
        details.textContent=row.name+' · '+row.category+' · '+row.products+' товарів · '+row.status;
      } else if(action==='duplicate') {
        const copy={...row,id:'preview-copy-'+(++nextCopy),name:row.name+' (копія)'};
        records=[...records,copy];collection.setRows(records);
        details.textContent='Створено локальну копію: '+copy.name;
      } else if(action==='archive') {
        records=records.map(item=>item.id===row.id?{...item,
          status:item.status==='Архівний'?'Активний':'Архівний'}:item);
        collection.setRows(records);details.textContent='Змінено статус: '+row.name;
      }
    },
  });
  archive.addEventListener('click',()=>{
    const selected=new Set(collection.getSelectedIds());
    if(!selected.size)return;
    records=records.map(item=>selected.has(item.id)?{...item,status:'Архівний'}:item);
    collection.setRows(records);
    details.textContent='Архівовано локально: '+selected.size;
    collection.clearSelection();
  });
  element.append(collection.element);
  return Object.freeze({
    element,headerActions:collection.headerActions,
    footerContent:collection.footerContent,
    getAsideContext:()=>({title:'Макети даних',controls}),
    getSearchContext:()=>({
      placeholder:'Пошук у таблиці',label:'Шукати у таблиці брендів',
      value:collection.getQuery(),onQuery:query=>collection.setQuery(query),
    }),
    getMode:collection.getMode,getCollection:()=>collection,
    destroy(){
      collection.destroy();sortBy.destroy();direction.destroy();
      element.remove();controls.remove();
    },
  });
}
