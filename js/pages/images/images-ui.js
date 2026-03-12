// js/pages/images/images-ui.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        IMAGES — UI                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerHook } from './images-plugins.js';
import { imagesState } from './images-state.js';
import { loadImages } from './images-data.js';
import { renderImagesTable } from './images-table.js';
import { showToast } from '../../components/feedback/toast.js';

export function init() {
    registerHook('onInit', setupUI);
    registerHook('onDataLoaded', renderTableStateLog);
}

function setupUI() {
    const tableContainer = document.getElementById('images-table-container');
    if (!tableContainer) {
        console.warn('[Images UI] Table container not found');
        return;
    }

    if (tableContainer._imagesRefreshInit) return;
    tableContainer._imagesRefreshInit = true;

    tableContainer.addEventListener('charm:refresh', (e) => {
        const refreshTask = (async () => {
            await loadImages();
            renderImagesTable();
            showToast('Дані оновлено', 'success');
        })();

        if (e?.detail?.waitUntil) {
            e.detail.waitUntil(refreshTask);
        }
    });
}

function renderTableStateLog() {
    console.log('[Images UI] Loaded images:', imagesState.images.length);
}
