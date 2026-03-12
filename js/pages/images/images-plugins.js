// js/pages/images/images-plugins.js

/**
 * Система хуків для сторінки Images.
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const imagesPlugins = createPluginRegistry('Images');

export const registerHook = imagesPlugins.registerHook;
export const runHook = imagesPlugins.runHook;
export { imagesPlugins };
