/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FOCUS CAROUSEL
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Горизонтальна карусель з фокусом під час scroll.
 * ║ ЗАЛЕЖНОСТІ: DOM, CSS і спільні токени.
 * ║ ПУБЛІЧНИЙ API: createFocusCarousel(), getCarouselFocus(), goTo(), destroy().
 * ║ ПРИНЦИП: Незалежний екземпляр, без глобального стану.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

export function getCarouselFocus(progress) {
  const strength = Math.max(0, Math.min(1, progress / .3, (1 - progress) / .3));
  return { scale: .85 + .15 * strength, opacity: .7 + .3 * strength };
}

export function createFocusCarousel({ items = [], label = 'Карусель' } = {}) {
  const element = document.createElement('div');
  element.className = 'pg-focus-carousel';
  element.tabIndex = 0;
  element.setAttribute('role', 'region');
  element.setAttribute('aria-label', label);
  const slides = items.map((item, index) => {
    const slide = document.createElement('div');
    slide.className = 'pg-focus-carousel__slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-label', (index + 1) + ' / ' + items.length);
    const surface = document.createElement('div');
    surface.className = 'pg-focus-carousel__surface';
    surface.append(item);
    slide.append(surface);
    element.append(slide);
    return { slide, surface };
  });
  const view = element.ownerDocument.defaultView;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  const native = view.CSS.supports('animation-timeline: --pg-carousel-view') &&
    view.CSS.supports('view-timeline: --pg-carousel-view inline 0px');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let frame = null;
  let drag = null;
  let suppressClick = false;
  let destroyed = false;

  function distances() {
    const rect = element.getBoundingClientRect();
    const center = rect.left + element.clientLeft + element.clientWidth / 2;
    return slides.map(({ slide }) => {
      const box = slide.getBoundingClientRect();
      return { delta: box.left + box.width / 2 - center, width: box.width };
    });
  }

  function nearest() {
    return distances().reduce((best, current, index, all) =>
      Math.abs(current.delta) < Math.abs(all[best].delta) ? index : best, 0);
  }

  function paint() {
    frame = null;
    if (destroyed || native || !element.clientWidth) return;
    const poses = distances().map(({ delta, width }) =>
      getCarouselFocus(.5 + delta / (element.clientWidth + width)));
    slides.forEach(({ surface }, index) => {
      surface.style.setProperty('--pg-carousel-scale', String(poses[index].scale));
      surface.style.setProperty('--pg-carousel-opacity', String(poses[index].opacity));
    });
  }

  function schedule() {
    if (!native && !destroyed && frame === null) frame = view.requestAnimationFrame(paint);
  }

  function goTo(index, { behavior = 'smooth' } = {}) {
    if (destroyed || !slides.length || !Number.isFinite(index)) return;
    const target = Math.max(0, Math.min(slides.length - 1, Math.round(index)));
    const delta = distances()[target].delta;
    element.scrollBy({ left: delta, behavior: reduced.matches ? 'instant' : behavior });
  }

  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const held = drag;
    drag = null;
    if (!held.moved) return;
    const target = nearest();
    delete element.dataset.pgState;
    if (element.hasPointerCapture(held.id)) element.releasePointerCapture(held.id);
    goTo(target);
  }

  element.addEventListener('keydown', event => {
    if (event.target !== element || !slides.length || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = nearest();
    const rtl = view.getComputedStyle(element).direction === 'rtl';
    const target = { ArrowLeft: index + (rtl ? 1 : -1), ArrowRight: index + (rtl ? -1 : 1), Home: 0, End: slides.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    goTo(target);
  }, options);
  element.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (!event.isPrimary || event.pointerType !== 'mouse' || event.button !== 0 ||
        event.target.closest('a, button, input, textarea, select, [contenteditable], [role="button"], [draggable="true"]')) return;
    drag = { id: event.pointerId, x: event.clientX, left: element.scrollLeft, moved: false };
  }, options);
  element.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!(event.buttons & 1)) { endDrag(event); return; }
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      suppressClick = true;
      element.dataset.pgState = 'dragging';
      element.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    element.scrollLeft = drag.left - dx;
  }, options);
  element.addEventListener('pointerup', endDrag, options);
  element.addEventListener('pointercancel', endDrag, options);
  element.addEventListener('lostpointercapture', endDrag, options);
  element.addEventListener('pointerleave', () => { if (!drag?.moved) drag = null; }, options);
  view.addEventListener('blur', () => endDrag(), options);
  element.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }
  }, { ...options, capture: true });
  element.addEventListener('dragstart', event => {
    if (drag) event.preventDefault();
  }, options);
  const observer = !native && typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : null;
  if (!native) {
    element.addEventListener('scroll', schedule, { ...options, passive: true });
    view.addEventListener('resize', schedule, options);
    observer?.observe(element);
    schedule();
  }

  return Object.freeze({
    element, goTo,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.abort();
      observer?.disconnect();
      if (frame !== null) view.cancelAnimationFrame(frame);
      if (drag && element.hasPointerCapture(drag.id)) element.releasePointerCapture(drag.id);
      drag = null;
      element.remove();
    },
  });
}
