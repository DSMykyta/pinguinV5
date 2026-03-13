// js/pages/attributes-manager/am-plugins.js

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const amPlugins = createPluginRegistry('AttributesManager');

export const registerHook = amPlugins.registerHook;
export const runHook = amPlugins.runHook;
export const runHookAsync = amPlugins.runHookAsync;
export const optionalFunctions = amPlugins.optionalFunctions;
export const registerOptionalFunction = amPlugins.registerOptionalFunction;

export { amPlugins };
