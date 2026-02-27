// js/layout/layout-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   LAYOUT — ОРКЕСТРАТОР + ПУБЛІЧНИЙ API                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Єдина точка входу для всієї системи лейауту.                            ║
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

import { init as initCore }    from './layout-core.js';
import * as navMenu            from './layout-plugin-nav-menu.js';
import * as asideLoader        from './layout-plugin-aside-loader.js';
import * as asideObserver      from './layout-plugin-aside-observer.js';
import * as navSections        from './layout-plugin-nav-sections.js';
import { initTabs }            from './layout-plugin-nav-tabs.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЕКСПОРТ — ПУБЛІЧНИЙ API
// ═══════════════════════════════════════════════════════════════════════════

export { registerAsideInitializer,
         loadSingleAsideTemplate,
         showAsidePanel }         from './layout-plugin-aside-loader.js';
export { setAsideState }          from './layout-core.js';
export { initTabs }               from './layout-plugin-nav-tabs.js';
export { initDynamicTabs }        from './layout-plugin-nav-tabs-dynamic.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

export async function initLayout() {
    // 1. ЯДРО — синхронний DOM setup (aside кнопки, початковий стан)
    initCore();

    // 2. Паралельно: nav меню + aside шаблони
    await Promise.allSettled([
        navMenu.init(),
        asideLoader.init(),
    ]);

    // 3. Після завантаження шаблонів: observer + секції + tabs
    asideObserver.init();
    navSections.init();
    initTabs();
}
