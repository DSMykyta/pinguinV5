/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT                                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Безшовне триколірне поле, адаптивний маловитратний Canvas renderer.               ║
 * ║ ЗАЛЕЖНОСТІ: DOM, color-field.js, три існуючі семантичні колірні токени.                         ║
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradient({ text }).                                              ║
 * ║ ПРИНЦИП: Один компонент; зупиняти рендер поза екраном/під Dialog/при reduced motion.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createColorFieldPainter } from './color-field.js';

/**
 * Same existing API: text=null creates a purely visual gradient.
 * No new modal, library, external images, or uncontrolled animation timers.
 */
export function createAnimatedGradient({ text = 'pinguin V6' } = {}) {
  if (text !== null && (typeof text !== 'string' || !text.trim())) {
    throw new TypeError('AnimatedGradient text must be null or a non-empty string');
  }

  const surface = document.createElement('section');
  surface.className = 'pg-animated-gradient';
  surface.setAttribute('aria-label', 'Анімований градієнт');

  const canvas = document.createElement('canvas');
  canvas.className = 'pg-animated-gradient__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  surface.append(canvas);

  if (text !== null) {
    const title = document.createElement('p');
    title.className = 'pg-animated-gradient__title';
    title.textContent = text;
    surface.append(title);
  }

  const painter = createColorFieldPainter(surface, canvas);
  if (!painter) return surface; // Keep a solid semantic CSS fallback.

  const doc = surface.ownerDocument;
  const view = doc.defaultView;
  const reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let mounted = false;
  let visible = true;
  let frameId = 0;
  let previousFrame = 0;
  let lastPaint = 0;
  let elapsed = 0;
  let resizeObserver = null;
  let intersectionObserver = null;
  let themeObserver = null;

  function allowedToAnimate() {
    const modal = doc.querySelector('.pg-dialog[open]');
    return !doc.hidden && visible && !reducedMotion?.matches &&
      (!modal || modal.contains(surface));
  }

  function frame(now) {
    frameId = 0;
    if (!mounted || !allowedToAnimate()) return;
    if (!previousFrame) previousFrame = now;
    if (now - lastPaint >= 1000 / 24) {
      elapsed += Math.min(.1, (now - previousFrame) / 1000);
      painter.draw(elapsed);
      lastPaint = now;
    }
    previousFrame = now;
    frameId = view.requestAnimationFrame(frame);
  }

  function sync() {
    if (!mounted) return;
    if (!allowedToAnimate()) {
      if (frameId) view.cancelAnimationFrame(frameId);
      frameId = 0;
      previousFrame = 0;
      return;
    }
    if (!frameId) frameId = view.requestAnimationFrame(frame);
  }

  function paintCurrentFrame() {
    if (!mounted) return;
    painter.resize();
    painter.draw(reducedMotion?.matches ? 0 : elapsed);
    sync();
  }

  function onThemeChange() {
    painter.refreshColors();
    paintCurrentFrame();
  }

  function stop() {
    if (!mounted) return;
    mounted = false;
    if (frameId) view.cancelAnimationFrame(frameId);
    frameId = 0;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    themeObserver?.disconnect();
    doc.removeEventListener('visibilitychange', sync);
    doc.removeEventListener('pg:modal-change', sync);
    view.removeEventListener('resize', paintCurrentFrame);
    reducedMotion?.removeEventListener?.('change', paintCurrentFrame);
    connectionObserver.disconnect();
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    painter.refreshColors();
    painter.resize();
    painter.draw(0);
    resizeObserver = new view.ResizeObserver(paintCurrentFrame);
    resizeObserver.observe(surface);
    if (view.IntersectionObserver) {
      intersectionObserver = new view.IntersectionObserver(entries => {
        visible = entries[0]?.isIntersecting ?? true;
        sync();
      });
      intersectionObserver.observe(surface);
    }
    themeObserver = new view.MutationObserver(onThemeChange);
    themeObserver.observe(doc.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });
    doc.addEventListener('visibilitychange', sync);
    doc.addEventListener('pg:modal-change', sync);
    view.addEventListener('resize', paintCurrentFrame);
    reducedMotion?.addEventListener?.('change', paintCurrentFrame);
    sync();
  }

  // The demo constructs content before showDialog() attaches it. Observe both
  // mount and removal so the RAF/observers cannot outlive the visual surface.
  const connectionObserver = new view.MutationObserver(() => {
    if (surface.isConnected) mount();
    else if (mounted) stop();
  });
  connectionObserver.observe(doc, { childList: true, subtree: true });
  if (surface.isConnected) mount();
  return surface;
}
