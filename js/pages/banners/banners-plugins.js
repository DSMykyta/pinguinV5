// js/pages/banners/banners-plugins.js

/**
 * Система хуків для сторінки Banners.
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const bannersPlugins = createPluginRegistry('Banners');

export const registerHook = bannersPlugins.registerHook;
export const runHook = bannersPlugins.runHook;
export { bannersPlugins };
