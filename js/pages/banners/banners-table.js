// js/pages/banners/banners-table.js

/**
 * BANNERS — TABLE RENDERING
 *
 * Uses action handlers + fullscreen modal (consistent with products pattern).
 */

import { getBanners } from './banners-data.js';
import { bannersState } from './banners-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { registerBannersPlugin } from './banners-plugins.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { escapeHtml } from '../../utils/utils-text.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('banners', {
    edit: async (rowId) => {
        const { showEditBannerModal } = await import('./banners-crud.js');
        await showEditBannerModal(rowId);
    }
});

let _bannersManagedTable = null;
let _actionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('banner_id', 'ID', 'tag', { span: 1, sortable: true }),
        col('banner_target', 'Target', 'text', { span: 1, sortable: true, filterable: true }),
        col('banner_group', 'Group', 'text', { span: 1, sortable: true, filterable: true }),
        col('banner_type', 'Type', 'text', { span: 1, sortable: true, filterable: true }),
        col('banner_sort_order', 'Sort', 'code', { span: 1, sortable: true }),
        col('status', 'Status', 'status-dot', { span: 1, sortable: true, filterable: true }),
        col('banner_name_ua', 'Назва UA', 'name', { span: 2, sortable: true }),
        col('url', 'URL', 'code', { span: 1, sortable: true }),
        col('image_url', 'Фото', 'photo', {
            span: 1,
            sortable: false,
            render: (value, row) => value
                ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(row.banner_name_ua || row.banner_id || '')}" class="product-thumb" show>`
                : '<div class="product-thumb product-thumb-empty"><span class="material-symbols-outlined">image</span></div>'
        }),
        col('created_at', 'Створено', 'code', { span: 1, sortable: true })
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initBannersTable() {
    const visibleCols = [
        'banner_id', 'banner_target', 'banner_group', 'banner_type',
        'banner_sort_order', 'status', 'banner_name_ua',
        'url', 'image_url', 'created_at'
    ];

    const searchCols = [
        'banner_id', 'banner_target', 'banner_group', 'banner_type',
        'banner_name_ua', 'banner_name_ru', 'url_ua', 'url_ru',
        'url', 'created_by'
    ];

    _bannersManagedTable = createManagedTable({
        container: 'banners-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getBanners(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({
                action: 'edit',
                rowId: row.banner_id,
                context: 'banners'
            }),
            getRowId: (row) => row.banner_id,
            emptyState: { message: 'Банери не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'banners');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        banner_id: 'string',
                        banner_target: 'string',
                        banner_group: 'string',
                        banner_type: 'string',
                        banner_sort_order: 'number',
                        status: 'string',
                        banner_name_ua: 'string',
                        url: 'string',
                        created_at: 'string'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'banner_target', label: 'Target', filterType: 'values' },
                        { id: 'banner_group', label: 'Group', filterType: 'values' },
                        { id: 'banner_type', label: 'Type', filterType: 'values' },
                        { id: 'status', label: 'Status', filterType: 'values' }
                    ]
                }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'banners'
    });

    bannersState.tableAPI = _bannersManagedTable.tableAPI;
    bannersState.managedTable = _bannersManagedTable;
    initColumnsCharm();
}

export function renderBannersTable() {
    if (!_bannersManagedTable) {
        if (!document.getElementById('banners-table-container')) return;
        initBannersTable();
        return;
    }
    _bannersManagedTable.updateData(getBanners());
}

export function renderBannersTableRowsOnly() {
    if (_bannersManagedTable) {
        _bannersManagedTable.refilter();
    } else {
        renderBannersTable();
    }
}

export function resetBannersTableAPI() {
    if (_bannersManagedTable) {
        _bannersManagedTable.destroy();
        _bannersManagedTable = null;
    }
    bannersState.tableAPI = null;
    bannersState.managedTable = null;
}

export function init() {
    registerBannersPlugin('onInit', () => {
        renderBannersTable();
    });
    registerBannersPlugin('onRender', () => {
        if (bannersState.managedTable) {
            bannersState.managedTable.refilter();
        }
    });
}
