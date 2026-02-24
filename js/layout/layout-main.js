// js/layout/layout-main.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      LAYOUT — ГОЛОВНИЙ МОДУЛЬ                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Єдина точка входу для всієї системи лейауту.                            ║
 * ║  Збирає: nav-menu + nav-tabs + nav-sections + aside.                     ║
 * ║                                                                          ║
 * ║  ВИКОРИСТАННЯ (main-core.js):                                            ║
 * ║     import { initLayout } from './layout/layout-main.js';                ║
 * ║     await initLayout();                                                   ║
 * ║                                                                          ║
 * ║  РЕЄСТРАЦІЯ ASIDE (сторінки):                                            ║
 * ║     import { registerAsideInitializer } from './layout/layout-main.js'; ║
 * ║     registerAsideInitializer('aside-brands', () => { ...setup... });    ║
 * ║     Виклик на рівні модуля (до initCore()), щоб встигло зареєструватись  ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initNav }               from './nav-menu.js';
import { initAsideState }        from './aside-state.js';
import { preloadAsideTemplates } from './aside-loader.js';
import { initAsideObserver }     from './aside-observer.js';
import { initTabs }              from './nav-tabs.js';
import { initSectionNavigator }  from './nav-sections.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЕКСПОРТ
// ═══════════════════════════════════════════════════════════════════════════

export { registerAsideInitializer,
         loadSingleAsideTemplate } from './aside-loader.js';
export { setAsideState }           from './aside-state.js';
export { initTabs }                from './nav-tabs.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

export async function initLayout() {
    await initNav();
    initAsideState();
    await preloadAsideTemplates();
    initAsideObserver();
    initTabs();
    initSectionNavigator();
}
