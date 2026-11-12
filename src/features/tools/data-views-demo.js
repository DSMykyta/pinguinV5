/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — DATA COLLECTION DESIGN PREVIEW                                                       ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Fictional Brands records. One shared UI collection, no Brands feature/backend.         ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/collection-view/collection-view, ../../core/preferences,                       ║
 * ║ ../../ui/select/select, ../../ui/input/input, ../../ui/dialog/dialog                                ║
 * ║ ПУБЛІЧНИЙ API: createDataViewsDemo()                                                                ║
 * ║ ПРИНЦИП: Its persisted view mode is the same universal choice mechanism as Shell IO.                ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createCollectionView } from '../../ui/collection-view/collection-view.js';
import { createSelect } from '../../ui/select/select.js';
import { createCollectionPageControls } from './collection-page-controls.js';
import { createInput } from '../../ui/input/input.js';
import { showConfirmDialog } from '../../ui/dialog/dialog.js';
import { showFormDialog } from '../../ui/form-dialog/form-dialog.js';
import { createSelectionActions } from '../../ui/selection-actions/selection-actions.js';

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
  card.classList.add('pg-collection-view__card');
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
  const element=node('section','root');
  let records=EXAMPLE_BRANDS.map(item=>({...item}));
  let nextCopy=0;
  const details=node('div','aside-detail','Оберіть дію біля запису.');
  details.setAttribute('role','status');

  // The shared header strip observes collection selection; this demo alone
  // defines which actions are relevant and what they do to sample records.
  const selectedActions=createSelectionActions({
    single:[{value:'duplicate',label:'Дублювати'}],
    multiple:[
      {value:'archive',label:'Архівувати',tone:'warning',appearance:'soft'},
      {value:'restore',label:'Відновити',tone:'success',appearance:'soft'},
      {value:'delete',label:'Видалити',tone:'danger',appearance:'soft'},
    ],
    onAction:action=>{
      void applySelectedAction(action).catch(error=>{
        console.error('Selected brand action failed:',error);
        details.textContent='Не вдалося виконати дію.';
      });
    },
  });
  const pageControls=createCollectionPageControls({
    storageKey:'pg:v1:tools-data-views:view',defaultMode:'table',
    columns:COLUMNS,selectedActions,details,
    searchPlaceholder:'Пошук у таблиці',
    searchLabel:'Шукати у таблиці брендів',
    allPageLabel:'Усі записи',pageUnit:'записів',
  });
  const {headerActions,asideControls:controls}=pageControls;
  async function editRecord(row) {
    // Local data remains the feature's responsibility. Shared Dialog owns all
    // corners, navigation, modal lifecycle, dirty checks and async action states.
    const nameField=createInput({label:'Назва бренду',value:row.name,required:true});
    nameField.input.setAttribute('autofocus','');
    const categoryField=createSelect({
      label:'Категорія',placeholder:null,value:row.category,
      options:CATEGORIES.map(item=>({label:item,value:item})),
    });
    const marketField=createInput({label:'Канали продажу',value:row.marketplace});
    const countryField=createSelect({
      label:'Країна',placeholder:null,value:row.country,
      options:COUNTRIES.map(item=>({label:item,value:item})),
    });
    const statusChoices=[...new Set(STATUSES)];
    const statusField=createSelect({
      label:'Статус',placeholder:null,value:row.status,
      options:statusChoices.map(item=>({label:item,value:item})),
    });
    const content=node('div','edit-content');
    const general=node('section','edit-section');
    general.append(nameField.element);
    const channels=node('section','edit-section');
    channels.append(categoryField.element,marketField.element);
    const settings=node('section','edit-section');
    settings.append(countryField.element,statusField.element);
    content.append(general,channels,settings);
    const sections=[
      {id:'general',label:'Основне',icon:'pencil',element:general},
      {id:'channels',label:'Канали продажу',icon:'layers',element:channels},
      {id:'settings',label:'Налаштування',icon:'sliders',element:settings},
    ];
    let baseline={...row};
    const getDraft=()=>({
      name:nameField.getValue().trim(),
      category:categoryField.getValue(),
      marketplace:marketField.getValue().trim(),
      country:countryField.getValue(),
      status:statusField.getValue(),
    });
    const isDirty=()=>{
      const draft=getDraft();
      return Object.entries(draft).some(([key,value])=>value!==baseline[key]);
    };
    try {
      await showFormDialog({
        title:'Редагувати',entityName:row.name,
        layout:'workspace',content,sections,isDirty,
        validate:()=>{
          const name=nameField.getValue().trim();
          const duplicate=records.some(item=>
            item.id!==row.id&&item.name.toLocaleLowerCase('uk')===name.toLocaleLowerCase('uk')
          );
          nameField.setError(!name?'Вкажіть назву бренду':
            duplicate?'Бренд із такою назвою вже існує':'');
          return Boolean(name&&!duplicate);
        },
        save:()=>{
          const draft=getDraft();
          records=records.map(item=>item.id===row.id?{...item,...draft}:item);
          collection.setRows(records);
          // Save-only stays in this editor: the persisted values are now the
          // clean baseline for dirty confirmation, refresh and later edits.
          baseline={...row,...draft};
          details.textContent='Збережено локально: '+draft.name;
          return true;
        },
        onRefresh:()=>{
          const latest=records.find(item=>item.id===row.id);
          if(!latest)return false;
          nameField.setValue(latest.name);
          categoryField.setValue(latest.category);
          marketField.setValue(latest.marketplace);
          countryField.setValue(latest.country);
          statusField.setValue(latest.status);
          baseline={...latest};
          nameField.setError('');
          return true;
        },
        onDelete:()=>{
          if(!records.some(item=>item.id===row.id))return false;
          records=records.filter(item=>item.id!==row.id);
          collection.setRows(records);
          details.textContent='Видалено локально: '+row.name;
          return true;
        },
      });
    } finally {
      nameField.destroy();
      categoryField.destroy();
      marketField.destroy();
      countryField.destroy();
      statusField.destroy();
    }
  }
  function duplicateRecord(row) {
    const copy={...row,id:'preview-copy-'+(++nextCopy),name:row.name+' (копія)'};
    records=[...records,copy];
    details.textContent='Дубльовано локально: '+row.name;
  }
  const collection=createCollectionView({
    label:'Приклад списку брендів',rows:records,columns:COLUMNS,
    getRowId:row=>row.id,renderTile,modes:['tiles','table'],
    initialMode:pageControls.initialMode,
    initialSort:pageControls.initialSort,
    density:pageControls.initialDensity,
    onDensityChange:pageControls.onDensityChange,
    selectable:true,pageSize:25,
    onEditRow:row=>{ void editRecord(row).catch(error=>console.error('Brand edit failed:',error)); },
    rowActions:[
      {value:'details',label:'Переглянути деталі'},
      {value:'duplicate',label:'Дублювати'},
      {value:'archive',label:'Архівувати або відновити'},
    ],
    onModeChange:pageControls.onModeChange,
    onSortChange:pageControls.onSortChange,
    onSelectionChange:pageControls.onSelectionChange,
    onRowAction:(action,row)=>{
      if(action==='details') {
        details.textContent=row.name+' · '+row.category+' · '+row.products+' товарів · '+row.status;
      } else if(action==='duplicate') {
        duplicateRecord(row);
        collection.setRows(records);
      } else if(action==='archive') {
        records=records.map(item=>item.id===row.id?{...item,
          status:item.status==='Архівний'?'Активний':'Архівний'}:item);
        collection.setRows(records);details.textContent='Змінено статус: '+row.name;
      }
    },
  });
  // Both demo collections reuse one Shell-context adapter; their states stay isolated.
  pageControls.bind(collection);

  async function applySelectedAction(action) {
    const ids=collection.getSelectedIds();
    const selected=new Set(ids);
    if(!ids.length)return;
    if(action==='duplicate') {
      if(ids.length!==1)return;
      const original=records.find(row=>selected.has(row.id));
      if(!original)return;
      duplicateRecord(original);
    } else if(action==='archive'||action==='restore') {
      const status=action==='archive'?'Архівний':'Активний';
      records=records.map(row=>selected.has(row.id)?{...row,status}:row);
      details.textContent=(action==='archive'?'Архівовано: ':'Відновлено: ')+ids.length;
    } else if(action==='delete') {
      if(ids.length<2)return;
      const confirmed=await showConfirmDialog({
        title:'Видалити вибрані записи?',
        message:'З тестової таблиці буде видалено '+ids.length+' записи.',
        confirmText:'Видалити',
        cancelText:'Скасувати',
        destructive:true,
      });
      if(!confirmed)return;
      // Re-check at confirmation time: selection can change during a dialog.
      // A queued confirmation may outlive selection updates. Never remove IDs
      // that were not part of the original confirmation request.
      const current=new Set(collection.getSelectedIds().filter(id=>selected.has(id)));
      const removed=records.filter(row=>current.has(row.id)).length;
      records=records.filter(row=>!current.has(row.id));
      details.textContent='Видалено локально: '+removed;
    } else throw new RangeError('Unknown selection action');
    collection.setRows(records);
    collection.clearSelection();
  }
  element.append(collection.element);
  return Object.freeze({
    element,headerActions,
    footerContent:collection.footerContent,
    getAsideContext:()=>({ title:'Макети даних', controls }),
    getPageFabContext:pageControls.getPageFabContext,
    getSearchContext:pageControls.getSearchContext,
    getMode:collection.getMode,getCollection:()=>collection,
    destroy(){
      selectedActions.destroy();collection.destroy();pageControls.destroy();
      element.remove();
    },
  });
}
