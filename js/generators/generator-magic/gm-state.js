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

import { createHookRegistry } from '../../utils/utils-hooks.js';

// Hooks registry
export const { registerHook, runHook, runHookAsync } = createHookRegistry({
    name: 'Magic',
    events: ['onBeforeParse', 'onAfterParse', 'onNormalize', 'onCleanup', 'onError'],
});

// Loaded plugins registry
const loadedPlugins = new Set();

// State
export const state = {
    lastParsedText: '',
    lastEntries: [],
    servingSize: '',
};

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
