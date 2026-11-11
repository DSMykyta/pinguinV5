/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — POSITION POPUP                                                                       ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Position an already visible popover against its trigger.                               ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: positionPopup()                                                                      ║
 * ║ ПРИНЦИП: For upward opening, use the actual rendered height AFTER max-height is set. This avoids    ║
 * ║ the large gap produced by subtracting an available-height limit. This helper owns geometry only;    ║
 * ║ the calling component owns events and state.                                                        ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

export function positionPopup({
  anchor, popup, maxHeight = 320, matchWidth = true,
  minWidth = 170, maxWidth = 300, preferredWidth = null, align = 'start', gap = 4, edge = 8,
  placement = 'block',
} = {}) {
  if (!(anchor instanceof HTMLElement) || !(popup instanceof HTMLElement)) {
    throw new TypeError('Popup positioning requires anchor and popup elements');
  }
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const widthLimit = Math.max(0, viewportWidth - 2 * edge);
  const desiredWidth = matchWidth
    ? rect.width
    : Math.min(maxWidth, Math.max(minWidth, preferredWidth ?? rect.width));
  // The existing block popup remains unchanged. Submenus request inline
  // placement and reuse this same geometry owner, including viewport flip.
  if (placement === 'inline') {
    const right = Math.max(0, viewportWidth - rect.right - gap - edge);
    const leftSpace = Math.max(0, rect.left - gap - edge);
    const openingLeft = right < desiredWidth && leftSpace > right;
    const available = openingLeft ? leftSpace : right;
    const width = Math.min(widthLimit, desiredWidth, Math.max(0, available));
    popup.style.position = 'fixed';
    popup.style.width = width + 'px';
    popup.style.minWidth = '0';
    popup.style.left = (openingLeft ? rect.left - gap - width : rect.right + gap) + 'px';
    popup.style.maxHeight = Math.max(0, Math.min(maxHeight, viewportHeight - 2 * edge)) + 'px';
    const height = popup.getBoundingClientRect().height;
    const top = Math.max(edge, Math.min(rect.top, viewportHeight - edge - height));
    popup.style.top = top + 'px';
    return { direction: openingLeft ? 'left' : 'right', top,
      left: openingLeft ? rect.left - gap - width : rect.right + gap, width, height };
  }
  if (placement !== 'block') throw new TypeError('Unknown popup placement');
  const width = Math.min(widthLimit, desiredWidth);
  const requestedLeft = align === 'end' ? rect.right - width : rect.left;
  const left = Math.max(edge, Math.min(requestedLeft, viewportWidth - width - edge));

  popup.style.position = 'fixed';
  popup.style.width = width + 'px';
  popup.style.minWidth = '0';
  popup.style.left = left + 'px';

  // scrollHeight represents all contents even when an earlier limit was smaller.
  const fullHeight = Math.min(maxHeight, popup.scrollHeight);
  const below = Math.max(0, viewportHeight - rect.bottom - gap - edge);
  const above = Math.max(0, rect.top - gap - edge);
  const upward = fullHeight > below && above > below;
  const available = upward ? above : below;
  popup.style.maxHeight = Math.max(0, Math.min(maxHeight, available)) + 'px';

  // Read the actual height after sizing. A 120px menu must not sit 320px away.
  const measuredHeight = popup.getBoundingClientRect().height;
  const desiredTop = upward
    ? rect.top - gap - measuredHeight
    : rect.bottom + gap;
  const top = Math.max(edge, Math.min(desiredTop, viewportHeight - edge - measuredHeight));
  popup.style.top = top + 'px';
  return { direction: upward ? 'up' : 'down', top, left, width, height: measuredHeight };
}
