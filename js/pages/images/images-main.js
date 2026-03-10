// js/pages/images/images-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         IMAGES SYSTEM                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { runHook } from './images-plugins.js';
import { loadImages } from './images-data.js';
import { imagesState } from './images-state.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

const PLUGINS = [
    () => import('./images-table.js'),
    () => import('./images-ui.js')
];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(imagesState);
        } else if (result.status === 'rejected') {
            console.warn(`[Images] ⚠️ Плагін ${index} не завантажено`, result.reason?.message || '');
        }
    });
}

export async function initImages() {
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
            await loadImages();
            runHook('onInit');
            runHook('onDataLoaded');
        } catch (error) {
            console.error('[Images Main] Init Error:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}

function renderAuthRequiredState() {
    const tbody = document.querySelector('#tab-images .pseudo-table-body') || document.querySelector('#images-table-container');
    if (tbody) {
        tbody.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            showMessage: true,
            containerClass: 'empty-state'
        });
    }
}

function renderErrorState() {
    const tbody = document.querySelector('#tab-images .pseudo-table-body') || document.querySelector('#images-table-container');
    if (tbody) {
        tbody.innerHTML = renderAvatarState('error', {
            message: 'Помилка завантаження зображень',
            showMessage: true,
            containerClass: 'empty-state'
        });
    }
}
