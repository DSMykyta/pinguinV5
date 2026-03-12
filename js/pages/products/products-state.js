// js/pages/products/products-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCTS - STATE                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

import { createPageState } from '../../components/page/page-state.js';
import { registerFilter } from './products-plugins.js';

export const productsState = createPageState({
    activeTab: 'products',
    searchColumns: ['product_id', 'name_ua', 'brand_id', 'category_id'],
    visibleColumns: ['image_url', 'product_id', 'article', 'name_ua', 'brand_name', 'category_name', 'status', 'variants_count'],
    custom: {
        // Plugin API delegate
        registerFilter(name, callback, options) {
            registerFilter(name, callback, options);
        },
        // Дані
        products: [],
        productVariants: [],
        productGroups: [],
        brands: [],
        categories: [],
        // Managed table
        productsManagedTable: null,
        tableAPI: null,
        sortAPI: null,
    }
});
