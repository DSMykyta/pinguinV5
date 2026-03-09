// js/pages/products/products-plugin-fab.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS — FAB MENU (aside)                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — FAB меню в aside (wizard, variant, group)
 */

import { registerAsideInitializer } from '../../layout/layout-main.js';

export function init() {
    registerAsideInitializer('aside-products', () => {
        const fabMenu = document.getElementById('fab-products-aside');
        if (!fabMenu) return;

        fabMenu.addEventListener('click', async (e) => {
            if (e.target.closest('.fab-menu-trigger')) {
                fabMenu.classList.toggle('open');
                return;
            }
            const item = e.target.closest('.fab-menu-item');
            if (!item) return;

            fabMenu.classList.remove('open');

            if (item.id === 'btn-wizard-product-aside') {
                const { showAddProductModal } = await import('./products-crud.js');
                const { setPendingWizardMode } = await import('./products-crud-wizard.js');
                setPendingWizardMode();
                await showAddProductModal();
            } else if (item.id === 'btn-add-variant-aside') {
                // TODO: створити варіант
            } else if (item.id === 'btn-add-group-aside') {
                const { showAddGroupModal } = await import('./groups-crud.js');
                showAddGroupModal();
            }
        });

        document.addEventListener('click', (e) => {
            if (!fabMenu.contains(e.target)) fabMenu.classList.remove('open');
        });
    });
}
