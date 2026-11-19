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
const FALLBACK_IMAGE=new URL('./photo-charm-fallback.svg',import.meta.url).href;

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
