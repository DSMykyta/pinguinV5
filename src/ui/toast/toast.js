/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED TOAST                                                          ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Глобальні короткі повідомлення з чергою та необов'язковою дією.         ║
 * ║ ЗАЛЕЖНОСТІ: UI icon, DOM і таймери браузера.                                         ║
 * ║ ПУБЛІЧНИЙ API: mountToasts(), showToast().                                           ║
 * ║ ПРИНЦИП: Одне явне монтування; немає window globals, DOM-даних як джерела істини.    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

const TOAST_TYPES = Object.freeze({
  info: { icon: 'info', duration: 4000 },
  success: { icon: 'check-circle', duration: 4000 },
  warning: { icon: 'triangle-alert', duration: 5000 },
  error: { icon: 'circle-alert', duration: 6000 },
});
const MAX_WAITING_TOASTS = 8;
const EXIT_DURATION = 180;

let mountedManager = null;

/**
 * Mount once from the application bootstrap. Disposing releases every listener,
 * node and timer so HMR can remount without a second notification host.
 */
export function mountToasts() {
  if (mountedManager) throw new Error('Toast manager is already mounted');
  const doc = document;
  const view = doc.defaultView;

  const host = doc.createElement('div');
  host.className = 'pg-toast-host';

  function createAnnouncer(role) {
    const announcer = doc.createElement('div');
    announcer.className = 'pg-toast__announcer';
    announcer.setAttribute('role', role);
    announcer.setAttribute('aria-atomic', 'true');
    return announcer;
  }

  // Live regions exist before messages arrive; never place interactive buttons
  // inside role="alert" or move keyboard focus merely to announce a Toast.
  const polite = createAnnouncer('status');
  const urgent = createAnnouncer('alert');
  doc.body.append(host, polite, urgent);

  const queue = [];
  let active = null;
  let exitTimer = null;
  let destroyed = false;

  function clearTimer(item) {
    if (item.timerId !== null) {
      view.clearTimeout(item.timerId);
      item.timerId = null;
      item.remaining = Math.max(0, item.remaining - (Date.now() - item.startedAt));
    }
  }

  function isPaused(item) {
    return item.isHovered || item.isFocused || doc.hidden;
  }

  function resumeTimer(item) {
    if (active !== item || item.isClosing || item.duration === 0 || isPaused(item)) return;
    if (item.timerId !== null) return;
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
    if (active === item) clearTimer(item);
  }

  function announce(item) {
    polite.textContent = '';
    urgent.textContent = '';
    const region = item.type === 'error' ? urgent : polite;
    view.setTimeout(() => {
      if (active === item && !item.isClosing && !destroyed) {
        region.textContent = item.message;
      }
    }, 0);
  }

  function finishDismiss(item) {
    if (active !== item) return;
    const hadFocus = item.element.contains(doc.activeElement);
    item.element.remove();
    if (hadFocus && item.returnFocus?.isConnected &&
        typeof item.returnFocus.focus === 'function') {
      item.returnFocus.focus({ preventScroll: true });
    }
    active = null;
    exitTimer = null;
    showNext();
  }

  function dismissItem(item) {
    if (destroyed || item.isClosing) return false;
    if (active !== item) {
      const index = queue.indexOf(item);
      if (index < 0) return false;
      queue.splice(index, 1);
      return true;
    }

    item.isClosing = true;
    clearTimer(item);
    item.element.dataset.pgState = 'closing';
    polite.textContent = '';
    urgent.textContent = '';
    const reduceMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    exitTimer = view.setTimeout(() => finishDismiss(item),
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

  function showNext() {
    if (destroyed || active || queue.length === 0) return;
    const item = queue.shift();
    active = item;
    item.element = createToastElement(item);
    host.append(item.element);
    announce(item);
    resumeTimer(item);

    // Only opacity and transform move; the accepted Shell grid is untouched.
    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => {
        if (active === item && !item.isClosing) item.element.dataset.pgState = 'visible';
      });
    });
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

    if (!action) {
      const duplicate = [active, ...queue].find(item =>
        item && !item.isClosing && !item.action &&
        item.message === message && item.type === type);
      if (duplicate) return duplicate.handle;
      if (queue.length >= MAX_WAITING_TOASTS) {
        return Object.freeze({ dismiss: () => false });
      }
    }

    const item = {
      message, type, duration, action,
      remaining: duration, startedAt: 0, timerId: null,
      isHovered: false, isFocused: false, isClosing: false,
      returnFocus: doc.activeElement && doc.activeElement !== doc.body
        ? doc.activeElement : null,
      element: null,
      handle: null,
    };
    item.handle = Object.freeze({ dismiss: () => dismissItem(item) });
    queue.push(item);
    showNext();
    return item.handle;
  }

  function onVisibilityChange() {
    if (!active || active.isClosing) return;
    if (doc.hidden) pauseTimer(active);
    else resumeTimer(active);
  }

  doc.addEventListener('visibilitychange', onVisibilityChange);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (active) clearTimer(active);
    if (exitTimer !== null) view.clearTimeout(exitTimer);
    queue.length = 0;
    active = null;
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
 * Show one queued notification. Requires mountToasts() from src/main.js.
 *
 * @param {string} message - Plain text, never interpreted as HTML.
 * @param {{type?: 'info'|'success'|'warning'|'error',duration?:number,
 *   action?:{label:string,onClick:Function}}} options
 * @returns {{dismiss:()=>boolean}} Handle to remove a visible or queued toast.
 */
export function showToast(message, options = {}) {
  if (!mountedManager) throw new Error('Mount Toast UI before showing notifications');
  return mountedManager.enqueue(message, options);
}
