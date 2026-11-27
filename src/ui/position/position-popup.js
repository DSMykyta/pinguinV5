/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — POSITION POPUP                                                                       ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Position an already visible popover against its trigger.                               ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: positionPopup()                                                                      ║
 * ║ ПРИНЦИП: Native CSS anchors first; viewport clamp is a compatibility and geometry fallback.         ║
 * ║ The caller owns events and state; this helper owns geometry only.                                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */


const anchorNames = new WeakMap();
let anchorSequence = 0;

function clearNativePosition(popup) {
  const style = popup.style;
  if (!style.getPropertyValue?.('position-anchor')) return;
  style.removeProperty('position-anchor');
  style.removeProperty('position-try-fallbacks');
  style.inset = 'auto';
}

// CSS owns placement. JS binds the actual DOM nodes and reads the result
// for the existing direction contract, not to calculate the native position.
function tryNativePosition({ anchor, popup, maxHeight, matchWidth, minWidth,
  maxWidth, preferredWidth, align, gap, edge, placement, inlineAnchor }) {
  if (gap < 0 || align === 'center' || inlineAnchor !== anchor ||
      (anchor.offsetWidth === 0 && anchor.offsetHeight === 0) ||
      !window.CSS?.supports('position-anchor', '--pg-popup-anchor') ||
      !window.CSS.supports('top', 'anchor(bottom)') ||
      !window.CSS.supports('width', 'anchor-size(width)') ||
      !window.CSS.supports('position-try-fallbacks', 'flip-block, flip-inline, flip-block flip-inline') ||
      !popup.matches(':popover-open')) return null;

  let name = anchorNames.get(anchor);
  if (!name) {
    name = '--pg-popup-anchor-' + (++anchorSequence);
    anchorNames.set(anchor, name);
  }
  const names = window.getComputedStyle(anchor).getPropertyValue('anchor-name').trim();
  if (!names.split(/\s*,\s*/).includes(name)) {
    anchor.style.setProperty('anchor-name', names && names !== 'none' ? names + ', ' + name : name);
  }

  const widthLimit = 'max(0px, calc(100vw - ' + 2 * edge + 'px))';
  const heightLimit = 'max(0px, calc(100vh - ' + 2 * edge + 'px))';
  const desiredWidth = matchWidth ? 'anchor-size(width)' :
    preferredWidth == null ? 'clamp(' + minWidth + 'px, anchor-size(width), ' + maxWidth + 'px)' :
      Math.min(maxWidth, Math.max(minWidth, preferredWidth)) + 'px';
  const style = popup.style;
  style.position = 'fixed';
  style.inset = 'auto';
  style.margin = '0';
  style.minWidth = '0';
  style.width = 'min(' + desiredWidth + ', ' + widthLimit + ')';
  style.maxHeight = 'min(' + maxHeight + 'px, ' + heightLimit + ')';
  style.setProperty('position-anchor', name);
  if (placement === 'inline') {
    style.left = 'calc(anchor(right) + ' + gap + 'px)';
    style.top = 'anchor(top)';
    style.setProperty('position-try-fallbacks', 'flip-inline, flip-block, flip-inline flip-block');
  } else {
    style.top = 'calc(anchor(bottom) + ' + gap + 'px)';
    if (align === 'end') style.right = 'anchor(right)';
    else style.left = 'anchor(left)';
    style.setProperty('position-try-fallbacks', 'flip-block, flip-inline, flip-block flip-inline');
  }

  const rect = popup.getBoundingClientRect();
  const source = anchor.getBoundingClientRect();
  const epsilon = 1;
  const near = (a, b) => Math.abs(a - b) <= epsilon;
  const direction = placement === 'inline'
    ? near(rect.right + gap, source.left) ? 'left' : near(rect.left, source.right + gap) ? 'right' : null
    : near(rect.bottom + gap, source.top) ? 'up' : near(rect.top, source.bottom + gap) ? 'down' : null;
  const aligned = placement === 'inline'
    ? near(rect.top, source.top) || near(rect.bottom, source.bottom)
    : near(rect.left, source.left) || near(rect.right, source.right);
  if (direction && aligned && rect.width > 0 && rect.height > 0 &&
      rect.left >= edge - epsilon && rect.top >= edge - epsilon &&
      rect.right <= window.innerWidth - edge + epsilon &&
      rect.bottom <= window.innerHeight - edge + epsilon) {
    return { direction, top: rect.top, left: rect.left, width: rect.width, height: rect.height };
  }
  return null;
}

export function positionPopup({
  anchor, popup, maxHeight = 320, matchWidth = true,
  minWidth = 170, maxWidth = 300, preferredWidth = null, align = 'start', gap = 4, edge = 8,
  placement = 'block', inlineAnchor = anchor,
} = {}) {
  if (!(anchor instanceof HTMLElement) || !(popup instanceof HTMLElement)) {
    throw new TypeError('Popup positioning requires anchor and popup elements');
  }
  if (!['block', 'inline'].includes(placement)) throw new TypeError('Unknown popup placement');
  const native = tryNativePosition({ anchor, popup, maxHeight, matchWidth, minWidth,
    maxWidth, preferredWidth, align, gap, edge, placement, inlineAnchor });
  if (native) return native;
  // Preserve the legacy clamp for unsupported browsers, virtual cursor
  // anchors, centered/overlapping panels and cases no native flip can fit.
  clearNativePosition(popup);
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
    const fullWidth = Math.min(widthLimit, desiredWidth);
    // On a phone, a parent menu can occupy almost the whole viewport:
    // never shrink its child to an unreadable strip. Overlap the parent
    // instead and clamp the popover to the screen like other shared popups.
    const width = available >= Math.min(minWidth, fullWidth)
      ? Math.min(fullWidth, available) : fullWidth;
    const requestedLeft = openingLeft ? rect.left - gap - width : rect.right + gap;
    const left = Math.max(edge, Math.min(requestedLeft, viewportWidth - width - edge));
    popup.style.position = 'fixed';
    popup.style.width = width + 'px';
    popup.style.minWidth = '0';
    popup.style.left = left + 'px';
    popup.style.maxHeight = Math.max(0, Math.min(maxHeight, viewportHeight - 2 * edge)) + 'px';
    const height = popup.getBoundingClientRect().height;
    const top = Math.max(edge, Math.min(rect.top, viewportHeight - edge - height));
    popup.style.top = top + 'px';
    return { direction: openingLeft ? 'left' : 'right', top, left, width, height };
  }
  const width = Math.min(widthLimit, desiredWidth);
  const inlineRect = inlineAnchor === anchor ? rect : inlineAnchor.getBoundingClientRect();
  const requestedLeft = align === 'center' ? inlineRect.left + (inlineRect.width - width) / 2
    : align === 'end' ? inlineRect.right - width : inlineRect.left;
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
