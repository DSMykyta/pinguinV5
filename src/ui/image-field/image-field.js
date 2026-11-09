/**
 * PINGUIN NEXT — IMAGE FIELD
 * Native file picking and optional drop/paste, local preview and explicit cleanup.
 * No upload/persistence logic and no references to any feature.
 */
let sequence=0;
const DEFAULT_TYPES=['image/png','image/jpeg','image/webp','image/gif','image/avif'];

export function createImageField({
  label,id,value=null,description='',error='',disabled=false,
  maxBytes=2*1024*1024,acceptedTypes=DEFAULT_TYPES,onChange,
}={}) {
  if(typeof label!=='string'||!label.trim())throw new TypeError('Image Field label is required');
  if(!Number.isFinite(maxBytes)||maxBytes<=0)throw new RangeError('maxBytes must be positive');
  if(!Array.isArray(acceptedTypes)||!acceptedTypes.length)throw new TypeError('acceptedTypes must be a nonempty list');
  const allowed=new Set(acceptedTypes);
  const uid=id||'pg-image-field-'+(++sequence);
  const element=document.createElement('div');
  element.className='pg-image-field';
  const title=document.createElement('span');
  title.className='pg-image-field__label';
  title.textContent=label;
  const zone=document.createElement('div');
  zone.className='pg-image-field__zone';
  zone.setAttribute('role','group');
  zone.setAttribute('aria-label','Зображення: '+label);
  const picker=document.createElement('button');
  picker.type='button';
  picker.className='pg-image-field__choose';
  picker.textContent='Додати зображення';
  picker.disabled=Boolean(disabled);
  const fileInput=document.createElement('input');
  fileInput.type='file';
  fileInput.accept=acceptedTypes.join(',');
  fileInput.className='pg-image-field__file';
  fileInput.id=uid;
  fileInput.tabIndex=-1;
  fileInput.hidden=true;
  fileInput.disabled=Boolean(disabled);
  const preview=document.createElement('div');
  preview.className='pg-image-field__preview';
  preview.hidden=true;
  const image=document.createElement('img');
  image.className='pg-image-field__image';
  image.alt='';
  const imageName=document.createElement('span');
  imageName.className='pg-image-field__filename';
  const remove=document.createElement('button');
  remove.type='button';
  remove.className='pg-image-field__remove';
  remove.textContent='Прибрати';
  remove.disabled=Boolean(disabled);
  const replace=document.createElement('button');
  replace.type='button';
  replace.className='pg-image-field__replace';
  replace.textContent='Замінити';
  replace.disabled=Boolean(disabled);
  preview.append(image,imageName,replace,remove);
  const instruction=document.createElement('span');
  instruction.className='pg-image-field__instruction';
  instruction.textContent='Перетягніть зображення сюди або виберіть файл';
  zone.append(picker,fileInput,preview,instruction);
  const support=document.createElement('div');
  support.className='pg-image-field__support';
  const hint=document.createElement('span');
  hint.id=uid+'-description';
  hint.textContent=description||'PNG, JPEG, WebP, GIF або AVIF';
  const problem=document.createElement('span');
  problem.className='pg-image-field__error';
  problem.id=uid+'-error';
  problem.setAttribute('role','status');
  problem.hidden=true;
  support.append(hint,problem);
  element.append(title,zone,support);
  const controller=new AbortController();
  let current=null;
  let objectUrl=null;
  let disposed=false;

  function refresh(){
    const filled=!!current;
    element.dataset.pgFilled=String(filled);
    picker.hidden=filled;
    preview.hidden=!filled;
    imageName.textContent=current?.name||'';
    image.src=current?.url||'';
    image.alt=current?'Попередній перегляд: '+current.name:'';
    element.dataset.pgDisabled=String(Boolean(disabled));
  }
  function setError(message=''){
    problem.textContent=String(message||'');
    problem.hidden=!problem.textContent;
    element.dataset.pgState=problem.hidden?(disabled?'disabled':'ready'):'error';
    const described=[hint.textContent?hint.id:null,!problem.hidden?problem.id:null].filter(Boolean);
    if(described.length)zone.setAttribute('aria-describedby',described.join(' '));
    else zone.removeAttribute('aria-describedby');
  }
  function release(){
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=null;
  }
  function commit(next,event,notify=true){
    release();
    current=next?{...next}:null;
    refresh();
    setError('');
    if(notify)onChange?.(current?{...current}:null,event);
  }
  function validateFile(file){
    if(!(file instanceof File)||!file.size)return 'Порожній або недоступний файл.';
    if(!allowed.has(file.type))return 'Формат зображення не підтримується.';
    if(file.size>maxBytes)return 'Зображення перевищує дозволений розмір.';
    return '';
  }
  function handleFile(file,event){
    if(disposed||disabled||!file)return false;
    const issue=validateFile(file);
    if(issue){setError(issue);return false;}
    const url=URL.createObjectURL(file);
    objectUrl=url; // commit() releases the *previous* owned URL; keep new until after.
    // Temporarily detach new URL before commit so only the prior preview is revoked.
    const latest=objectUrl;
    objectUrl=null;
    commit({name:file.name,url,file},event);
    objectUrl=latest;
    return true;
  }
  function setValue(next){
    if(next===null){commit(null,undefined,false);return;}
    if(next instanceof File){
      const problem=validateFile(next);
      if(problem)throw new TypeError(problem);
      const url=URL.createObjectURL(next);
      release();
      objectUrl=url;
      current={name:next.name,url,file:next};
      refresh();setError('');
      return;
    }
    if(!next||typeof next.name!=='string'||typeof next.url!=='string'){
      throw new TypeError('Image value needs {name,url} or File');
    }
    // Only URLs explicitly supplied by the caller; never revoke externally owned URLs.
    if(!/^(https?:|blob:)/i.test(next.url))throw new TypeError('Unsupported initial image URL');
    commit({name:next.name,url:next.url,file:next.file||null},undefined,false);
  }
  function handleDrop(event){
    if(disabled||disposed)return;
    event.preventDefault();
    zone.dataset.pgDragging='false';
    handleFile(event.dataTransfer?.files?.[0],event);
  }
  picker.addEventListener('click',()=>fileInput.click(),{signal:controller.signal});
  replace.addEventListener('click',()=>fileInput.click(),{signal:controller.signal});
  remove.addEventListener('click',event=>{if(disabled)return;commit(null,event);fileInput.value='';},{signal:controller.signal});
  fileInput.addEventListener('change',event=>{
    handleFile(fileInput.files?.[0],event);
    // Permit selecting the exact same file again after a failed or removed attempt.
    fileInput.value='';
  },{signal:controller.signal});
  zone.addEventListener('dragenter',event=>{
    if(!disabled&&Array.from(event.dataTransfer?.types||[]).includes('Files')) {
      event.preventDefault();zone.dataset.pgDragging='true';
    }
  },{signal:controller.signal});
  zone.addEventListener('dragover',event=>{
    if(!disabled&&Array.from(event.dataTransfer?.types||[]).includes('Files')) {
      event.preventDefault();event.dataTransfer.dropEffect='copy';
    }
  },{signal:controller.signal});
  zone.addEventListener('dragleave',event=>{
    if(!zone.contains(event.relatedTarget))zone.dataset.pgDragging='false';
  },{signal:controller.signal});
  zone.addEventListener('drop',handleDrop,{signal:controller.signal});
  zone.addEventListener('paste',event=>{
    const file=Array.from(event.clipboardData?.files||[]).find(file=>allowed.has(file.type));
    if(file){event.preventDefault();handleFile(file,event);}
  },{signal:controller.signal});
  setValue(value);
  setError(error);
  return Object.freeze({
    element,fileInput,getValue:()=>current?{...current}:null,
    setValue,setError,focus(){(current?replace:picker).focus();},
    destroy(){disposed=true;controller.abort();release();element.remove();},
  });
}
