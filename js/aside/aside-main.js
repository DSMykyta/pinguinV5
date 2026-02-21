// js/aside/aside-main.js

/**
 * ASIDE: Main
 *
 * Головний модуль aside системи.
 * Ініціалізує стан, завантажує шаблони, запускає observer.
 *
 * Використання:
 *   import { initAside } from './aside/aside-main.js';
 *   await initAside();
 *
 * Для простих сторінок (один aside на всю сторінку):
 *   import { loadSingleAsideTemplate } from './aside/aside-main.js';
 *   await loadSingleAsideTemplate('aside-brands');
 *
 * Для реєстрації ініціалізаторів (генератори):
 *   import { registerAsideInitializer } from './aside/aside-main.js';
 *   registerAsideInitializer('aside-table', initTableGenerator);
 *
 * Структура HTML:
 * <div class="aside-controls">
 *     <button class="btn-icon ghost flip aside-expand">...</button>
 *     <button class="btn-icon large rotate aside-trigger">...</button>
 * </div>
 * <aside class="aside expanded">
 *     <div class="aside-body"></div>
 * </aside>
 * <div class="aside-fab"></div>
 *
 * Секції:
 * <section data-aside-template="aside-table" data-aside-state="expanded">
 * <section data-aside-template="" data-aside-state="closed">  ← absent
 *
 * CSS: css/layout/layout-aside.css
 * JS:  js/aside/aside-state.js, aside-loader.js, aside-observer.js
 */

import { initAsideState, setAsideState }     from './aside-state.js';
import { preloadAsideTemplates,
         loadSingleAsideTemplate,
         showAsidePanel,
         registerAsideInitializer }           from './aside-loader.js';
import { initAsideObserver }                  from './aside-observer.js';

// Реекспорт для зручності
export { setAsideState }            from './aside-state.js';
export { registerAsideInitializer,
         loadSingleAsideTemplate }  from './aside-loader.js';

/**
 * Ініціалізує aside систему.
 * Для сторінок з секціями (index, tasks).
 */
export async function initAside() {
    initAsideState();
    await preloadAsideTemplates();
    initAsideObserver();
}

/**
 * Ініціалізує aside для простих сторінок (один aside).
 * Для сторінок без секцій (brands, keywords, etc.).
 * @param {string} templateName — назва шаблону
 * @param {string} [initialState='expanded'] — початковий стан
 */
export async function initAsideSimple(templateName, initialState = 'expanded') {
    initAsideState();
    await loadSingleAsideTemplate(templateName);
    setAsideState(initialState);
}
