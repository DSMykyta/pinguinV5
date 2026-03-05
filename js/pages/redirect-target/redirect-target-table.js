// js/pages/redirect-target/redirect-target-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    REDIRECT TARGET - TABLE RENDERING                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Використовує createManagedTable для таблиці.
 */

import { getRedirects } from './redirect-target-data.js';
import { redirectTargetState } from './redirect-target-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { renderRedirectEditRow, handleRedirectSave } from './redirect-target-crud.js';
import { registerRedirectPlugin } from './redirect-target-plugins.js';

let _redirectsManagedTable = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('redirect_id', 'ID', 'tag', { span: 2 }),
        col('redirect_in', 'Вхідний URL', 'code', { span: 3 }),
        col('redirect_out', 'Вихідний URL', 'code', { span: 3 }),
        col('redirect_target', 'Ціль', 'words-list', { 
            span: 2, 
            extraClass: 'c-secondary' 
        }),
        col('redirect_entity', 'Сутність', 'text', { span: 2 })
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initRedirectsTable() {
    const visibleCols = ['redirect_id', 'redirect_in', 'redirect_out', 'redirect_target', 'redirect_entity'];
    const searchCols = ['redirect_id', 'redirect_in', 'redirect_out', 'redirect_target', 'redirect_entity'];

    _redirectsManagedTable = createManagedTable({
        container: 'redirect-target-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getRedirects(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: () => '', // Кнопка розкриття додається плагіном expandable
            getRowId: (row) => row.redirect_id,
            emptyState: { message: 'Редиректи не знайдено' },
            withContainer: false,
            plugins: {
                sorting: {
                    columnTypes: {
                        redirect_id: 'string',
                        redirect_in: 'string',
                        redirect_out: 'string',
                        redirect_target: 'string',
                        redirect_entity: 'string'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'redirect_target', label: 'Ціль', filterType: 'values' }
                    ]
                },
                expandable: {
                    renderContent: renderRedirectEditRow,
                    onSave: (rowEl, row) => handleRedirectSave(rowEl, row, redirectTargetState.tableAPI)
                }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'redirects'
    });

    redirectTargetState.tableAPI = _redirectsManagedTable.tableAPI;
    redirectTargetState.managedTable = _redirectsManagedTable;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RENDER
// ═══════════════════════════════════════════════════════════════════════════

export function renderRedirectsTable() {
    if (!_redirectsManagedTable) {
        if (!document.getElementById('redirect-target-table-container')) return;
        initRedirectsTable();
        return;
    }
    _redirectsManagedTable.updateData(getRedirects());
}

export function renderRedirectsTableRowsOnly() {
    if (_redirectsManagedTable) {
        _redirectsManagedTable.refilter();
    } else {
        renderRedirectsTable();
    }
}

export function resetRedirectsTableAPI() {
    if (_redirectsManagedTable) {
        _redirectsManagedTable.destroy();
        _redirectsManagedTable = null;
    }
    redirectTargetState.tableAPI = null;
    redirectTargetState.managedTable = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    // Підписуємо таблицю на подію ініціалізації
    registerRedirectPlugin('onInit', () => {
        renderRedirectsTable();
    });

    // Підписуємо таблицю на перемальовування (refilter)
    registerRedirectPlugin('onRender', () => {
        if (redirectTargetState.managedTable) {
            redirectTargetState.managedTable.refilter();
        }
    });
}