/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HOLOGRAPHIC FOIL DEMO
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Інтерактивний голографічний квиток.
 * ║ ЗАЛЕЖНОСТІ: Спільні Foil, Slider, Switch, SegmentSwitch.
 * ║ ПУБЛІЧНИЙ API: createHolographicFoilDemo().
 * ║ ПРИНЦИП: Демо лише компонує спільні механізми.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createHolographicFoil } from '../../ui/holographic-foil/holographic-foil.js';
import { createSlider } from '../../ui/slider/slider.js';
import { createSwitch } from '../../ui/switch/switch.js';
import { createSegmentSwitch } from '../../ui/segment-switch/segment-switch.js';

export function createHolographicFoilDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-holographic-foil-demo';
  const title = document.createElement('h3');
  title.textContent = 'Голографічна фольга';
  const description = document.createElement('p');
  description.textContent = 'Наведи курсор на картку. Нахил і відбиття реагують на його положення.';
  const stage = document.createElement('div');
  stage.className = 'pg-tools-holographic-foil-demo__stage';
  const foil = createHolographicFoil({ base: 'medium', palette: 'spectrum' });
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
  const update = patch => foil.setOptions(patch);
  const controls = document.createElement('div');
  controls.className = 'pg-tools-holographic-foil-demo__controls';
  const palette = createSegmentSwitch({ label: 'Палітра фольги', value: 'spectrum', fit: true,
    options: [{ value: 'theme', label: 'Pinguin' }, { value: 'spectrum', label: 'Спектр' }],
    onChange: value => update({ palette: value }) });
  const intensity = createSlider({ label: 'Інтенсивність', value: 85, formatValue: n => n + '%',
    onInput: n => update({ intensity: n / 100 }) });
  const angle = createSlider({ label: 'Кут градієнта', min: 0, max: 360, value: 115, formatValue: n => n + '°',
    onInput: n => update({ angle: n }) });
  const enabled = createSwitch({ label: 'Фольга', checked: true, onChange: value => update({ enabled: value }) });
  const motion = createSwitch({ label: 'Реакція на курсор', checked: true, onChange: value => update({ interactive: value }) });
  const tilt = createSwitch({ label: 'Нахил поверхні', checked: true, onChange: value => update({ tilt: value }) });
  const widgets = [palette, intensity, angle, enabled, motion, tilt];
  controls.append(...widgets.map(widget => widget.element));
  element.append(title, description, stage, controls);
  return Object.freeze({
    element,
    destroy() { widgets.forEach(widget => widget.destroy()); foil.destroy(); element.remove(); },
  });
}
