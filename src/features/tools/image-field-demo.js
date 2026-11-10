/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — IMAGE FIELD DEMO                                                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Independent Image Field preview; local browser URL, no network upload.                 ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/image-field/image-field                                                        ║
 * ║ ПУБЛІЧНИЙ API: createImageFieldDemo()                                                               ║
 * ║ ПРИНЦИП: Тільки демонстрація; вигляд і логіка спільного UI не дублюються.                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createImageField } from '../../ui/image-field/image-field.js';

export function createImageFieldDemo() {
  const element=document.createElement('section');
  element.className='pg-tools-image-demo';
  const title=document.createElement('h3');
  title.textContent='Зображення';
  const description=document.createElement('p');
  description.textContent='Додайте, замініть або приберіть локальне зображення. Збереження на сервері не виконується.';
  const field=createImageField({
    label:'Фото товару',
    description:'PNG, JPEG, WebP, GIF або AVIF · до 2 МБ',
    maxBytes:2*1024*1024,
  });
  element.append(title,description,field.element);
  return {element,destroy(){field.destroy();element.remove();}};
}
