/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SCROLLBAR EDGE PROJECTION
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Переносить видиму вертикальну смугу сторінки до краю Shell.
 * ║ ЗАЛЕЖНОСТІ: DOM, ResizeObserver, MutationObserver, shared scrollbar CSS.
 * ║ ПУБЛІЧНИЙ API: mountEdgeScrollbar({ host, container, media }).
 * ║ ПРИНЦИП: Нативний scrollport залишається власником scrollTop; без дублювання стилів.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

export function mountEdgeScrollbar({ host, container, media }) {
  const doc = container.ownerDocument;
  const view = doc.defaultView;
  if (!view.ResizeObserver || !view.MutationObserver) return () => {};
  const rail = doc.createElement('div');
  rail.className = 'pg-scrollbar pg-scrollbar--edge';
  rail.hidden = true;
  rail.tabIndex = -1;
  rail.setAttribute('aria-hidden', 'true');
  const spacer = doc.createElement('div');
  spacer.className = 'pg-scrollbar__extent';
  rail.append(spacer);
  host.append(rail);

  const events = new AbortController();
  const options = { signal: events.signal };
  let source = null;
  let frame = null;
  let mirrored = 0;
  let disposed = false;

  function updateRail() {
    if (!source || rail.hidden) return;
    const max = source.scrollHeight - source.clientHeight;
    const railMax = rail.scrollHeight - rail.clientHeight;
    const next = max > 0 ? source.scrollTop / max * railMax : 0;
    if (Math.abs(rail.scrollTop - next) > .5) rail.scrollTop = next;
    mirrored = rail.scrollTop;
  }

  function onRailScroll() {
    if (!source || rail.hidden || Math.abs(rail.scrollTop - mirrored) < .5) return;
    const railMax = rail.scrollHeight - rail.clientHeight;
    if (railMax > 0) {
      source.scrollTop = rail.scrollTop / railMax * (source.scrollHeight - source.clientHeight);
      mirrored = rail.scrollTop;
    }
  }

  const resize = new view.ResizeObserver(schedule);
  resize.observe(container);

  function bind(next) {
    if (next === source) return;
    if (source) {
      source.removeEventListener('scroll', updateRail);
      source.removeAttribute('data-pg-scrollbar-detached');
    }
    resize.disconnect();
    resize.observe(container);
    source = next;
    if (source) {
      source.setAttribute('data-pg-scrollbar-detached', '');
      source.addEventListener('scroll', updateRail, { passive: true });
      resize.observe(source);
      for (const child of source.children) resize.observe(child);
    }
  }

  function update() {
    frame = null;
    if (disposed) return;
    const next = media.matches ? null : [...container.querySelectorAll('[data-pg-scrollbar-primary]')]
      .find(node => node.clientHeight > 0 && !node.closest('[hidden]')) ?? null;
    bind(next);
    if (!source || source.scrollHeight <= source.clientHeight + 1 || !container.clientHeight) {
      rail.hidden = true;
      return;
    }
    const rect = container.getBoundingClientRect();
    rail.style.setProperty('--pg-scrollbar-edge-top', rect.top + 'px');
    rail.style.setProperty('--pg-scrollbar-edge-height', container.clientHeight + 'px');
    const height = container.clientHeight * source.scrollHeight / source.clientHeight;
    spacer.style.setProperty('--pg-scrollbar-extent', Math.ceil(height) + 'px');
    rail.hidden = false;
    updateRail();
  }

  function schedule() {
    if (!disposed && frame === null) frame = view.requestAnimationFrame(update);
  }

  const mutation = new view.MutationObserver(records => {
    if (source && records.some(record => record.type === 'childList' && record.target === source)) {
      for (const child of source.children) resize.observe(child);
    }
    schedule();
  });
  mutation.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'data-pg-scrollbar-primary'] });
  rail.addEventListener('scroll', onRailScroll, { ...options, passive: true });
  rail.addEventListener('focus', () => source?.focus({ preventScroll: true }), options);
  media.addEventListener('change', schedule, options);
  view.addEventListener('resize', schedule, options);
  schedule();

  return () => {
    disposed = true;
    if (frame !== null) view.cancelAnimationFrame(frame);
    events.abort();
    mutation.disconnect();
    bind(null);
    resize.disconnect();
    rail.remove();
  };
}
