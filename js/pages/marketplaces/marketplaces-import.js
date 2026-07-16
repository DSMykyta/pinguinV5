// js/pages/marketplaces/marketplaces-import.js

/**
 * MARKETPLACES - IMPORT PLUGIN
 *
 * Facade for file imports (Excel, CSV).
 * Implementation is split into state/ui/file/execute modules.
 */

import { registerHook } from './marketplaces-plugins.js';

export { PLUGIN_NAME, registerImportAdapter } from './marketplaces-import-state.js';
export { showImportModal } from './marketplaces-import-ui.js';
export { importReferenceForCategory } from './marketplaces-import-execute.js';

let _state = null;

/**
 * Initialize plugin.
 */
export function init(state) {
    _state = state;
    registerHook('onDataLoaded', handleDataLoaded);
}

/**
 * Data loaded hook.
 */
function handleDataLoaded() {
    // Update dependent data if needed.
}
