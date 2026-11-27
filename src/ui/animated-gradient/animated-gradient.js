/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Два незалежні м’які кольорові поля з циклом швидкості.
 * ║ ЗАЛЕЖНОСТІ: DOM, Web Animations API, visibility, reduced motion.
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradient() → { element, mount, destroy }.
 * ║ ПРИНЦИП: Без залежності від Dialog; швидкість без зміни фази.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

const PATHS = [
  [
    'translate(-12%, -5%) scale(1.05) rotate(0deg)',
    'translate(19%, 9%) scale(1.17) rotate(18deg)',
    'translate(-12%, -5%) scale(1.05) rotate(0deg)',
  ],
  [
    'translate(13%, 8%) scale(1.02) rotate(0deg)',
    'translate(-22%, -13%) scale(1.2) rotate(-22deg)',
    'translate(13%, 8%) scale(1.02) rotate(0deg)',
  ],
];
const DURATIONS = [18000, 22000];
const RATES = [1, 1.6, 2.3, 4.5, 1.6, 1];
const HOLDS = [4200, 2800, 2400, 1400, 2200, 3600];

export function createAnimatedGradient({ cycle = false } = {}) {
  const element = document.createElement('div');
  element.className = 'pg-animated-gradient';
  element.setAttribute('aria-hidden', 'true');
  const layers = ['secondary', 'tertiary'].map(tone => {
    const layer = document.createElement('div');
    layer.className = 'pg-animated-gradient__layer';
    layer.dataset.pgTone = tone;
    element.append(layer);
    return layer;
  });
  const view = element.ownerDocument.defaultView;
  const doc = element.ownerDocument;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  let motions = [], glows = [], timer = 0, frame = 0;
  let mounted = false, destroyed = false, running = false;
  let rate = 1, phase = 0;

  function clearSchedule() {
    view.clearTimeout(timer);
    view.cancelAnimationFrame(frame);
    timer = frame = 0;
  }
  function schedule() {
    if (!cycle || !running) return;
    timer = view.setTimeout(() => {
      timer = 0;
      phase = (phase + 1) % RATES.length;
      const target = RATES[phase], initial = rate;
      const start = view.performance.now();
      function ramp(now) {
        if (!running) return;
        const t = Math.min(1, (now - start) / 900);
        rate = initial + (target - initial) * t * t * (3 - 2 * t);
        for (const animation of motions) animation.updatePlaybackRate(rate);
        element.dataset.pgRate = rate.toFixed(2);
        if (t < 1) frame = view.requestAnimationFrame(ramp);
        else { frame = 0; schedule(); }
      }
      frame = view.requestAnimationFrame(ramp);
    }, HOLDS[phase]);
  }
  function sync() {
    const active = mounted && !destroyed && !doc.hidden && !reduced.matches &&
      element.isConnected && motions.length > 0;
    if (active === running) return;
    running = active;
    element.dataset.pgMotion = active ? 'running' : 'paused';
    if (active) {
      for (const animation of [...motions, ...glows]) animation.play();
      schedule();
    } else {
      clearSchedule();
      for (const animation of [...motions, ...glows]) animation.pause();
    }
  }
  function mount() {
    if (destroyed || mounted) return;
    if (!element.isConnected) throw new Error('Mount AnimatedGradient after insertion');
    mounted = true;
    element.dataset.pgMotion = 'paused';
    element.dataset.pgRate = '1.00';
    if (typeof layers[0].animate !== 'function') return;
    motions = layers.map((layer, i) => layer.animate(
      PATHS[i].map(transform => ({ transform })),
      { duration: DURATIONS[i], iterations: Infinity, easing: 'ease-in-out' },
    ));
    glows = layers.map((layer, i) => layer.animate(
      i === 0 ? [{ opacity: .72 }, { opacity: 1 }, { opacity: .72 }]
        : [{ opacity: .94 }, { opacity: .55 }, { opacity: .94 }],
      { duration: i === 0 ? 9400 : 12700, iterations: Infinity, easing: 'ease-in-out' },
    ));
    for (const animation of [...motions, ...glows]) {
      animation.pause();
      animation.currentTime = 0;
    }
    reduced.addEventListener('change', sync);
    doc.addEventListener('visibilitychange', sync);
    sync();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    running = false;
    clearSchedule();
    reduced.removeEventListener('change', sync);
    doc.removeEventListener('visibilitychange', sync);
    for (const animation of [...motions, ...glows]) animation.cancel();
    motions = glows = [];
    element.remove();
  }
  return Object.freeze({ element, mount, destroy });
}
