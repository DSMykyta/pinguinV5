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
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { createBatchActionsBar } from '../../components/actions/actions-batch.js';

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
let _productsBatchBar = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('product_id', 'ID', 'tag', { span: 1 }),
        col('article', 'Артикул', 'text', { span: 1 }),
        col('image_url', ' ', 'photo'),
        col('category_name', 'Категорія', 'text', { span: 2, filterable: true }),
        col('brand_name', 'Бренд', 'text', { span: 2, filterable: true }),
        col('name_ua', 'Назва коротка', 'name'),
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
        : ['product_id', 'article', 'image_url', 'category_name', 'brand_name', 'name_ua', 'status', 'variants_count'];

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
                },
                checkboxes: {
                    batchBar: () => _productsBatchBar
                }
            }
        },

        dataTransform: (data) => {
            const variants = productsState.productVariants || [];
            const brands = productsState.brands || [];
            const categories = productsState.categories || [];

            const brandMap = {};
            brands.forEach(b => { brandMap[b.brand_id] = b.name_uk || b.brand_id; });

            const catMap = {};
            categories.forEach(c => { catMap[c.id] = c.name_ua || c.id; });

            return data.map(p => {
                const productVariants = variants.filter(v => v.product_id === p.product_id);
                const count = productVariants.length;

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
                    variants_count: { count, tooltip: productVariants.map(v => v.generated_short_ua || v.name_ua || v.variant_id).join('\n') }
                };
            });
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'products'
    });

    productsState.tableAPI = productsState.productsManagedTable.tableAPI;

    // Batch actions bar
    _productsBatchBar = createBatchActionsBar({
        tabId: 'products',
        actions: [
            {
                id: 'copy',
                label: 'Копіювати',
                icon: 'content_copy',
                singleOnly: true,
                handler: async (selectedIds) => {
                    const { copyProduct } = await import('./products-copy.js');
                    const newId = await copyProduct(selectedIds[0]);
                    if (newId) {
                        _productsBatchBar.deselectAll();
                        renderProductsTable();
                    }
                }
            },
            {
                id: 'delete',
                label: 'Видалити',
                icon: 'delete',
                dangerous: true,
                handler: async (selectedIds) => {
                    const { deleteProduct } = await import('./products-data.js');
                    const { showToast } = await import('../../components/feedback/toast.js');
                    if (!confirm(`Видалити ${selectedIds.length} товар(ів)?`)) return;
                    try {
                        for (const id of selectedIds) {
                            await deleteProduct(id);
                        }
                        _productsBatchBar.deselectAll();
                        renderProductsTable();
                        showToast(`Видалено ${selectedIds.length} товар(ів)`, 'success');
                    } catch (error) {
                        console.error('Batch delete error:', error);
                        showToast('Помилка видалення', 'error');
                    }
                }
            }
        ]
    });

    initColumnsCharm();
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
    if (_productsBatchBar) {
        _productsBatchBar.destroy();
        _productsBatchBar = null;
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
