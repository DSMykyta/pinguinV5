/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — IMAGE FIELD DEMO                                                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Локальний Image Field та демонстрація шарму для фотографій.                            ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/image-field, ../../ui/photo-charm, ../../ui/switch.                            ║
 * ║ ПУБЛІЧНИЙ API: createImageFieldDemo().                                                               ║
 * ║ ПРИНЦИП: Показує композицію готових UI; обробку файлів не дублює.                                 ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import {createImageField} from '../../ui/image-field/image-field.js';
import {createPhotoCharm} from '../../ui/photo-charm/photo-charm.js';
import {createSwitch} from '../../ui/switch/switch.js';

// Online sample; always fall back to an embedded offline example.
const EXAMPLE_IMAGE='https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=960&q=80';
const FALLBACK_IMAGE='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">'+
  '<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#78a5bb"/>'+
  '<stop offset="1" stop-color="#edc3a3"/></linearGradient>'+
  '<linearGradient id="lake" x2="0" y2="1"><stop stop-color="#638f9d"/>'+
  '<stop offset="1" stop-color="#2d626c"/></linearGradient></defs>'+
  '<rect width="900" height="600" fill="url(#sky)"/>'+
  '<circle cx="662" cy="169" r="84" fill="#fff2c9" opacity=".85"/>'+
  '<path d="M0 386 240 98 427 330 590 156 900 412V600H0Z" fill="#467f89"/>'+
  '<path d="M0 430 226 230 410 401 641 269 900 454V600H0Z" fill="#255866"/>'+
  '<rect y="460" width="900" height="140" fill="url(#lake)"/></svg>'
);

export function createImageFieldDemo() {
  const element=document.createElement('section');
  element.className='pg-tools-image-demo';
  const title=document.createElement('h3');
  title.textContent='Зображення';
  const description=document.createElement('p');
  description.textContent='Шарм використовує те саме фото для м’якого розмитого тла. Можна вибрати власний файл і порівняти ефект.';
  const charm=createPhotoCharm({src:EXAMPLE_IMAGE,alt:'Демонстраційний пейзаж'});
  const effectSwitch=createSwitch({
    label:'Розмите тло',checked:true,
    description:'Атмосферне відображення фотографії позаду основного зображення',
    onChange:enabled=>charm.setEnabled(enabled),
  });
  const field=createImageField({
    label:'Фото товару',
    description:'PNG, JPEG, WebP, GIF або AVIF · до 2 МБ',
    maxBytes:2*1024*1024,
    onChange:value=>{
      charm.setSrc(value?.url||EXAMPLE_IMAGE,
        value?'Попередній перегляд: '+value.name:'Демонстраційний пейзаж');
    },
  });
  const handleExampleError=()=>{
    if(charm.getSrc()===EXAMPLE_IMAGE)charm.setSrc(FALLBACK_IMAGE,'Демонстраційний пейзаж');
  };
  charm.image.addEventListener('error',handleExampleError);
  const preview=document.createElement('div');
  preview.className='pg-tools-image-demo__preview';
  preview.append(charm.element);
  element.append(title,description,preview,effectSwitch.element,field.element);
  return {
    element,
    destroy() {
      charm.image.removeEventListener('error',handleExampleError);
      effectSwitch.destroy();
      charm.destroy();
      field.destroy();
      element.remove();
    },
  };
}
