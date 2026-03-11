// js/pages/entities/entities-core.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - CORE                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Lifecycle: auth, data loading, tabs, lazy loaders, aside    ║
 * ║                                                                          ║
 * ║  Запускає state.runHook() в ключових точках:                            ║
 * ║  • onDataLoaded   — дані завантажено, можна рендерити                  ║
 * ║  • onTabSwitch    — користувач переключив таб                          ║
 * ║  • onTabDataReady — lazy data для табу готова                          ║
 * ║  • onLookupInvalidate — кеші потрібно скинути                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadAllEntities } from '../../data/entities-data.js';
import { loadMpCategories, loadMpCharacteristics, loadMpOptions } from '../../data/mp-data.js';
import { loadMapCategories, loadMapCharacteristics, loadMapOptions } from '../../data/mappings-data.js';
import { createLazyLoader } from '../../utils/utils-lazy-load.js';
import { initTooltips } from '../../components/feedback/tooltip.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';

let _state = null;
let lazyCharacteristics = null;
let lazyOptions = null;

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    _state = state;

    initTooltips();
    initTabListener();
    initAside();

    checkAuthAndLoadData();

    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB LISTENER
// ═══════════════════════════════════════════════════════════════════════════

function initTabListener() {
    document.addEventListener('tab-switched', async (e) => {
        const tabId = e.detail.tabId;
        if (!tabId.startsWith('tab-entities-')) return;

        const newTab = tabId.replace('tab-entities-', '');
        _state.activeTab = newTab;

        _state.runHook('onTabSwitch', newTab);

        if (!window.isAuthorized) return;

        await ensureTabData(newTab);
        _state.runHook('onTabDataReady', newTab);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// LAZY LOADERS
// ═══════════════════════════════════════════════════════════════════════════

function createTabLoaders() {
    lazyCharacteristics = createLazyLoader(async () => {
        await Promise.allSettled([loadMpCharacteristics(), loadMapCharacteristics()]);
        _state.runHook('onLookupInvalidate');
    });

    lazyOptions = createLazyLoader(async () => {
        await Promise.allSettled([loadMpOptions(), loadMapOptions()]);
        _state.runHook('onLookupInvalidate');
    });
}

async function ensureTabData(tabName) {
    if (tabName === 'characteristics' && lazyCharacteristics) {
        await lazyCharacteristics.load();
    } else if (tabName === 'options' && lazyOptions) {
        if (lazyCharacteristics) await lazyCharacteristics.load();
        await lazyOptions.load();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH + DATA LOADING
// ═══════════════════════════════════════════════════════════════════════════

async function checkAuthAndLoadData() {
    if (window.isAuthorized) {
        try {
            await loadAllEntities();
            await Promise.allSettled([loadMpCategories(), loadMapCategories()]);

            createTabLoaders();
            await ensureTabData(_state.activeTab);

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
    const containers = [
        'entities-categories-table-container',
        'entities-characteristics-table-container',
        'entities-options-table-container',
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            size: 'medium',
            containerClass: 'empty-state',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    });
}

function renderErrorState() {
    const container = document.getElementById(`entities-${_state.activeTab}-table-container`);
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
    registerAsideInitializer('aside-entities', () => {
        initAsideFab('fab-entities-aside', {
            'btn-add-category-aside': async () => {
                const { showAddCategoryModal } = await import('./entities-categories.js');
                showAddCategoryModal();
            },
            'btn-add-characteristic-aside': async () => {
                const { showAddCharacteristicModal } = await import('./entities-characteristics.js');
                showAddCharacteristicModal();
            },
            'btn-add-option-aside': async () => {
                const { showAddOptionModal } = await import('./entities-options.js');
                showAddOptionModal();
            }
        });

        const mappingWizardBtn = document.getElementById('btn-mapping-wizard-aside');
        if (mappingWizardBtn) {
            mappingWizardBtn.addEventListener('click', async () => {
                const { showMappingWizard } = await import('./entities-mapping-wizard.js');
                showMappingWizard();
            });
        }

        const charWizardBtn = document.getElementById('btn-mapping-wizard-characteristics-aside');
        if (charWizardBtn) {
            charWizardBtn.addEventListener('click', async () => {
                const { showCharacteristicMappingWizard } = await import('./entities-mapping-wizard-characteristics.js');
                showCharacteristicMappingWizard();
            });
        }

        const optWizardBtn = document.getElementById('btn-mapping-wizard-options-aside');
        if (optWizardBtn) {
            optWizardBtn.addEventListener('click', async () => {
                const { showOptionMappingWizard } = await import('./entities-mapping-wizard-options.js');
                showOptionMappingWizard();
            });
        }
    });
}
