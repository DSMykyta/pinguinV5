/**
 * Close an open floating surface when the page or an ancestor scrolls.
 * A scroll *inside* the popup is allowed (long option lists remain usable).
 * Each component supplies its own signal, state and close callback.
 */
export function dismissOnOutsideScroll({ popup, isOpen, dismiss, signal }) {
  if (!(popup instanceof HTMLElement) || typeof isOpen !== 'function' ||
      typeof dismiss !== 'function') {
    throw new TypeError('Outside-scroll dismissal needs a popup and callbacks');
  }
  function onScroll(event) {
    if (!isOpen()) return;
    const target = event.target;
    if (target instanceof Node && popup.contains(target)) return;
    dismiss();
  }
  window.addEventListener('scroll', onScroll, {
    capture: true, passive: true, signal,
  });
}
