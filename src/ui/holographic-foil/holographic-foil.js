/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HOLOGRAPHIC FOIL
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Опційний шар голографічного відбиття.
 * ║ ЗАЛЕЖНОСТІ: DOM, глобальні CSS і токени.
 * ║ ПУБЛІЧНИЙ API: createHolographicFoil(), setOptions(), destroy().
 * ║ ПРИНЦИП: Окремі екземпляри; без таймерів, глобального стану чи залежності від feature.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

const PALETTES = new Set(['theme', 'spectrum']);
const BASES = new Set(['medium', 'dark', 'theme']);

export function createHolographicFoil(options = {}) {
  const element = document.createElement('div');
  element.className = 'pg-holographic-foil';
  const surface = document.createElement('div');
  surface.className = 'pg-holographic-foil__surface';
  const layer = document.createElement('span');
  layer.className = 'pg-holographic-foil__layer';
  layer.setAttribute('aria-hidden', 'true');
  const content = document.createElement('div');
  content.className = 'pg-holographic-foil__content';
  surface.append(layer, content);
  element.append(surface);
  let state = { palette: 'theme', base: 'medium', intensity: 0.85, duration: 6, animated: false, tilt: false, enabled: true, angle: 115 };
  let destroyed = false;

  function setOptions(patch = {}) {
    if (destroyed) throw new Error('HolographicFoil was destroyed');
    const next = { ...state, ...patch };
    if (!PALETTES.has(next.palette) || !BASES.has(next.base)) throw new RangeError('Unknown foil palette or base');
    for (const [key, min, max] of [['intensity', 0, 1], ['duration', 2, 30], ['angle', 0, 360]]) {
      if (!Number.isFinite(next[key]) || next[key] < min || next[key] > max) throw new RangeError('Invalid foil ' + key);
    }
    for (const key of ['animated', 'tilt', 'enabled']) {
      if (typeof next[key] !== 'boolean') throw new TypeError('Invalid foil ' + key);
    }
    state = next;
    element.dataset.pgPalette = state.palette;
    element.dataset.pgBase = state.base;
    element.dataset.pgAnimated = String(state.animated);
    element.dataset.pgTilt = String(state.tilt);
    element.dataset.pgEnabled = String(state.enabled);
    element.style.setProperty('--pg-foil-intensity', String(state.intensity));
    element.style.setProperty('--pg-foil-duration', state.duration + 's');
    element.style.setProperty('--pg-foil-angle', state.angle + 'deg');
  }
  setOptions(options);
  return Object.freeze({
    element, surface, content, setOptions,
    getOptions: () => ({ ...state }),
    destroy() { destroyed = true; element.remove(); },
  });
}
