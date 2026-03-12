// js/pages/products/products-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         PRODUCTS SYSTEM                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── products-main.js     — Точка входу, завантаження плагінів           ║
 * ║  ├── products-plugins.js  — Система реєстрації плагінів (хуки + фільтри)║
 * ║  ├── products-state.js    — Глобальний стан (productsState)              ║
 * ║  ├── products-data.js     — Google Sheets API (CRUD товарів)             ║
 * ║  └── variants-data.js     — Google Sheets API (CRUD варіантів)           ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── products-table.js, products-crud.js, products-events.js             ║
 * ║  ├── variants-table.js, variants-events.js                               ║
 * ║  ├── groups-table.js, groups-crud.js                                     ║
 * ║  └── products-crud-wizard.js та інші                                     ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { productsState } from './products-state.js';
import { productsPlugins, runHook } from './products-plugins.js';
import { loadProducts } from './products-data.js';
import { loadProductVariants } from './variants-data.js';
import { loadProductGroups } from './groups-data.js';
import { loadCategories, getCategories } from '../../data/entities-data.js';
import { getBrands, loadBrands } from '../brands/brands-data.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';
import { createPage } from '../../components/page/page-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════

const page = createPage({
    name: 'Products',
    state: productsState,
    plugins: productsPlugins,
    PLUGINS: [
        () => import('./products-table.js'),
        () => import('./products-crud.js'),
        () => import('./products-events.js'),
        () => import('./variants-table.js'),
        () => import('./variants-events.js'),
        () => import('./groups-table.js'),
        () => import('./groups-crud.js'),
        () => import('./products-crud-wizard.js'),
        () => import('./products-crud-table-generator.js'),
        () => import('./products-crud-variant-weight.js'),
        () => import('./products-crud-article.js'),
        () => import('./products-plugin-brand-status.js'),
    ],
    dataLoaders: [
        loadProducts,
        loadProductVariants,
        loadProductGroups,
        () => getBrands().length === 0 ? loadBrands() : Promise.resolve(),
        () => getCategories().length === 0 ? loadCategories() : Promise.resolve()
    ],
    containers: ['products-table-container'],
});

export async function initProducts() {
    await page.init();

    // Cache brands/categories on state for dataTransform
    productsState.brands = getBrands();
    productsState.categories = getCategories();

    // Tab switching with lazy loading
    document.addEventListener('tab-switched', (e) => {
        const tabName = e.detail.tabId.replace('tab-', '');
        productsState.activeTab = tabName;

        if (tabName === 'variants') {
            import('./variants-table.js').then(m => m.renderVariantsTable()).catch(() => {});
        } else if (tabName === 'groups') {
            import('./groups-table.js').then(m => m.renderGroupsTable()).catch(() => {});
        }

        runHook('onTabChange', tabName);
        runHook('onRender');
    });

    // Start polling
    const { startPolling } = await import('./products-polling.js');
    startPolling();
}

// ═══════════════════════════════════════════════════════════════════════════
// ASIDE (module-level registration — before initCore())
// ═══════════════════════════════════════════════════════════════════════════

registerAsideInitializer('aside-products', () => {
    initAsideFab('fab-products-aside', {
        'btn-wizard-product-aside': async () => {
            const { showAddProductModal } = await import('./products-crud.js');
            const { setPendingWizardMode } = await import('./products-crud-wizard.js');
            setPendingWizardMode();
            await showAddProductModal();
        },
        'btn-add-group-aside': async () => {
            const { showAddGroupModal } = await import('./groups-crud.js');
            showAddGroupModal();
        }
    });
});
