// js/pages/entities/entities-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         ENTITIES SYSTEM                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── entities-main.js       — Точка входу, завантаження плагінів         ║
 * ║  ├── entities-plugins.js    — Система реєстрації плагінів (хуки)         ║
 * ║  └── entities-state.js      — Глобальний стан (entitiesState)            ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── entities-core.js           — Tab switching + lazy loaders           ║
 * ║  ├── entities-table.js          — Рендеринг таблиць                     ║
 * ║  ├── entities-events.js         — Обробники подій                       ║
 * ║  ├── entities-categories.js     — Категорії CRUD + модалки              ║
 * ║  ├── entities-characteristics.js — Характеристики CRUD + модалки        ║
 * ║  ├── entities-options.js        — Опції CRUD + модалки                  ║
 * ║  ├── entities-polling.js        — Фоновий polling маппінгів             ║
 * ║  ├── entities-mapping-wizard.js              — Wizard категорій         ║
 * ║  ├── entities-mapping-wizard-characteristics.js — Wizard характеристик  ║
 * ║  └── entities-mapping-wizard-options.js         — Wizard опцій          ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { entitiesState } from './entities-state.js';
import { entitiesPlugins, runHook } from './entities-plugins.js';
import { loadAllEntities } from '../../data/entities-data.js';
import { loadMarketplaces } from '../../data/marketplaces-data.js';
import { loadMpCategories, loadMpCharacteristics, loadMpOptions } from '../../data/mp-data.js';
import { loadMapCategories, loadMapCharacteristics, loadMapOptions } from '../../data/mappings-data.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';
import { createPage } from '../../components/page/page-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════

const page = createPage({
    name: 'Entities',
    state: entitiesState,
    plugins: entitiesPlugins,
    PLUGINS: [
        () => import('./entities-table.js'),
        () => import('./entities-events.js'),
        () => import('./entities-categories.js'),
        () => import('./entities-characteristics.js'),
        () => import('./entities-options.js'),
        () => import('./entities-mapping-wizard.js'),
        () => import('./entities-mapping-wizard-characteristics.js'),
        () => import('./entities-mapping-wizard-options.js'),
        () => import('./entities-polling.js'),
    ],
    dataLoaders: [
        loadAllEntities,
        loadMarketplaces,
        loadMpCategories,
        loadMapCategories,
    ],
    initHook: 'onDataLoaded',
    tabPrefix: 'tab-entities-',
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
        'entities-categories-table-container',
        'entities-characteristics-table-container',
        'entities-options-table-container',
    ],
});

export async function initEntities() {
    await page.init();
}

// ═══════════════════════════════════════════════════════════════════════════
// ASIDE (module-level registration — before initCore())
// ═══════════════════════════════════════════════════════════════════════════

registerAsideInitializer('aside-entities', () => {
    initAsideFab('fab-entities-aside', {
        'btn-add-category-aside': async () => {
            const { showAddCategoryModal } = await import('./entities-categories.js');
            showAddCategoryModal();
        },
        'btn-add-characteristic-aside': async () => {
            const { showAddCharacteristicModal } = await import('./entities-characteristics.js');
            showAddCharacteristicModal();
        },
        'btn-add-option-aside': async () => {
            const { showAddOptionModal } = await import('./entities-options.js');
            showAddOptionModal();
        }
    });

    const mappingWizardBtn = document.getElementById('btn-mapping-wizard-aside');
    if (mappingWizardBtn) {
        mappingWizardBtn.addEventListener('click', async () => {
            const { showMappingWizard } = await import('./entities-mapping-wizard.js');
            showMappingWizard();
        });
    }

    const charWizardBtn = document.getElementById('btn-mapping-wizard-characteristics-aside');
    if (charWizardBtn) {
        charWizardBtn.addEventListener('click', async () => {
            const { showCharacteristicMappingWizard } = await import('./entities-mapping-wizard-characteristics.js');
            showCharacteristicMappingWizard();
        });
    }

    const optWizardBtn = document.getElementById('btn-mapping-wizard-options-aside');
    if (optWizardBtn) {
        optWizardBtn.addEventListener('click', async () => {
            const { showOptionMappingWizard } = await import('./entities-mapping-wizard-options.js');
            showOptionMappingWizard();
        });
    }
});
