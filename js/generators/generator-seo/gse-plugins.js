// js/generators/generator-seo/gse-plugins.js

/**
 * СИСТЕМА ПЛАГІНІВ SEO ГЕНЕРАТОРА
 *
 * Дозволяє модулям реєструватися і бути видаленими без помилок.
 *
 * Хуки (події):
 * - onInit: викликається при ініціалізації SEO
 * - onCalculate: викликається при перерахунку SEO
 * - onReset: викликається при скиданні форми
 */

const hooks = {
    onInit: [],
    onCalculate: [],
    onReset: [],
};

/**
 * Реєструє плагін для певного хука
 * @param {string} hookName - Назва хука (onInit, onCalculate, onReset)
 * @param {Function} callback - Функція яка буде викликана
 * @param {number} priority - Пріоритет (менше = раніше), за замовчуванням 10
 */
export function registerSeoPlugin(hookName, callback, priority = 10) {
    if (!hooks[hookName]) {
        console.warn(`[SEO Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    hooks[hookName].push({ callback, priority });
    // Сортуємо по пріоритету
    hooks[hookName].sort((a, b) => a.priority - b.priority);
}

/**
 * Викликає всі зареєстровані плагіни для хука
 * @param {string} hookName - Назва хука
 * @param {...any} args - Аргументи для передачі в плагіни
 */
export function runHook(hookName, ...args) {
    if (!hooks[hookName]) return;

    hooks[hookName].forEach(({ callback }) => {
        try {
            callback(...args);
        } catch (err) {
            console.error(`[SEO Plugin Error] ${hookName}:`, err);
        }
    });
}

/**
 * Повертає список зареєстрованих плагінів (для дебагу)
 */
export function getRegisteredPlugins() {
    const result = {};
    for (const [hookName, plugins] of Object.entries(hooks)) {
        result[hookName] = plugins.length;
    }
    return result;
}

/**
 * Опціональні функції, які плагіни можуть реєструвати.
 * Якщо плагін видалено — функція просто не буде викликана.
 */
export const optionalFunctions = {};
