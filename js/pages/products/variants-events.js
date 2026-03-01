// js/pages/products/variants-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    VARIANTS - EVENTS (PAGE TAB)                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — обробники подій для таблиці варіантів на сторінці.
 */

import { registerProductsPlugin } from './products-plugins.js';
import { loadProductVariants } from './variants-data.js';
import { loadProducts } from './products-data.js';

// ═══════════════════════════════════════════════════════════════════════════
// CHARM REFRESH HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function initCharmRefresh() {
    const variantsContainer = document.getElementById('variants-table-container');
    if (!variantsContainer) return;

    variantsContainer.addEventListener('charm:refresh', async () => {
        await Promise.allSettled([loadProductVariants(), loadProducts()]);
        const { renderVariantsTable } = await import('./variants-table.js');
        renderVariantsTable();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerProductsPlugin('onInit', () => {
        initCharmRefresh();
    });
}
