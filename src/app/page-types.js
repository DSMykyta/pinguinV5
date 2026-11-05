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
