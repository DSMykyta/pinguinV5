// js/pages/entities/entities-core.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - CORE                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Lifecycle: auth, data loading, tabs, lazy loaders           ║
 * ║                                                                          ║
 * ║  Запускає runHook() в ключових точках:                                  ║
 * ║  • onDataLoaded   — дані завантажено, можна рендерити                  ║
 * ║  • onTabSwitch    — користувач переключив таб                          ║
 * ║  • onTabDataReady — lazy data для табу готова                          ║
 * ║  • onLookupInvalidate — кеші потрібно скинути                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadAllEntities } from '../../data/entities-data.js';
import { loadMpCategories, loadMpCharacteristics, loadMpOptions } from '../../data/mp-data.js';
import { loadMapCategories, loadMapCharacteristics, loadMapOptions } from '../../data/mappings-data.js';
import { loadMarketplaces } from '../../data/marketplaces-data.js';
import { createLazyLoader } from '../../utils/utils-lazy-load.js';
import { initTooltips } from '../../components/feedback/tooltip.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { runHook } from './entities-plugins.js';

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

        runHook('onTabSwitch', newTab);

        if (!window.isAuthorized) return;

        await ensureTabData(newTab);
        runHook('onTabDataReady', newTab);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// LAZY LOADERS
// ═══════════════════════════════════════════════════════════════════════════

function createTabLoaders() {
    lazyCharacteristics = createLazyLoader(async () => {
        await Promise.allSettled([loadMpCharacteristics(), loadMapCharacteristics()]);
        runHook('onLookupInvalidate');
    });

    lazyOptions = createLazyLoader(async () => {
        await Promise.allSettled([loadMpOptions(), loadMapOptions()]);
        runHook('onLookupInvalidate');
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
            await Promise.allSettled([loadAllEntities(), loadMarketplaces()]);
            await Promise.allSettled([loadMpCategories(), loadMapCategories()]);

            createTabLoaders();
            await ensureTabData(_state.activeTab);

            runHook('onDataLoaded');
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
