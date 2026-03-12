// js/pages/redirect-target/redirect-target-plugins.js

/**
 * Система хуків для сторінки Redirect Target.
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const redirectPlugins = createPluginRegistry('RedirectTarget');

export const registerRedirectPlugin = redirectPlugins.registerHook;
export const runHook = redirectPlugins.runHook;
export { redirectPlugins };
