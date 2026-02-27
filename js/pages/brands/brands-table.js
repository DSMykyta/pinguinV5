// js/brands/brands-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Використовує createManagedTable для таблиці + пошуку + колонок.
 */

import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { getBrands } from './brands-data.js';
import { brandsState } from './brands-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('brands', {
    edit: async (rowId) => {
        const { showEditBrandModal } = await import('./brands-crud.js');
        await showEditBrandModal(rowId);
    }
});

let _actionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('brand_logo_url', ' ', 'photo'),
        col('brand_id', 'ID', 'tag', { span: 1 }),
        col('name_uk', 'Назва', 'name'),
        col('names_alt', 'Альтернативні назви', 'words-list', { searchable: true }),
        col('country_option_id', 'Країна', 'text', { span: 1, filterable: true }),
        col('brand_status', 'Статус', 'status-dot', { filterable: true }),
        col('brand_links', 'Посилання', 'links'),
        col('bindings', 'Лінійки', 'binding-chip')
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initBrandsTable() {
    const visibleCols = brandsState.visibleColumns.length > 0
        ? brandsState.visibleColumns
        : ['brand_id', 'name_uk', 'country_option_id', 'brand_links'];

    const searchCols = brandsState.searchColumns.length > 0
        ? brandsState.searchColumns
        : ['brand_id', 'name_uk', 'names_alt', 'country_option_id'];

    brandsState.brandsManagedTable = createManagedTable({
        container: 'brands-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getBrands(),

        // DOM IDs
        searchInputId: 'search-brands',
        statsId: null,
        paginationId: null,

        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({
                action: 'edit',
                rowId: row.brand_id,
                context: 'brands'
            }),
            getRowId: (row) => row.brand_id,
            emptyState: { message: 'Бренди не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'brands');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        brand_id: 'id-text',
                        name_uk: 'string',
                        names_alt: 'string',
                        country_option_id: 'string',
                        brand_status: 'string',
                        bindings: 'binding-chip'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'country_option_id', label: 'Країна', filterType: 'values' },
                        { id: 'brand_status', label: 'Статус', filterType: 'values' }
                    ]
                }
            }
        },

        dataTransform: (data) => {
            const lines = brandsState.brandLines || [];
            return data.map(b => {
                const count = lines.filter(l => l.brand_id === b.brand_id).length;
                return { ...b, bindings: { count, tooltip: `Лінійок: ${count}` } };
            });
        },

        pageSize: null,
        checkboxPrefix: 'brands'
    });

    // Зберігаємо tableAPI в state для сумісності
    brandsState.tableAPI = brandsState.brandsManagedTable.tableAPI;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RENDER
// ═══════════════════════════════════════════════════════════════════════════

export function renderBrandsTable() {
    if (!brandsState.brandsManagedTable) {
        if (!document.getElementById('brands-table-container')) return;
        initBrandsTable();
        return;
    }
    brandsState.brandsManagedTable.updateData(getBrands());
}

export function renderBrandsTableRowsOnly() {
    if (brandsState.brandsManagedTable) {
        brandsState.brandsManagedTable.refilter();
    } else {
        renderBrandsTable();
    }
}

export function resetTableAPI() {
    if (brandsState.brandsManagedTable) {
        brandsState.brandsManagedTable.destroy();
        brandsState.brandsManagedTable = null;
    }
    brandsState.tableAPI = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerBrandsPlugin('onInit', () => {
        renderBrandsTable();
    });

    registerBrandsPlugin('onRender', () => {
        if (brandsState.activeTab === 'brands' && brandsState.brandsManagedTable) {
            brandsState.brandsManagedTable.refilter();
        }
    });
}
