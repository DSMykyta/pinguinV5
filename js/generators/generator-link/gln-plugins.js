// js/generators/generator-link/gln-plugins.js

/**
 * СИСТЕМА ПЛАГІНІВ LINKS ГЕНЕРАТОРА
 *
 * Дозволяє модулям реєструватися і бути видаленими без помилок.
 *
 * Хуки (події):
 * - onInit: викликається при ініціалізації
 * - onReset: викликається при оновленні даних
 */

const hooks = {
    onInit: [],
    onReset: [],
};

/**
 * Реєструє плагін для певного хука
 */
export function registerLinksPlugin(hookName, callback, priority = 10) {
    if (!hooks[hookName]) {
        console.warn(`[Links Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    hooks[hookName].push({ callback, priority });
    hooks[hookName].sort((a, b) => a.priority - b.priority);
}

/**
 * Викликає всі зареєстровані плагіни для хука
 */
export function runHook(hookName, ...args) {
    if (!hooks[hookName]) return;

    hooks[hookName].forEach(({ callback }) => {
        try {
            callback(...args);
        } catch (err) {
            console.error(`[Links Plugin Error] ${hookName}:`, err);
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
