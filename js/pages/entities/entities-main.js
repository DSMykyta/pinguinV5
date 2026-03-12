// js/pages/entities/entities-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         ENTITIES SYSTEM                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── entities-main.js       — Точка входу, завантаження плагінів         ║
 * ║  ├── entities-plugins.js    — Система реєстрації плагінів (хуки)         ║
 * ║  ├── entities-state.js      — Глобальний стан (entitiesState)            ║
 * ║  ├── entities-core.js       — Lifecycle: auth, data, tabs               ║
 * ║  └── entities-table.js      — Рендеринг таблиць                         ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── entities-events.js          — Обробники подій                       ║
 * ║  ├── entities-categories.js      — Категорії CRUD + модалки              ║
 * ║  ├── entities-characteristics.js — Характеристики CRUD + модалки         ║
 * ║  ├── entities-options.js         — Опції CRUD + модалки                  ║
 * ║  ├── entities-polling.js         — Фоновий polling маппінгів             ║
 * ║  ├── entities-mapping-wizard.js              — Wizard категорій          ║
 * ║  ├── entities-mapping-wizard-characteristics.js — Wizard характеристик   ║
 * ║  └── entities-mapping-wizard-options.js         — Wizard опцій           ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { entitiesState } from './entities-state.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    () => import('./entities-core.js'),
    () => import('./entities-table.js'),
    () => import('./entities-events.js'),
    () => import('./entities-categories.js'),
    () => import('./entities-characteristics.js'),
    () => import('./entities-options.js'),
    () => import('./entities-mapping-wizard.js'),
    () => import('./entities-mapping-wizard-characteristics.js'),
    () => import('./entities-mapping-wizard-options.js'),
    () => import('./entities-polling.js'),
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
            result.value.init(entitiesState);
        } else if (result.status === 'rejected') {
            console.warn(`[Entities] ⚠️ Плагін ${index} не завантажено`, result.reason?.message || '');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Головна функція ініціалізації модуля Entities
 */
export async function initEntities() {

    // Завантажити плагіни
    await loadPlugins();
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
