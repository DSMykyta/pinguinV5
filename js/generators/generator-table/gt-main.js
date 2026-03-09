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
import { getTableDOM } from './gt-dom.js';
import { SORTABLE_CONFIG } from '../../utils/common-utils.js';
import { setInitialized, getLoadedPlugins } from './gt-state.js';

// ============================================================================
// CORE MODULES (завжди завантажуються)
// ============================================================================

import { setupEventListeners } from './gt-event-handler.js';
import { initializeFirstRow } from './gt-row-manager.js';

// ============================================================================
// PLUGINS (завантажуються через Promise.allSettled)
// ============================================================================

const PLUGINS = [
    './gt-hotkeys.js',
    './gt-reset.js',
    './gt-session-manager.js',
    './gt-calculator.js',
    './gt-magic-hints.js',
];

/** Завантажені модулі плагінів */
const loadedModules = {};

/**
 * Завантажити плагіни з graceful degradation
 */
async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        const pluginPath = PLUGINS[index];
        const pluginName = pluginPath.replace('./', '').replace('.js', '');

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

async function initTableGenerator() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    // 1. Завантажуємо плагіни
    await loadPlugins();
    console.log(`[GT] Loaded plugins: ${getLoadedPlugins().join(', ')}`);

    // 2. Ініціалізуємо core
    setupEventListeners();

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

// Реєструємо запускач
registerAsideInitializer('aside-table', initTableGenerator);

// ============================================================================
// EXPORTS
// ============================================================================

export { loadedModules, getLoadedPlugins };
