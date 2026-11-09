/**
 * Scroll only the option collection/popup, never the page or its ancestors.
 * scrollIntoView() can scroll unrelated ancestors and dismiss a popover.
 */
export function ensureOptionVisible(popup, option) {
  if (!(popup instanceof HTMLElement) || !(option instanceof HTMLElement) ||
      !popup.contains(option)) return;

  let parent = option.parentElement;
  while (parent && popup.contains(parent)) {
    const style = getComputedStyle(parent);
    if (/auto|scroll/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
      const visible = parent.getBoundingClientRect();
      const item = option.getBoundingClientRect();
      if (item.top < visible.top) parent.scrollTop += item.top - visible.top;
      else if (item.bottom > visible.bottom) parent.scrollTop += item.bottom - visible.bottom;
    }
    if (parent === popup) break;
    parent = parent.parentElement;
  }
}
