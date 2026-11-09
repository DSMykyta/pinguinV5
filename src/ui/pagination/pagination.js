/**
 * PINGUIN NEXT — PAGINATION
 * Legacy-style page numbers, ellipsis, page size and result range.
 * No knowledge of tables, features, Shell, storage or data fetching.
 */
export const DEFAULT_PAGE_SIZES = Object.freeze([10, 25, 50, 100, 0]);

export function getPageNumbers(total, page, radius = 1) {
  if (!Number.isInteger(total) || total < 1 || !Number.isInteger(page) ||
      page < 1 || page > total) return [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const numbers = new Set([1, total]);
  for (let n = Math.max(2, page - radius); n <= Math.min(total - 1, page + radius); n++) numbers.add(n);
  const ordered = [...numbers].sort((a,b) => a-b);
  const output = [];
  for (let i = 0; i < ordered.length; i++) {
    if (i && ordered[i] - ordered[i - 1] > 1) {
      if (ordered[i] - ordered[i - 1] === 2) output.push(ordered[i] - 1);
      else output.push('…');
    }
    output.push(ordered[i]);
  }
  return output;
}

export function createPagination({
  total = 0, page = 1, pageSize = 25,
  sizes = DEFAULT_PAGE_SIZES, label = 'Пагінація', onChange,
} = {}) {
  if (!Number.isInteger(total) || total < 0 ||
      !Number.isInteger(page) || page < 1 || !Array.isArray(sizes) ||
      !sizes.length || sizes.some(value => !Number.isInteger(value) || value < 0) ||
      !sizes.includes(pageSize)) throw new TypeError('Invalid pagination configuration');
  const element = document.createElement('nav');
  element.className = 'pg-pagination';
  element.setAttribute('aria-label', label);
  const status = document.createElement('span');
  status.className = 'pg-pagination__status';
  const nav = document.createElement('div');
  nav.className = 'pg-pagination__pages';
  const setting = document.createElement('label');
  setting.className = 'pg-pagination__setting';
  const settingText = document.createElement('span');
  settingText.textContent = 'Рядків:';
  const sizeInput = document.createElement('select');
  sizeInput.className = 'pg-pagination__page-size';
  sizeInput.setAttribute('aria-label', 'Рядків на сторінці');
  for (const item of sizes) {
    const option = document.createElement('option');
    option.value = String(item);
    option.textContent = item === 0 ? 'Усі' : String(item);
    sizeInput.append(option);
  }
  setting.append(settingText, sizeInput);
  element.append(status, nav, setting);
  const controller = new AbortController();
  let count = total;
  let current = page;
  let limit = pageSize;

  const pages = () => limit === 0 ? 1 : Math.max(1, Math.ceil(count / limit));
  function getState() {
    current = Math.max(1, Math.min(pages(), current));
    const from = count ? (limit ? (current-1)*limit : 0) : 0;
    const to = count ? (limit ? Math.min(current*limit,count) : count) : 0;
    return Object.freeze({page:current,pageSize:limit,total:count,
      totalPages:pages(),start:from,end:to});
  }
  function addButton(text,label,where,disabled=false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-pagination__button';
    button.textContent = text;
    button.setAttribute('aria-label',label);
    button.disabled = disabled;
    if (typeof where === 'number' && where === current) button.setAttribute('aria-current','page');
    button.addEventListener('click',()=>setPage(where),{signal:controller.signal});
    nav.append(button);
  }
  function render() {
    const state = getState();
    status.textContent = count ? (state.start+1)+'–'+state.end+' із '+count : '0 записів';
    sizeInput.value = String(limit);
    nav.replaceChildren();
    addButton('‹','Попередня сторінка',current-1,current===1);
    for(const next of getPageNumbers(state.totalPages,current)){
      if(next==='…') {
        const dots=document.createElement('span');
        dots.className='pg-pagination__dots';
        dots.textContent=next;
        dots.setAttribute('aria-hidden','true');
        nav.append(dots);
      } else addButton(String(next),'Сторінка '+next,next);
    }
    addButton('›','Наступна сторінка',current+1,current===state.totalPages);
  }
  function setPage(next){
    if(!Number.isInteger(next))throw new TypeError('Page must be integer');
    const clamped=Math.max(1,Math.min(pages(),next));
    if(current===clamped)return;
    current=clamped;
    render();
    onChange?.(getState());
  }
  function setPageSize(next){
    if(!sizes.includes(next))throw new RangeError('Unsupported page size');
    if(limit===next)return;
    limit=next;current=1;
    render();onChange?.(getState());
  }
  function setTotal(next){
    if(!Number.isInteger(next)||next<0)throw new TypeError('Total must be non-negative integer');
    count=next;current=Math.max(1,Math.min(pages(),current));
    render();
  }
  sizeInput.addEventListener('change',()=>setPageSize(Number(sizeInput.value)),{signal:controller.signal});
  render();
  return Object.freeze({
    element,getState,setPage,setPageSize,setTotal,
    destroy(){controller.abort();element.remove();},
  });
}
