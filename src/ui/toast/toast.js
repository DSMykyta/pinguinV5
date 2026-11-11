/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED TOAST                                                         ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Повідомлення з компактним стеком, hover-expand і FIFO-чергою.           ║
 * ║ ЗАЛЕЖНОСТІ: UI icon, DOM, ResizeObserver та таймери браузера.                       ║
 * ║ ПУБЛІЧНИЙ API: mountToasts(), showToast().                                           ║
 * ║ ПРИНЦИП: Кожен Toast незалежний, анімації належать виключно toast.css.              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

const TOAST_TYPES = Object.freeze({
  info: { icon: 'info', duration: 4000 },
  success: { icon: 'check-circle', duration: 4000 },
  warning: { icon: 'triangle-alert', duration: 5000 },
  error: { icon: 'circle-alert', duration: 6000 },
});
const MAX_VISIBLE_TOASTS = 3;
const MAX_WAITING_TOASTS = 8;
const EXPANDED_GAP = 10;
const COLLAPSED_PEEK = 12;
const EXIT_DURATION = 320;
let mountedManager = null;

/** Mount the global UI service once. Dispose fully during app HMR. */
export function mountToasts() {
  if (mountedManager) throw new Error('Toast manager is already mounted');

  const doc = document;
  const view = doc.defaultView;
  const host = doc.createElement('div');
  host.className = 'pg-toast__host';
  host.dataset.pgExpanded = 'false';
  host.dataset.pgEmpty = 'true';
  host.setAttribute('role', 'region');
  host.setAttribute('aria-label', 'Сповіщення');
  host.tabIndex = -1;

  function createAnnouncer(role) {
    const region = doc.createElement('div');
    region.className = 'pg-toast__announcer';
    region.setAttribute('role', role);
    region.setAttribute('aria-atomic', 'false');
    region.setAttribute('aria-relevant', 'additions');
    return region;
  }

  const polite = createAnnouncer('status');
  const urgent = createAnnouncer('alert');
  doc.body.append(host, polite, urgent);

  const visible = new Set();
  const exiting = new Set();
  const queue = [];
  let destroyed = false;
  let pointerInside = false;
  let focusWithin = false;
  let windowBlurred = false;
  let expanded = false;
  let expandedScroll = 0;
  let expandedOverflow = 0;

  const resizeObserver = typeof view.ResizeObserver === 'function'
    ? new view.ResizeObserver(() => refreshLayout()) : null;

  function clearTimer(item) {
    if (item.timerId === null) return;
    view.clearTimeout(item.timerId);
    item.timerId = null;
    item.remaining = Math.max(0, item.remaining - (Date.now() - item.startedAt));
  }

  function isPaused(item) {
    return item.isHovered || item.isFocused || expanded || doc.hidden || windowBlurred;
  }

  function resumeTimer(item) {
    if (destroyed || !visible.has(item) || item.isClosing ||
        item.duration === 0 || item.timerId !== null || isPaused(item)) return;
    if (item.remaining <= 0) {
      dismissItem(item);
      return;
    }
    item.startedAt = Date.now();
    item.timerId = view.setTimeout(() => {
      item.timerId = null;
      item.remaining = 0;
      dismissItem(item);
    }, item.remaining);
  }

  function pauseTimer(item) {
    if (visible.has(item)) clearTimer(item);
  }

  function announce(item) {
    item.announcementTimerId = view.setTimeout(() => {
      item.announcementTimerId = null;
      if (destroyed || !visible.has(item) || item.isClosing) return;
      const region = item.type === 'error' ? urgent : polite;
      const entry = doc.createElement('span');
      entry.textContent = region.childNodes.length ? ' ' + item.message : item.message;
      region.append(entry);
      item.announcement = entry;
    }, 0);
  }

  /**
   * Only live dimensions are set by JS. All appearance, transforms and easing
   * are owned by toast.css. Newest is the bottom/front card; older cards peek
   * above it until the pointer or keyboard focus expands the stack.
   */
  function refreshLayout() {
    if (destroyed) return;
    // The FIFO queue remains pending, but its cards can be inspected on
    // hover/focus without changing the three active timers or their order.
    const active = Array.from(visible);
    const ordered = (expanded ? [...active, ...queue] : active).reverse();
    host.dataset.pgExpanded = String(expanded);
    host.dataset.pgEmpty = String(active.length === 0 && queue.length === 0);
    host.tabIndex = active.length || queue.length ? 0 : -1;

    const maximumHeight = Math.max(100, view.innerHeight - 40);
    const heights = ordered.map(item => item.element.offsetHeight);
    const fullHeight = heights.reduce((sum, height) => sum + height, 0)
      + Math.max(0, ordered.length - 1) * EXPANDED_GAP;
    expandedOverflow = expanded ? Math.max(0, fullHeight - maximumHeight) : 0;
    expandedScroll = Math.min(expandedScroll, expandedOverflow);
    host.dataset.pgOverflow = String(expandedOverflow > 0);

    // Keep pending cards mounted for smooth expansion, but completely inert
    // and inaccessible while the ordinary three-card stack is collapsed.
    if (!expanded) {
      for (const item of queue) {
        item.element.dataset.pgDepth = 'pending';
        item.element.style.setProperty('--pg-toast-offset', '0px');
        item.element.style.setProperty('--pg-toast-stack-layer', '0');
        item.element.inert = true;
        item.element.setAttribute('aria-hidden', 'true');
      }
    }

    let expandedOffset = 0;
    let neededHeight = 0;
    for (let depth = 0; depth < ordered.length; depth += 1) {
      const item = ordered[depth];
      const height = heights[depth];
      const offset = expanded
        ? expandedOffset - expandedScroll
        : Math.max(0, Math.min(depth * COLLAPSED_PEEK, maximumHeight - height));
      item.element.style.setProperty('--pg-toast-offset', offset + 'px');
      item.element.style.setProperty('--pg-toast-stack-layer', String(ordered.length - depth));
      item.element.dataset.pgDepth = String(depth);
      item.element.inert = !expanded && depth > 0;
      item.element.setAttribute('aria-hidden', 'false');
      neededHeight = Math.max(neededHeight, offset + height);
      expandedOffset += height + EXPANDED_GAP;
    }
    host.style.setProperty('--pg-toast-host-height',
      Math.min(maximumHeight, Math.ceil(expanded ? fullHeight : neededHeight)) + 'px');
  }

  function syncInteraction() {
    const next = pointerInside || focusWithin;
    if (expanded === next) return;
    expanded = next;
    if (!expanded) expandedScroll = 0;
    refreshLayout();
    for (const item of visible) {
      if (expanded) pauseTimer(item);
      else resumeTimer(item);
    }
  }

  function finishDismiss(item) {
    if (!exiting.has(item)) return;
    if (item.exitTimerId !== null) {
      view.clearTimeout(item.exitTimerId);
      item.exitTimerId = null;
    }
    resizeObserver?.unobserve(item.element);
    item.element.remove();
    item.announcement?.remove();
    exiting.delete(item);
    if (item.hadFocus && item.returnFocus?.isConnected &&
        typeof item.returnFocus.focus === 'function') {
      item.returnFocus.focus({ preventScroll: true });
    }
    refreshLayout();
  }

  function dismissItem(item) {
    if (destroyed || item.isClosing) return false;
    const wasVisible = visible.has(item);
    if (!wasVisible) {
      const index = queue.indexOf(item);
      if (index < 0) return false;
      queue.splice(index, 1);
      // Programmatic dismissal of an unseen queued item is immediate.
      if (!expanded) {
        resizeObserver?.unobserve(item.element);
        item.element.remove();
        refreshLayout();
        return true;
      }
    } else {
      visible.delete(item);
    }

    item.isClosing = true;
    item.hadFocus = item.element.contains(doc.activeElement);
    clearTimer(item);
    if (item.announcementTimerId !== null) {
      view.clearTimeout(item.announcementTimerId);
      item.announcementTimerId = null;
    }
    // Preserve this element's last --pg-toast-offset until it travels down.
    exiting.add(item);
    // Travel beyond the bottom of the viewport regardless of the toast's
    // height or its position in the expanded stack. No fade-out/snap.
    const currentOffset = parseFloat(item.element.style.getPropertyValue('--pg-toast-offset')) || 0;
    const exitDistance = item.element.offsetHeight + currentOffset + 40;
    item.element.style.setProperty('--pg-toast-exit-distance', exitDistance + 'px');
    item.element.dataset.pgState = 'closing';
    item.element.inert = true;

    refreshLayout();
    if (wasVisible) showWaiting();

    const reduceMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    item.exitTimerId = view.setTimeout(() => finishDismiss(item),
      reduceMotion ? 0 : EXIT_DURATION);
    return true;
  }

  function createToastElement(item) {
    const element = doc.createElement('div');
    element.className = 'pg-toast';
    element.dataset.pgState = 'entering';
    element.dataset.pgType = item.type;

    const symbol = createIcon(TOAST_TYPES[item.type].icon);
    symbol.classList.add('pg-toast__icon');
    const message = doc.createElement('span');
    message.className = 'pg-toast__message';
    message.textContent = item.message;
    element.append(symbol, message);

    if (item.action) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'pg-toast__action pg-button pg-button--quiet';
      button.dataset.pgAction = 'toast-action';
      button.textContent = item.action.label;
      button.addEventListener('click', () => {
        if (item.isClosing) return;
        try {
          const result = item.action.onClick();
          if (result && typeof result.catch === 'function') {
            result.catch(error => console.error('Toast action failed:', error));
          }
        } catch (error) {
          console.error('Toast action failed:', error);
        } finally {
          dismissItem(item);
        }
      });
      element.append(button);
    }

    const close = doc.createElement('button');
    close.type = 'button';
    close.className = 'pg-toast__close pg-button pg-button--quiet pg-button--square';
    close.dataset.pgAction = 'toast-dismiss';
    close.setAttribute('aria-label', 'Закрити повідомлення');
    close.append(createIcon('x'));
    close.addEventListener('click', () => dismissItem(item));
    element.append(close);

    element.addEventListener('mouseenter', () => {
      item.isHovered = true;
      pauseTimer(item);
    });
    element.addEventListener('mouseleave', () => {
      item.isHovered = false;
      resumeTimer(item);
    });
    element.addEventListener('focusin', () => {
      item.isFocused = true;
      pauseTimer(item);
    });
    element.addEventListener('focusout', event => {
      item.isFocused = Boolean(event.relatedTarget && element.contains(event.relatedTarget));
      resumeTimer(item);
    });
    element.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      dismissItem(item);
    });
    return element;
  }

  function animateEntry(item) {
    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => {
        if (!destroyed && !item.isClosing && (visible.has(item) || queue.includes(item))) {
          item.element.dataset.pgState = 'visible';
        }
      });
    });
  }

  function showWaiting() {
    if (destroyed) return;
    const newlyVisible = [];
    while (visible.size < MAX_VISIBLE_TOASTS && queue.length) {
      const item = queue.shift();
      visible.add(item);
      item.element.dataset.pgPending = 'false';
      item.element.inert = false;
      item.element.setAttribute('aria-hidden', 'false');
      newlyVisible.push(item);
    }

    refreshLayout();
    for (const item of newlyVisible) {
      announce(item);
      resumeTimer(item);
    }
  }

  function enqueue(message, options = {}) {
    if (destroyed) throw new Error('Toast manager has been disposed');
    if (typeof message !== 'string' || !message.trim()) {
      throw new TypeError('Toast message must be a non-empty string');
    }
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('Toast options must be an object');
    }

    const type = options.type ?? 'info';
    if (!Object.hasOwn(TOAST_TYPES, type)) {
      throw new TypeError('Unknown Toast type: ' + type);
    }
    const action = options.action ?? null;
    if (action && (typeof action.label !== 'string' || !action.label.trim() ||
      typeof action.onClick !== 'function')) {
      throw new TypeError('Toast action needs label and onClick');
    }
    const duration = options.duration ?? (action ? 0 : TOAST_TYPES[type].duration);
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
      throw new RangeError('Toast duration must be a finite non-negative number');
    }
    if (!action && queue.filter(item => !item.action).length >= MAX_WAITING_TOASTS) {
      return Object.freeze({ dismiss: () => false });
    }

    const item = {
      message, type, duration, action,
      remaining: duration, startedAt: 0, timerId: null, exitTimerId: null,
      announcementTimerId: null, announcement: null,
      isHovered: false, isFocused: false, isClosing: false, hadFocus: false,
      returnFocus: doc.activeElement && doc.activeElement !== doc.body
        ? doc.activeElement : null,
      element: null, handle: null,
    };
    item.handle = Object.freeze({ dismiss: () => dismissItem(item) });

    // Mount before publishing to the FIFO queue: refreshLayout() accesses
    // every pending element, including the fourth and subsequent Toasts.
    item.element = createToastElement(item);
    item.element.dataset.pgPending = 'true';
    item.element.inert = !expanded;
    item.element.setAttribute('aria-hidden', String(!expanded));
    host.prepend(item.element);
    resizeObserver?.observe(item.element);
    queue.push(item);
    showWaiting();
    animateEntry(item);
    return item.handle;
  }

  function onVisibilityChange() {
    for (const item of visible) {
      if (item.isClosing) continue;
      if (doc.hidden) pauseTimer(item);
      else resumeTimer(item);
    }
  }

  function onWindowBlur() {
    windowBlurred = true;
    for (const item of visible) pauseTimer(item);
  }
  function onWindowFocus() {
    windowBlurred = false;
    for (const item of visible) resumeTimer(item);
  }

  function onHostKeydown(event) {
    if (event.target !== host || event.key !== 'Escape') return;
    const newest = Array.from(visible).at(-1);
    if (!newest) return;
    event.preventDefault();
    dismissItem(newest);
  }

  function onHostWheel(event) {
    if (!expanded || expandedOverflow <= 0) return;
    // The newest cards stay at the bottom; scrolling up reveals older cards
    // if the expanded list is taller than the available viewport.
    const next = Math.max(0, Math.min(expandedOverflow, expandedScroll - event.deltaY));
    if (next === expandedScroll) return;
    event.preventDefault();
    expandedScroll = next;
    refreshLayout();
  }

  host.addEventListener('wheel', onHostWheel, { passive: false });
  host.addEventListener('mouseenter', () => {
    pointerInside = true;
    syncInteraction();
  });
  host.addEventListener('mouseleave', () => {
    pointerInside = false;
    syncInteraction();
  });
  host.addEventListener('focusin', () => {
    focusWithin = true;
    syncInteraction();
  });
  host.addEventListener('focusout', event => {
    if (event.relatedTarget && host.contains(event.relatedTarget)) return;
    focusWithin = false;
    syncInteraction();
  });
  host.addEventListener('keydown', onHostKeydown);

  doc.addEventListener('visibilitychange', onVisibilityChange);
  view.addEventListener('blur', onWindowBlur);
  view.addEventListener('focus', onWindowFocus);
  view.addEventListener('resize', refreshLayout);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const item of [...visible, ...exiting]) {
      clearTimer(item);
      if (item.exitTimerId !== null) view.clearTimeout(item.exitTimerId);
      if (item.announcementTimerId !== null) view.clearTimeout(item.announcementTimerId);
    }
    resizeObserver?.disconnect();
    visible.clear();
    exiting.clear();
    queue.length = 0;
    doc.removeEventListener('visibilitychange', onVisibilityChange);
    view.removeEventListener('blur', onWindowBlur);
    view.removeEventListener('focus', onWindowFocus);
    view.removeEventListener('resize', refreshLayout);
    host.remove();
    polite.remove();
    urgent.remove();
  }

  const manager = { enqueue, destroy };
  mountedManager = manager;
  return function disposeToasts() {
    manager.destroy();
    if (mountedManager === manager) mountedManager = null;
  };
}

/**
 * Create an independent notification; identical messages remain separate.
 * @param {string} message Plain text only.
 * @param {{type?:'info'|'success'|'warning'|'error',duration?:number,
 *   action?:{label:string,onClick:Function}}} options
 * @returns {{dismiss:()=>boolean}} Handle for this notification.
 */
export function showToast(message, options = {}) {
  if (!mountedManager) throw new Error('Mount Toast UI before showing notifications');
  return mountedManager.enqueue(message, options);
}
