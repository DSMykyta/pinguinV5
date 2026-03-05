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

// 🟢 ЯВНИЙ ІМПОРТ ПЛАГІНІВ (Вирішує проблему з "порожньою сторінкою")
import * as tablePlugin from './redirect-target-table.js';

export async function initRedirectTarget() {
    // 1. Явно ініціалізуємо плагін таблиці (реєструємо хуки)
    if (tablePlugin.init) {
        tablePlugin.init(redirectTargetState);
    }
    
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
            // Завантажуємо дані з Google Sheets
            await loadRedirects();
            
            // Сповіщаємо плагіни (таблицю), що дані готові і можна рендерити
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