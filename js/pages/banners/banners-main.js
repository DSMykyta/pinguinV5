// js/pages/banners/banners-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         BANNERS SYSTEM                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { runHook } from './banners-plugins.js';
import { loadBanners } from './banners-data.js';
import { bannersState } from './banners-state.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

const PLUGINS = [
    './banners-table.js',
    './banners-ui.js'
];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(bannersState);
        } else if (result.status === 'rejected') {
            console.warn(`[Banners] ⚠️ Плагін не завантажено: ${PLUGINS[index]}`, result.reason?.message || '');
        }
    });
}

export async function initBanners() {
    await loadPlugins();
    checkAuthAndLoadData();

    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

async function checkAuthAndLoadData() {
    if (window.isAuthorized) {
        try {
            await loadBanners();
            runHook('onInit');
            runHook('onDataLoaded');
        } catch (error) {
            console.error('[Banners Main] Init Error:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}

function renderAuthRequiredState() {
    const tbody = document.querySelector('#tab-banners .pseudo-table-body') || document.querySelector('#banners-table-container');
    if (tbody) {
        tbody.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            showMessage: true,
            containerClass: 'empty-state'
        });
    }
}

function renderErrorState() {
    const tbody = document.querySelector('#tab-banners .pseudo-table-body') || document.querySelector('#banners-table-container');
    if (tbody) {
        tbody.innerHTML = renderAvatarState('error', {
            message: 'Помилка завантаження банерів',
            showMessage: true,
            containerClass: 'empty-state'
        });
    }
}
