// js/generators/generator-table/gt-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE GENERATOR LEGO - MAIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🏭 ФАБРИКА — Точка входу + завантаження плагінів                        ║
 * ║                                                                          ║
 * ║  АРХІТЕКТУРА:                                                            ║
 * ║  ┌─────────────────────────────────────────────────────────────────┐     ║
 * ║  │                    Table Generator                              │     ║
 * ║  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │     ║
 * ║  │  │ Hotkeys │ │  Reset  │ │ Session │ │  Calc   │ │   Hints   │  │     ║
 * ║  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘  │     ║
 * ║  │                         ▲                                       │     ║
 * ║  │  ┌──────────────────────────────────────────────────────────┐   │     ║
 * ║  │  │                    GT-State                              │   │     ║
 * ║  │  │           (hooks, plugins, rowCounter)                   │   │     ║
 * ║  │  └──────────────────────────────────────────────────────────┘   │     ║
 * ║  └─────────────────────────────────────────────────────────────────┘     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerAsideInitializer } from '../../layout/layout-main.js';
import { getTableDOM, resetDomCache } from './gt-dom.js';
import { SORTABLE_CONFIG } from '../../utils/utils-sortable-config.js';
import { setInitialized, getLoadedPlugins, resetState } from './gt-state.js';

// ============================================================================
// CORE MODULES (завжди завантажуються)
// ============================================================================

import { setupEventListeners } from './gt-event-handler.js';
import { initializeFirstRow } from './gt-row-manager.js';

// ============================================================================
// PLUGINS (завантажуються через Promise.allSettled)
// ============================================================================

const PLUGINS = [
    () => import('./gt-hotkeys.js'),
    () => import('./gt-reset.js'),
    () => import('./gt-session-manager.js'),
    () => import('./gt-calculator.js'),
    () => import('./gt-magic-hints.js'),
];

const PLUGIN_NAMES = [
    'gt-hotkeys',
    'gt-reset',
    'gt-session-manager',
    'gt-calculator',
    'gt-magic-hints',
];

/** Завантажені модулі плагінів */
const loadedModules = {};
let _pluginsLoaded = false;

/**
 * Завантажити плагіни з graceful degradation
 */
async function loadPlugins() {
    if (_pluginsLoaded) return;
    _pluginsLoaded = true;

    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        const pluginName = PLUGIN_NAMES[index];

        if (result.status === 'fulfilled') {
            const module = result.value;
            loadedModules[pluginName] = module;

            // Викликаємо init якщо є
            if (typeof module.init === 'function') {
                try {
                    module.init();
                } catch (e) {
                    console.error(`[GT] Plugin ${pluginName} init error:`, e);
                }
            }
        } else {
            console.warn(`[GT] ⚠️ Plugin ${pluginName} failed:`, result.reason);
        }
    });
}

/**
 * Отримати функцію з плагіна
 */
export function getPluginFunction(pluginName, funcName) {
    const module = loadedModules[pluginName];
    if (module && typeof module[funcName] === 'function') {
        return module[funcName];
    }
    return null;
}

/**
 * Викликати функцію плагіна (якщо доступна)
 */
export function callPlugin(pluginName, funcName, ...args) {
    const fn = getPluginFunction(pluginName, funcName);
    if (fn) {
        return fn(...args);
    }
    return undefined;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Ініціалізація генератора таблиць.
 * @param {HTMLElement} [panelEl] — контейнер кнопок (замість .aside)
 */
async function initTableGenerator(panelEl) {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    // 1. Завантажуємо плагіни
    await loadPlugins();
    console.log(`[GT] Loaded plugins: ${getLoadedPlugins().join(', ')}`);

    // 2. Ініціалізуємо core
    setupEventListeners(panelEl);

    // 3. Завантажуємо сесію або створюємо перший рядок
    const loadSession = getPluginFunction('gt-session-manager', 'loadSession');
    const sessionLoaded = loadSession ? await loadSession() : false;

    if (!sessionLoaded) {
        initializeFirstRow();
    }

    // 4. Ініціалізуємо Sortable
    if (typeof Sortable !== 'undefined') {
        const autoSaveSession = getPluginFunction('gt-session-manager', 'autoSaveSession');
        new Sortable(dom.rowsContainer, {
            ...SORTABLE_CONFIG,
            onEnd: () => autoSaveSession?.(),
        });
    }

    // 5. Позначаємо як ініціалізований
    setInitialized();
}

/**
 * Скидає генератор (для re-init при повторному відкритті модалу).
 */
function destroyTableGenerator() {
    resetDomCache();
    resetState();
}

// Реєструємо запускач
registerAsideInitializer('aside-table', () => initTableGenerator());

// ============================================================================
// EXPORTS
// ============================================================================

export { initTableGenerator, destroyTableGenerator, loadedModules, getLoadedPlugins };
