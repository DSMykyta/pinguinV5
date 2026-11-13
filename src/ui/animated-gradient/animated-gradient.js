/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT                                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Primary surface + soft moving secondary/tertiary radial gradients.                 ║
 * ║ ЗАЛЕЖНОСТІ: Existing semantic CSS tone tokens and shared gradient CSS.                          ║
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradient({ text, preset }), getPreset/setPreset.                    ║
 * ║ ПРИНЦИП: One oversized pseudo-element, CSS transform only; no canvas, timers or noise.          ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const PRESETS = new Set(['light', 'storm', 'dawn']);

/** One lightweight visual component shared by every consumer, including Dialog. */
export function createAnimatedGradient({ text = 'pinguinV6', preset = 'dawn' } = {}) {
  if (text !== null && (typeof text !== 'string' || !text.trim())) {
    throw new TypeError('AnimatedGradient text must be null or a non-empty string');
  }
  if (!PRESETS.has(preset)) {
    throw new RangeError('Unknown animated gradient preset');
  }

  const surface = document.createElement('section');
  surface.className = 'pg-animated-gradient';
  surface.setAttribute('aria-label', 'Анімований градієнт');
  surface.dataset.pgPreset = preset;

  if (text !== null) {
    const title = document.createElement('p');
    title.className = 'pg-animated-gradient__title';
    title.textContent = text;
    surface.append(title);
  }

  surface.getPreset = () => surface.dataset.pgPreset;
  surface.setPreset = next => {
    if (!PRESETS.has(next)) throw new RangeError('Unknown animated gradient preset');
    if (surface.dataset.pgPreset === next) return false;
    surface.dataset.pgPreset = next;
    return true;
  };

  return surface;
}
