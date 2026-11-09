/**
 * PINGUIN NEXT — SECTION NAVIGATOR
 * ПРИЗНАЧЕННЯ: Перемикає незалежні DOM-секції через локальну навігацію.
 * ЗАЛЕЖНОСТІ: Власний navigation-gestures, native DOM.
 * ПУБЛІЧНИЙ API: createSectionNavigator(options).
 * ПРИНЦИП: Вміст, збереження та бізнес-перевірки належать власнику секцій.
 */
import { mountNavigationGestures } from './navigation-gestures.js';

let nextNavigatorId = 0;

export function createSectionNavigator({ label, items, initialId, wheel = true, canNavigate, onChange, onError } = {}) {
  if (typeof label !== 'string' || !label.trim() || !Array.isArray(items) || !items.length) {
    throw new TypeError('Section navigator requires a label and non-empty items');
  }
  const sections = items.map(item => ({ ...item }));
  const ids = new Set(sections.map(item => item.id));
  const contents = new Set(sections.map(item => item.content));
  if (ids.size !== sections.length || contents.size !== sections.length || sections.some(item =>
    typeof item.id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(item.id) || typeof item.label !== 'string' ||
    !item.label.trim() || !(item.content instanceof HTMLElement))) {
    throw new TypeError('Sections require unique kebab-case IDs, labels and distinct HTML content');
  }
  for (const callback of [canNavigate, onChange, onError]) {
    if (callback !== undefined && typeof callback !== 'function') throw new TypeError('Navigation callbacks must be functions');
  }
  const startingId = initialId ?? sections[0].id;
  if (!ids.has(startingId)) throw new TypeError('Unknown initial section: ' + startingId);
  let currentIndex = sections.findIndex(item => item.id === startingId);
  let busy = false;
  let destroyed = false;
  const positions = new Map();
  const panels = new Map();
  const prefix = 'pg-section-navigator-' + (++nextNavigatorId);
  let visibleDirection = 'next';
  let gestures = null;
  let stopScroll = () => {};
  let lastScrollTop = 0;
  let ignoreScrollDirectionOnce = false;

  function createNode(tag, part, text) {
    const node = document.createElement(tag);
    node.className = 'pg-section-navigator' + (part ? '__' + part : '');
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const element = createNode('section');
  element.setAttribute('aria-label', label);
  element.setAttribute('aria-busy', 'false');
  element.dataset.pgState = 'ready';
  const header = createNode('header', 'header');
  const title = createNode('h3', 'title');
  title.id = prefix + '-title';
  title.tabIndex = -1;
  const counter = createNode('span', 'counter');
  header.append(title, counter);
  const viewport = createNode('div', 'viewport');
  viewport.id = prefix + '-viewport';
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-labelledby', title.id);
  for (const section of sections) {
    const panel = createNode('div', 'panel');
    panel.dataset.pgSection = section.id;
    panel.hidden = section.id !== startingId;
    panel.append(section.content);
    panels.set(section.id, panel);
    viewport.append(panel);
  }
  const rail = createNode('div', 'rail');
  let scrollContainer = viewport;
  const status = createNode('p', 'status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-atomic', 'true');

  function createHandle(direction) {
    const button = createNode('button', 'handle');
    button.type = 'button';
    button.dataset.pgDirection = direction;
    button.setAttribute('aria-controls', viewport.id);
    const symbol = createNode('span', 'symbol', direction === 'next' ? '↓' : '↑');
    symbol.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('pg-section-navigator__ring');
    svg.setAttribute('viewBox', '0 0 44 44');
    svg.setAttribute('aria-hidden', 'true');
    for (const role of ['track', 'fill']) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.classList.add('pg-section-navigator__ring-' + role);
      circle.setAttribute('cx', '22');
      circle.setAttribute('cy', '22');
      circle.setAttribute('r', '19');
      if (role === 'fill') {
        circle.setAttribute('pathLength', '100');
        circle.style.strokeDashoffset = '100';
      }
      svg.append(circle);
    }
    symbol.append(svg);
    const caption = createNode('span', 'caption');
    button.append(symbol, caption);
    rail.append(button);
    return { button, caption, ring: svg.lastElementChild };
  }
  const controls = { previous: createHandle('previous'), next: createHandle('next') };
  element.append(header, rail, viewport, status);

  function adjacent(direction) {
    return sections[currentIndex + (direction === 'next' ? 1 : -1)];
  }

  function showDirection(direction) {
    if (!adjacent(direction)) direction = adjacent(direction === 'next' ? 'previous' : 'next')
      ? (direction === 'next' ? 'previous' : 'next') : direction;
    visibleDirection = direction;
    for (const [side, control] of Object.entries(controls)) {
      control.button.hidden = !adjacent(side) || side !== visibleDirection;
    }
  }

  function renderControls() {
    title.textContent = sections[currentIndex].label;
    counter.textContent = (currentIndex + 1) + ' / ' + sections.length;
    for (const [direction, { button, caption }] of Object.entries(controls)) {
      const destination = adjacent(direction);
      button.disabled = busy || !destination;
      if (destination) {
        button.setAttribute('aria-label', 'Перейти до розділу «' + destination.label + '»');
        caption.textContent = destination.label;
      } else {
        button.removeAttribute('aria-label');
        caption.textContent = '';
      }
      button.dataset.pgState = 'ready';
    }
    showDirection(visibleDirection);
    element.setAttribute('aria-busy', String(busy));
    element.dataset.pgState = busy ? 'busy' : 'ready';
  }

  function syncProgress() {
    if (destroyed) return;
    const max = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    const progress = max <= 1 ? 0 : Math.min(1, Math.max(0, scrollContainer.scrollTop / max));
    element.style.setProperty('--pg-section-scroll-progress', progress.toFixed(5));
    for (const { ring } of Object.values(controls)) {
      ring.style.strokeDashoffset = String((100 * (1 - progress)).toFixed(3));
    }
  }

  function renderProgress(direction, progress) {
    if (destroyed) return;
    if (direction && adjacent(direction)) showDirection(direction);
    for (const [side, { button }] of Object.entries(controls)) {
      const amount = direction === side ? progress : 0;
      button.dataset.pgState = amount >= 1 ? 'armed' : amount > 0 ? 'pulling' : 'ready';
    }
  }

  function reportError(error) {
    status.textContent = 'Не вдалося перейти. Спробуйте ще раз.';
    // A reporting callback must not turn an already completed change into rejection.
    try { onError?.(error); } catch { /* The local status remains available. */ }
  }

  async function navigateTo(id, { source = 'api', focus = true } = {}) {
    if (destroyed || busy || !ids.has(id) || sections[currentIndex].id === id) return false;
    const request = Object.freeze({ fromId: sections[currentIndex].id, toId: id, source });
    busy = true;
    gestures.reset({ cooldown: true });
    status.textContent = '';
    renderControls();
    try {
      const allowed = canNavigate ? await canNavigate(request) : true;
      if (destroyed) return false;
      if (allowed !== true) {
        status.textContent = 'Поки залишаємося в поточному блоці.';
        return false;
      }
      const outgoing = panels.get(request.fromId);
      const shouldFocus = focus || outgoing.contains(document.activeElement);
      positions.set(request.fromId, scrollContainer.scrollTop);
      outgoing.hidden = true;
      currentIndex = sections.findIndex(item => item.id === id);
      panels.get(id).hidden = false;
      ignoreScrollDirectionOnce = true;
      scrollContainer.scrollTop = positions.get(id) ?? 0;
      lastScrollTop = scrollContainer.scrollTop;
      visibleDirection = adjacent('next') ? 'next' : 'previous';
      syncProgress();
      renderControls();
      status.textContent = 'Блок ' + (currentIndex + 1) + ' з ' + sections.length + ': ' + sections[currentIndex].label;
      if (shouldFocus) title.focus({ preventScroll: true });
      try { onChange?.(request); } catch (error) { reportError(error); }
      return true;
    } catch (error) {
      if (!destroyed) reportError(error);
      return false;
    } finally {
      if (!destroyed) {
        busy = false;
        renderControls();
      }
    }
  }

  function bindScroll(container) {
    gestures?.destroy();
    stopScroll();
    scrollContainer = container;
    element.dataset.pgScrollContainer = container === viewport ? 'local' : 'external';
    const onScroll = () => {
      const current = container.scrollTop;
      if (!ignoreScrollDirectionOnce && Math.abs(current - lastScrollTop) > 1) {
        showDirection(current > lastScrollTop ? 'next' : 'previous');
      }
      ignoreScrollDirectionOnce = false;
      lastScrollTop = current;
      syncProgress();
    };
    const onWheel = event => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && !event.ctrlKey && !event.metaKey) {
        showDirection(event.deltaY > 0 ? 'next' : 'previous');
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('wheel', onWheel, { passive: true });
    const view = container.ownerDocument.defaultView;
    view.addEventListener('resize', syncProgress, { passive: true });
    const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(syncProgress) : null;
    observer?.observe(container);
    observer?.observe(viewport);
    stopScroll = () => {
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('wheel', onWheel);
      view.removeEventListener('resize', syncProgress);
      observer?.disconnect();
    };
    gestures = mountNavigationGestures({
      viewport: container,
      handles: { previous: controls.previous.button, next: controls.next.button },
      wheel,
      canGo: direction => Boolean(adjacent(direction)),
      isEnabled: () => !destroyed && !busy && element.isConnected && container.getClientRects().length > 0,
      onProgress: renderProgress,
      onNavigate: (direction, source) => {
        const destination = adjacent(direction);
        if (destination) void navigateTo(destination.id, { source, focus: source === 'button' });
      },
    });
    lastScrollTop = container.scrollTop;
    syncProgress();
  }
  bindScroll(viewport);
  renderControls();
  syncProgress();

  return Object.freeze({
    element,
    navigate: (id, options) => navigateTo(id, { focus: options?.focus ?? true }),
    getActive: () => sections[currentIndex].id,
    setScrollContainer(container) {
      if (destroyed || !(container instanceof HTMLElement) || !container.contains(element)) {
        throw new TypeError('Scroll container must contain the mounted navigator');
      }
      if (container !== scrollContainer) bindScroll(container);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      gestures?.destroy();
      stopScroll();
      element.remove();
    },
  });
}
