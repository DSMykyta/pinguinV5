/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FOCUS CAROUSEL
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Горизонтальна карусель з фокусом під час scroll.
 * ║ ЗАЛЕЖНОСТІ: DOM, CSS і спільні токени.
 * ║ ПУБЛІЧНИЙ API: createFocusCarousel(), getCarouselFocus(), goTo(), setAutoplay(), setLoop(), destroy().
 * ║ ПРИНЦИП: Незалежний екземпляр, без глобального стану.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

export function getCarouselFocus(progress) {
  const strength = Math.max(0, Math.min(1, progress / .3, (1 - progress) / .3));
  return { scale: .85 + .15 * strength, opacity: .7 + .3 * strength };
}

export function getCarouselIndex(index, length, loop = false) {
  if (!length) return 0;
  return loop ? ((Math.round(index) % length) + length) % length : Math.max(0, Math.min(length - 1, Math.round(index)));
}

export function createFocusCarousel({ items = [], label = 'Карусель', autoplay = false, autoplayInterval = 3500, loop = false, pauseOnHover = true } = {}) {
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
    return { slide, surface, index, clone: false };
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
  let physical = slides.slice();
  let loopEnabled = false;
  let pendingIndex = null;
  let scrollIdle = null;
  let touching = false;
  let targetPhysical = null;
  const doc = element.ownerDocument;
  const canLoop = () => loopEnabled && slides.length > 1;
  const interval = Number.isFinite(autoplayInterval) ? Math.max(1000, autoplayInterval) : 3500;

  function clearAutoplay() {
    if (autoplayTimer !== null) view.clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }

  function scheduleAutoplay() {
    clearAutoplay();
    if (destroyed || !autoEnabled || !visible || (pauseOnHover && hovering) || drag || touching ||
        settleFrame !== null || pendingIndex !== null || reduced.matches || doc.hidden ||
        element.contains(doc.activeElement) || slides.length < 2) return;
    autoplayTimer = view.setTimeout(() => {
      autoplayTimer = null;
      if (!canLoop()) {
        const index = nearest();
        if (index === slides.length - 1) autoDirection = -1;
        if (index === 0) autoDirection = 1;
      }
      step(canLoop() ? 1 : autoDirection);
    }, interval);
  }

  function setAutoplay(enabled) {
    autoEnabled = Boolean(enabled);
    scheduleAutoplay();
  }

  function cancelSettle() {
    if (settleFrame !== null) view.cancelAnimationFrame(settleFrame);
    settleFrame = null;
    targetPhysical = null;
  }

  function distances() {
    const rect = element.getBoundingClientRect();
    const center = rect.left + element.clientLeft + element.clientWidth / 2;
    return physical.map(({ slide }) => {
      const box = slide.getBoundingClientRect();
      return { delta: box.left + box.width / 2 - center, width: box.width };
    });
  }

  function nearestPhysical() {
    return distances().reduce((best, current, index, all) =>
      Math.abs(current.delta) < Math.abs(all[best].delta) ? index : best, 0);
  }

  function nearest() {
    return physical[nearestPhysical()]?.index ?? 0;
  }

  function cloneSlide(original) {
    const slide = original.slide.cloneNode(true);
    slide.inert = true;
    slide.setAttribute('aria-hidden', 'true');
    slide.dataset.pgClone = 'true';
    slide.removeAttribute('role');
    slide.removeAttribute('aria-label');
    // Loop copies are visual only; avoid duplicated IDs or form submissions.
    for (const node of [slide, ...slide.querySelectorAll('[id], [name]')]) {
      node.removeAttribute('id');
      node.removeAttribute('name');
    }
    for (const node of slide.querySelectorAll('input, select, textarea, button')) node.disabled = true;
    for (const node of slide.querySelectorAll('img')) node.loading = 'eager';
    return { slide, surface: slide.firstElementChild, index: original.index, clone: true };
  }

  function jumpToPhysical(index) {
    if (!physical[index] || !element.clientWidth) return;
    element.dataset.pgState = 'settling';
    // Resolve snap:none before changing scrollLeft to prevent an old snap target
    // from restoring itself on the same frame.
    const delta = distances()[index].delta;
    element.scrollLeft += delta;
    delete element.dataset.pgState;
    schedule();
  }

  function rebase() {
    if (!canLoop() || !element.clientWidth || drag || touching || settleFrame !== null) return;
    const position = nearestPhysical();
    const current = physical[position];
    if (!current?.clone || Math.abs(distances()[position].delta) > 3) return;
    jumpToPhysical(physical.findIndex(item => !item.clone && item.index === current.index));
  }

  function setLoop(enabled) {
    const next = Boolean(enabled) && slides.length > 1;
    if (destroyed || next === loopEnabled) return;
    const index = pendingIndex ?? nearest();
    clearAutoplay();
    cancelSettle();
    for (const item of physical) if (item.clone) item.slide.remove();
    loopEnabled = next;
    element.dataset.pgLoop = String(next);
    physical = slides.slice();
    if (next) {
      const count = Math.min(2, slides.length);
      const before = slides.slice(-count).map(cloneSlide);
      const after = slides.slice(0, count).map(cloneSlide);
      element.prepend(...before.map(item => item.slide));
      element.append(...after.map(item => item.slide));
      physical = [...before, ...slides, ...after];
    }
    pendingIndex = index;
    alignPending();
  }

  function alignPending() {
    if (pendingIndex !== null && element.clientWidth) {
      const index = pendingIndex;
      pendingIndex = null;
      jumpToPhysical(physical.findIndex(item => !item.clone && item.index === index));
    }
    scheduleAutoplay();
    schedule();
  }

  function paint() {
    frame = null;
    if (destroyed || native || !element.clientWidth) return;
    const poses = distances().map(({ delta, width }) =>
      getCarouselFocus(.5 + delta / (element.clientWidth + width)));
    physical.forEach(({ surface }, index) => {
      surface.style.setProperty('--pg-carousel-scale', String(poses[index].scale));
      surface.style.setProperty('--pg-carousel-opacity', String(poses[index].opacity));
    });
  }

  function schedule() {
    if (!native && !destroyed && frame === null) frame = view.requestAnimationFrame(paint);
  }

  function goTo(index, { behavior = 'smooth' } = {}) {
    if (destroyed || !slides.length || !Number.isFinite(index)) return;
    const logical = getCarouselIndex(index, slides.length, canLoop());
    if (!element.clientWidth) { pendingIndex = logical; return; }
    const measures = distances();
    const target = physical.reduce((best, item, i) => item.index === logical &&
      (best < 0 || Math.abs(measures[i].delta) < Math.abs(measures[best].delta)) ? i : best, -1);
    moveToPhysical(target, behavior);
  }

  function step(direction) {
    if (!slides.length) return;
    const current = targetPhysical ?? nearestPhysical();
    const target = Math.max(0, Math.min(physical.length - 1, current + direction));
    moveToPhysical(target, 'smooth');
  }

  function moveToPhysical(target, behavior = 'smooth') {
    if (destroyed || !physical[target] || !element.clientWidth) return;
    clearAutoplay();
    cancelSettle();
    targetPhysical = target;
    element.dataset.pgState = 'settling';
    const delta = distances()[target].delta;
    const start = element.scrollLeft;
    const finish = () => {
      settleFrame = null;
      targetPhysical = null;
      // Rebase a visual copy to its identical real slide before the next paint.
      element.scrollLeft = start + delta;
      const item = physical[target];
      if (item?.clone) {
        const original = physical.findIndex(candidate => !candidate.clone && candidate.index === item.index);
        element.scrollLeft += distances()[original].delta;
      }
      delete element.dataset.pgState;
      schedule();
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
    const target = nearestPhysical();
    if (element.hasPointerCapture(held.id)) element.releasePointerCapture(held.id);
    moveToPhysical(target);
  }

  element.addEventListener('keydown', event => {
    if (event.target !== element || !slides.length || event.altKey || event.ctrlKey || event.metaKey) return;
    const rtl = view.getComputedStyle(element).direction === 'rtl';
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step((event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      goTo(event.key === 'Home' ? 0 : slides.length - 1);
    }
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
  element.addEventListener('pointerenter', () => { hovering = true; if (pauseOnHover) clearAutoplay(); }, options);
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
    const target = index + direction;
    // Finite mode releases the page at the boundary; loop mode never has a logical edge.
    if (!canLoop() && (target < 0 || target >= slides.length)) return;
    event.preventDefault();
    if (settleFrame !== null || !fresh) return;
    step(direction);
  }, { ...options, passive: false });
  element.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    touching = true;
    clearAutoplay();
    if (settleFrame !== null) {
      cancelSettle();
      delete element.dataset.pgState;
    }
  }, options);
  function onScrollEnd() {
    if (scrollIdle !== null) view.clearTimeout(scrollIdle);
    scrollIdle = null;
    rebase();
    scheduleAutoplay();
  }
  function onScroll() {
    clearAutoplay();
    if (scrollIdle !== null) view.clearTimeout(scrollIdle);
    scrollIdle = view.setTimeout(onScrollEnd, 160);
  }
  element.addEventListener('scroll', onScroll, { ...options, passive: true });
  element.addEventListener('scrollend', onScrollEnd, options);
  for (const type of ['pointerup', 'pointercancel']) {
    view.addEventListener(type, event => {
      if (event.pointerType === 'mouse' || !touching) return;
      touching = false;
      onScroll();
    }, options);
  }
  element.ownerDocument.addEventListener('visibilitychange', scheduleAutoplay, options);
  reduced.addEventListener('change', () => {
    if (settleFrame !== null) goTo(nearest());
    scheduleAutoplay();
  }, options);
  const visibility = new view.IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) alignPending();
    else clearAutoplay();
  }, { threshold: 0.01 });
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
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(alignPending) : null;
  observer?.observe(element);
  if (!native) {
    element.addEventListener('scroll', schedule, { ...options, passive: true });
    view.addEventListener('resize', schedule, options);
    schedule();
  }

  element.dataset.pgLoop = 'false';
  if (loop) setLoop(true);
  return Object.freeze({
    element, goTo, setAutoplay, setLoop,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.abort();
      clearAutoplay();
      if (scrollIdle !== null) view.clearTimeout(scrollIdle);
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
