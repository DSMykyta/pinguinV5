/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HOLOGRAPHIC FOIL
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Опційний шар голографічного відбиття.
 * ║ ЗАЛЕЖНОСТІ: DOM, глобальні CSS і токени.
 * ║ ПУБЛІЧНИЙ API: createHolographicFoil(), setOptions(), destroy().
 * ║ ПРИНЦИП: Окремі екземпляри; без циклічних таймерів, глобального стану чи залежності від feature.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

const PALETTES = new Set(['theme', 'spectrum']);
const BASES = new Set(['medium', 'dark', 'theme']);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// The hit region never rotates. Coordinates are normalized against the stable
// outer box, not against the moving surface (which would cause feedback jitter).
export function getFoilPose(clientX, clientY, rect) {
  const x = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : .5;
  const y = rect.height > 0 ? clamp((clientY - rect.top) / rect.height, 0, 1) : .5;
  return {
    x: x * 100, y: y * 100,
    rotateX: (.5 - y) * 20, rotateY: (x - .5) * 24,
    // A larger background moves left/up as its percentage increases.
    backgroundX: 15 + x * 70, backgroundY: 25 + y * 50,
  };
}

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
  const view = element.ownerDocument.defaultView;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const listeners = { signal: controller.signal };
  let state = { palette: 'theme', base: 'medium', intensity: .85, interactive: true, tilt: true, enabled: true, angle: 115 };
  let destroyed = false;
  let frame = null;
  let point = null;

  function applyPose(pose) {
    for (const [key, value] of Object.entries({
      'x': pose.x + '%', 'y': pose.y + '%',
      'rotate-x': pose.rotateX + 'deg', 'rotate-y': pose.rotateY + 'deg',
      'background-x': pose.backgroundX + '%', 'background-y': pose.backgroundY + '%',
    })) element.style.setProperty('--pg-foil-' + key, value);
  }

  function reset() {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    point = null;
    delete element.dataset.pgTracking;
    applyPose(getFoilPose(.5, .5, { left: 0, top: 0, width: 1, height: 1 }));
  }

  function track(event) {
    if (!state.enabled || !state.interactive || reduced.matches || event.pointerType === 'touch') return;
    point = { x: event.clientX, y: event.clientY };
    if (frame !== null) return;
    frame = view.requestAnimationFrame(() => {
      frame = null;
      if (!point || !element.isConnected) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) { reset(); return; }
      element.dataset.pgTracking = 'true';
      applyPose(getFoilPose(point.x, point.y, rect));
    });
  }

  function setOptions(patch = {}) {
    if (destroyed) throw new Error('HolographicFoil was destroyed');
    const next = { ...state, ...patch };
    if (!PALETTES.has(next.palette) || !BASES.has(next.base)) throw new RangeError('Unknown foil palette or base');
    for (const [key, min, max] of [['intensity', 0, 1], ['angle', 0, 360]]) {
      if (!Number.isFinite(next[key]) || next[key] < min || next[key] > max) throw new RangeError('Invalid foil ' + key);
    }
    for (const key of ['interactive', 'tilt', 'enabled']) {
      if (typeof next[key] !== 'boolean') throw new TypeError('Invalid foil ' + key);
    }
    state = next;
    element.dataset.pgPalette = state.palette;
    element.dataset.pgBase = state.base;
    element.dataset.pgInteractive = String(state.interactive);
    element.dataset.pgTilt = String(state.tilt);
    element.dataset.pgEnabled = String(state.enabled);
    element.style.setProperty('--pg-foil-intensity', String(state.intensity));
    element.style.setProperty('--pg-foil-angle', state.angle + 'deg');
    if (!state.enabled || !state.interactive) reset();
  }

  element.addEventListener('pointerenter', track, listeners);
  element.addEventListener('pointermove', track, listeners);
  element.addEventListener('pointerleave', reset, listeners);
  element.addEventListener('pointercancel', reset, listeners);
  view.addEventListener('blur', reset, listeners);
  reduced.addEventListener('change', reset, listeners);
  reset();
  setOptions(options);
  return Object.freeze({
    element, surface, content, setOptions,
    getOptions: () => ({ ...state }),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.abort();
      reset();
      element.remove();
    },
  });
}
