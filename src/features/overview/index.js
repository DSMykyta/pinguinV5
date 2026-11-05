/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — OVERVIEW PAGE                                                                       ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Монтує головну сторінку робочого простору.                                            ║
 * ║ ЗАЛЕЖНОСТІ: ui/page та DOM host.                                                           ║
 * ║ ПУБЛІЧНИЙ API: mount(host).                                                                        ║
 * ║ ПРИНЦИП: Не створює фальшивих інструментів.                                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createPageView } from '../../ui/page/page.js';

/** Overview uses exactly the same page surface as every other route. */
export function mount(host) {
  const page = createPageView({ title: 'Робочий простір' });
  host.replaceChildren(page.element);
  return () => host.replaceChildren();
}
