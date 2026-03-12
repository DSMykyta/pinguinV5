// js/pages/products/products-plugins.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCTS - PLUGIN SYSTEM                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Generic hooks + page-specific value filters.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const productsPlugins = createPluginRegistry('Products');

export const registerProductsPlugin = productsPlugins.registerHook;
export const runHook = productsPlugins.runHook;
export const runHookAsync = productsPlugins.runHookAsync;
export const optionalFunctions = productsPlugins.optionalFunctions;
export const registerOptionalFunction = productsPlugins.registerOptionalFunction;
export { productsPlugins };

// ═══════════════════════════════════════════════════════════════════════════
// ФІЛЬТРИ (value-трансформери — специфічні для Products)
// ═══════════════════════════════════════════════════════════════════════════

const filters = {};

/**
 * Зареєструвати фільтр (value-трансформер)
 * @param {string} filterName - Назва фільтру
 * @param {Function} callback - fn(value, ctx) => value
 * @param {Object} [options]
 * @param {number} [options.priority=10]
 * @param {string} [options.plugin]
 */
export function registerFilter(filterName, callback, options = {}) {
    if (!filters[filterName]) filters[filterName] = [];
    const priority = options.priority ?? 10;
    filters[filterName].push({ callback, priority, plugin: options.plugin });
    filters[filterName].sort((a, b) => a.priority - b.priority);
}

/**
 * Застосувати фільтри
 * @param {string} filterName
 * @param {*} value - початкове значення
 * @param {Object} [ctx] - додатковий контекст
 * @returns {*} - трансформоване значення
 */
export function applyFilter(filterName, value, ctx = {}) {
    if (!filters[filterName]) return value;
    for (const { callback, plugin } of filters[filterName]) {
        try {
            value = callback(value, ctx);
        } catch (err) {
            console.error(`[Products Filter Error] ${filterName}${plugin ? ` (${plugin})` : ''}:`, err);
        }
    }
    return value;
}
