// js/pages/products/products-plugins.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCTS - PLUGIN SYSTEM                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Система хуків для модульної архітектури товарів.
 * Дозволяє плагінам реєструвати callbacks на певні події.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

/**
 * Реєстр хуків
 */
const hooks = {
    onInit: [],              // Після завантаження даних товарів
    onProductAdd: [],        // Після додавання товару
    onProductUpdate: [],     // Після оновлення товару
    onProductDelete: [],     // Після видалення товару
    onVariantAdd: [],        // Після додавання варіанту
    onVariantUpdate: [],     // Після оновлення варіанту
    onVariantDelete: [],     // Після видалення варіанту
    onRender: [],            // Після рендеру таблиці
    onTabChange: [],         // Після зміни активного табу
    onModalOpen: [],         // Після відкриття модалу товару
    onVariantModalOpen: [],  // Після відкриття модалу варіанту
    onModalClose: [],        // Після закриття модалу
};

/**
 * Зареєструвати плагін на хук
 * @param {string} hookName - Назва хука
 * @param {Function} callback - Функція для виклику
 * @param {number} priority - Пріоритет (менше = раніше), default 10
 */
export function registerProductsPlugin(hookName, callback, priority = 10) {
    if (!hooks[hookName]) {
        console.warn(`[Products Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    hooks[hookName].push({ callback, priority });
    hooks[hookName].sort((a, b) => a.priority - b.priority);
}

/**
 * Виконати всі callbacks для хука
 * @param {string} hookName - Назва хука
 * @param {...any} args - Аргументи для передачі в callbacks
 */
export function runHook(hookName, ...args) {
    if (!hooks[hookName]) {
        console.warn(`[Products Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    hooks[hookName].forEach(({ callback }) => {
        try {
            callback(...args);
        } catch (err) {
            console.error(`[Products Plugin Error] ${hookName}:`, err);
        }
    });
}

/**
 * Асинхронно виконати всі callbacks для хука
 * @param {string} hookName - Назва хука
 * @param {...any} args - Аргументи для передачі в callbacks
 */
export async function runHookAsync(hookName, ...args) {
    if (!hooks[hookName]) {
        console.warn(`[Products Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    for (const { callback } of hooks[hookName]) {
        try {
            await callback(...args);
        } catch (err) {
            console.error(`[Products Plugin Error] ${hookName}:`, err);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФІЛЬТРИ (value-трансформери, на відміну від хуків — повертають значення)
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
 * Застосувати фільтри — кожен callback отримує поточне значення і повертає нове
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

/**
 * Опціональні функції, які можуть бути зареєстровані плагінами
 */
export const optionalFunctions = {};

/**
 * Зареєструвати опціональну функцію
 * @param {string} name - Назва функції
 * @param {Function} func - Функція
 */
export function registerOptionalFunction(name, func) {
    optionalFunctions[name] = func;
}
