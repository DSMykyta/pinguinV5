// js/components/page/page-plugins.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGE PLUGINS — Generic Hook System                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Фабрика системи хуків для будь-якої сторінки.                          ║
 * ║  Замінює brands-plugins.js, entities-plugins.js тощо.                  ║
 * ║                                                                          ║
 * ║  ВИКОРИСТАННЯ:                                                           ║
 * ║  const { registerHook, runHook, runHookAsync } = createPluginRegistry(); ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Створити нову систему хуків
 * @param {string} [name='Page'] - Назва модуля (для логів)
 * @returns {{ registerHook, runHook, runHookAsync, registerOptionalFunction, optionalFunctions }}
 */
export function createPluginRegistry(name = 'Page') {
    const hooks = {};
    const optionalFunctions = {};

    function registerHook(hookName, callback, priority = 10) {
        if (!hooks[hookName]) hooks[hookName] = [];
        hooks[hookName].push({ callback, priority });
        hooks[hookName].sort((a, b) => a.priority - b.priority);
    }

    function runHook(hookName, ...args) {
        if (!hooks[hookName]) return;
        hooks[hookName].forEach(({ callback }) => {
            try {
                callback(...args);
            } catch (err) {
                console.error(`[${name} Plugin Error] ${hookName}:`, err);
            }
        });
    }

    async function runHookAsync(hookName, ...args) {
        if (!hooks[hookName]) return;
        for (const { callback } of hooks[hookName]) {
            try {
                await callback(...args);
            } catch (err) {
                console.error(`[${name} Plugin Error] ${hookName}:`, err);
            }
        }
    }

    function registerOptionalFunction(fnName, func) {
        optionalFunctions[fnName] = func;
    }

    return {
        registerHook,
        runHook,
        runHookAsync,
        registerOptionalFunction,
        optionalFunctions
    };
}
