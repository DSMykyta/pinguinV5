/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PHOTO CHARM                                                ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Чітке зображення з декоративним розмитим відбитком позаду.    ║
 * ║ ЗАЛЕЖНОСТІ: Немає; тільки DOM і CSS.                                      ║
 * ║ ПУБЛІЧНИЙ API: createPhotoCharm(), setSrc(), setEnabled(), destroy().     ║
 * ║ ПРИНЦИП: Ефект не володіє файлами, URL та логікою завантаження.           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

export function createPhotoCharm({src,alt='',enabled=true}={}) {
  const element=document.createElement('div');
  element.className='pg-photo-charm';
  const aura=document.createElement('img');
  aura.className='pg-photo-charm__aura';
  aura.alt='';
  aura.setAttribute('aria-hidden','true');
  aura.decoding='async';
  const image=document.createElement('img');
  image.className='pg-photo-charm__image';
  image.decoding='async';
  element.append(aura,image);
  let currentSrc='';
  let isEnabled=false;
  let destroyed=false;

  function setSrc(nextSrc,nextAlt=image.alt) {
    if(destroyed)throw new Error('Photo Charm was destroyed');
    if(typeof nextSrc!=='string'||!nextSrc.trim()) {
      throw new TypeError('Photo Charm requires a nonempty image src');
    }
    if(typeof nextAlt!=='string')throw new TypeError('Photo Charm alt must be text');
    currentSrc=nextSrc;
    image.alt=nextAlt;
    // Both layers share one source; the browser can reuse its image cache.
    image.src=currentSrc;
    aura.src=currentSrc;
  }
  function setEnabled(next) {
    if(destroyed)throw new Error('Photo Charm was destroyed');
    isEnabled=Boolean(next);
    element.dataset.pgEnabled=String(isEnabled);
  }
  setSrc(src,alt);
  setEnabled(enabled);
  return Object.freeze({
    element,image,
    setSrc,setEnabled,
    getSrc:()=>currentSrc,
    getEnabled:()=>isEnabled,
    destroy() {
      if(destroyed)return;
      destroyed=true;
      image.removeAttribute('src');
      aura.removeAttribute('src');
      element.remove();
    },
  });
}
