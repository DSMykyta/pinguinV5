/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MENU / NESTED ACTIONS                                               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: One accessible action menu with optional lateral submenus.            ║
 * ║ ЗАЛЕЖНОСТІ: Icon, shared Button skin, positionPopup, dismissOnOutsideScroll.      ║
 * ║ ПУБЛІЧНИЙ API: createMenu({label, items, align, onSelect}) → {element,...}.         ║
 * ║ ПРИНЦИП: One owner/lifecycle; descendants reuse menu roles, popup positioning.   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { setButtonColor } from '../button/button.js';
import { createIcon } from '../icon/icon.js';
import { positionPopup } from '../position/position-popup.js';
import { dismissOnOutsideScroll } from '../position/dismiss-on-scroll.js';

let sequence = 0;
const allowed = new Set(['action', 'navigation', 'check']);
const HOVER_GRACE = 220;
const TYPEAHEAD_IDLE = 550;

function normalizeEntries(items, stack = new Set()) {
  if (!Array.isArray(items) || !items.length || stack.has(items)) {
    throw new TypeError('Menu needs a non-empty, non-cyclic list of items');
  }
  stack.add(items);
  const entries = items.map((item, index) => {
    if (!item || typeof item.label !== 'string' || !item.label.trim()) {
      throw new TypeError('Menu item needs a label');
    }
    const type = item.type || 'action';
    if (!allowed.has(type)) throw new TypeError('Invalid menu item type');
    if (item.danger && item.tone != null && item.tone !== 'danger') {
      throw new TypeError('Dangerous menu actions must have danger tone');
    }
    const children = item.items === undefined ? null : normalizeEntries(item.items, stack);
    if (children && (type !== 'action' || item.checked || item.danger)) {
      throw new TypeError('Submenu triggers cannot also be checkable or destructive actions');
    }
    return {
      label: item.label, value: String(item.value ?? index), type,
      disabled: Boolean(item.disabled), danger: Boolean(item.danger),
      checked: Boolean(item.checked),
      tone: item.tone ?? (item.danger ? 'danger' : undefined),
      appearance: item.appearance, items: children,
    };
  });
  stack.delete(items);
  return entries;
}

