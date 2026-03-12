// js/pages/marketplaces/marketplaces-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         MARKETPLACES SYSTEM                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── marketplaces-main.js       — Точка входу, завантаження плагінів     ║
 * ║  ├── marketplaces-plugins.js    — Система реєстрації плагінів (хуки)     ║
 * ║  ├── marketplaces-state.js      — Глобальний стан (marketplacesState)    ║
 * ║  ├── marketplaces-core.js       — Lifecycle: auth, data                 ║
 * ║  └── marketplaces-table.js      — Рендеринг таблиці                     ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── marketplaces-events.js     — Обробники подій                       ║
 * ║  ├── marketplaces-crud.js       — Маркетплейси CRUD + модалки           ║
 * ║  └── marketplaces-import.js     — Імпорт даних                          ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { marketplacesState } from './marketplaces-state.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    () => import('./marketplaces-core.js'),
    () => import('./marketplaces-table.js'),
    () => import('./marketplaces-events.js'),
    () => import('./marketplaces-crud.js'),
    () => import('./marketplaces-import.js'),
    () => import('./marketplaces-import-wizard.js'),
];

/**
 * Завантажити плагіни динамічно
 */
async function loadPlugins() {

    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(marketplacesState);
        } else if (result.status === 'rejected') {
            console.warn(`[Marketplaces] ⚠️ Плагін ${index} не завантажено`, result.reason?.message || '');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Головна функція ініціалізації модуля Marketplaces
 */
export async function initMarketplaces() {

    // Завантажити плагіни
    await loadPlugins();
}

// ═══════════════════════════════════════════════════════════════════════════
// ASIDE (module-level registration — before initCore())
// ═══════════════════════════════════════════════════════════════════════════

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
