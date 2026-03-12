// js/pages/entities/entities-plugins.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - PLUGIN SYSTEM                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Система хуків для модульної архітектури сутностей.
 * Дозволяє плагінам реєструвати callbacks на певні події.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

/**
 * Реєстр хуків
 */
const hooks = {
    onDataLoaded: [],        // Дані завантажено, можна рендерити
    onTabSwitch: [],         // Користувач переключив таб
    onTabChange: [],         // Таб змінився (alias для плагінів)
    onTabDataReady: [],      // Lazy data для табу готова
    onDataChanged: [],       // Дані змінились (CRUD операція)
    onLookupInvalidate: [],  // Кеші потрібно скинути
    onRowSelect: [],         // Вибір рядків змінився
};

/**
 * Зареєструвати плагін на хук
 * @param {string} hookName - Назва хука
 * @param {Function} callback - Функція для виклику
 * @param {number} priority - Пріоритет (менше = раніше), default 10
 */
export function registerEntitiesPlugin(hookName, callback, priority = 10) {
    if (!hooks[hookName]) {
        console.warn(`[Entities Plugins] Невідомий хук: ${hookName}`);
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
        console.warn(`[Entities Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    hooks[hookName].forEach(({ callback }) => {
        try {
            callback(...args);
        } catch (err) {
            console.error(`[Entities Plugin Error] ${hookName}:`, err);
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
        console.warn(`[Entities Plugins] Невідомий хук: ${hookName}`);
        return;
    }

    for (const { callback } of hooks[hookName]) {
        try {
            await callback(...args);
        } catch (err) {
            console.error(`[Entities Plugin Error] ${hookName}:`, err);
        }
    }
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
