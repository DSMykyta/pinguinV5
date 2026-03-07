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

    // Modal-level: product-edit
    document.addEventListener('modal-opened', async (e) => {
        if (e.detail.modalId !== 'product-edit') return;
        const overlay = e.detail.modalElement;
        const container = overlay?.querySelector('.modal-container');

        // ── Wizard mode switch ──
        const modeSwitch = overlay?.querySelector('#product-mode-switch');
        if (modeSwitch && !modeSwitch._wizardInit) {
            modeSwitch._wizardInit = true;
            modeSwitch.addEventListener('change', async (ev) => {
                const c = ev.target.closest('.modal-container');
                if (!c) return;
                const { initWizard, destroyWizard } = await import('../../components/modal/modal-wizard.js');
                if (ev.target.value === 'wizard') {
                    initWizard(c);
                } else {
                    destroyWizard(c);
                }
            });
        }

        // ── Auto-activate wizard якщо прапорець стоїть ──
        if (window._pendingWizardMode && container) {
            window._pendingWizardMode = false;
            const { initWizard } = await import('../../components/modal/modal-wizard.js');
            initWizard(container);
            const radio = overlay.querySelector('#product-mode-wizard');
            if (radio) radio.checked = true;
        }
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

    // Destroy wizard on modal close
    document.addEventListener('modal-closed', async (e) => {
        if (e.detail.modalId !== 'product-edit') return;
        const container = e.detail.modalElement?.querySelector('.modal-container');
        if (container?.classList.contains('wizard-mode')) {
            const { destroyWizard } = await import('../../components/modal/modal-wizard.js');
            destroyWizard(container);
        }
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
