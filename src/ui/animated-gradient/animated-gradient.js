/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT                                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Light/Storm/Dawn, дві готові підкладки, плавний CSS-композиторний рух.              ║
 * ║ ЗАЛЕЖНОСТІ: color-field.js, CSS, existing semantic palettes.                                   ║
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradient({ text, preset }), element.setPreset/getPreset.            ║
 * ║ ПРИНЦИП: Без щокадрового JS, без нового Dialog чи дублювання анімацій.                           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createColorFieldPainter, GRADIENT_PRESETS } from './color-field.js';

/** Same existing HTMLElement API; no separate renderer/component per preset. */
export function createAnimatedGradient({ text = 'pinguinV6', preset = 'dawn' } = {}) {
  if (text !== null && (typeof text !== 'string' || !text.trim())) {
    throw new TypeError('AnimatedGradient text must be null or a non-empty string');
  }
  if (!GRADIENT_PRESETS.includes(preset)) {
    throw new RangeError('Unknown animated gradient preset');
  }

  const doc = document;
  const view = doc.defaultView;
  const surface = doc.createElement('section');
  surface.className = 'pg-animated-gradient';
  surface.setAttribute('aria-label', 'Анімований градієнт');
  surface.dataset.pgPreset = preset;

  const layers = ['a', 'b'].map(layer => {
    const canvas = doc.createElement('canvas');
    canvas.className = 'pg-animated-gradient__canvas pg-animated-gradient__canvas--' + layer;
    canvas.setAttribute('aria-hidden', 'true');
    surface.append(canvas);
    return canvas;
  });

  const grain = doc.createElement('canvas');
  grain.className = 'pg-animated-gradient__grain';
  grain.setAttribute('aria-hidden', 'true');
  surface.append(grain);

  if (text !== null) {
    const title = doc.createElement('p');
    title.className = 'pg-animated-gradient__title';
    title.textContent = text;
    surface.append(title);
  }

  const painter = createColorFieldPainter(surface, layers, grain);
  let mounted = false;
  let visible = true;
  let resizeObserver;
  let intersectionObserver;
  let themeObserver;
  const reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)');

  function syncMotion() {
    const modal = doc.querySelector('.pg-dialog[open]');
    const paused = doc.hidden || !visible || Boolean(reducedMotion?.matches) ||
      (modal && !modal.contains(surface));
    surface.dataset.pgGradientPaused = String(Boolean(paused));
  }

  function render() {
    if (!mounted || !surface.isConnected || !painter) return;
    painter.render(surface.dataset.pgPreset);
  }

  function onThemeChange() { render(); }
  function stop() {
    mounted = false;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    themeObserver?.disconnect();
    doc.removeEventListener('visibilitychange', syncMotion);
    doc.removeEventListener('pg:modal-change', syncMotion);
    reducedMotion?.removeEventListener?.('change', syncMotion);
    connectionObserver.disconnect();
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    render();
    if (view.ResizeObserver) {
      resizeObserver = new view.ResizeObserver(render);
      resizeObserver.observe(surface);
    }
    if (view.IntersectionObserver) {
      intersectionObserver = new view.IntersectionObserver(entries => {
        visible = entries[0]?.isIntersecting ?? true;
        syncMotion();
      });
      intersectionObserver.observe(surface);
    }
    themeObserver = new view.MutationObserver(onThemeChange);
    themeObserver.observe(doc.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });
    doc.addEventListener('visibilitychange', syncMotion);
    doc.addEventListener('pg:modal-change', syncMotion);
    reducedMotion?.addEventListener?.('change', syncMotion);
    syncMotion();
  }

  // Content is created before the shared Dialog inserts it in the document.
  // Watch attachment only until mount and disconnect once the DOM is removed.
  const connectionObserver = new view.MutationObserver(() => {
    if (surface.isConnected) mount();
    else if (mounted) stop();
  });
  connectionObserver.observe(doc, { childList: true, subtree: true });
  if (surface.isConnected) mount();

  surface.getPreset = () => surface.dataset.pgPreset;
  surface.setPreset = next => {
    if (!GRADIENT_PRESETS.includes(next)) {
      throw new RangeError('Unknown animated gradient preset');
    }
    if (surface.dataset.pgPreset === next) return false;
    surface.dataset.pgPreset = next;
    render();
    return true;
  };
  return surface;
}
