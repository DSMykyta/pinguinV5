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
import { registerProductsPlugin } from './products-plugins.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { displayName } from './products-crud-variant-names.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('variants-page', {
    edit: async (rowId) => {
        const { showEditVariantModal } = await import('./products-crud-variants.js');
        await showEditVariantModal(rowId);
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
        col('article', 'Артикул', 'text', { span: 2 }),
        col('image_url', 'Фото', 'photo', { span: 1 }),
        col('name_ua', 'Назва', 'name'),
        col('price', 'Ціна', 'tag', { span: 1, align: 'center', class: 'u-max-80', color: 'c-secondary' }),
        col('old_price', 'Стара ціна', 'tag', { span: 1, align: 'center', class: 'u-max-80', color: 'c-secondary' }),
        col('stock', 'Залишок', 'tag', { span: 1, align: 'center', class: 'u-max-80', color: 'c-tertiary' }),
        col('status', 'Статус', 'status-dot'),
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initVariantsPageTable() {
    const visibleCols = ['variant_id', 'product_name', 'article', 'image_url', 'name_ua', 'price', 'old_price', 'stock', 'status'];
    const searchCols = ['variant_id', 'article', 'name_ua', 'product_name'];

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
                        article: 'string',
                        name_ua: 'string',
                        price: 'number',
                        old_price: 'number',
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

            return data.map(v => {
                // Витягнути перший URL з JSON масиву або залишити як є
                let thumb = v.image_url || '';
                if (thumb) {
                    try {
                        const parsed = JSON.parse(thumb);
                        if (Array.isArray(parsed)) thumb = parsed[0] || '';
                    } catch { /* not JSON — use as-is */ }
                }

                return {
                    ...v,
                    // Показувати згенеровану назву варіанту
                    name_ua: v.generated_short_ua || displayName(v.name_ua),
                    product_name: productMap[v.product_id] || v.product_id,
                    image_url: thumb,
                };
            });
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'variants-page'
    });

    initColumnsCharm();
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

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerProductsPlugin('onInit', () => {
        if (productsState.activeTab === 'variants') renderVariantsTable();
    });
}
