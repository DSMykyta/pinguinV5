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

    // Modal-level refresh
    document.addEventListener('modal-opened', (e) => {
        if (e.detail.modalId !== 'product-edit') return;
        const container = e.detail.modalElement?.querySelector('.modal-fullscreen-container');
        if (!container || container._productsRefreshInit) return;
        container._productsRefreshInit = true;
        container.addEventListener('charm:refresh', (ev) => {
            ev.detail.waitUntil((async () => {
                await loadProducts();
                renderProductsTable();
                const { resetSnapshots } = await import('./products-polling.js');
                const { refreshProductModal } = await import('./products-crud.js');
                resetSnapshots();
                refreshProductModal();
                showToast('Дані оновлено', 'success');
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
