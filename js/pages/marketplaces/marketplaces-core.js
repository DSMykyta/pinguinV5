// js/pages/marketplaces/marketplaces-core.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES - CORE                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Lifecycle: auth, data loading, aside                        ║
 * ║                                                                          ║
 * ║  Запускає state.runHook() в ключових точках:                            ║
 * ║  • onDataLoaded — дані завантажено, можна рендерити                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadMarketplaces } from '../../data/marketplaces-data.js';
import { loadAllEntities } from '../../data/entities-data.js';
import { loadMpCategories, loadMpCharacteristics, loadMpOptions } from '../../data/mp-data.js';
import { loadMapCategories, loadMapCharacteristics, loadMapOptions } from '../../data/mappings-data.js';
import { initTooltips } from '../../components/feedback/tooltip.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';

let _state = null;

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    _state = state;

    initTooltips();
    initAside();

    checkAuthAndLoadData();

    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH + DATA LOADING
// ═══════════════════════════════════════════════════════════════════════════

async function checkAuthAndLoadData() {
    if (window.isAuthorized) {
        try {
            await Promise.allSettled([
                loadMarketplaces(),
                loadAllEntities(),
                loadMpCategories(),
                loadMpCharacteristics(),
                loadMpOptions(),
                loadMapCategories(),
                loadMapCharacteristics(),
                loadMapOptions(),
            ]);
            _state.runHook('onDataLoaded');
        } catch (error) {
            console.error('Помилка завантаження даних:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}

function renderAuthRequiredState() {
    const container = document.getElementById('marketplaces-table-container');
    if (!container) return;
    container.innerHTML = renderAvatarState('authLogin', {
        message: 'Авторизуйтесь для завантаження даних',
        size: 'medium',
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });
}

function renderErrorState() {
    const container = document.getElementById('marketplaces-table-container');
    if (!container) return;
    container.innerHTML = renderAvatarState('error', {
        message: 'Помилка завантаження даних',
        size: 'medium',
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ASIDE
// ═══════════════════════════════════════════════════════════════════════════

function initAside() {
    registerAsideInitializer('aside-marketplaces', () => {
        initAsideFab('fab-marketplaces-aside', {
            'btn-add-marketplace-aside': async () => {
                const { showAddMarketplaceModal } = await import('./marketplaces-crud.js');
                showAddMarketplaceModal();
            }
        });

        const importBtn = document.getElementById('btn-import-aside');
        if (importBtn) {
            importBtn.addEventListener('click', async () => {
                await import('./marketplaces-import-rozetka.js');
                await import('./marketplaces-import-epicentr.js');
                await import('./marketplaces-import-etalon.js');
                const { showImportModal } = await import('./marketplaces-import.js');
                showImportModal();
            });
        }
    });
}
