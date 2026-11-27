/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FOCUS CAROUSEL DEMO
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Демонстрація фокусної каруселі в Ефектах.
 * ║ ЗАЛЕЖНОСТІ: DOM, CSS і спільні токени.
 * ║ ПУБЛІЧНИЙ API: createFocusCarouselDemo().
 * ║ ПРИНЦИП: Незалежний екземпляр, без глобального стану.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createFocusCarousel } from '../../ui/focus-carousel/focus-carousel.js';
import { createSwitch } from '../../ui/switch/switch.js';

const PHOTOS = [
  ['1470770841072-f978cf4d019e', 'Озеро серед гір'],
  ['1464822759023-fed622ff2c3b', 'Гірські вершини'],
  ['1501785888041-af3ef285b470', 'Гірське озеро'],
  ['1470252649378-9c29740c9fa8', 'Ранковий пейзаж'],
  ['1469474968028-56623f02e42e', 'Сонце над горами'],
];

export function createFocusCarouselDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-focus-carousel-demo';
  const title = document.createElement('h3');
  title.textContent = 'Фокусна карусель';
  const description = document.createElement('p');
  description.textContent = 'Гортай колесом, перетягуванням, свайпом або стрілками клавіатури.';
  const stage = document.createElement('div');
  stage.className = 'pg-tools-focus-carousel-demo__stage';
  const items = PHOTOS.map(([id, alt]) => {
    const image = document.createElement('img');
    image.className = 'pg-tools-focus-carousel-demo__card';
    image.src = 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=720&h=960&q=80';
    image.alt = alt;
    image.draggable = false;
    image.decoding = 'async';
    image.loading = 'lazy';
    return image;
  });
  const carousel = createFocusCarousel({ items, label: 'Фокусна карусель: фотографії', pauseOnHover: false });
  const autoplay = createSwitch({
    label: 'Автопрокрутка',
    checked: false,
    onChange: enabled => carousel.setAutoplay(enabled),
  });
  const loop = createSwitch({
    label: 'Зациклення',
    checked: false,
    onChange: enabled => carousel.setLoop(enabled),
  });
  stage.append(carousel.element, autoplay.element, loop.element);
  element.append(title, description, stage);
  return Object.freeze({ element, destroy() { autoplay.destroy(); loop.destroy(); carousel.destroy(); element.remove(); } });
}
