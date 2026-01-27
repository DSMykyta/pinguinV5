// js/generators/generator-image/gim-plugins.js

/**
 * СИСТЕМА ПЛАГІНІВ IMAGE TOOL ГЕНЕРАТОРА
 *
 * Дозволяє модулям реєструватися і бути видаленими без помилок.
 *
 * Хуки (події):
 * - onInit: викликається при ініціалізації
 * - onLoad: викликається при завантаженні зображення
 * - onSave: викликається при збереженні
 */

const hooks = {
    onInit: [],
    onLoad: [],
    onSave: [],
};

/**
 * Реєструє плагін для певного хука
 */
export function registerImagePlugin(hookName, callback, priority = 10) {
    if (!hooks[hookName]) {
        console.warn(`[Image Plugins] Невідомий хук: ${hookName}`);
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
            console.error(`[Image Plugin Error] ${hookName}:`, err);
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
