/**
 * PINGUIN NEXT — UNIVERSAL PAGINATION
 * Compact page navigation; page-size choice is delegated to the existing Shell FAB.
 * Native buttons and version-independent page math, without a second launcher.
 * The caller decides where the element is mounted (e.g. the Shell footer slot).
 */
export const DEFAULT_PAGE_SIZES=Object.freeze([10,25,50,100,0]);

export function getPageNumbers(total,page,maxVisible=7) {
  if(!Number.isInteger(total)||total<1||!Number.isInteger(page)||
     page<1||page>total)return [];
  if(total<=maxVisible)return Array.from({length:total},(_,i)=>i+1);
  if(page<=4)return [1,2,3,4,5,'…',total];
  if(page>=total-3)return [1,'…',...Array.from({length:5},(_,i)=>total-4+i)];
  return [1,'…',page-1,page,page+1,'…',total];
}

export function createPagination({
  total=0,page=1,pageSize=25,sizes=DEFAULT_PAGE_SIZES,
  label='Пагінація',onChange,
}={}) {
  if(!Number.isInteger(total)||total<0||!Number.isInteger(page)||page<1||
    !Array.isArray(sizes)||!sizes.length||
    sizes.some(n=>!Number.isInteger(n)||n<0)||new Set(sizes).size!==sizes.length||
    !sizes.includes(pageSize))throw new TypeError('Invalid pagination configuration');

  const element=document.createElement('nav');
  element.className='pg-pagination';
  element.setAttribute('aria-label',label);
  const status=document.createElement('span');
  status.className='pg-pagination__status';
  status.setAttribute('role','status');
  const nav=document.createElement('div');
  nav.className='pg-pagination__pages';
  nav.setAttribute('aria-label','Сторінки');
  element.append(status,nav);

  const controller=new AbortController();
  let count=total,current=page,limit=pageSize;
  const pages=()=>limit===0?1:Math.max(1,Math.ceil(count/limit));

  function getState(){
    current=Math.max(1,Math.min(pages(),current));
    const start=count?(limit?(current-1)*limit:0):0;
    const end=count?(limit?Math.min(current*limit,count):count):0;
    return Object.freeze({
      page:current,pageSize:limit,total:count,totalPages:pages(),start,end,
    });
  }

  function addButton(text,accessibleName,to,disabled=false){
    const button=document.createElement('button');
    button.type='button';
    button.className='pg-pagination__button';
    button.textContent=text;
    button.setAttribute('aria-label',accessibleName);
    button.dataset.pgPageTarget=String(to);
    button.disabled=disabled;
    if(to===current)button.setAttribute('aria-current','page');
    nav.append(button);
  }

  function render(){
    const state=getState();
    status.textContent='Показано '+(state.end-state.start)+' з '+count;
    nav.replaceChildren();
    addButton('‹','Попередня сторінка',current-1,current===1);
    for(const n of getPageNumbers(state.totalPages,current)){
      if(n==='…') {
        const dots=document.createElement('span');
        dots.className='pg-pagination__dots';
        dots.textContent='...';
        dots.setAttribute('aria-hidden','true');
        nav.append(dots);
      } else addButton(String(n),'Сторінка '+n,n);
    }
    addButton('›','Наступна сторінка',current+1,current===state.totalPages);
  }

  function setPage(next){
    if(!Number.isInteger(next))throw new TypeError('Page must be integer');
    const clamped=Math.max(1,Math.min(pages(),next));
    if(current===clamped)return;
    current=clamped;
    render();onChange?.(getState());
  }
  function setPageSize(next){
    if(!sizes.includes(next))throw new RangeError('Unsupported page size');
    if(limit===next)return;
    limit=next;current=1;
    render();onChange?.(getState());
  }
  function setTotal(next){
    if(!Number.isInteger(next)||next<0)throw new TypeError('Total must be non-negative integer');
    count=next;current=Math.max(1,Math.min(pages(),current));render();
  }

  nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-pg-page-target]');
    if(!button||button.disabled||!nav.contains(button))return;
    setPage(Number(button.dataset.pgPageTarget));
  },{signal:controller.signal});
  render();
  return Object.freeze({
    element,getState,setPage,setPageSize,setTotal,
    destroy(){controller.abort();element.remove();},
  });
}
