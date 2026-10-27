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

import { createHookRegistry } from '../../utils/utils-hooks.js';

/**
 * Створити нову систему хуків
 * @param {string} [name='Page'] - Назва модуля (для логів)
 * @returns {{ registerHook, runHook, runHookAsync, registerOptionalFunction, optionalFunctions }}
 */
export function createPluginRegistry(name = 'Page') {
    const { registerHook, runHook, runHookAsync } = createHookRegistry({ name });
    const optionalFunctions = {};

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
