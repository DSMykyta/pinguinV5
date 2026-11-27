/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HOLOGRAPHIC FOIL DEMO
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Порівняння фольги на різних основах.
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
  description.textContent = 'Один механізм, три основи. Світліша основа підсилює відблиск, темніша приглушує його.';
  const gallery = document.createElement('div');
  gallery.className = 'pg-tools-holographic-foil-demo__gallery';
  const foils = [['medium', 'Сіра основа'], ['dark', 'Темна основа'], ['theme', 'Колір теми']].map(([base, label]) => {
    const figure = document.createElement('figure');
    figure.className = 'pg-tools-holographic-foil-demo__sample';
    const foil = createHolographicFoil({ base, animated: true, tilt: true });
    const caption = document.createElement('figcaption');
    caption.textContent = label;
    const swatch = document.createElement('div');
    swatch.className = 'pg-tools-holographic-foil-demo__swatch';
    foil.content.append(swatch);
    figure.append(foil.element, caption);
    gallery.append(figure);
    return foil;
  });
  const update = patch => foils.forEach(foil => foil.setOptions(patch));
  const controls = document.createElement('div');
  controls.className = 'pg-tools-holographic-foil-demo__controls';
  const palette = createSegmentSwitch({ label: 'Палітра фольги', value: 'theme', fit: true,
    options: [{ value: 'theme', label: 'Pinguin' }, { value: 'spectrum', label: 'Спектр' }],
    onChange: value => update({ palette: value }) });
  const intensity = createSlider({ label: 'Інтенсивність', value: 85, formatValue: n => n + '%',
    onInput: n => update({ intensity: n / 100 }) });
  const duration = createSlider({ label: 'Тривалість циклу', min: 2, max: 20, value: 6, formatValue: n => n + ' с',
    onInput: n => update({ duration: n }) });
  const angle = createSlider({ label: 'Кут градієнта', min: 0, max: 360, value: 115, formatValue: n => n + '°',
    onInput: n => update({ angle: n }) });
  const enabled = createSwitch({ label: 'Фольга', checked: true, onChange: value => update({ enabled: value }) });
  const motion = createSwitch({ label: 'Анімація', checked: true, onChange: value => update({ animated: value }) });
  const tilt = createSwitch({ label: 'Нахил поверхні', checked: true, onChange: value => update({ tilt: value }) });
  const widgets = [palette, intensity, duration, angle, enabled, motion, tilt];
  controls.append(...widgets.map(widget => widget.element));
  element.append(title, description, gallery, controls);
  return Object.freeze({
    element,
    destroy() { widgets.forEach(widget => widget.destroy()); foils.forEach(foil => foil.destroy()); element.remove(); },
  });
}
