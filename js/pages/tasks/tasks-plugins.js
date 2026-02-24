// js/tasks/tasks-plugins.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - PLUGIN SYSTEM                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Система хуків для модульної архітектури задач.
 * Дозволяє плагінам реєструвати callbacks на певні події.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

/**
 * Реєстр хуків
 */
const hooks = {
    onInit: [],           // Після завантаження даних задач
    onTaskAdd: [],        // Після додавання задачі
    onTaskUpdate: [],     // Після оновлення задачі
    onTaskDelete: [],     // Після видалення задачі
    onRender: [],         // Після рендеру карток
    onTabChange: [],      // Після зміни активного табу
    onFilterChange: [],   // Після зміни фільтрів
    onModalOpen: [],      // Після відкриття модалу
    onModalClose: [],     // Після закриття модалу
};

/**
 * Зареєструвати плагін на хук
 * @param {string} hookName - Назва хука (onInit, onTaskAdd, etc.)
 * @param {Function} callback - Функція для виклику
 * @param {number} priority - Пріоритет (менше = раніше), default 10
 */
export function registerTasksPlugin(hookName, callback, priority = 10) {
    if (!hooks[hookName]) {
        console.warn(`[Tasks Plugins] Невідомий хук: ${hookName}`);
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
        console.warn(`[Tasks Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    hooks[hookName].forEach(({ callback }) => {
        try {
            callback(...args);
        } catch (err) {
            console.error(`[Tasks Plugin Error] ${hookName}:`, err);
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
        console.warn(`[Tasks Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    for (const { callback } of hooks[hookName]) {
        try {
            await callback(...args);
        } catch (err) {
            console.error(`[Tasks Plugin Error] ${hookName}:`, err);
        }
    }
}

/**
 * Опціональні функції, які можуть бути зареєстровані плагінами
 * Використовуйте optionalFunctions.someFunc?.() для безпечного виклику
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
