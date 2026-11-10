/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — CONTENT SIZE TRANSITION                                                              ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Animate the natural block height after synchronous content changes.                    ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: createSizeTransition()                                                               ║
 * ║ ПРИНЦИП: No page-specific selectors; self-contained interruption and reduced-motion.                ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

export function createSizeTransition({ element, duration = 280 } = {}) {
  if (!(element instanceof HTMLElement) || !Number.isFinite(duration) || duration < 0) {
    throw new TypeError('Size transition requires an element and nonnegative duration');
  }
  const view = element.ownerDocument.defaultView;
  let animation = null;
  let overflow = '';
  let destroyed = false;

  function cancel() {
    if (!animation) return;
    const current = animation;
    animation = null;
    current.cancel();
    element.style.overflowY = overflow;
  }

  function change(mutate) {
    if (destroyed || typeof mutate !== 'function') {
      if (destroyed) return;
      throw new TypeError('Size transition change needs a synchronous function');
    }
    // Capture the live presentation size, even mid-flight: reversal continues
    // from the current height instead of snapping to either endpoint.
    const before = element.getBoundingClientRect().height;
    cancel();
    const result = mutate();
    const after = element.getBoundingClientRect().height;
    if (!element.isConnected || element.inert ||
        view.getComputedStyle(element).visibility === 'hidden' ||
        view.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        typeof element.animate !== 'function' || Math.abs(after - before) < 2) {
      return result;
    }
    overflow = element.style.overflowY;
    element.style.overflowY = 'hidden';
    const instance = element.animate([
      { height: before + 'px' },
      { height: after + 'px' },
    ], {
      duration, fill: 'both', easing: 'cubic-bezier(.22, 1, .36, 1)',
    });
    animation = instance;
    instance.finished.then(() => {
      if (animation !== instance) return;
      animation = null;
      instance.cancel();
      element.style.overflowY = overflow;
    }).catch(() => {});
    return result;
  }

  return Object.freeze({
    change,
    destroy() { destroyed = true; cancel(); },
  });
}
