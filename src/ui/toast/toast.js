/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED TOAST                                                          ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Незалежні повідомлення: видимий стек із 3 Toast та FIFO-черга.          ║
 * ║ ЗАЛЕЖНОСТІ: UI icon, DOM і таймери браузера.                                         ║
 * ║ ПУБЛІЧНИЙ API: mountToasts(), showToast().                                           ║
 * ║ ПРИНЦИП: Кожен виклик утворює власний Toast; явне монтування, коректний cleanup.     ║
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
const EXIT_DURATION = 180;

let mountedManager = null;

/**
 * Mount a single app-wide manager. Each notification has independent DOM, timers,
 * focus restoration and an optional action. Calling twice without cleanup throws.
 */
export function mountToasts() {
  if (mountedManager) throw new Error('Toast manager is already mounted');
  const doc = document;
  const view = doc.defaultView;

  const host = doc.createElement('div');
  host.className = 'pg-toast__host';

  function createAnnouncer(role) {
    const region = doc.createElement('div');
    region.className = 'pg-toast__announcer';
    region.setAttribute('role', role);
    // Only announce the new message, never reread the entire visible stack.
    region.setAttribute('aria-atomic', 'false');
    region.setAttribute('aria-relevant', 'additions');
    return region;
  }

  const polite = createAnnouncer('status');
  const urgent = createAnnouncer('alert');
  doc.body.append(host, polite, urgent);

  const queue = [];
  const visible = new Set();
  let destroyed = false;

  function clearTimer(item) {
    if (item.timerId === null) return;
    view.clearTimeout(item.timerId);
    item.timerId = null;
    item.remaining = Math.max(0, item.remaining - (Date.now() - item.startedAt));
  }

  function isPaused(item) {
    return item.isHovered || item.isFocused || doc.hidden;
  }

  function resumeTimer(item) {
    if (destroyed || !visible.has(item) || item.isClosing ||
      item.duration === 0 || isPaused(item) || item.timerId !== null) return;
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
    // Permanent regions were mounted before the first Toast. Appending a new
    // child supports multiple successive announcements without erasing others.
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

  function finishDismiss(item) {
    if (!visible.has(item)) return;
    if (item.exitTimerId !== null) {
      view.clearTimeout(item.exitTimerId);
      item.exitTimerId = null;
    }
    const hadFocus = item.element.contains(doc.activeElement);
    item.element.remove();
    item.announcement?.remove();
    item.announcement = null;
    visible.delete(item);
    if (hadFocus && item.returnFocus?.isConnected &&
      typeof item.returnFocus.focus === 'function') {
      item.returnFocus.focus({ preventScroll: true });
    }
    showWaiting();
  }

  function dismissItem(item) {
    if (destroyed || item.isClosing) return false;
    if (!visible.has(item)) {
      const index = queue.indexOf(item);
      if (index === -1) return false;
      queue.splice(index, 1);
      return true;
    }
    item.isClosing = true;
    clearTimer(item);
    if (item.announcementTimerId !== null) {
      view.clearTimeout(item.announcementTimerId);
      item.announcementTimerId = null;
    }
    item.element.dataset.pgState = 'closing';
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
      button.className = 'pg-toast__action';
      button.dataset.pgAction = 'toast-action';
      button.textContent = item.action.label;
      button.addEventListener('click', () => {
        if (item.isClosing) return;
        // An action may reject; this must not leave a stale Toast behind.
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
    close.className = 'pg-toast__close';
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

  function showWaiting() {
    if (destroyed) return;
    while (visible.size < MAX_VISIBLE_TOASTS && queue.length) {
      const item = queue.shift();
      visible.add(item);
      item.element = createToastElement(item);
      host.append(item.element);
      announce(item);
      resumeTimer(item);
      view.requestAnimationFrame(() => {
        view.requestAnimationFrame(() => {
          if (!destroyed && visible.has(item) && !item.isClosing) {
            item.element.dataset.pgState = 'visible';
          }
        });
      });
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
      isHovered: false, isFocused: false, isClosing: false,
      returnFocus: doc.activeElement && doc.activeElement !== doc.body
        ? doc.activeElement : null,
      element: null,
      handle: null,
    };
    item.handle = Object.freeze({ dismiss: () => dismissItem(item) });
    queue.push(item);
    showWaiting();
    return item.handle;
  }

  function onVisibilityChange() {
    for (const item of visible) {
      if (item.isClosing) continue;
      if (doc.hidden) pauseTimer(item);
      else resumeTimer(item);
    }
  }

  doc.addEventListener('visibilitychange', onVisibilityChange);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const item of visible) {
      clearTimer(item);
      if (item.exitTimerId !== null) view.clearTimeout(item.exitTimerId);
      if (item.announcementTimerId !== null) view.clearTimeout(item.announcementTimerId);
    }
    visible.clear();
    queue.length = 0;
    doc.removeEventListener('visibilitychange', onVisibilityChange);
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
 * Each call creates a separate notification, including identical messages.
 *
 * @param {string} message - Plain text, never interpreted as HTML.
 * @param {{type?: 'info'|'success'|'warning'|'error',duration?:number,
 *   action?:{label:string,onClick:Function}}} options
 * @returns {{dismiss:()=>boolean}} Handle to remove this toast only.
 */
export function showToast(message, options = {}) {
  if (!mountedManager) throw new Error('Mount Toast UI before showing notifications');
  return mountedManager.enqueue(message, options);
}
