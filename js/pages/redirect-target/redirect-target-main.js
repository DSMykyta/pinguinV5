/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     REDIRECT TARGET SYSTEM                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── redirect-target-main.js    — Точка входу, завантаження плагінів     ║
 * ║  ├── redirect-target-plugins.js — Система реєстрації плагінів (хуки)     ║
 * ║  ├── redirect-target-state.js   — Глобальний стан сторінки               ║
 * ║  └── redirect-target-data.js    — Google Sheets API (CRUD операції)      ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── redirect-target-table.js   — Таблиця редиректів (конфігурація)      ║
 * ║  └── redirect-target-crud.js    — Логіка інлайн-редагування (форма)      ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { runHook } from './redirect-target-plugins.js';
import { loadRedirects } from './redirect-target-data.js';
import { redirectTargetState } from './redirect-target-state.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

const PLUGINS = [
    () => import('./redirect-target-table.js'),
    () => import('./redirect-target-ui.js')
];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(redirectTargetState);
        } else if (result.status === 'rejected') {
            console.warn(`[RedirectTarget] ⚠️ Плагін ${index} не завантажено`, result.reason?.message || '');
        }
    });
}

export async function initRedirectTarget() {
    // 1. Динамічно завантажуємо плагіни
    await loadPlugins();
    
    // 2. Перевіряємо авторизацію та запускаємо завантаження
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
            await loadRedirects();
            
            // Сповіщаємо плагіни, що дані готові і можна рендерити
            runHook('onInit');
            runHook('onDataLoaded');
            
        } catch (error) {
            console.error('[RedirectTarget Main] Init Error:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}

function renderAuthRequiredState() {
    const tbody = document.querySelector('#tab-redirect-target .pseudo-table-body') || document.querySelector('#redirect-target-table-container');
    if (tbody) {
        tbody.innerHTML = renderAvatarState('authLogin', { 
            message: 'Авторизуйтесь для завантаження даних', 
            showMessage: true,
            containerClass: 'empty-state'
        });
    }
}

function renderErrorState() {
    const tbody = document.querySelector('#tab-redirect-target .pseudo-table-body') || document.querySelector('#redirect-target-table-container');
    if (tbody) {
        tbody.innerHTML = renderAvatarState('error', { 
            message: 'Помилка завантаження даних редиректів', 
            showMessage: true,
            containerClass: 'empty-state'
        });
    }
}