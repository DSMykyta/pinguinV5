// js/pages/entities/entities-plugins.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - PLUGIN SYSTEM                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Re-export з generic page-plugins.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const entitiesPlugins = createPluginRegistry('Entities');

export const registerHook = entitiesPlugins.registerHook;
export const runHook = entitiesPlugins.runHook;
export const runHookAsync = entitiesPlugins.runHookAsync;
export const optionalFunctions = entitiesPlugins.optionalFunctions;
export const registerOptionalFunction = entitiesPlugins.registerOptionalFunction;

// Export registry for page-main usage
export { entitiesPlugins };
