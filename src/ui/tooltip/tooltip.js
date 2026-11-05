/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED TOOLTIP                                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Єдина спливаюча підказка для елементів інтерфейсу.                                   ║
 * ║ ЗАЛЕЖНОСТІ: DOM, CSS компонента та data-pg-tooltip.                                                ║
 * ║ ПУБЛІЧНИЙ API: initTooltips() → dispose().                                                         ║
 * ║ ПРИНЦИП: Делеговані події, поведінка legacy, жодних браузерних title-плашок.                      ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Inspired by legacy/js/components/feedback/tooltip.js:
 * 500 ms hover delay, follows the cursor, stays inside the viewport,
 * gentle scale/opacity entrance, and works with dynamically created controls.
 * Keyboard focus gets the same tooltip beside its element.
 */
export function initTooltips({ doc = document, view = window } = {}) {
  const SELECTOR = '[data-pg-tooltip], [data-tooltip], [title]';
  const OFFSET = 15;
  const EDGE = 8;

  let target = null;
  let tooltip = null;
  let timer = null;
  let mode = 'pointer';
  let keyboardNavigation = false;
  let pointerX = 0;
  let pointerY = 0;
  let frame = null;
  let previousDescription = null;

  function resolveTarget(node) {
    const element = node?.closest?.(SELECTOR);
    if (!element || element.closest('[inert]') || !element.isConnected) return null;

    // Legacy compatibility: convert title once, before the native browser hint appears.
    if (element.hasAttribute('title')) {
      const title = element.getAttribute('title');
      if (title && !element.hasAttribute('data-pg-tooltip')) {
        element.dataset.pgTooltip = title;
      }
      if (title) element.setAttribute('data-pg-tooltip-always', '');
      element.removeAttribute('title');
    }
    return element;
  }

  function textFor(element) {
    return element.dataset.pgTooltip ?? element.dataset.tooltip ?? '';
  }

  function shouldShow(element) {
    return element.hasAttribute('data-pg-tooltip-always') ||
      element.hasAttribute('data-tooltip-always') ||
      element.scrollWidth > element.clientWidth;
  }

  function cancelTimer() {
    if (timer !== null) {
      view.clearTimeout(timer);
      timer = null;
    }
  }

  function clearTooltip() {
    if (frame !== null) {
      view.cancelAnimationFrame(frame);
      frame = null;
    }
    tooltip?.remove();
    tooltip = null;
    if (target && previousDescription !== null) {
      if (previousDescription) target.setAttribute('aria-describedby', previousDescription);
      else target.removeAttribute('aria-describedby');
    }
    previousDescription = null;
  }

  function hide() {
    cancelTimer();
    clearTooltip();
    target = null;
  }

  function position() {
    if (!tooltip || !target?.isConnected) return;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let x;
    let y;

    if (mode === 'focus') {
      const rect = target.getBoundingClientRect();
      x = rect.left;
      y = rect.bottom + OFFSET;
      if (y + height + EDGE > view.innerHeight) y = rect.top - height - OFFSET;
    } else {
      x = pointerX + OFFSET;
      y = pointerY + OFFSET;
      if (x + width + EDGE > view.innerWidth) x = pointerX - width - OFFSET;
      if (y + height + EDGE > view.innerHeight) y = pointerY - height - OFFSET;
    }

    tooltip.style.left = Math.max(EDGE, Math.min(x, view.innerWidth - width - EDGE)) + 'px';
    tooltip.style.top = Math.max(EDGE, Math.min(y, view.innerHeight - height - EDGE)) + 'px';
  }

  function show() {
    timer = null;
    if (!target?.isConnected || !shouldShow(target)) {
      hide();
      return;
    }
    const label = textFor(target);
    if (!label) {
      hide();
      return;
    }

    tooltip = doc.createElement('div');
    tooltip.id = 'pg-global-tooltip';
    tooltip.className = 'pg-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = label;
    doc.body.append(tooltip);

    previousDescription = target.getAttribute('aria-describedby') ?? '';
    target.setAttribute('aria-describedby', [
      previousDescription, tooltip.id,
    ].filter(Boolean).join(' '));
    position();
    frame = view.requestAnimationFrame(() => {
      frame = null;
      tooltip?.classList.add('pg-tooltip--visible');
    });
  }

  function start(element, nextMode) {
    if (!element || !textFor(element) || !shouldShow(element)) {
      hide();
      return;
    }
    if (target === element && (timer !== null || tooltip !== null)) return;
    hide();
    target = element;
    mode = nextMode;
    timer = view.setTimeout(show, nextMode === 'focus' ? 250 : 500);
  }

  function onMouseOver(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    start(resolveTarget(event.target), 'pointer');
  }

  function onMouseOut(event) {
    if (!target) return;
    const from = event.target?.closest?.(SELECTOR);
    const to = event.relatedTarget?.closest?.(SELECTOR);
    if (from === target && to !== target) hide();
  }

  function onMouseMove(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (tooltip && mode === 'pointer') position();
  }

  function onKeyDown(event) {
    if (event.key === 'Tab' || event.key.startsWith('Arrow')) keyboardNavigation = true;
    if (event.key === 'Escape') hide();
  }

  function onFocusIn(event) {
    if (keyboardNavigation) start(resolveTarget(event.target), 'focus');
  }

  function onFocusOut(event) {
    if (target && target === event.target) hide();
  }

  function onPointerDown(event) {
    keyboardNavigation = false;
    if (event.pointerType === 'touch') hide();
  }

  function onClick() {
    // The theme and pin buttons can change labels while the hint is visible.
    if (tooltip && target) {
      tooltip.textContent = textFor(target);
      position();
    }
  }

  function onVisibilityChange() {
    if (doc.hidden) hide();
  }

  doc.addEventListener('mouseover', onMouseOver);
  doc.addEventListener('mouseout', onMouseOut);
  doc.addEventListener('mousemove', onMouseMove);
  doc.addEventListener('keydown', onKeyDown);
  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);
  doc.addEventListener('pointerdown', onPointerDown);
  doc.addEventListener('click', onClick);
  doc.addEventListener('visibilitychange', onVisibilityChange);
  view.addEventListener('scroll', hide, true);
  view.addEventListener('resize', hide);

  return function disposeTooltips() {
    hide();
    doc.removeEventListener('mouseover', onMouseOver);
    doc.removeEventListener('mouseout', onMouseOut);
    doc.removeEventListener('mousemove', onMouseMove);
    doc.removeEventListener('keydown', onKeyDown);
    doc.removeEventListener('focusin', onFocusIn);
    doc.removeEventListener('focusout', onFocusOut);
    doc.removeEventListener('pointerdown', onPointerDown);
    doc.removeEventListener('click', onClick);
    doc.removeEventListener('visibilitychange', onVisibilityChange);
    view.removeEventListener('scroll', hide, true);
    view.removeEventListener('resize', hide);
  };
}
