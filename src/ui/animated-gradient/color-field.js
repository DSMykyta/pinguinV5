/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — STATIC ANIMATED GRADIENT TEXTURES                                                ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створити 2 безшовні текстури з legacy Light/Storm/Dawn та статичний grain.           ║
 * ║ ЗАЛЕЖНОСТІ: Canvas 2D, semantic CSS color tokens, legacy gradient stop formulas.                 ║
 * ║ ПУБЛІЧНИЙ API: createColorFieldPainter(surface, layers, noiseCanvas).                            ║
 * ║ ПРИНЦИП: Малювання тільки при mount/resize/theme/preset; CSS рухає готові текстури.                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

export const GRADIENT_PRESETS = Object.freeze(['light', 'storm', 'dawn']);

const STOP_POSITIONS = Object.freeze([
  [.12, .11], [.83, .16], [.46, .46],
  [.15, .79], [.85, .82], [.50, .95],
]);

const COLOR_ROLES = Object.freeze(['main', 'secondary', 'tertiary']);

function mix(first, second, firstWeight) {
  return first.map((component, channel) =>
    component * firstWeight + second[channel] * (1 - firstWeight));
}

/** Replicate the SIX color stops of each named legacy root.css gradient.
 * They become a 2D field rather than 1D stripes; palette recipes remain exact.
 */
function legacyStops(preset, tones, dark) {
  const [main, secondary, tertiary] = tones;
  const black = [0, 0, 0], white = [255, 255, 255];
  switch (preset) {
    case 'light': {
      const weights = dark ? [.45, .30, .12, .05, .12, .30]
        : [.65, .45, .17, .07, .17, .45];
      return weights.map(weight => mix(secondary, dark ? black : white, weight));
    }
    case 'storm':
      return dark
        ? [mix(main, black, .30), mix(main, black, .40), mix(main, black, .60),
            mix(main, secondary, .50), mix(secondary, black, .45), mix(secondary, black, .30)]
        : [mix(main, black, .50), mix(main, black, .60), mix(main, black, .80),
            mix(main, secondary, .50), mix(secondary, white, .65), mix(secondary, white, .45)];
    case 'dawn':
      return dark
        ? [mix(secondary, black, .45), mix(secondary, black, .40),
            mix(secondary, tertiary, .50), mix(tertiary, secondary, .60),
            mix(tertiary, black, .70), mix(tertiary, black, .85)]
        : [mix(secondary, white, .65), mix(secondary, white, .60),
            mix(secondary, tertiary, .50), mix(tertiary, secondary, .60),
            mix(tertiary, black, .90), tertiary];
    default:
      throw new RangeError('Unsupported gradient preset: ' + preset);
  }
}

function paintStaticGrain(canvas) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const width = 192;
  canvas.width = canvas.height = width;
  const image = context.createImageData(width, width);
  let seed = 0x56d041; // Deterministic: identical grain after each re-open.
  for (let i = 0; i < image.data.length; i += 4) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const value = seed >>> 0;
    const light = (value & 1) !== 0;
    const intensity = 130 + ((value >>> 4) % 126);
    image.data[i] = light ? intensity : 255 - intensity;
    image.data[i + 1] = image.data[i];
    image.data[i + 2] = image.data[i];
    image.data[i + 3] = 150 + ((value >>> 12) % 106);
  }
  context.putImageData(image, 0, 0);
}

export function createColorFieldPainter(surface, layers, noiseCanvas) {
  if (!Array.isArray(layers) || layers.length !== 2) {
    throw new TypeError('Color field requires exactly two static layers');
  }
  const contexts = layers.map(layer => layer.getContext('2d', { alpha: false }));
  if (contexts.some(context => !context)) return null;

  const probe = surface.ownerDocument.createElement('canvas');
  probe.width = probe.height = 1;
  const probeContext = probe.getContext('2d', { willReadFrequently: true });
  if (!probeContext) return null;
  paintStaticGrain(noiseCanvas);

  function readPalette() {
    const style = getComputedStyle(surface);
    return COLOR_ROLES.map(role => {
      probeContext.fillStyle = style.getPropertyValue('--pg-tone-' + role + '-base').trim();
      probeContext.fillRect(0, 0, 1, 1);
      return [...probeContext.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
  }

  function render(preset) {
    if (!GRADIENT_PRESETS.includes(preset)) {
      throw new RangeError('Unsupported gradient preset: ' + preset);
    }
    const bounds = surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    const width = Math.max(192, Math.min(300, Math.round(bounds.width * .75)));
    const height = Math.max(192, Math.min(300, Math.round(bounds.height * .75)));
    const dark = surface.ownerDocument.documentElement.dataset.theme === 'dark';
    const stops = legacyStops(preset, readPalette(), dark);

    for (const [layer, context] of contexts.entries()) {
      const canvas = layers[layer];
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const image = context.createImageData(width, height);
      const data = image.data;
      const phase = layer === 0 ? 0 : 2.15;
      const warpedPositions = STOP_POSITIONS.map(([x, y], index) => [
        x + .085 * Math.sin(phase + index * 1.6),
        y + .075 * Math.cos(phase * .8 + index * 1.93),
      ]);

      for (let y = 0; y < height; y++) {
        const cy = y / (height - 1);
        for (let x = 0; x < width; x++) {
          const cx = x / (width - 1);
          const px = cx + .075 * Math.sin(cy * 6.5 + phase)
            + .035 * Math.cos(cy * 11 + cx * 3 + phase * .5);
          const py = cy + .075 * Math.cos(cx * 6.2 - phase)
            + .03 * Math.sin(cx * 9 + cy * 2);
          let total = 0, red = 0, green = 0, blue = 0;
          for (let i = 0; i < stops.length; i++) {
            const dx = px - warpedPositions[i][0];
            const dy = py - warpedPositions[i][1];
            const radius = 1 + (dx * dx / .16 + dy * dy / .18);
            const weight = 1 / (radius * radius);
            total += weight;
            red += weight * stops[i][0];
            green += weight * stops[i][1];
            blue += weight * stops[i][2];
          }
          const offset = (y * width + x) * 4;
          data[offset] = red / total;
          data[offset + 1] = green / total;
          data[offset + 2] = blue / total;
          data[offset + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
    }
    surface.dataset.pgGradientReady = 'true';
    return true;
  }

  return { render };
}
