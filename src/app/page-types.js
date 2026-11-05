/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PAGE TYPES                                                                          ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Визначає канонічні типи сторінок.                                                     ║
 * ║ ЗАЛЕЖНОСТІ: Немає.                                                                                 ║
 * ║ ПУБЛІЧНИЙ API: PAGE_TYPES, isPageType().                                                           ║
 * ║ ПРИНЦИП: Тип не створює нову оболонку.                                                             ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Page types describe the content contract, not five different design systems.
 * All pages share the same Pinguin Shell and UI primitives.
 */
export const PAGE_TYPES = Object.freeze({
  overview: 'overview',
  tool: 'tool',
  collection: 'collection',
  record: 'record',
  settings: 'settings',
});

export function isPageType(value) {
  return Object.hasOwn(PAGE_TYPES, value);
}
