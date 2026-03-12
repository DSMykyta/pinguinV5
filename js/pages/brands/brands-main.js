// js/pages/brands/brands-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         BRANDS SYSTEM                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── brands-main.js     — Точка входу, завантаження плагінів             ║
 * ║  ├── brands-plugins.js  — Система реєстрації плагінів (хуки)             ║
 * ║  ├── brands-state.js    — Глобальний стан (brandsState)                  ║
 * ║  └── brands-data.js     — Google Sheets API (CRUD операції)              ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── brands-table.js         — Таблиця брендів (сторінка)                ║
 * ║  ├── brands-crud.js          — Модал бренду (open/fill/save)             ║
 * ║  ├── brands-crud-alt-names.js— Модал: секція альт. назв                  ║
 * ║  ├── brands-crud-links.js    — Модал: секція посилань                    ║
 * ║  ├── brands-crud-logo.js     — Модал: секція логотипу                    ║
 * ║  ├── brands-crud-lines.js    — Модал: таблиця лінійок                    ║
 * ║  ├── brands-delete.js        — Delete бренду (confirm + API)             ║
 * ║  ├── brands-events.js        — Обробники подій (refresh)                 ║
 * ║  ├── lines-table.js          — Таблиця лінійок (сторінка)                ║
 * ║  ├── lines-crud.js           — Модал лінійки                             ║
 * ║  └── lines-delete.js         — Delete лінійки                            ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { brandsState } from './brands-state.js';
import { brandsPlugins, runHook } from './brands-plugins.js';
import { loadBrands } from './brands-data.js';
import { loadBrandLines } from './lines-data.js';
import { loadOptions, getOptions } from '../../data/entities-data.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';
import { createPage } from '../../components/page/page-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE BOOTSTRAP (generic createPage замість 80 рядків boilerplate)
// ═══════════════════════════════════════════════════════════════════════════

const page = createPage({
    name: 'Brands',
    state: brandsState,
    plugins: brandsPlugins,
    PLUGINS: [
        () => import('./brands-table.js'),
        () => import('./brands-crud.js'),
        () => import('./brands-events.js'),
        () => import('./lines-table.js'),
        () => import('./lines-crud.js'),
    ],
    dataLoaders: [
        loadBrands,
        loadBrandLines,
        () => getOptions().length === 0 ? loadOptions() : Promise.resolve()
    ],
    containers: ['brands-table-container'],
});

/**
 * Головна функція ініціалізації модуля Brands
 */
export async function initBrands() {
    await page.init();

    // Tab switching
    document.addEventListener('tab-switched', (e) => {
        const tabName = e.detail.tabId.replace('tab-', '');
        brandsState.activeTab = tabName;
        runHook('onTabChange', tabName);
        runHook('onRender');
    });

    // Start polling
    const { startPolling } = await import('./brands-polling.js');
    startPolling();
}

// ═══════════════════════════════════════════════════════════════════════════
// ASIDE (module-level registration — before initCore())
// ═══════════════════════════════════════════════════════════════════════════

registerAsideInitializer('aside-brands', () => {
    initAsideFab('fab-brands-aside', {
        'btn-add-brand-aside': async () => {
            const { showAddBrandModal } = await import('./brands-crud.js');
            showAddBrandModal();
        },
        'btn-add-line-aside': async () => {
            const { showAddLineModal } = await import('./lines-crud.js');
            showAddLineModal();
        }
    });
});
