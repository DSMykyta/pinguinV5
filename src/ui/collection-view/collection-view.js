/**
 * PINGUIN NEXT — SHARED DATA COLLECTION
 * One dataset, sortable native table, optional tiles, circular row selection,
 * one legacy-inspired pagination service and existing Menu actions.
 * Data fetching, persistence and business actions belong to the caller.
 */
import { createViewSwitch } from '../view-switch/view-switch.js';
import { createCheckbox } from '../checkbox/checkbox.js';
import { createMenu } from '../menu/menu.js';
import { createIconButton } from '../button/button.js';
import { createIcon } from '../icon/icon.js';
import { createPagination } from '../pagination/pagination.js';

const collator = new Intl.Collator('uk', { numeric:true, sensitivity:'base' });
function compareValues(a,b) {
  if(a==null&&b==null)return 0;
  if(a==null)return 1;
  if(b==null)return -1;
  if(typeof a==='number'&&typeof b==='number')return a-b;
  return collator.compare(String(a),String(b));
}
function appendContent(target,value) {
  if(value instanceof Node) target.append(value);
  else if(value!=null)target.textContent=String(value);
}
function validateColumns(columns) {
  if(!Array.isArray(columns)||!columns.length)throw new TypeError('Collection needs columns');
  const keys=new Set();
  for(const column of columns) {
    if(!column||typeof column.key!=='string'||!column.key||
      typeof column.label!=='string'||!column.label.trim()||keys.has(column.key)||
      (column.align!==undefined&&!['start','end'].includes(column.align))||
      (column.render!==undefined&&typeof column.render!=='function')||
      (column.sortValue!==undefined&&typeof column.sortValue!=='function')) {
      throw new TypeError('Invalid collection column');
    }
    keys.add(column.key);
  }
}
export function createCollectionView({
  label,rows=[],columns,getRowId=row=>row.id,renderTile,
  modes=['table'],initialMode='table',initialSort=null,
  selectable=false,rowActions=[],pageSize=25,
  onModeChange,onSortChange,onSelectionChange,onRowAction,onEditRow,
}={}) {
  if(typeof label!=='string'||!label.trim())throw new TypeError('Collection label is required');
  if(typeof getRowId!=='function')throw new TypeError('getRowId must be a function');
  validateColumns(columns);
  if(!Array.isArray(modes)||!modes.length||new Set(modes).size!==modes.length||
    modes.some(mode=>!['table','tiles'].includes(mode))||!modes.includes(initialMode)||
    (modes.includes('tiles')&&typeof renderTile!=='function')) {
    throw new TypeError('Collection requires valid view modes and tile renderer');
  }
  if(initialSort!==null&&(!columns.some(col=>col.key===initialSort.key&&col.sortable!==false)||
      !['asc','desc'].includes(initialSort.direction)))throw new TypeError('Invalid initial sort');
  if(!Array.isArray(rowActions)||rowActions.some(item=>!item||
    typeof item.label!=='string'||typeof item.value!=='string'))throw new TypeError('Invalid row actions');

  const element=document.createElement('section');
  element.className='pg-collection-view';
  element.setAttribute('aria-label',label);
  element.dataset.pgSelectable=String(Boolean(selectable));
  element.dataset.pgRowActions=String(rowActions.length>0);
  element.dataset.pgRowEdit=String(typeof onEditRow==='function');
  const tableScroller=document.createElement('div');
  tableScroller.className='pg-collection-view__table-scroll pg-scrollbar';
  tableScroller.tabIndex=0;
  tableScroller.setAttribute('role','region');
  tableScroller.setAttribute('aria-label','Таблиця: '+label+'. Прокручуйте для перегляду стовпців.');
  const table=document.createElement('table');
  table.className='pg-collection-view__table';
  const caption=document.createElement('caption');
  caption.className='pg-collection-view__caption';
  caption.textContent=label;
  const thead=document.createElement('thead');
  const heading=document.createElement('tr');
  const tbody=document.createElement('tbody');
  const tiles=document.createElement('div');
  tiles.className='pg-collection-view__tiles pg-scrollbar';
  tiles.setAttribute('role','list');
  tiles.setAttribute('aria-label','Плитки: '+label);
  const empty=document.createElement('p');
  empty.className='pg-collection-view__empty';
  empty.textContent='Немає записів';
  empty.hidden=true;
  const controller=new AbortController();
  const headers=new Map();
  const selected=new Set();
  const rowControls=[];
  let dataset=[];
  let currentMode=initialMode;
  let sort=initialSort?{...initialSort}:null;
  let query='';

  const switcher=modes.length>1?createViewSwitch({
    modes,value:currentMode,
    onChange(next) {setMode(next);onModeChange?.(next);},
  }):null;

  const pageControl=createPagination({
    total:0,pageSize,
    onChange:()=>renderData(),
    label:'Сторінки: '+label,
  });

  let allCheckbox=null;
  if(selectable) {
    const th=document.createElement('th');
    th.scope='col';
    th.className='pg-collection-view__selection-cell';
    th.setAttribute('aria-label','Вибір записів');
    allCheckbox=createCheckbox({
      label:'Вибрати всі на поточній сторінці',compact:true,
      onChange:()=>{
        const pageRows=getVisibleRows();
        // Mixed means "clear what is selected", never "select the rest".
        // The same rule applies when every visible row is already selected.
        const hadSelection=pageRows.some(row=>selected.has(String(getRowId(row))));
        pageRows.forEach(row=>{
          const id=String(getRowId(row));
          if(hadSelection)selected.delete(id);else selected.add(id);
        });
        syncSelection();
        onSelectionChange?.(getSelectedIds());
      },
    });
    const controls=document.createElement('div');
    controls.className='pg-collection-view__row-controls';
    controls.append(allCheckbox.element);
    th.append(controls);
    heading.append(th);
  }

  for(const column of columns) {
    const th=document.createElement('th');
    th.scope='col';
    th.dataset.pgColumn=column.key;
    if(column.align==='end')th.dataset.pgAlign='end';
    if(column.primary)th.dataset.pgPrimary='true';
    if(column.sortable===false)th.textContent=column.label;
    else {
      const button=document.createElement('button');
      button.type='button';
      button.className='pg-collection-view__sort';
      const name=document.createElement('span');
      name.textContent=column.label;
      const marker=document.createElement('span');
      marker.className='pg-collection-view__sort-mark';
      marker.setAttribute('aria-hidden','true');
      button.append(name,marker);
      button.addEventListener('click',()=>{
        setSort(column.key,sort?.key===column.key&&sort.direction==='asc'?'desc':'asc');
      },{signal:controller.signal});
      th.append(button);
      headers.set(column.key,{th,button,marker,label:column.label});
    }
    heading.append(th);
  }

  if(rowActions.length) {
    const th=document.createElement('th');
    th.scope='col';
    th.className='pg-collection-view__actions-cell';
    th.textContent='Дії';
    heading.append(th);
  }

  thead.append(heading);
  table.append(caption,thead,tbody);
  tableScroller.append(table);
  element.append(tableScroller,tiles,empty,pageControl.element);
  // The caller may mount this same pagination element in the shared footer slot.

  function sortedRows() {
    const match=query.trim().toLocaleLowerCase('uk');
    const filtered=match?dataset.filter(row=>
      columns.some(column=>String(row[column.key]??'').toLocaleLowerCase('uk').includes(match))
    ):dataset;
    if(!sort)return [...filtered];
    const column=columns.find(col=>col.key===sort.key);
    return filtered.map((row,index)=>({row,index})).sort((a,b)=>{
      const value=column.sortValue||((record)=>record[column.key]);
      const delta=compareValues(value(a.row),value(b.row));
      return (sort.direction==='asc'?delta:-delta)||(a.index-b.index);
    }).map(item=>item.row);
  }
  function getVisibleRows() {
    const all=sortedRows();
    const {start,end}=pageControl.getState();
    return all.slice(start,end);
  }
  function getSelectedIds() {return [...selected];}
  function syncSelection() {
    if(!selectable)return;
    const visible=getVisibleRows();
    const n=visible.filter(row=>selected.has(String(getRowId(row)))).length;
    allCheckbox.setChecked(visible.length>0&&n===visible.length);
    allCheckbox.setIndeterminate(n>0&&n<visible.length);
    rowControls.forEach(({id,checkbox})=>checkbox.setChecked(selected.has(id)));
    element.dataset.pgSelectedCount=String(selected.size);
    tbody.querySelectorAll('tr').forEach(row=>{
      row.dataset.pgSelected=String(selected.has(row.dataset.pgRowId));
    });
  }
  function cleanupRows() {
    rowControls.forEach(({checkbox,menu})=>{
      checkbox?.destroy();menu?.destroy();
    });
    rowControls.length=0;
  }
  function renderData() {
    const all=sortedRows();
    pageControl.setTotal(all.length);
    const {start,end}=pageControl.getState();
    const shown=all.slice(start,end);
    cleanupRows();
    tbody.replaceChildren();
    tiles.replaceChildren();
    for(const row of shown) {
      const id=String(getRowId(row));
      const tr=document.createElement('tr');
      tr.dataset.pgRowId=id;
      let checkbox=null;
      if(selectable) {
        checkbox=createCheckbox({
          label:'Вибрати: '+String(row.name??id),compact:true,
          checked:selected.has(id),
          onChange:checked=>{
            if(checked)selected.add(id);else selected.delete(id);
            syncSelection();
            onSelectionChange?.(getSelectedIds());
          },
        });
        const cell=document.createElement('td');
        cell.className='pg-collection-view__selection-cell';
        const controls=document.createElement('div');
        controls.className='pg-collection-view__row-controls';
        controls.append(checkbox.element);
        if(typeof onEditRow==='function') {
          const edit=createIconButton({
            label:'Редагувати: '+String(row.name??id),
            icon:'pencil',action:'row-edit',
            onClick:()=>onEditRow(row),
          });
          edit.classList.add('pg-mini-button');
          controls.append(edit);
        }
        cell.append(controls);
        tr.append(cell);
      }
      let menu=null;
      for(const column of columns) {
        const td=document.createElement('td');
        if(column.align==='end')td.dataset.pgAlign='end';
        if(column.primary)td.dataset.pgPrimary='true';
        if(column.muted)td.dataset.pgMuted='true';
        const value=column.render?column.render(row):row[column.key];
        const span=document.createElement('span');
        span.className='pg-collection-view__cell-content';
        appendContent(span,value);
        if(!(value instanceof Node)&&value!=null)span.title=String(value);
        td.append(span);
        tr.append(td);
      }
      // Action menus are always the final column, after every data field.
      if(rowActions.length) {
        menu=createMenu({
          label:'Дії: '+String(row.name??id),align:'end',
          items:rowActions,
          onSelect:action=>onRowAction?.(action,row),
        });
        menu.trigger.replaceChildren(createIcon('ellipsis'));
        menu.trigger.classList.add('pg-mini-button');
        menu.trigger.setAttribute('aria-label','Дії: '+String(row.name??id));
        menu.element.classList.add('pg-collection-view__row-menu');
        const cell=document.createElement('td');
        cell.className='pg-collection-view__actions-cell';
        cell.append(menu.element);
        tr.append(cell);
      }
      rowControls.push({id,checkbox,menu});
      tbody.append(tr);
      if(modes.includes('tiles')) {
        const tile=renderTile(row);
        if(!(tile instanceof HTMLElement))throw new TypeError('renderTile must return HTMLElement');
        const wrapper=document.createElement('div');
        wrapper.className='pg-collection-view__tile';
        wrapper.dataset.pgRowId=id;
        wrapper.setAttribute('role','listitem');
        wrapper.append(tile);
        tiles.append(wrapper);
      }
    }
    empty.hidden=all.length>0;
    tableScroller.hidden=!all.length||currentMode!=='table';
    tiles.hidden=!all.length||currentMode!=='tiles';
    for(const [key,entry] of headers) {
      const state=sort?.key===key?(sort.direction==='asc'?'ascending':'descending'):null;
      if(state)entry.th.setAttribute('aria-sort',state);
      else entry.th.removeAttribute('aria-sort');
      entry.button.setAttribute('aria-label','Сортувати '+entry.label+' '+(state==='ascending'?'за спаданням':'за зростанням'));
      entry.marker.textContent=state==='ascending'?'↑':state==='descending'?'↓':'↕';
    }
    syncSelection();
  }
  function setRows(next) {
    if(!Array.isArray(next))throw new TypeError('Rows must be array');
    const ids=next.map(row=>String(getRowId(row)));
    if(ids.some(id=>!id||id==='undefined')||new Set(ids).size!==ids.length)
      throw new TypeError('Rows need unique stable ids');
    dataset=[...next];
    const available=new Set(ids);
    for(const id of selected)if(!available.has(id))selected.delete(id);
    renderData();
  }
  function setQuery(next) {
    query=String(next??'');
    pageControl.setPage(1);
    renderData();
  }
  function setSort(key,direction='asc') {
    if(!columns.some(col=>col.key===key&&col.sortable!==false)||
      !['asc','desc'].includes(direction))throw new RangeError('Invalid collection sort');
    sort={key,direction};
    pageControl.setPage(1);
    renderData();
    onSortChange?.({...sort});
  }
  function setMode(next) {
    if(!modes.includes(next))throw new RangeError('Unsupported view mode');
    currentMode=next;
    switcher?.setValue(next);
    element.dataset.pgView=next;
    const hasRows=sortedRows().length>0;
    tableScroller.hidden=!hasRows||next!=='table';
    tiles.hidden=!hasRows||next!=='tiles';
  }
  setRows(rows);
  setMode(currentMode);
  return Object.freeze({
    element,headerActions:switcher?.element??null,footerContent:pageControl.element,
    getMode:()=>currentMode,setMode,
    getRows:sortedRows,getVisibleRows,getSort:()=>sort?{...sort}:null,
    setSort,getQuery:()=>query,setQuery,getSelectedIds,clearSelection() {
      if(!selected.size)return;selected.clear();syncSelection();onSelectionChange?.([]);
    },
    getPagination:pageControl.getState,setPage:pageControl.setPage,
    setPageSize:pageControl.setPageSize,setRows,
    destroy(){
      controller.abort();cleanupRows();allCheckbox?.destroy();
      pageControl.destroy();switcher?.destroy();element.remove();
    },
  });
}
