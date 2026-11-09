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

  function createHandle() {
    const button = createNode('button', 'handle');
    button.type = 'button';
    button.setAttribute('aria-controls', viewport.id);
    const caption = createNode('span', 'caption');
    const symbol = createNode('span', 'symbol');
    symbol.setAttribute('aria-hidden', 'true');
    const arrow = createNode('span', 'arrow', '↓');
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
    symbol.append(arrow, svg);
    button.append(caption, symbol);
    rail.append(button);
    return { button, caption, ring: svg.lastElementChild };
  }
  const control = createHandle();
  element.append(header, rail, viewport, status);

  function adjacent(direction) {
    return sections[currentIndex + (direction === 'next' ? 1 : -1)];
  }

  function showDirection(direction) {
    const fallback = direction === 'next' ? 'previous' : 'next';
    const selected = adjacent(direction) ? direction : adjacent(fallback) ? fallback : null;
    if (!selected) {
      control.button.hidden = true;
      return;
    }
    control.button.hidden = false;
    const target = adjacent(selected);
    const changed = control.caption.textContent !== target.label;
    control.caption.textContent = target.label;
    control.button.setAttribute('aria-label', 'Перейти до розділу «' + target.label + '»');
    control.button.dataset.pgDirection = selected;
    if (visibleDirection !== selected && changed &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      control.caption.animate([
        { opacity: 0.45, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 190, easing: 'ease-out' });
    }
    visibleDirection = selected;
  }

  function renderControls() {
    title.textContent = sections[currentIndex].label;
    counter.textContent = (currentIndex + 1) + ' / ' + sections.length;
    control.button.disabled = busy;
    control.button.dataset.pgState = busy ? 'committing' : 'ready';
    showDirection(visibleDirection);
    element.setAttribute('aria-busy', String(busy));
    element.dataset.pgState = busy ? 'busy' : 'ready';
  }

  // A pure pull indicator. Ordinary page scroll does not fill the circle.
  function renderProgress(direction, progress) {
    if (destroyed || busy) return;
    if (direction && adjacent(direction)) showDirection(direction);
    const value = direction ? Math.min(1, Math.max(0, progress)) : 0;
    control.button.dataset.pgState = value >= 1 ? 'armed' : value > 0 ? 'pulling' : 'ready';
    control.ring.style.strokeDashoffset = String((100 * (1 - value)).toFixed(3));
  }

  let activeAnimation = null;
  async function animatePanel(panel, phase, movement) {
    const reduce = panel.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof panel.animate !== 'function') return;
    const exit = phase === 'exit';
    const from = exit
      ? { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      : { opacity: 0, transform: 'translate3d(0, ' + (movement * 26) + 'px, 0)' };
    const to = exit
      ? { opacity: 0, transform: 'translate3d(0, ' + (-movement * 20) + 'px, 0)' }
      : { opacity: 1, transform: 'translate3d(0, 0, 0)' };
    const animation = panel.animate([from, to], {
      duration: exit ? 170 : 270,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      fill: 'both',
    });
    activeAnimation = animation;
    try { await animation.finished; } catch { /* Destroy cancels animation. */ }
    if (activeAnimation === animation) {
      animation.cancel();
      activeAnimation = null;
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
    gestures?.reset({ cooldown: true });
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
      const movement = sections.findIndex(item => item.id === id) > currentIndex ? 1 : -1;
      positions.set(request.fromId, scrollContainer.scrollTop);
      control.ring.style.strokeDashoffset = '0';
      element.dataset.pgTransition = movement > 0 ? 'forward' : 'backward';
      await animatePanel(outgoing, 'exit', movement);
      if (destroyed) return false;
      outgoing.hidden = true;
      currentIndex = sections.findIndex(item => item.id === id);
      const incoming = panels.get(id);
      incoming.hidden = false;
      ignoreScrollDirectionOnce = true;
      scrollContainer.scrollTop = positions.get(id) ?? 0;
      lastScrollTop = scrollContainer.scrollTop;
      visibleDirection = adjacent('next') ? 'next' : 'previous';
      renderControls();
      await animatePanel(incoming, 'enter', movement);
      if (destroyed) return false;
      control.ring.style.strokeDashoffset = '100';
      delete element.dataset.pgTransition;
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
      if (!busy && !ignoreScrollDirectionOnce && Math.abs(current - lastScrollTop) > 1) {
        showDirection(current > lastScrollTop ? 'next' : 'previous');
      }
      ignoreScrollDirectionOnce = false;
      lastScrollTop = current;
    };
    const onWheel = event => {
      if (!busy && Math.abs(event.deltaY) > Math.abs(event.deltaX) &&
        !event.ctrlKey && !event.metaKey) {
        showDirection(event.deltaY > 0 ? 'next' : 'previous');
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('wheel', onWheel, { passive: true });
    stopScroll = () => {
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('wheel', onWheel);
    };
    gestures = mountNavigationGestures({
      viewport: container,
      handles: { next: control.button },
      getHandleDirection: () => visibleDirection,
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
    renderProgress(null, 0);
  }
  bindScroll(viewport);
  renderControls();
  renderProgress(null, 0);

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
      activeAnimation?.cancel();
      activeAnimation = null;
      stopScroll();
      element.remove();
    },
  });
}
