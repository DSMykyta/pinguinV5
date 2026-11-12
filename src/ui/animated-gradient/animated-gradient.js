/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює автономний триколірний градієнт із зернистістю.              ║
 * ║ ЗАЛЕЖНОСТІ: DOM, SVG feTurbulence, токени семантичних кольорів.                   ║
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradient({ text }).                                  ║
 * ║ ПРИНЦИП: Без прив'язки до Dialog, Shell, теми чи конкретної вкладки.              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
let nextNoiseId = 0;

function createNoiseLayer() {
  const id = 'pg-animated-gradient-noise-' + ++nextNoiseId;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pg-animated-gradient__grain');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const defs = document.createElementNS(SVG_NS, 'defs');
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  const turbulence = document.createElementNS(SVG_NS, 'feTurbulence');
  turbulence.setAttribute('type', 'fractalNoise');
  turbulence.setAttribute('baseFrequency', '0.72');
  turbulence.setAttribute('numOctaves', '3');
  turbulence.setAttribute('stitchTiles', 'stitch');
  turbulence.setAttribute('seed', '8');
  filter.append(turbulence);
  defs.append(filter);

  const field = document.createElementNS(SVG_NS, 'rect');
  field.setAttribute('width', '100%');
  field.setAttribute('height', '100%');
  field.setAttribute('filter', 'url(#' + id + ')');
  svg.append(defs, field);
  return svg;
}

/** Return a theme-aware gradient surface, without mounting global behaviors. */
export function createAnimatedGradient({ text = 'pinguin V6' } = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('AnimatedGradient text must be a non-empty string');
  }

  const surface = document.createElement('section');
  surface.className = 'pg-animated-gradient';
  surface.setAttribute('aria-label', 'Анімований градієнт');

  for (const tone of ['main', 'secondary', 'tertiary']) {
    const glow = document.createElement('span');
    glow.className = 'pg-animated-gradient__glow pg-animated-gradient__glow--' + tone;
    glow.setAttribute('aria-hidden', 'true');
    surface.append(glow);
  }

  const title = document.createElement('p');
  title.className = 'pg-animated-gradient__title';
  title.textContent = text;
  surface.append(createNoiseLayer(), title);
  return surface;
}
