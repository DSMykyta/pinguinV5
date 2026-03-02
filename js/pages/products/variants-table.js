// js/pages/products/variants-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    VARIANTS - TABLE RENDERING (PAGE TAB)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Таблиця ВСІХ варіантів на вкладці "Варіанти".
 */

import { getProductVariants } from './variants-data.js';
import { getProducts } from './products-data.js';
import { productsState } from './products-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('variants-page', {
    edit: async (rowId) => {
        // Знаходимо варіант щоб отримати product_id → відкриваємо модал товару
        const variants = getProductVariants();
        const variant = variants.find(v => v.variant_id === rowId);
        if (!variant) return;

        const { showEditProductModal } = await import('./products-crud.js');
        await showEditProductModal(variant.product_id);
    }
});

let _variantsPageManagedTable = null;
let _actionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

function getColumns() {
    return [
        col('variant_id', 'ID', 'tag', { span: 1 }),
        col('product_name', 'Товар', 'text', { span: 2 }),
        col('sku', 'SKU', 'text', { span: 2 }),
        col('name_ua', 'Назва', 'name'),
        col('price', 'Ціна', 'text', { span: 1, align: 'right' }),
        col('stock', 'Залишок', 'text', { span: 1, align: 'right' }),
        col('status', 'Статус', 'status-dot'),
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initVariantsPageTable() {
    const visibleCols = ['variant_id', 'product_name', 'sku', 'name_ua', 'price', 'stock', 'status'];
    const searchCols = ['variant_id', 'sku', 'name_ua', 'product_name'];

    _variantsPageManagedTable = createManagedTable({
        container: 'variants-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getProductVariants(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({
                action: 'edit',
                rowId: row.variant_id,
                context: 'variants-page'
            }),
            getRowId: (row) => row.variant_id,
            emptyState: { message: 'Варіанти не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'variants-page');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        variant_id: 'id-text',
                        product_name: 'string',
                        sku: 'string',
                        name_ua: 'string',
                        price: 'number',
                        stock: 'number',
                        status: 'string',
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'status', label: 'Статус', filterType: 'values' }
                    ]
                }
            }
        },
        dataTransform: (data) => {
            const products = getProducts();
            const productMap = {};
            products.forEach(p => { productMap[p.product_id] = p.generated_short_ua || p.name_ua || p.product_id; });

            return data.map(v => ({
                ...v,
                // Показувати згенеровану назву варіанту
                name_ua: v.generated_short_ua || v.name_ua,
                product_name: productMap[v.product_id] || v.product_id,
            }));
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'variants-page'
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

export function renderVariantsTable() {
    if (!_variantsPageManagedTable) {
        if (!document.getElementById('variants-table-container')) return;
        if (!window.isAuthorized) return;
        initVariantsPageTable();
        return;
    }
    _variantsPageManagedTable.updateData(getProductVariants());
}

export function renderVariantsTableRowsOnly() {
    if (_variantsPageManagedTable) {
        _variantsPageManagedTable.refilter();
    } else {
        renderVariantsTable();
    }
}

export function resetVariantsTableAPI() {
    if (_variantsPageManagedTable) {
        _variantsPageManagedTable.destroy();
        _variantsPageManagedTable = null;
    }
    if (_actionCleanup) {
        _actionCleanup();
        _actionCleanup = null;
    }
}
