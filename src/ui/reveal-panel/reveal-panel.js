/**
 * PINGUIN NEXT — REVEAL PANEL
 * Purpose: a reusable, interruptible entrance/exit for contextual UI surfaces.
 * Dependencies: HTMLElement, CSS transitions, semantic motion tokens.
 * Public API: createRevealPanel({element, direction, focusTarget, initialVisible})
 *   -> {element, setVisible, getState, destroy}.
 * The caller owns the panel's content; this module knows no tabs, Search, or Toast.
 */
export function createRevealPanel({
  element, direction = 'top', focusTarget = null, initialVisible = false,
} = {}) {
  if (!(element instanceof HTMLElement) || !['top', 'bottom'].includes(direction) ||
      (focusTarget !== null && !(focusTarget instanceof HTMLElement))) {
    throw new TypeError('Reveal panel requires an HTMLElement, valid direction and optional focus target');
  }
  const view = element.ownerDocument.defaultView;
  let visible = Boolean(initialVisible);
  let destroyed = false;
  let exitTimer = null;
  let exitListener = null;
  let afterHide = null;
  let revision = 0;

  element.classList.add('pg-reveal-panel');
  element.dataset.pgRevealDirection = direction;
  element.dataset.pgState = visible ? 'visible' : 'hidden';
  element.hidden = !visible;
  element.inert = !visible;
  element.setAttribute('aria-hidden', String(!visible));

  function cancelExit() {
    if (exitTimer !== null) view.clearTimeout(exitTimer);
    exitTimer = null;
    if (exitListener) element.removeEventListener('transitionend', exitListener);
    exitListener = null;
    afterHide = null;
  }

  function getExitDuration() {
    if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    const styles = view.getComputedStyle(element);
    const values = text => text.split(',').map(value => {
      const trimmed = value.trim();
      const n = parseFloat(trimmed);
      if (!Number.isFinite(n)) return 0;
      return trimmed.endsWith('ms') ? n : n * 1000;
    });
    const times = values(styles.transitionDuration);
    const delays = values(styles.transitionDelay);
    return Math.max(0, ...times.map((time, index) => time + (delays[index % delays.length] ?? 0)));
  }

  function setVisible(next, { onHidden } = {}) {
    if (destroyed) return;
    if (typeof next !== 'boolean' || (onHidden !== undefined && typeof onHidden !== 'function')) {
      throw new TypeError('setVisible expects boolean and optional onHidden callback');
    }

    if (next) {
      if (visible && !element.hidden) return;
      visible = true;
      revision += 1;
      cancelExit();
      if (element.hidden) {
        element.dataset.pgState = 'hidden';
        element.hidden = false;
        // Establish the offscreen frame before transitioning to the resting pose.
        void element.getBoundingClientRect().height;
      }
      element.inert = false;
      element.setAttribute('aria-hidden', 'false');
      element.dataset.pgState = 'visible';
      return;
    }

    if (!visible && element.hidden) {
      onHidden?.();
      return;
    }
    if (!visible && element.dataset.pgState === 'leaving') {
      afterHide = onHidden ?? null;
      return;
    }

    visible = false;
    const token = ++revision;
    cancelExit();
    afterHide = onHidden ?? null;
    if (element.contains(element.ownerDocument.activeElement)) {
      if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
      else element.ownerDocument.activeElement?.blur?.();
    }
    element.inert = true;
    element.setAttribute('aria-hidden', 'true');
    element.dataset.pgState = 'leaving';

    function finish() {
      if (destroyed || visible || token !== revision) return;
      const callback = afterHide;
      cancelExit();
      element.hidden = true;
      element.dataset.pgState = 'hidden';
      callback?.();
    }

    const duration = getExitDuration();
    if (duration <= 1) {
      finish();
      return;
    }
    exitListener = event => {
      if (event.target === element && event.propertyName === 'transform') finish();
    };
    element.addEventListener('transitionend', exitListener);
    exitTimer = view.setTimeout(finish, duration + 65);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    revision += 1;
    cancelExit();
  }

  return Object.freeze({
    element,
    setVisible,
    getState: () => element.dataset.pgState,
    destroy,
  });
}
