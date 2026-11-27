/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HOLOGRAPHIC FOIL DEMO
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Інтерактивний голографічний квиток.
 * ║ ЗАЛЕЖНОСТІ: Спільний HolographicFoil.
 * ║ ПУБЛІЧНИЙ API: createHolographicFoilDemo().
 * ║ ПРИНЦИП: Демо лише компонує спільні механізми.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createHolographicFoil } from '../../ui/holographic-foil/holographic-foil.js';

export function createHolographicFoilDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-holographic-foil-demo';
  const title = document.createElement('h3');
  title.textContent = 'Голографічна фольга';
  const description = document.createElement('p');
  description.textContent = 'Наведи курсор на картку. Нахил і відбиття реагують на його положення.';
  const stage = document.createElement('div');
  stage.className = 'pg-tools-holographic-foil-demo__stage';
  const foil = createHolographicFoil({ base: 'medium', palette: 'theme' });
  const card = document.createElement('div');
  card.className = 'pg-tools-holographic-foil-demo__card';
  const top = document.createElement('div');
  top.className = 'pg-tools-holographic-foil-demo__top';
  const edition = document.createElement('span');
  edition.textContent = 'Pinguin Next';
  const number = document.createElement('span');
  number.textContent = '№ 001';
  top.append(edition, number);
  const name = document.createElement('strong');
  name.className = 'pg-tools-holographic-foil-demo__name';
  name.textContent = 'PINGUIN';
  const bottom = document.createElement('div');
  bottom.className = 'pg-tools-holographic-foil-demo__bottom';
  const label = document.createElement('span');
  label.textContent = 'HOLOGRAPHIC PASS';
  const year = document.createElement('span');
  year.textContent = '2026';
  bottom.append(label, year);
  card.append(top, name, bottom);
  foil.content.append(card);
  stage.append(foil.element);
  element.append(title, description, stage);
  return Object.freeze({
    element,
    destroy() { foil.destroy(); element.remove(); },
  });
}
