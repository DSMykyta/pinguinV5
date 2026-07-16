// js/pages/marketplaces/marketplaces-import-wizard.js

/**
 * MARKETPLACES - IMPORT WIZARD
 *
 * Facade for importing marketplace references as own dictionary data.
 * Implementation is split into state/data/tree/ui/execute modules.
 */

import { registerHook } from './marketplaces-plugins.js';

export { PLUGIN_NAME } from './marketplaces-import-wizard-state.js';
export { showImportAsOwnWizard } from './marketplaces-import-wizard-ui.js';

let _state = null;

export function init(state) {
    _state = state;
    registerHook('onDataLoaded', handleDataLoaded);
}

function handleDataLoaded() {
    // Update data if needed.
}
