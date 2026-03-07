// js/pages/products/products-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCTS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Обробники подій для сторінки товарів.
 */

import { productsState } from './products-state.js';
import { registerProductsPlugin, runHook } from './products-plugins.js';
import { renderProductsTable } from './products-table.js';
import { loadProducts } from './products-data.js';
import { showToast } from '../../components/feedback/toast.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initProductsEvents() {
    initRefreshHandlers();
}

/**
 * Обробники charm:refresh на контейнерах
 */
function initRefreshHandlers() {
    const productsContainer = document.getElementById('products-table-container');
    if (productsContainer) {
        productsContainer.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                await loadProducts();
                renderProductsTable();
                const { resetSnapshots } = await import('./products-polling.js');
                resetSnapshots();
                showToast('Дані оновлено', 'success');
            })());
        });
    }

    // Mode switch: Повний / Покроковий
    const modeSwitch = document.getElementById('product-mode-switch');
    if (modeSwitch) {
        modeSwitch.addEventListener('change', async (e) => {
            const container = e.target.closest('.modal-container');
            if (!container) return;

            const { initWizard, destroyWizard } = await import('../../components/modal/modal-wizard.js');

            if (e.target.value === 'wizard') {
                initWizard(container);
            } else {
                destroyWizard(container);
            }
        });
    }

    // Modal-level refresh (product-edit)
    document.addEventListener('modal-opened', (e) => {
        if (e.detail.modalId !== 'product-edit') return;
        const container = e.detail.modalElement?.querySelector('.modal-container');
        if (!container || container._productsRefreshInit) return;
        container._productsRefreshInit = true;
        container.addEventListener('charm:refresh', (ev) => {
            ev.detail.waitUntil((async () => {
                await loadProducts();
                renderProductsTable();
                const { resetSnapshots } = await import('./products-polling.js');
                const { refreshProductModal } = await import('./products-crud.js');
                resetSnapshots();
                refreshProductModal(true);
                showToast('Дані оновлено', 'success');
            })());
        });
    });

    // Modal-level refresh (variant-edit)
    document.addEventListener('modal-opened', (e) => {
        if (e.detail.modalId !== 'variant-edit') return;
        const container = e.detail.modalElement?.querySelector('.modal-container');
        if (!container || container._variantRefreshInit) return;
        container._variantRefreshInit = true;
        container.addEventListener('charm:refresh', (ev) => {
            ev.detail.waitUntil((async () => {
                const variantIdInput = document.getElementById('variant-id');
                const variantId = variantIdInput ? variantIdInput.value : null;

                if (variantId) {
                    const { loadProductVariants } = await import('./variants-data.js');
                    await loadProductVariants();

                    const { showEditVariantModal } = await import('./products-crud-variants.js');
                    await showEditVariantModal(variantId);

                    showToast('Дані варіанту оновлено', 'success');
                } else {
                    showToast('Неможливо оновити новий варіант', 'warning');
                }
            })());
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerProductsPlugin('onInit', () => {
        initProductsEvents();
    });
}
