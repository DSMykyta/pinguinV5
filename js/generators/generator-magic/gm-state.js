// js/generators/generator-magic/gm-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAGIC LEGO - STATE MANAGEMENT                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Централізований state + hooks система                         ║
 * ║                                                                          ║
 * ║  HOOKS:                                                                  ║
 * ║  - onBeforeParse(text) — Перед парсингом                                 ║
 * ║  - onAfterParse(entries) — Після парсингу                                ║
 * ║  - onNormalize(name) — При нормалізації назви                            ║
 * ║  - onCleanup(text) — При очистці тексту                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// Hooks registry
const hooks = {
    onBeforeParse: [],
    onAfterParse: [],
    onNormalize: [],
    onCleanup: [],
    onError: [],
};

// Loaded plugins registry
const loadedPlugins = new Set();

// State
export const state = {
    lastParsedText: '',
    lastEntries: [],
    servingSize: '',
};

/**
 * Зареєструвати hook
 * @param {string} hookName - Назва хука
 * @param {Function} callback - Callback функція
 * @returns {Function} - Функція для видалення хука
 */
export function registerHook(hookName, callback, options = {}) {
    if (hooks[hookName] && typeof callback === 'function') {
        hooks[hookName].push({ fn: callback, plugin: options.plugin || 'anonymous' });
        return () => {
            const index = hooks[hookName].findIndex(h => h.fn === callback);
            if (index > -1) hooks[hookName].splice(index, 1);
        };
    }
    console.warn(`[MagicState] Unknown hook: ${hookName}`);
    return () => {};
}

/**
 * Виконати hooks
 * @param {string} hookName - Назва хука
 * @param {...any} args - Аргументи
 */
export function runHook(hookName, ...args) {
    if (!hooks[hookName]) return;
    hooks[hookName].forEach(({ fn, plugin }) => {
        try {
            fn(...args);
        } catch (e) {
            console.error(`[MagicState:${plugin}] hook "${hookName}" error:`, e);
        }
    });
}

/**
 * Позначити плагін як завантажений
 * @param {string} pluginName - Назва плагіна
 */
export function markPluginLoaded(pluginName) {
    loadedPlugins.add(pluginName);
}

/**
 * Перевірити чи плагін завантажений
 * @param {string} pluginName - Назва плагіна
 * @returns {boolean}
 */
export function isPluginLoaded(pluginName) {
    return loadedPlugins.has(pluginName);
}

/**
 * Отримати список завантажених плагінів
 * @returns {string[]}
 */
export function getLoadedPlugins() {
    return Array.from(loadedPlugins);
}

/**
 * Оновити state
 * @param {Object} updates - Оновлення
 */
export function updateState(updates) {
    Object.assign(state, updates);
}

/**
 * Скинути state
 */
export function resetState() {
    state.lastParsedText = '';
    state.lastEntries = [];
    state.servingSize = '';
}
