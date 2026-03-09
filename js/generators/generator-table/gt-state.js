// js/generators/generator-table/gt-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE GENERATOR LEGO - STATE                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Централізований state + hooks система                         ║
 * ║                                                                          ║
 * ║  HOOKS:                                                                  ║
 * ║  - onRowCreate(row) — При створенні рядка                                ║
 * ║  - onRowDelete(row) — При видаленні рядка                                ║
 * ║  - onTableReset() — При скиданні таблиці                                 ║
 * ║  - onSessionSave(data) — При збереженні сесії                            ║
 * ║  - onSessionLoad(data) — При завантаженні сесії                          ║
 * ║  - onGenerate(type, result) — При генерації HTML/BR                      ║
 * ║  - onMagicParse(text, entries) — При магічному парсингу                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// STATE
// ============================================================================

export const state = {
    rowCounter: 1,
    isInitialized: false,
};

// ============================================================================
// HOOKS
// ============================================================================

const hooks = {
    onRowCreate: [],
    onRowDelete: [],
    onTableReset: [],
    onSessionSave: [],
    onSessionLoad: [],
    onGenerate: [],
    onMagicParse: [],
    onInit: [],
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
    console.warn(`[GT-State] Unknown hook: ${hookName}`);
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
            console.error(`[GT-State:${plugin}] hook "${hookName}" error:`, e);
        }
    });
}

// ============================================================================
// PLUGINS
// ============================================================================

const loadedPlugins = new Set();

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

// ============================================================================
// ROW COUNTER
// ============================================================================

/**
 * Збільшує лічильник рядків на 1 і повертає нове значення
 * @returns {number}
 */
export function incrementRowCounter() {
    return state.rowCounter++;
}

/**
 * Скидає лічильник рядків до початкового значення
 */
export function resetRowCounter() {
    state.rowCounter = 1;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Позначити як ініціалізований
 */
export function setInitialized() {
    state.isInitialized = true;
    runHook('onInit');
}

/**
 * Перевірити чи ініціалізовано
 * @returns {boolean}
 */
export function isInitialized() {
    return state.isInitialized;
}

/**
 * Скидає state (для re-init в іншому контексті).
 */
export function resetState() {
    state.rowCounter = 1;
    state.isInitialized = false;
}
