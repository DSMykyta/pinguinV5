/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює суцільний триколірний градієнт із плавним рухом кольору.       ║
 * ║ ЗАЛЕЖНОСТІ: Нативний DOM, CSS і семантичні колірні токени.                         ║
 * ║ ПУБЛІЧНИЙ API: createAnimatedGradient({ text }).                                  ║
 * ║ ПРИНЦИП: Один компонент, 6 м'яких полів без контуру, SVG і нових залежностей.     ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

/** Return an autonomous gradient surface; Dialog/Shell are only consumers. */
export function createAnimatedGradient({ text = 'pinguin V6' } = {}) {
  // null intentionally renders a color-only surface, useful in content-first
  // dialogs and backgrounds; omitted text retains the existing default.
  if (text !== null && (typeof text !== 'string' || !text.trim())) {
    throw new TypeError('AnimatedGradient text must be null or a non-empty string');
  }

  const surface = document.createElement('section');
  surface.className = 'pg-animated-gradient';
  surface.setAttribute('aria-label', 'Анімований градієнт');

  // Two independently drifting soft color fields per tone: equal weight
  // without a left-to-right stripe or recognisable blob silhouettes.
  for (const tone of ['main', 'secondary', 'tertiary']) {
    for (const field of ['a', 'b']) {
      const glow = document.createElement('span');
      glow.className = 'pg-animated-gradient__glow pg-animated-gradient__glow--' + tone;
      glow.dataset.pgField = field;
      glow.setAttribute('aria-hidden', 'true');
      surface.append(glow);
    }
  }

  if (text !== null) {
    const title = document.createElement('p');
    title.className = 'pg-animated-gradient__title';
    title.textContent = text;
    surface.append(title);
  }
  return surface;
}
