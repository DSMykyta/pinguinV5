// js/components/modal/modal-main.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  🔒 ЯДРО — МОДАЛІ ОРКЕСТРАТОР                                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Єдина точка входу для модальної системи.                                ║
║  ├── initModals() — ініціалізація core + завантаження плагінів          ║
║  └── Re-export всього публічного API                                     ║
║                                                                          ║
║  🔒 ЯДРО (не видаляти):                                                  ║
║  ├── modal-main.js       — Оркестратор + публічний API                  ║
║  ├── modal-state.js      — Стек, кеш, хуки                              ║
║  └── modal-core.js       — DOM логіка: show/close + event delegation    ║
║                                                                          ║
║  🔌 ПЛАГІНИ (можна видалити):                                            ║
║  ├── modal-plugin-confirm.js  — Простий діалог підтвердження            ║
║  ├── modal-plugin-cascade.js  — Каскадне підтвердження (switch + move) ║
║  └── modal-plugin-info.js     — Info модалі                              ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import { initModalCore } from './modal-core.js';

const PLUGINS = [
    './modal-plugin-confirm.js',
    './modal-plugin-cascade.js',
    './modal-plugin-info.js',
];

/**
 * Ініціалізація модальної системи
 * Викликається один раз з main-core.js
 */
export async function initModals() {
    initModalCore();

    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init();
        } else if (result.status === 'rejected') {
            console.warn(`[modal] ${PLUGINS[index]} — не завантажено`);
        }
    });
}

// ── Re-export: Core API ──

export { showModal, closeModal, closeAllModals, getOpenModals, clearModalCache } from './modal-core.js';

// ── Re-export: State API ──

export { registerHook } from './modal-state.js';

// ── Re-export: Plugin API ──

export { showConfirmModal } from './modal-plugin-confirm.js';
export { showCascadeConfirm } from './modal-plugin-cascade.js';

export { initInfoButtons, clearInfoCache } from './modal-plugin-info.js';
