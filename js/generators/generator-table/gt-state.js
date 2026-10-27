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

import { createHookRegistry } from '../../utils/utils-hooks.js';

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

export const { registerHook, runHook, runHookAsync } = createHookRegistry({
    name: 'Table Generator',
    events: ['onRowCreate', 'onRowDelete', 'onTableReset', 'onSessionSave', 'onSessionLoad', 'onGenerate', 'onMagicParse', 'onInit'],
});

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
