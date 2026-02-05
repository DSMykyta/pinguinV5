// js/gemini/gem-plugins.js

/**
 * СИСТЕМА ПЛАГІНІВ GEMINI
 *
 * Дозволяє реєструвати плагіни для різних типів запитів до AI.
 * Кожен плагін - це окремий інструмент з власним system prompt.
 *
 * Хуки:
 * - onInit: при ініціалізації Gemini
 * - onBeforeRequest: перед запитом до API
 * - onAfterRequest: після отримання відповіді
 * - onError: при помилці
 */

const hooks = {
    onInit: [],
    onBeforeRequest: [],
    onAfterRequest: [],
    onError: []
};

const plugins = new Map();

/**
 * Зареєструвати хук
 * @param {string} hookName - Назва хука
 * @param {Function} callback - Функція
 * @param {number} priority - Пріоритет (менше = раніше)
 */
export function registerHook(hookName, callback, priority = 10) {
    if (!hooks[hookName]) {
        console.warn(`[Gemini Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    hooks[hookName].push({ callback, priority });
    hooks[hookName].sort((a, b) => a.priority - b.priority);
}

/**
 * Виконати хук
 * @param {string} hookName - Назва хука
 * @param {...any} args - Аргументи
 */
export function runHook(hookName, ...args) {
    if (!hooks[hookName]) return;

    hooks[hookName].forEach(({ callback }) => {
        try {
            callback(...args);
        } catch (err) {
            console.error(`[Gemini Hook Error] ${hookName}:`, err);
        }
    });
}

/**
 * Зареєструвати плагін
 * @param {Object} plugin - Об'єкт плагіна
 * @param {string} plugin.id - Унікальний ID
 * @param {string} plugin.name - Назва для UI
 * @param {string} plugin.icon - Material icon
 * @param {string[]} plugin.inputs - Які інпути показувати ['name', 'url', 'context']
 * @param {string} plugin.systemPrompt - System prompt для Gemini
 * @param {Function} plugin.buildPrompt - Функція побудови user prompt
 * @param {Function} plugin.parseResponse - Функція парсингу відповіді
 */
export function registerPlugin(plugin) {
    if (!plugin.id) {
        console.error('[Gemini] Плагін без ID');
        return;
    }

    plugins.set(plugin.id, plugin);
}

/**
 * Отримати плагін по ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getPlugin(id) {
    return plugins.get(id) || null;
}

/**
 * Отримати всі плагіни
 * @returns {Object[]}
 */
export function getAllPlugins() {
    return Array.from(plugins.values());
}

/**
 * Отримати активний плагін (перший зареєстрований або за ID)
 * @param {string} [id] - ID плагіна
 * @returns {Object|null}
 */
export function getActivePlugin(id) {
    if (id) {
        return getPlugin(id);
    }
    const all = getAllPlugins();
    return all.length > 0 ? all[0] : null;
}
