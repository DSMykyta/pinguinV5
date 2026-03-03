// js/pages/products/products-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCTS - TABLE RENDERING                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Використовує createManagedTable для таблиці + пошуку + колонок.
 */

import { registerProductsPlugin, runHook } from './products-plugins.js';
import { getProducts } from './products-data.js';
import { productsState } from './products-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('products', {
    edit: async (rowId) => {
        const { showEditProductModal } = await import('./products-crud.js');
        await showEditProductModal(rowId);
    }
});

let _actionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('product_id', 'ID', 'tag'),
        col('image_url', ' ', 'photo'),
        col('category_name', 'Категорія', 'text', { span: 1, filterable: true }),
        col('brand_name', 'Бренд', 'text', { span: 2, filterable: true }),
        col('name_ua', 'Назва коротка', 'name', { span: 12 }),
        col('status', 'Статус', 'status-dot', { filterable: true }),
        col('variants_count', 'Варіанти', 'binding-chip')
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initProductsTable() {
    const visibleCols = productsState.visibleColumns.length > 0
        ? productsState.visibleColumns
        : ['product_id', 'image_url', 'category_name', 'brand_name', 'name_ua', 'status', 'variants_count'];

    const searchCols = productsState.searchColumns.length > 0
        ? productsState.searchColumns
        : ['product_id', 'name_ua', 'brand_id', 'category_id'];

    productsState.productsManagedTable = createManagedTable({
        container: 'products-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getProducts(),

        // DOM IDs
        statsId: null,
        paginationId: null,

        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({
                action: 'edit',
                rowId: row.product_id,
                context: 'products'
            }),
            getRowId: (row) => row.product_id,
            emptyState: { message: 'Товари не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'products');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        product_id: 'id-text',
                        name_ua: 'string',
                        brand_name: 'string',
                        category_name: 'string',
                        status: 'string',
                        variants_count: 'binding-chip'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'category_name', label: 'Категорія', filterType: 'values' },
                        { id: 'status', label: 'Статус', filterType: 'values' }
                    ]
                }
            }
        },

        dataTransform: (data) => {
            const variants = productsState.productVariants || [];
            // Lazy import — ці модулі вже завантажені на момент рендеру
            let brands = [];
            let categories = [];
            try {
                const brandsModule = window.__productsPageBrands || [];
                const categoriesModule = window.__productsPageCategories || [];
                brands = brandsModule;
                categories = categoriesModule;
            } catch { /* ignore */ }

            const brandMap = {};
            brands.forEach(b => { brandMap[b.brand_id] = b.name_uk || b.brand_id; });

            const catMap = {};
            categories.forEach(c => { catMap[c.id] = c.name_ua || c.id; });

            return data.map(p => {
                const count = variants.filter(v => v.product_id === p.product_id).length;

                // image_url може бути JSON масив — витягуємо перший URL
                let thumbUrl = '';
                const raw = p.image_url || '';
                if (raw.startsWith('[')) {
                    try { const arr = JSON.parse(raw); thumbUrl = arr[0] || ''; } catch { /* ignore */ }
                } else if (raw.startsWith('http')) {
                    thumbUrl = raw;
                }

                return {
                    ...p,
                    image_url: thumbUrl,
                    name_ua: p.generated_short_ua || p.name_ua,
                    brand_name: brandMap[p.brand_id] || p.brand_id,
                    category_name: catMap[p.category_id] || p.category_id,
                    variants_count: { count, tooltip: `Варіантів: ${count}` }
                };
            });
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'products'
    });

    productsState.tableAPI = productsState.productsManagedTable.tableAPI;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RENDER
// ═══════════════════════════════════════════════════════════════════════════

export function renderProductsTable() {
    if (!productsState.productsManagedTable) {
        if (!document.getElementById('products-table-container')) return;
        initProductsTable();
        return;
    }
    productsState.productsManagedTable.updateData(getProducts());
}

export function renderProductsTableRowsOnly() {
    if (productsState.productsManagedTable) {
        productsState.productsManagedTable.refilter();
    } else {
        renderProductsTable();
    }
}

export function resetTableAPI() {
    if (productsState.productsManagedTable) {
        productsState.productsManagedTable.destroy();
        productsState.productsManagedTable = null;
    }
    productsState.tableAPI = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerProductsPlugin('onInit', () => {
        renderProductsTable();
    });

    registerProductsPlugin('onRender', () => {
        if (productsState.productsManagedTable) {
            productsState.productsManagedTable.refilter();
        }
    });
}
