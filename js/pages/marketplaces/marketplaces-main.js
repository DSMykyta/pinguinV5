// js/pages/marketplaces/marketplaces-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         MARKETPLACES SYSTEM                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── marketplaces-main.js       — Точка входу, завантаження плагінів     ║
 * ║  ├── marketplaces-plugins.js    — Система реєстрації плагінів (хуки)     ║
 * ║  └── marketplaces-state.js      — Глобальний стан (marketplacesState)    ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── marketplaces-table.js      — Рендеринг таблиці                     ║
 * ║  ├── marketplaces-events.js     — Обробники подій                       ║
 * ║  ├── marketplaces-crud.js       — Маркетплейси CRUD + модалки           ║
 * ║  ├── marketplaces-import.js     — Імпорт даних                          ║
 * ║  └── marketplaces-import-wizard.js — Wizard імпорту                     ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { marketplacesState } from './marketplaces-state.js';
import { marketplacesPlugins } from './marketplaces-plugins.js';
import { loadMarketplaces } from '../../data/marketplaces-data.js';
import { loadAllEntities } from '../../data/entities-data.js';
import { loadMpCategories, loadMpCharacteristics, loadMpOptions } from '../../data/mp-data.js';
import { loadMapCategories, loadMapCharacteristics, loadMapOptions } from '../../data/mappings-data.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';
import { createPage } from '../../components/page/page-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════

const page = createPage({
    name: 'Marketplaces',
    state: marketplacesState,
    plugins: marketplacesPlugins,
    PLUGINS: [
        () => import('./marketplaces-table.js'),
        () => import('./marketplaces-events.js'),
        () => import('./marketplaces-crud.js'),
        () => import('./marketplaces-import.js'),
        () => import('./marketplaces-import-wizard.js'),
    ],
    dataLoaders: [
        loadMarketplaces,
        loadAllEntities,
        loadMpCategories,
        loadMpCharacteristics,
        loadMpOptions,
        loadMapCategories,
        loadMapCharacteristics,
        loadMapOptions,
    ],
    initHook: 'onDataLoaded',
    containers: ['marketplaces-table-container'],
});

export async function initMarketplaces() {
    await page.init();
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
