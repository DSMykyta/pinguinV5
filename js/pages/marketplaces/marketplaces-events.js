// js/pages/marketplaces/marketplaces-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES - EVENT HANDLERS                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для сторінки Маркетплейсів.
 */

import { registerMarketplacesPlugin } from './marketplaces-plugins.js';
import { renderMarketplacesTable } from './marketplaces-table.js';
import { loadMarketplaces } from '../../data/marketplaces-data.js';
import { showToast } from '../../components/feedback/toast.js';

let _state = null;

export function init(state) {
    _state = state;
    registerMarketplacesPlugin('onDataLoaded', () => {
        initMarketplacesEvents();
    });
}

/**
 * Ініціалізувати всі обробники подій
 */
function initMarketplacesEvents() {
    initRefreshHandlers();
    initAddButton();
    initImportButton();
}

/**
 * Обробники charm:refresh на контейнері
 */
function initRefreshHandlers() {
    // Modal-level charm:refresh
    const modalLoaders = {
        'mapper-mp-data': () => import('../../data/marketplaces-data.js').then(m => m.loadMarketplaces()),
    };
    document.addEventListener('modal-opened', (e) => {
        const loader = modalLoaders[e.detail.modalId];
        if (!loader) return;
        const container = e.detail.modalElement?.querySelector('.modal-container');
        if (!container || container._marketplacesRefreshInit) return;
        container._marketplacesRefreshInit = true;
        container.addEventListener('charm:refresh', (ev) => {
            ev.detail.waitUntil((async () => {
                await loader();
                showToast('Дані оновлено', 'success');
            })());
        });
    });

    // Table-level charm:refresh
    const container = document.getElementById('marketplaces-table-container');
    if (container) {
        container.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                await loadMarketplaces();
                renderMarketplacesTable();
            })());
        });
    }
}

/**
 * Ініціалізувати кнопку додавання маркетплейсу
 */
function initAddButton() {
    const addBtn = document.getElementById('btn-add-marketplace');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const { showAddMarketplaceModal } = await import('./marketplaces-crud.js');
            showAddMarketplaceModal();
        });
    }
}

/**
 * Ініціалізувати кнопку імпорту
 */
function initImportButton() {
    const importBtn = document.getElementById('btn-import-marketplace');
    if (importBtn) {
        importBtn.addEventListener('click', async () => {
            await import('./marketplaces-import-rozetka.js');
            await import('./marketplaces-import-epicentr.js');
            await import('./marketplaces-import-etalon.js');
            const { showImportModal } = await import('./marketplaces-import.js');
            showImportModal();
        });
    }
}
