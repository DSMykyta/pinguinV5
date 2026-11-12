/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED TOOLBAR                                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Material 3 Toolbar skin/geometry for owner-provided actions.                          ║
 * ║ ЗАЛЕЖНОСТІ: Native DOM, shared design tokens and existing button elements.                         ║
 * ║ ПУБЛІЧНИЙ API: configureToolbar(element, {variant, density}).                                       ║
 * ║ ПРИНЦИП: No second DOM or action state; the owner manages commands, focus and lifecycle.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const VARIANTS = new Set(['floating', 'docked']);
const DENSITIES = new Set(['compact', 'regular']);

/** Decorate an existing semantic toolbar; do not recreate its buttons or behavior. */
export function configureToolbar(element, { variant = 'floating', density = 'regular' } = {}) {
  if (!(element instanceof HTMLElement) ||
      !VARIANTS.has(variant) || !DENSITIES.has(density)) {
    throw new TypeError('Toolbar requires an HTMLElement and a supported variant/density');
  }
  element.classList.add('pg-toolbar');
  element.dataset.pgVariant = variant;
  element.dataset.pgDensity = density;
  return element;
}
