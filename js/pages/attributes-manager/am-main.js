// js/pages/attributes-manager/am-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ATTRIBUTES MANAGER SYSTEM                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ЯДРО:                                                                  ║
 * ║  ├── am-main.js       — Точка входу, завантаження плагінів             ║
 * ║  ├── am-plugins.js    — Система реєстрації плагінів (хуки)             ║
 * ║  └── am-state.js      — Глобальний стан (amState)                      ║
 * ║                                                                         ║
 * ║  ПЛАГІНИ:                                                               ║
 * ║  ├── am-grid.js       — Рендеринг grid (папки + MP картки)             ║
 * ║  ├── am-drag.js       — Drag-and-drop (створення маппінгів)            ║
 * ║  └── am-events.js     — Пошук, edit, remove mapping                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { amState } from './am-state.js';
import { amPlugins, runHook } from './am-plugins.js';
import { loadAllEntities } from '../../data/entities-data.js';
import { loadMarketplaces } from '../../data/marketplaces-data.js';
import { loadMpCategories, loadMpCharacteristics, loadMpOptions } from '../../data/mp-data.js';
import { loadMapCategories, loadMapCharacteristics, loadMapOptions } from '../../data/mappings-data.js';
import { createPage } from '../../components/page/page-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════

const page = createPage({
    name: 'AttributesManager',
    state: amState,
    plugins: amPlugins,
    PLUGINS: [
        () => import('./am-grid.js'),
        () => import('./am-drag.js'),
        () => import('./am-events.js'),
    ],
    dataLoaders: [
        loadAllEntities,
        loadMarketplaces,
        loadMpCategories,
        loadMapCategories,
    ],
    initHook: 'onDataLoaded',
    tabPrefix: 'tab-am-',
    tabHook: 'onTabSwitch',
    tabDataReadyHook: 'onTabDataReady',
    tabLazyLoaders: {
        characteristics: async () => {
            await Promise.allSettled([loadMpCharacteristics(), loadMapCharacteristics()]);
            runHook('onLookupInvalidate');
        },
        options: async () => {
            await Promise.allSettled([loadMpCharacteristics(), loadMapCharacteristics()]);
            await Promise.allSettled([loadMpOptions(), loadMapOptions()]);
            runHook('onLookupInvalidate');
        },
    },
    containers: [
        'am-categories-grid',
        'am-characteristics-grid',
        'am-options-grid',
    ],
});

export async function initAM() {
    await page.init();
}
