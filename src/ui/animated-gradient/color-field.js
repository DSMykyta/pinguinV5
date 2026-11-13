/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT COLOR FIELD                                                    ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Безшовний піксельний мікс трьох semantic tone-палітр.                               ║
 * ║ ЗАЛЕЖНОСТІ: Canvas 2D, CSS computed tokens; жодних сторонніх пакетів.                           ║
 * ║ ПУБЛІЧНИЙ API: createColorFieldPainter(surface, canvas) — внутрішній renderer.                  ║
 * ║ ПРИНЦИП: Одна нормалізована суміш на кожен піксель, без обрізаних CSS-blob країв.                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const TONES = ['main', 'secondary', 'tertiary'];
const FIELDS = [
  { tone: 0, x: .17, y: .10, rx: .33, ry: .35, amount: 1.10 },
  { tone: 0, x: .81, y: .74, rx: .31, ry: .34, amount: .92 },
  { tone: 1, x: .76, y: .16, rx: .32, ry: .33, amount: 1.00 },
  { tone: 1, x: .19, y: .82, rx: .32, ry: .32, amount: .92 },
  { tone: 2, x: .49, y: .49, rx: .35, ry: .36, amount: 1.03 },
  { tone: 2, x: .91, y: .80, rx: .32, ry: .35, amount: .80 },
];

/**
 * Work at a capped low resolution, then let the browser smoothly upscale the
 * opaque canvas. Normalized three-tone weights have no rectangular layers,
 * blend seams, gradients ending inside the card, or hidden alpha compositing.
 */
export function createColorFieldPainter(surface, canvas) {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const probeContext = probe.getContext('2d', { willReadFrequently: true });
  if (!probeContext) return null;

  let width = 0;
  let height = 0;
  let image = null;
  let colors = null;
  let warpX = null;
  let warpY = null;

  function refreshColors() {
    const style = getComputedStyle(surface);
    colors = TONES.map(tone => {
      probeContext.clearRect(0, 0, 1, 1);
      probeContext.fillStyle = style.getPropertyValue('--pg-tone-' + tone + '-base').trim();
      probeContext.fillRect(0, 0, 1, 1);
      return probeContext.getImageData(0, 0, 1, 1).data.slice(0, 3);
    });
  }

  function resize() {
    const rect = surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const nextWidth = Math.max(72, Math.min(140, Math.round(rect.width / 3.5)));
    const nextHeight = Math.max(72, Math.min(140, Math.round(rect.height / 3.5)));
    if (nextWidth === width && nextHeight === height) return false;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    image = context.createImageData(width, height);
    warpX = new Float64Array(height);
    warpY = new Float64Array(width);
    return true;
  }

  function draw(seconds = 0) {
    if (!image || !colors) return;
    const fields = FIELDS.map((field, index) => {
      const time = seconds * (.09 + .009 * index);
      return {
        tone: field.tone,
        x: field.x + .06 * Math.sin(time + index * 2.14),
        y: field.y + .06 * Math.cos(time * .73 + index * 1.66),
        invX: 1 / (field.rx * field.rx),
        invY: 1 / (field.ry * field.ry),
        amount: field.amount,
      };
    });

    for (let y = 0; y < height; y++) {
      warpX[y] = .10 * Math.sin(7.5 * y / (height - 1) + seconds * .20);
    }
    for (let x = 0; x < width; x++) {
      warpY[x] = .10 * Math.cos(7 * x / (width - 1) - seconds * .17);
    }

    const pixels = image.data;
    const [main, secondary, tertiary] = colors;
    for (let y = 0; y < height; y++) {
      const py = y / (height - 1) + warpX[y];
      for (let x = 0; x < width; x++) {
        const px = x / (width - 1) + warpY[x];
        let a = .045, b = .045, c = .045;
        for (const field of fields) {
          const dx = px - field.x;
          const dy = py - field.y;
          const radius = 1 + dx * dx * field.invX + dy * dy * field.invY;
          const weight = field.amount / (radius * radius);
          if (field.tone === 0) a += weight;
          else if (field.tone === 1) b += weight;
          else c += weight;
        }
        // Increase color separation smoothly without drawing any shape edges.
        a *= a;
        b *= b;
        c *= c;
        const total = 1 / (a + b + c);
        const offset = (y * width + x) * 4;
        pixels[offset] = (a * main[0] + b * secondary[0] + c * tertiary[0]) * total;
        pixels[offset + 1] = (a * main[1] + b * secondary[1] + c * tertiary[1]) * total;
        pixels[offset + 2] = (a * main[2] + b * secondary[2] + c * tertiary[2]) * total;
        pixels[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    surface.dataset.pgGradientReady = 'true';
  }

  return { resize, refreshColors, draw };
}
