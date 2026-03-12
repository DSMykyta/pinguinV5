// js/pages/marketplaces/marketplaces-plugins.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES - PLUGIN SYSTEM                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Re-export з generic page-plugins.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const marketplacesPlugins = createPluginRegistry('Marketplaces');

export const registerMarketplacesPlugin = marketplacesPlugins.registerHook;
export const runHook = marketplacesPlugins.runHook;
export const runHookAsync = marketplacesPlugins.runHookAsync;
export const optionalFunctions = marketplacesPlugins.optionalFunctions;
export const registerOptionalFunction = marketplacesPlugins.registerOptionalFunction;

// Export registry for page-main usage
export { marketplacesPlugins };
