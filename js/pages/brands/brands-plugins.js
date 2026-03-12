// js/pages/brands/brands-plugins.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - PLUGIN SYSTEM                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Re-export з generic page-plugins.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const brandsPlugins = createPluginRegistry('Brands');

export const registerBrandsPlugin = brandsPlugins.registerHook;
export const runHook = brandsPlugins.runHook;
export const runHookAsync = brandsPlugins.runHookAsync;
export const optionalFunctions = brandsPlugins.optionalFunctions;
export const registerOptionalFunction = brandsPlugins.registerOptionalFunction;

// Export registry for page-main usage
export { brandsPlugins };
