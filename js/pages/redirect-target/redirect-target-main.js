// js/pages/redirect-target/redirect-target-main.js

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
 *
 * СТРУКТУРА КОЛОНОК В GOOGLE SHEETS (RedirectTarget):
 * ┌─────────┬────────────────────┬─────────────────────────────────────────┐
 * │ Колонка │ Поле               │ Формат                                  │
 * ├─────────┼────────────────────┼─────────────────────────────────────────┤
 * │ A       │ redirect_id        │ текст (унікальний ідентифікатор)        │
 * │ B       │ redirect_in        │ текст (вхідний URL)                     │
 * │ C       │ redirect_out       │ текст (вихідний URL)                    │
 * │ D       │ redirect_target    │ текст (ціль редиректу, словник)         │
 * │ E       │ redirect_entity    │ текст (сутність: товар, категорія...)   │
 * └─────────┴────────────────────┴─────────────────────────────────────────┘
 * * СТРУКТУРА ДАНИХ REDIRECT TARGET (в JS):
 * {
 * redirect_id: "prod-6306",
 * redirect_in: "biotech-glutamine-zero-300-gramm-arbuz",
 * redirect_out: "biotech-glutamine-zero-300-grammf-s",
 * redirect_target: "Сторінка товару",
 * redirect_entity: "",
 * _rowIndex: 2
 * }
 */

import { runHook } from './redirect-target-plugins.js';
import { loadRedirects } from './redirect-target-data.js';
import { redirectTargetState } from './redirect-target-state.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

// Список всіх плагінів сторінки
const PLUGINS = [
    './redirect-target-table.js'
];

async function loadPlugins() {
    const results = await Promise.allSettled(PLUGINS.map(p => import(p)));
    results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.init) {
            r.value.init(redirectTargetState);
        } else if (r.status === 'rejected') {
            console.error('[RedirectTarget Main] Failed to load plugin:', r.reason);
        }
    });
}

export async function initRedirectTarget() {
    // 1. Завантажуємо плагіни, які зареєструють свої хуки
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
            // Завантажуємо дані з Google Sheets
            await loadRedirects();
            
            // Сповіщаємо плагіни (наприклад, таблицю), що дані готові і можна рендерити
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