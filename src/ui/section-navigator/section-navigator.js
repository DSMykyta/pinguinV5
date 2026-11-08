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
    const caption = createNode('span', 'caption');
    const meter = createNode('span', 'meter');
    meter.setAttribute('aria-hidden', 'true');
    button.append(symbol, caption, meter);
    return { button, caption };
  }
  const controls = { previous: createHandle('previous'), next: createHandle('next') };
  element.append(header, controls.previous.button, viewport, controls.next.button, status);

  function adjacent(direction) {
    return sections[currentIndex + (direction === 'next' ? 1 : -1)];
  }

  function renderControls() {
    title.textContent = sections[currentIndex].label;
    counter.textContent = (currentIndex + 1) + ' / ' + sections.length;
    for (const [direction, { button, caption }] of Object.entries(controls)) {
      const destination = adjacent(direction);
      const text = destination
        ? (direction === 'next' ? 'Далі: ' : 'Назад: ') + destination.label
        : direction === 'next' ? 'Останній блок' : 'Перший блок';
      button.disabled = busy || !destination;
      button.setAttribute('aria-label', text);
      caption.textContent = text;
    }
    element.setAttribute('aria-busy', String(busy));
    element.dataset.pgState = busy ? 'busy' : 'ready';
  }

  function renderProgress(direction, progress, source) {
    if (destroyed) return;
    for (const [side, { button, caption }] of Object.entries(controls)) {
      const value = direction === side ? progress : 0;
      button.style.setProperty('--pg-section-navigator-progress', String(value));
      button.dataset.pgState = value >= 1 ? 'armed' : value > 0 ? 'pulling' : 'ready';
      const destination = adjacent(side);
      if (!destination) continue;
      caption.textContent = value >= 1
        ? (source === 'wheel' ? 'Перехід після зупинки: ' : 'Відпустіть: ') + destination.label
        : (side === 'next' ? 'Далі: ' : 'Назад: ') + destination.label;
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
      positions.set(request.fromId, viewport.scrollTop);
      outgoing.hidden = true;
      currentIndex = sections.findIndex(item => item.id === id);
      panels.get(id).hidden = false;
      viewport.scrollTop = positions.get(id) ?? 0;
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

  const gestures = mountNavigationGestures({
    viewport,
    handles: { previous: controls.previous.button, next: controls.next.button },
    wheel,
    canGo: direction => Boolean(adjacent(direction)),
    isEnabled: () => !destroyed && !busy && element.isConnected && viewport.getClientRects().length > 0,
    onProgress: renderProgress,
    onNavigate: (direction, source) => {
      const destination = adjacent(direction);
      if (destination) void navigateTo(destination.id, { source, focus: source === 'button' });
    },
  });
  renderControls();

  return Object.freeze({
    element,
    navigate: (id, options) => navigateTo(id, { focus: options?.focus ?? true }),
    getActive: () => sections[currentIndex].id,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      gestures.destroy();
      element.remove();
    },
  });
}
