/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ICON COMPONENT                                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює однакові SVG іконки.                                                          ║
 * ║ ЗАЛЕЖНОСТІ: Статична SVG геометрія.                                                                ║
 * ║ ПУБЛІЧНИЙ API: createIcon().                                                                       ║
 * ║ ПРИНЦИП: Без різних шрифтів чи випадкових бібліотек.                                               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

// Shared icon geometry. The app does not depend on icon fonts.
const ICONS = Object.freeze({
  'house': '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
  'panel-left': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  'panel-right': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
  'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  'sliders': '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  'moon': '<path d="M20.7 13.2A9 9 0 0 1 10.8 3.3 9 9 0 1 0 20.7 13.2Z"/>',
  'monitor': '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8m-4-4v4"/>',
  'code': '<path d="m8 9-3 3 3 3m8-6 3 3-3 3m-5-7-2 8"/>',
  'layers': '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  'table-2': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  'plus': '<path d="M12 5v14M5 12h14"/>',
  'pin': '<path d="m16 3 5 5-3.5 1.5-.5 4.5-3 3-3.5-3.5-4.5.5L3 11l5-3 4.5-.5L14 4z"/><path d="m9 15-6 6"/>',
  'pin-off': '<path d="M3 3 21 21M8 8l4.5-.5L14 4l2-1 5 5-3.5 1.5-.5 4.5-1 1M9 15l-6 6M5 11l-2 2 3.5-.5 2.5 2.5"/>',
  'external-link': '<path d="M14 3h7v7m0-7-10 10"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>',
});

export function createIcon(name) {
  if (!Object.hasOwn(ICONS, name)) {
    throw new Error('Unknown icon: ' + name);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('pg-icon');
  svg.innerHTML = ICONS[name];
  return svg;
}
