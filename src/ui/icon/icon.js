/**
 * PINGUIN NEXT — shared icon factory.
 * All icon geometry comes from locally embedded, official Google
 * Material Symbols Rounded SVGs (Apache-2.0).
 * Existing semantic aliases remain stable for every caller.
 */
import { MATERIAL_SYMBOLS } from './material-symbols.js';

export function createIcon(name) {
  if (!Object.hasOwn(MATERIAL_SYMBOLS, name)) {
    throw new Error('Unknown icon: ' + name);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 -960 960 960');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('pg-icon');
  svg.innerHTML = MATERIAL_SYMBOLS[name];
  return svg;
}
