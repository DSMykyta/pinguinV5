// js/pages/redirect-target/redirect-target-ui.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — UI                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Відповідає за маніпуляції з DOM та рендер                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerHook } from './redirect-target-plugins.js';
import { redirectTargetState } from './redirect-target-state.js';
import { loadRedirects } from './redirect-target-data.js';
import { renderRedirectsTable } from './redirect-target-table.js';
import { showToast } from '../../components/feedback/toast.js';

export function init() {
    registerHook('onInit', setupUI);
    registerHook('onDataLoaded', renderTableStateLog);
}

function setupUI() {
    const tableContainer = document.getElementById('redirect-target-table-container');
    if (!tableContainer) {
        console.warn('[RedirectTarget UI] Table container not found');
        return;
    }

    if (tableContainer._redirectTargetRefreshInit) return;
    tableContainer._redirectTargetRefreshInit = true;

    tableContainer.addEventListener('charm:refresh', (e) => {
        const refreshTask = (async () => {
            await loadRedirects();
            renderRedirectsTable();
            showToast('Дані оновлено', 'success');
        })();

        if (e?.detail?.waitUntil) {
            e.detail.waitUntil(refreshTask);
        }
    });
}

function renderTableStateLog() {
    console.log('[RedirectTarget UI] Loaded redirects:', redirectTargetState.redirects.length);
}
