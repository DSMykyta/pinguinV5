/**
 * PINGUIN NEXT — NAVIGATION GESTURES
 * ПРИЗНАЧЕННЯ: Розпізнає локальне продовження руху на межі viewport.
 * ЗАЛЕЖНОСТІ: pull-state та передані DOM-вузли / callbacks.
 * ПУБЛІЧНИЙ API: mountNavigationGestures(options) → { reset, destroy }.
 * ПРИНЦИП: Без редакторів, маршрутизації чи глобального input interception.
 */
import { isAtBoundary, normalizeWheelDelta, getPullProgress } from './pull-state.js';

const WHEEL_IDLE = 200;
const WHEEL_COOLDOWN = 600;
const IGNORED_TARGETS = 'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="slider"], [data-pg-navigation-ignore]';

export function mountNavigationGestures({ viewport, handles, wheel = true, canGo, isEnabled, onProgress, onNavigate }) {
  const view = viewport.ownerDocument.defaultView;
  const controller = new view.AbortController();
  let wheelSession = null;
  let lastWheelAt = -Infinity;
  let wheelTimer = null;
  let wheelLockedUntil = 0;
  let pointer = null;
  let touch = null;
  let suppressClick = null;
  let destroyed = false;

  function listen(target, type, listener, options = {}) {
    target.addEventListener(type, listener, { ...options, signal: controller.signal });
  }

  function reset({ cooldown = false } = {}) {
    if (wheelTimer !== null) view.clearTimeout(wheelTimer);
    wheelTimer = null;
    wheelSession = null;
    const held = pointer;
    pointer = null;
    touch = null;
    if (held) {
      suppressClick = { handle: held.handle, until: view.performance.now() + 500 };
      if (held.handle.hasPointerCapture(held.id)) held.handle.releasePointerCapture(held.id);
    }
    if (cooldown) wheelLockedUntil = view.performance.now() + WHEEL_COOLDOWN;
    onProgress(null, 0, null);
  }

  function canStart(direction) {
    return !destroyed && isEnabled() && canGo(direction) && isAtBoundary(viewport, direction);
  }

  function ignored(event) {
    if (!viewport.ownerDocument.getSelection()?.isCollapsed) return true;
    for (const node of event.composedPath()) {
      if (node === viewport) break;
      if (!(node instanceof view.HTMLElement)) continue;
      if (node.matches(IGNORED_TARGETS)) return true;
      if (node.scrollHeight > node.clientHeight + 1 &&
        /auto|scroll|overlay/.test(view.getComputedStyle(node).overflowY)) return true;
    }
    return false;
  }

  function handleWheel(event) {
    const now = view.performance.now();
    // Keep burst history even when an ignored event cancels visible progress.
    const fresh = now - lastWheelAt >= WHEEL_IDLE;
    lastWheelAt = now;
    if (!wheel || pointer || touch || !isEnabled() || event.defaultPrevented ||
      event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
      !event.cancelable || Math.abs(event.deltaX) > Math.abs(event.deltaY) || ignored(event)) {
      reset();
      return;
    }
    const delta = normalizeWheelDelta(event, viewport.clientHeight,
      parseFloat(view.getComputedStyle(viewport).lineHeight) || 20);
    if (!delta) return;
    const direction = delta > 0 ? 'next' : 'previous';
    if (fresh || !wheelSession) {
      wheelSession = { direction, distance: 0, last: now,
        eligible: fresh && now >= wheelLockedUntil && canStart(direction) };
    }
    const session = wheelSession;
    session.last = now;
    // Once an ordinary scroll or reversal owns a burst, it cannot turn into navigation.
    if (session.direction !== direction || !canStart(direction)) session.eligible = false;
    if (wheelTimer !== null) view.clearTimeout(wheelTimer);
    wheelTimer = view.setTimeout(() => {
      const shouldNavigate = wheelSession === session && session.eligible &&
        session.distance >= 180 && canStart(direction);
      reset();
      if (shouldNavigate) {
        wheelLockedUntil = view.performance.now() + WHEEL_COOLDOWN;
        onNavigate(direction, 'wheel');
      }
    }, WHEEL_IDLE);
    if (!session.eligible) {
      onProgress(null, 0, null);
      return;
    }
    event.preventDefault();
    session.distance += Math.abs(delta);
    onProgress(direction, getPullProgress(session.distance, 180), 'wheel');
  }

  function handleTouchStart(event) {
    reset();
    if (event.touches.length !== 1 || ignored(event) || !isEnabled()) return;
    const point = event.touches[0];
    touch = { id: point.identifier, x: point.clientX, y: point.clientY, distance: 0,
      previous: canStart('previous'), next: canStart('next'), direction: null };
  }

  function handleTouchMove(event) {
    if (!touch) return;
    if (event.touches.length !== 1 || !isEnabled()) { reset(); return; }
    const point = Array.from(event.touches).find(item => item.identifier === touch.id);
    if (!point) { reset(); return; }
    const dy = point.clientY - touch.y;
    const dx = point.clientX - touch.x;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { reset(); return; }
    if (Math.abs(dy) < 6 && !touch.direction) return;
    const direction = dy < 0 ? 'next' : 'previous';
    if (!touch.direction) touch.direction = direction;
    if (touch.direction !== direction || !touch[direction] || !canStart(direction) || !event.cancelable) {
      reset();
      return;
    }
    event.preventDefault();
    touch.distance = Math.abs(dy);
    onProgress(direction, getPullProgress(touch.distance), 'touch');
  }

  function handleTouchEnd(event) {
    if (!touch) return;
    if (event.touches.length) { reset(); return; }
    const direction = touch.direction;
    const shouldNavigate = direction && touch.distance >= 88 && canStart(direction);
    reset();
    if (shouldNavigate) onNavigate(direction, 'touch');
  }

  for (const [direction, handle] of Object.entries(handles)) {
    listen(handle, 'pointerdown', event => {
      if (pointer && event.pointerId !== pointer.id) { reset(); return; }
      if (!event.isPrimary || event.button !== 0 || handle.disabled || !isEnabled()) return;
      reset();
      suppressClick = null;
      // Handles are an explicit alternative and may be used before the scroll edge.
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY,
        direction, handle, distance: 0, moved: false };
      handle.setPointerCapture(event.pointerId);
    });
    listen(handle, 'pointermove', event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const dy = event.clientY - pointer.y;
      const dx = event.clientX - pointer.x;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { reset(); return; }
      pointer.moved ||= Math.abs(dy) >= 6;
      if (!pointer.moved) return;
      event.preventDefault();
      pointer.distance = Math.max(0, direction === 'next' ? -dy : dy);
      onProgress(direction, getPullProgress(pointer.distance), 'pointer');
    });
    listen(handle, 'pointerup', event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const held = pointer;
      const shouldNavigate = held.distance >= 88 && isEnabled() && canGo(direction);
      pointer = null;
      if (held.moved) suppressClick = { handle, until: view.performance.now() + 500 };
      if (handle.hasPointerCapture(held.id)) handle.releasePointerCapture(held.id);
      onProgress(null, 0, null);
      if (shouldNavigate) onNavigate(direction, 'pointer');
    });
    listen(handle, 'pointercancel', () => reset());
    listen(handle, 'lostpointercapture', event => {
      if (pointer?.id === event.pointerId) reset();
    });
    listen(handle, 'click', event => {
      if (event.detail !== 0 && suppressClick?.handle === handle &&
        view.performance.now() <= suppressClick.until) {
        event.preventDefault();
        suppressClick = null;
        return;
      }
      if (!handle.disabled && isEnabled()) onNavigate(direction, 'button');
    });
  }

  listen(viewport, 'wheel', handleWheel, { passive: false });
  listen(viewport, 'touchstart', handleTouchStart, { passive: true });
  listen(viewport, 'touchmove', handleTouchMove, { passive: false });
  listen(viewport, 'touchend', handleTouchEnd, { passive: true });
  listen(viewport, 'touchcancel', () => reset(), { passive: true });
  listen(viewport, 'scroll', () => {
    if (wheelSession?.eligible && !isAtBoundary(viewport, wheelSession.direction)) reset();
  }, { passive: true });
  listen(view, 'blur', () => reset());
  listen(viewport.ownerDocument, 'visibilitychange', () => {
    if (viewport.ownerDocument.hidden) reset();
  });
  // Observe cancellation only. Extra contacts elsewhere must never start navigation
  // or lose their browser defaults (including pinch zoom).
  listen(viewport.ownerDocument, 'pointerdown', event => {
    if ((pointer && event.pointerId !== pointer.id) || touch) reset();
  }, { capture: true, passive: true });
  listen(viewport.ownerDocument, 'keydown', event => {
    if (event.key === 'Escape') reset();
  });

  return {
    reset,
    destroy() {
      destroyed = true;
      reset();
      controller.abort();
    },
  };
}
