/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — COLLECTION COLUMN HEADER                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Quiet sort control and hover/click column filter popover.     ║
 * ║ ЗАЛЕЖНОСТІ: Button, Icon, Input, Checkbox, positionPopup, scroll dismissal.║
 * ║ ПУБЛІЧНИЙ API: createCollectionHeader() → element, sync, close, destroy.   ║
 * ║ ПРИНЦИП: Composes shared controls; collection owns all data and filtering. ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton, setButtonColor } from '../button/button.js';
import { createIcon } from '../icon/icon.js';
import { createInput } from '../input/input.js';
import { createCheckbox } from '../checkbox/checkbox.js';
import { positionPopup } from '../position/position-popup.js';
import { dismissOnOutsideScroll } from '../position/dismiss-on-scroll.js';

let sequence = 0;

export function createCollectionHeader({ column, th, getOptions, getFilter, onFilter,
  onSort, onOpen } = {}) {
  const element = document.createElement('div');
  element.className = 'pg-collection-view__column-header';
  const controller = new AbortController();
  const { signal } = controller;
  const name = document.createElement('span');
  name.className = 'pg-collection-view__column-name';
  name.textContent = column.label;
  name.dataset.pgTooltip = column.label;
  let sortButton = null, marker = null, direction = null;
  if (column.sortable !== false) {
    sortButton = document.createElement('button');
    sortButton.type = 'button';
    sortButton.className = 'pg-collection-view__sort pg-button pg-button--plain';
    marker = document.createElement('span');
    marker.className = 'pg-collection-view__sort-mark';
    marker.setAttribute('aria-hidden', 'true');
    // Keep the sort indicator before the label in every column, filtered or not.
    sortButton.append(marker, name);
    sortButton.addEventListener('click', () => {
      close();
      onSort(direction === 'asc' ? 'desc' : 'asc');
    }, { signal });
    element.append(sortButton);
  } else element.append(name);

  let trigger = null, panel = null, search = null, all = null;
  let opened = false, pinned = false, disposed = false, pointerInPanel = false;
  let showTimer = null, hideTimer = null;
  let options = [], controls = [];
  let reset = null, list = null, noMatches = null;
  const hasPopover = typeof element.showPopover === 'function';
  let observer = null, scrollDismiss = null;
  const belongs = target => target instanceof Node &&
    (th.contains(target) || panel?.contains(target));
  function cancelTimers() {
    clearTimeout(showTimer); clearTimeout(hideTimer);
    showTimer = hideTimer = null;
  }
  function position() {
    if (!opened) return;
    if (!th.isConnected || !th.getClientRects().length) { close(); return; }
    positionPopup({ anchor: th, popup: panel, matchWidth: false,
      minWidth: 260, maxWidth: 320, preferredWidth: 280, maxHeight: 420 });
  }
  function syncOptions() {
    if (!opened) return;
    const values = getFilter();
    const query = search?.input.value.trim().toLocaleLowerCase('uk') || '';
    let visible = 0;
    for (const { option, checkbox, row, count } of controls) {
      checkbox.setChecked(values === null || values.includes(option.value));
      row.hidden = !option.label.toLocaleLowerCase('uk').includes(query);
      count.textContent = String(option.count);
      if (!row.hidden) visible++;
    }
    const checked = controls.filter(item => item.checkbox.input.checked).length;
    all.setChecked(checked === controls.length && checked > 0);
    all.setIndeterminate(checked > 0 && checked < controls.length);
    all.setDisabled(!controls.length);
    reset.disabled = values === null;
    noMatches.hidden = visible > 0;
    // Filtering can shorten the table and clamp its scroll position. As with
    // opening/focus, that browser-generated scroll must not dismiss the form.
    scrollDismiss?.arm();
  }
  function buildOptions() {
    controls.forEach(item => item.checkbox.destroy());
    controls = [];
    list.replaceChildren();
    options = getOptions();
    for (const option of options) {
      const row = document.createElement('div');
      row.className = 'pg-collection-view__filter-option';
      const checkbox = createCheckbox({
        label: option.label,
        onChange: checked => {
          const selected = new Set(getFilter() ?? options.map(item => item.value));
          if (checked) selected.add(option.value); else selected.delete(option.value);
          onFilter([...selected]);
        },
      });
      const count = document.createElement('span');
      count.className = 'pg-collection-view__filter-count';
      count.setAttribute('aria-hidden', 'true');
      row.append(checkbox.element, count);
      list.append(row);
      controls.push({ option, row, checkbox, count });
    }
    search.element.hidden = options.length <= 10;
    syncOptions();
  }
  function open(focus = false) {
    cancelTimers();
    if (disposed || !panel || !th.isConnected || !th.getClientRects().length) return;
    if (!opened) {
      onOpen();
      opened = true;
      pinned = focus;
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      th.dataset.pgFilterOpen = 'true';
      search.setValue('');
      buildOptions();
      if (hasPopover) panel.showPopover();
      else document.body.append(panel);
      position();
      scrollDismiss.arm();
      observer?.observe(th);
    }
    if (focus) {
      pinned = true;
      (search.element.hidden ? all.input : search.input).focus({ preventScroll: true });
    }
  }
  function close(restore = false) {
    cancelTimers();
    if (!opened) return;
    const hadFocus = panel.contains(document.activeElement);
    opened = pinned = pointerInPanel = false;
    scrollDismiss.disarm();
    observer?.disconnect();
    if (hasPopover && panel.matches(':popover-open')) panel.hidePopover();
    panel.hidden = true;
    if (!hasPopover) element.append(panel);
    trigger.setAttribute('aria-expanded', 'false');
    delete th.dataset.pgFilterOpen;
    if (restore || hadFocus) trigger.focus({ preventScroll: true });
  }
  function scheduleHide() {
    clearTimeout(showTimer); showTimer = null;
    clearTimeout(hideTimer);
    if (!opened || pinned) return;
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (!panel.matches(':hover') && !th.matches(':hover') &&
          !panel.contains(document.activeElement)) close();
    }, 200);
  }
  if (column.filterable) {
    th.dataset.pgFilterable = 'true';
    const id = 'pg-column-filter-' + (++sequence);
    trigger = createIconButton({ label: 'Фільтр: ' + column.label,
      icon: 'sliders', variant: 'mini', action: 'column-filter' });
    trigger.classList.add('pg-collection-view__filter-trigger');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', id);
    panel = document.createElement('section');
    panel.id = id;
    panel.className = 'pg-collection-view__filter-panel pg-field__popup pg-scrollbar';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Фільтр: ' + column.label);
    if (hasPopover) panel.setAttribute('popover', 'manual');
    const title = document.createElement('strong');
    title.className = 'pg-collection-view__filter-title';
    title.textContent = column.label;
    const toolbar = document.createElement('div');
    toolbar.className = 'pg-collection-view__filter-toolbar';
    all = createCheckbox({ label: 'Всі', onChange: () => {
      const hasSelected = controls.some(item => item.checkbox.input.checked);
      onFilter(hasSelected ? [] : null);
    } });
    reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'pg-button pg-button--plain';
    reset.textContent = 'Скинути';
    reset.addEventListener('click', () => onFilter(null), { signal });
    toolbar.append(all.element, reset);
    search = createInput({ label: 'Пошук значень: ' + column.label,
      variant: 'search', labelPresentation: 'sr-only', placeholder: 'Пошук…',
      clearable: true, onInput: () => syncOptions() });
    list = document.createElement('div');
    list.className = 'pg-collection-view__filter-values pg-scrollbar';
    noMatches = document.createElement('p');
    noMatches.className = 'pg-collection-view__filter-empty';
    noMatches.setAttribute('role', 'status');
    noMatches.textContent = 'Нічого не знайдено';
    panel.append(title, toolbar, search.element, list, noMatches);
    element.append(trigger, panel);
    trigger.addEventListener('click', () => opened && pinned ? close(true) : open(true), { signal });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); open(true); }
    }, { signal });
    th.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      cancelTimers();
      if (!opened) showTimer = setTimeout(() => open(), 400);
    }, { signal });
    th.addEventListener('pointerleave', event => {
      if (!belongs(event.relatedTarget)) scheduleHide();
    }, { signal });
    panel.addEventListener('pointerenter', cancelTimers, { signal });
    panel.addEventListener('pointerleave', scheduleHide, { signal });
    panel.addEventListener('pointerdown', () => { pinned = true; }, { signal });
    panel.addEventListener('focusin', () => { pinned = true; }, { signal });
    document.addEventListener('pointerdown', event => {
      pointerInPanel = panel.contains(event.target);
      if (opened && !belongs(event.target)) close();
      if (!belongs(event.target)) cancelTimers();
    }, { signal });
    document.addEventListener('focusin', event => {
      // A label press first focuses its tabindex scroll ancestor in Chromium,
      // before the native checkbox receives focus. Keep that intermediate step.
      if (opened && !belongs(event.target) &&
          !(pointerInPanel && event.target.contains(panel))) close();
    }, { signal });
    document.addEventListener('keydown', event => {
      pointerInPanel = false;
      if (opened && event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); close(true);
      }
    }, { signal, capture: true });
    window.addEventListener('resize', position, { signal });
    observer = new ResizeObserver(position);
    scrollDismiss = dismissOnOutsideScroll({ popup: panel,
      isOpen: () => opened, dismiss: () => close(), signal });
  }
  return Object.freeze({ element, close,
    sync(sort, filtered) {
      direction = sort?.key === column.key ? sort.direction : null;
      if (direction) th.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
      th.dataset.pgFiltered = String(filtered);
      if (sortButton) {
        sortButton.setAttribute('aria-label', 'Сортувати ' + column.label + ' ' +
          (direction === 'asc' ? 'за спаданням' : 'за зростанням'));
        const icon = direction === 'asc' ? 'arrow-up' : direction === 'desc' ? 'arrow-down' : 'swap-vert';
        if (marker.dataset.pgIcon !== icon) {
          marker.replaceChildren(createIcon(icon)); marker.dataset.pgIcon = icon;
        }
      }
      if (trigger) {
        setButtonColor(trigger, filtered ? { tone: 'main', appearance: 'ghost' } : {});
        trigger.setAttribute('aria-label', 'Фільтр: ' + column.label + (filtered ? ' — застосовано' : ''));
      }
      syncOptions();
    },
    destroy() {
      close(); disposed = true; controller.abort(); observer?.disconnect();
      controls.forEach(item => item.checkbox.destroy());
      all?.destroy(); search?.destroy(); panel?.remove(); element.remove();
    },
  });
}
