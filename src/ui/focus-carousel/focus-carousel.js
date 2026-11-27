/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FOCUS CAROUSEL
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Горизонтальна карусель з фокусом під час scroll.
 * ║ ЗАЛЕЖНОСТІ: DOM, CSS і спільні токени.
 * ║ ПУБЛІЧНИЙ API: createFocusCarousel(), getCarouselFocus(), goTo(), setAutoplay(), destroy().
 * ║ ПРИНЦИП: Незалежний екземпляр, без глобального стану.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

export function getCarouselFocus(progress) {
  const strength = Math.max(0, Math.min(1, progress / .3, (1 - progress) / .3));
  return { scale: .85 + .15 * strength, opacity: .7 + .3 * strength };
}

export function createFocusCarousel({ items = [], label = 'Карусель', autoplay = false, autoplayInterval = 3500 } = {}) {
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
  let settleFrame = null;
  let autoplayTimer = null;
  let autoEnabled = Boolean(autoplay);
  let autoDirection = 1;
  let visible = false;
  let hovering = false;
  let lastWheel = -Infinity;
  const interval = Number.isFinite(autoplayInterval) ? Math.max(1000, autoplayInterval) : 3500;

  function clearAutoplay() {
    if (autoplayTimer !== null) view.clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }

  function scheduleAutoplay() {
    clearAutoplay();
    if (destroyed || !autoEnabled || !visible || hovering || drag || settleFrame !== null ||
        reduced.matches || element.ownerDocument.hidden || element.contains(element.ownerDocument.activeElement) ||
        slides.length < 2) return;
    autoplayTimer = view.setTimeout(() => {
      autoplayTimer = null;
      const index = nearest();
      if (index === slides.length - 1) autoDirection = -1;
      if (index === 0) autoDirection = 1;
      goTo(index + autoDirection);
    }, interval);
  }

  function setAutoplay(enabled) {
    autoEnabled = Boolean(enabled);
    scheduleAutoplay();
  }

  function cancelSettle() {
    if (settleFrame !== null) view.cancelAnimationFrame(settleFrame);
    settleFrame = null;
  }

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
    clearAutoplay();
    cancelSettle();
    const start = element.scrollLeft;
    const delta = distances()[target].delta;
    element.dataset.pgState = 'settling';
    const finish = () => {
      settleFrame = null;
      // Snap is restored only once the requested center has been reached.
      element.scrollLeft = start + delta;
      delete element.dataset.pgState;
      scheduleAutoplay();
    };
    if (reduced.matches || behavior !== 'smooth' || Math.abs(delta) < 1) {
      finish();
      return;
    }
    const token = view.getComputedStyle(element).getPropertyValue('--pg-motion-spatial-normal-duration').trim();
    const duration = (parseFloat(token) * (token.endsWith('ms') ? 1 : 1000)) || 340;
    const began = view.performance.now();
    const tick = now => {
      const t = Math.max(0, Math.min(1, (now - began) / duration));
      element.scrollLeft = start + delta * (1 - (1 - t) ** 3);
      if (t < 1) settleFrame = view.requestAnimationFrame(tick);
      else finish();
    };
    settleFrame = view.requestAnimationFrame(tick);
  }

  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const held = drag;
    drag = null;
    if (!held.moved) {
      if (element.dataset.pgState === 'settling') goTo(nearest());
      else scheduleAutoplay();
      return;
    }
    const target = nearest();
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
    clearAutoplay();
    cancelSettle();
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
  element.addEventListener('pointerenter', () => { hovering = true; clearAutoplay(); }, options);
  element.addEventListener('pointerleave', () => {
    hovering = false;
    if (drag && !drag.moved) endDrag();
    scheduleAutoplay();
  }, options);
  element.addEventListener('focusin', clearAutoplay, options);
  element.addEventListener('focusout', () => view.queueMicrotask(scheduleAutoplay), options);
  element.addEventListener('wheel', event => {
    if (!slides.length || drag || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
        event.defaultPrevented || !event.cancelable || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || !event.deltaY) return;
    const direction = Math.sign(event.deltaY);
    const index = nearest();
    const now = view.performance.now();
    const fresh = now - lastWheel > 180;
    lastWheel = now;
    if (settleFrame !== null || !fresh) {
      if (settleFrame !== null) event.preventDefault();
      return;
    }
    const target = index + direction;
    // At either edge let the ordinary page scroll continue.
    if (target < 0 || target >= slides.length) return;
    event.preventDefault();
    goTo(target);
  }, { ...options, passive: false });
  element.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    clearAutoplay();
    if (settleFrame !== null) {
      cancelSettle();
      delete element.dataset.pgState;
    }
  }, options);
  element.addEventListener('scroll', scheduleAutoplay, { ...options, passive: true });
  element.ownerDocument.addEventListener('visibilitychange', scheduleAutoplay, options);
  reduced.addEventListener('change', () => {
    if (settleFrame !== null) goTo(nearest());
    scheduleAutoplay();
  }, options);
  const visibility = new view.IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    scheduleAutoplay();
  }, { threshold: 0 });
  visibility.observe(element);
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
    element, goTo, setAutoplay,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.abort();
      clearAutoplay();
      cancelSettle();
      visibility.disconnect();
      observer?.disconnect();
      if (frame !== null) view.cancelAnimationFrame(frame);
      if (drag && element.hasPointerCapture(drag.id)) element.releasePointerCapture(drag.id);
      drag = null;
      element.remove();
    },
  });
}
