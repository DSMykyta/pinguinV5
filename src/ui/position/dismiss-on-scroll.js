/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — DISMISS ON SCROLL                                                                    ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Dismiss a popup when an external surface scrolls.                                      ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: dismissOnOutsideScroll()                                                             ║
 * ║ ПРИНЦИП: User-initiated opening can itself finish a browser scroll-to-focus sequence. Arm after two ║
 * ║ animation frames so those initial scroll events cannot immediately cancel the freshly opened popup. ║
 * ║ The popup's own scroll is always allowed.                                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

export function dismissOnOutsideScroll({ popup, isOpen, dismiss, containsTarget, signal }) {
  if (!(popup instanceof HTMLElement) || typeof isOpen !== 'function' ||
      typeof dismiss !== 'function') {
    throw new TypeError('Outside-scroll dismissal needs a popup and callbacks');
  }
  let armed = false;
  let raf1 = 0;
  let raf2 = 0;

  function disarm() {
    armed = false;
    if (raf1) cancelAnimationFrame(raf1);
    if (raf2) cancelAnimationFrame(raf2);
    raf1 = raf2 = 0;
  }

  function arm() {
    disarm();
    raf1 = requestAnimationFrame(() => {
      raf1 = 0;
      raf2 = requestAnimationFrame(() => {
        raf2 = 0;
        armed = true;
      });
    });
  }

  function onScroll(event) {
    if (!armed || !isOpen()) return;
    const target = event.target;
    if (target instanceof Node && (popup.contains(target) || containsTarget?.(target))) return;
    dismiss();
  }

  window.addEventListener('scroll', onScroll, {
    capture: true, passive: true, signal,
  });
  signal?.addEventListener('abort', disarm, { once: true });
  return Object.freeze({ arm, disarm });
}
