// Visual only: preserve native values, keyboard, selection, autosave and export.
const bound=new WeakSet();
function sync(field){
 const mirror=field.parentElement?.querySelector(':scope > .gt-ingredient-mirror');
 if(!mirror)return;
 const inner=mirror.firstElementChild;
 inner.style.transform='translate('+(-field.scrollLeft)+'px,'+(-field.scrollTop)+'px)';
 inner.style.width=field.tagName==='TEXTAREA'?'100%':'max-content';
}
export function renderIngredientHighlights(field,matches=[]){
 if(!field)return;
 const host=field.parentElement;
 host.querySelector(':scope > .gt-ingredient-mirror')?.remove();
 host.classList.remove('gt-highlight-field');
 if(field.dataset.gtIngredientHint){field.removeAttribute('title');delete field.dataset.gtIngredientHint;}
 if(!matches.length)return;
 const mirror=document.createElement('div');mirror.className='gt-ingredient-mirror';mirror.setAttribute('aria-hidden','true');
 const inner=document.createElement('div'),computed=getComputedStyle(field);
 for(const p of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','textAlign','textTransform','wordSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','tabSize'])inner.style[p]=computed[p];
 inner.style.whiteSpace=field.tagName==='TEXTAREA'?'pre-wrap':'pre';
 inner.style.overflowWrap=field.tagName==='TEXTAREA'?'break-word':'normal';inner.style.boxSizing='border-box';
 let pos=0;
 for(const m of matches){inner.append(document.createTextNode(field.value.slice(pos,m.start)));const mark=document.createElement('mark');mark.className='gt-ingredient-'+m.color;mark.textContent=field.value.slice(m.start,m.end);inner.append(mark);pos=m.end;}
 inner.append(document.createTextNode(field.value.slice(pos)));mirror.append(inner);host.append(mirror);host.classList.add('gt-highlight-field');
 field.dataset.gtIngredientHint=[...new Set(matches.map(m=>m.label))].join(' · ');field.title=field.dataset.gtIngredientHint;
 if(!bound.has(field)){bound.add(field);field.addEventListener('scroll',()=>sync(field),{passive:true});field.addEventListener('input',()=>{field.parentElement?.querySelector(':scope > .gt-ingredient-mirror')?.remove();field.parentElement?.classList.remove('gt-highlight-field');});}
 sync(field);requestAnimationFrame(()=>sync(field));
}
