// js/pages/keywords/keywords-plugins.js

/**
 * Система хуків для сторінки Keywords.
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const keywordsPlugins = createPluginRegistry('Keywords');

export const registerKeywordsPlugin = keywordsPlugins.registerHook;
export const runHook = keywordsPlugins.runHook;
export { keywordsPlugins };