export function createMenu({ label, id, items = [], align = 'start', disabled = false, onSelect } = {}) {
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('Menu label is required');
  if (!['start', 'end'].includes(align)) throw new TypeError('Invalid menu alignment');
  const entries = normalizeEntries(items);
  const uid = id || 'pg-menu-' + (++sequence);
  const element = document.createElement('div');
  element.className = 'pg-menu';
  element.dataset.pgAlign = align;

  const trigger = document.createElement('button');
  trigger.className = 'pg-menu__trigger pg-button pg-button--outline';
  trigger.type = 'button';
  trigger.disabled = Boolean(disabled);
  trigger.textContent = label;
  trigger.id = uid + '-trigger';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', uid + '-panel');

  const controller = new AbortController();
  const signal = controller.signal;
  const allNodes = [];
  const supportsPopover = typeof document.createElement('div').showPopover === 'function';
  let openState = false;
  let disposed = false;
  let graceTimer = null;
  let typeTimer = null;
  let typeBuffer = '';

  function cancelGrace() {
    if (graceTimer !== null) clearTimeout(graceTimer);
    graceTimer = null;
  }
  function clearTypeahead() {
    if (typeTimer !== null) clearTimeout(typeTimer);
    typeTimer = null;
    typeBuffer = '';
  }

  function createNode(nodeLabel, nodeId, nodeEntries, parent = null, parentButton = null) {
    const panel = document.createElement('div');
    panel.className = 'pg-menu__panel pg-scrollbar';
    if (parent) panel.classList.add('pg-menu__subpanel');
    panel.id = nodeId;
    panel.hidden = true;
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', nodeLabel);
    if (supportsPopover) panel.setAttribute('popover', 'manual');
    const node = { panel, parent, parentButton, buttons: [], children: new Map(),
      activeChild: null, open: false };
    allNodes.push(node);
    const hasSubmenus = nodeEntries.some(entry => entry.items);

    for (const entry of nodeEntries) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pg-menu__item pg-button pg-button--list-item';
      button.textContent = entry.label;
      button.dataset.pgValue = entry.value;
      button.disabled = entry.disabled;
      button.tabIndex = -1;
      button.setAttribute('role', entry.type === 'check' ? 'menuitemcheckbox' : 'menuitem');
      if (entry.type === 'check') {
        button.setAttribute('aria-checked', String(entry.checked));
        button.append(createIcon('check'));
      }
      if (entry.danger) button.dataset.pgDanger = 'true';
      if (entry.tone != null || entry.appearance != null) {
        setButtonColor(button, { tone: entry.tone, appearance: entry.appearance ?? 'ghost' });
      }
      node.buttons.push(button);
      panel.append(button);
      if (entry.items) {
        const subNode = createNode(entry.label, nodeId + '-sub-' + node.buttons.length,
          entry.items, node, button);
        node.children.set(button, subNode);
        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', subNode.panel.id);
        const arrow = createIcon('expand-more');
        arrow.classList.add('pg-menu__sub-arrow');
        arrow.setAttribute('aria-hidden', 'true');
        button.append(arrow);
        // Popover subpanels remain descendants in the DOM but escape any
        // scroll clipping in the browser top layer.
        panel.append(subNode.panel);
      }

      button.addEventListener('click', event => {
        if (entry.disabled) return;
        const submenu = node.children.get(button);
        if (submenu) { openChild(node, submenu, true); return; }
        if (entry.type === 'check') {
          entry.checked = !entry.checked;
          button.setAttribute('aria-checked', String(entry.checked));
        }
        close(true);
        onSelect?.(entry.value, { ...entry }, event);
      }, { signal });

      if (hasSubmenus) button.addEventListener('pointerenter', event => {
        if (entry.disabled || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
        cancelGrace();
        const submenu = node.children.get(button);
        if (node.activeChild && node.activeChild !== submenu) {
          // A diagonal pointer path may briefly cross the next row while
          // travelling into an open submenu. Delay sibling switching, not
          // initial opening, and cancel when the pointer reaches the panel.
          const previous = node.activeChild;
          graceTimer = setTimeout(() => {
            graceTimer = null;
            if (!button.matches(':hover') || node.activeChild !== previous) return;
            closeNode(previous);
            if (submenu) openChild(node, submenu, false);
          }, HOVER_GRACE);
        } else if (submenu) {
          openChild(node, submenu, false);
        }
      }, { signal });
      if (entry.items) {
        button.addEventListener('pointerleave', event => {
          if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
          scheduleClose(node.children.get(button));
        }, { signal });
      }
    }

    // When a long parent menu scrolls, its anchored submenu must follow
    // the same row; hide it if that row is no longer in the scroll viewport.
    if (hasSubmenus) panel.addEventListener('scroll', () => {
      const child = node.activeChild;
      if (!child?.open) return;
      const anchor = child.parentButton.getBoundingClientRect();
      const bounds = panel.getBoundingClientRect();
      if (anchor.bottom <= bounds.top || anchor.top >= bounds.bottom) closeNode(child);
      else positionNode(child);
    }, { passive: true, signal });

    panel.addEventListener('keydown', event => {
      // Nested popup events bubble to the ancestor menu as well.
      if (event.target.closest('[role="menu"]') !== panel) return;
      const enabled = node.buttons.filter(button => !button.disabled);
      const index = enabled.indexOf(document.activeElement);
      const current = enabled[index];
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (node.parent) closeNode(node, true);
        else close(true);
      } else if (event.key === 'ArrowLeft' && node.parent) {
        event.preventDefault();
        closeNode(node, true);
      } else if (event.key === 'ArrowRight' && current && node.children.has(current)) {
        event.preventDefault();
        openChild(node, node.children.get(current), true);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        clearTypeahead();
        focusItem(node, index + (event.key === 'ArrowDown' ? 1 : -1));
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        focusItem(node, event.key === 'Home' ? 0 : enabled.length - 1);
      } else if (event.key === 'Tab') {
        close();
      } else if (event.key.length === 1 && event.key !== ' ' &&
          !event.ctrlKey && !event.altKey && !event.metaKey) {
        typeBuffer += event.key.toLocaleLowerCase();
        if (typeTimer !== null) clearTimeout(typeTimer);
        typeTimer = setTimeout(clearTypeahead, TYPEAHEAD_IDLE);
        const next = enabled.find(button => button.textContent.trim()
          .toLocaleLowerCase().startsWith(typeBuffer));
        next?.focus({ preventScroll: true });
      }
    }, { signal });

    if (parent) {
      panel.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') cancelGrace();
      }, { signal });
      panel.addEventListener('pointerleave', event => {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        scheduleClose(node);
      }, { signal });
    }
    return node;
  }

  const root = createNode(label, uid + '-panel', entries);
  element.append(trigger, root.panel);

  function focusItem(node, index) {
    const enabled = node.buttons.filter(button => !button.disabled);
    if (enabled.length) {
      enabled[(index + enabled.length) % enabled.length].focus({ preventScroll: true });
    }
  }
  function positionNode(node) {
    if (!node.open) return;
    const width = Math.max(170, ...node.buttons.map(button => button.scrollWidth + 12));
    const geometry = positionPopup({
      anchor: node.parentButton ?? trigger, popup: node.panel,
      placement: node.parent ? 'inline' : 'block',
      maxHeight: 320, matchWidth: false, minWidth: 170, maxWidth: 360,
      preferredWidth: width, align, gap: 4,
    });
    if (node.parentButton) node.parentButton.dataset.pgSide = geometry.direction;
  }
  function position() {
    for (const node of allNodes) if (node.open) positionNode(node);
  }
  function openNode(node) {
    if (node.open || disposed) return;
    node.open = true;
    node.panel.hidden = false;
    if (supportsPopover) node.panel.showPopover();
    else if (node.parent) document.body.append(node.panel);
    positionNode(node);
  }
  function closeNode(node, restore = false) {
    if (!node?.open) return;
    if (node.activeChild) closeNode(node.activeChild);
    node.activeChild = null;
    node.open = false;
    if (supportsPopover && node.panel.matches(':popover-open')) node.panel.hidePopover();
    node.panel.hidden = true;
    if (node.parent) {
      node.parent.activeChild = null;
      node.parentButton.setAttribute('aria-expanded', 'false');
      delete node.parentButton.dataset.pgSide;
      if (restore) node.parentButton.focus({ preventScroll: true });
    }
  }
  function openChild(parent, child, focus = false) {
    cancelGrace();
    if (parent.activeChild && parent.activeChild !== child) closeNode(parent.activeChild);
    parent.activeChild = child;
    openNode(child);
    child.parentButton.setAttribute('aria-expanded', 'true');
    if (focus) focusItem(child, 0);
  }
  function scheduleClose(child) {
    cancelGrace();
    if (!child?.open) return;
    graceTimer = setTimeout(() => {
      graceTimer = null;
      if (child.parentButton.matches(':hover') || child.panel.matches(':hover') ||
          child.panel.contains(document.activeElement)) return;
      closeNode(child);
    }, HOVER_GRACE);
  }

  function open() {
    if (openState || disposed || trigger.disabled) return;
    openState = true;
    trigger.setAttribute('aria-expanded', 'true');
    element.dataset.pgOpen = 'true';
    openNode(root);
    focusItem(root, 0);
    scrollDismiss.arm();
  }
  function close(restore = false) {
    if (!openState) return;
    cancelGrace();
    clearTypeahead();
    closeNode(root);
    openState = false;
    scrollDismiss.disarm();
    trigger.setAttribute('aria-expanded', 'false');
    element.dataset.pgOpen = 'false';
    if (restore) trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener('click', () => openState ? close(true) : open(), { signal });
  trigger.addEventListener('keydown', event => {
    if (!openState && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open();
      if (event.key === 'ArrowUp') focusItem(root, -1);
    }
  }, { signal });

  document.addEventListener('pointerdown', event => {
    if (!openState) return;
    const target = event.target;
    if (element.contains(target) ||
        allNodes.some(node => node.open && node.panel.contains(target))) return;
    close();
  }, { signal });
  window.addEventListener('resize', position, { signal });
  const scrollDismiss = dismissOnOutsideScroll({
    popup: root.panel, isOpen: () => openState, dismiss: () => close(),
    containsTarget: target => allNodes.some(node => node.open && node.panel.contains(target)),
    signal,
  });

  return Object.freeze({
    element, trigger, open, close,
    destroy() {
      disposed = true;
      close();
      controller.abort();
      for (const node of allNodes) node.panel.remove();
      element.remove();
    },
  });
}
