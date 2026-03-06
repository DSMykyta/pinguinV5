// js/pages/banners/banners-ui.js

/**
 * BANNERS — UI
 */

import { registerBannersPlugin } from './banners-plugins.js';
import { bannersState } from './banners-state.js';
import { loadBanners } from './banners-data.js';
import { renderBannersTable } from './banners-table.js';
import { showAddBannerModal } from './banners-crud.js';
import { showToast } from '../../components/feedback/toast.js';

export function init() {
    registerBannersPlugin('onInit', setupUI);
    registerBannersPlugin('onDataLoaded', renderTableStateLog);
}

function setupUI() {
    const tableContainer = document.getElementById('banners-table-container');
    if (!tableContainer) {
        console.warn('[Banners UI] Table container not found');
        return;
    }

    if (!tableContainer._bannersRefreshInit) {
        tableContainer._bannersRefreshInit = true;
        tableContainer.addEventListener('charm:refresh', (e) => {
            const refreshTask = (async () => {
                await loadBanners();
                renderBannersTable();
                showToast('Дані оновлено', 'success');
            })();
            if (e?.detail?.waitUntil) e.detail.waitUntil(refreshTask);
        });
    }

    const addButtons = [
        document.getElementById('btn-add-banner'),
        document.getElementById('btn-add-banner-aside')
    ].filter(Boolean);

    addButtons.forEach((btn) => {
        if (btn._bannersAddInit) return;
        btn._bannersAddInit = true;
        btn.addEventListener('click', () => showAddBannerModal());
    });
}

function renderTableStateLog() {
    console.log('[Banners UI] Loaded banners:', bannersState.banners.length);
}
