// js/pages/redirect-target/redirect-target-ui.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — UI                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Відповідає за маніпуляції з DOM та рендер                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerRedirectPlugin } from './redirect-target-plugins.js';
import { redirectTargetState } from './redirect-target-state.js';

export function init() {
    registerRedirectPlugin('onInit', setupUI);
    registerRedirectPlugin('onDataLoaded', renderTableStateLog);
}

function setupUI() {
    const tableContainer = document.getElementById('redirect-target-table-container');
    if (!tableContainer) {
        console.warn('[RedirectTarget UI] Table container not found');
    }
}

function renderTableStateLog() {
    console.log('[RedirectTarget UI] Loaded redirects:', redirectTargetState.redirects.length);
}
