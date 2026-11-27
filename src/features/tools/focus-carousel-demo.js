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

export function createFocusCarouselDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-focus-carousel-demo';
  const title = document.createElement('h3');
  title.textContent = 'Фокусна карусель';
  const description = document.createElement('p');
  description.textContent = 'Гортай пальцем, трекпадом, мишею або стрілками клавіатури.';
  const stage = document.createElement('div');
  stage.className = 'pg-tools-focus-carousel-demo__stage';
  const items = ['main', 'secondary', 'success', 'tertiary', 'warning'].map(tone => {
    const card = document.createElement('div');
    card.className = 'pg-tools-focus-carousel-demo__card';
    card.dataset.pgTone = tone;
    const landscape = document.createElement('div');
    landscape.className = 'pg-tools-focus-carousel-demo__landscape';
    landscape.setAttribute('aria-hidden', 'true');
    card.append(landscape);
    return card;
  });
  const carousel = createFocusCarousel({ items, label: 'Фокусна карусель: п’ять кольорових пейзажів' });
  stage.append(carousel.element);
  element.append(title, description, stage);
  return Object.freeze({ element, destroy() { carousel.destroy(); element.remove(); } });
}
