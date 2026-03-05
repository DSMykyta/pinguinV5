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

export function getColumns() {
    return [
        col('redirect_id', 'ID', 'tag', { span: 2, sortable: true }),
        col('redirect_in', 'Вхідний URL', 'code', { span: 3, sortable: true }),
        col('redirect_out', 'Вихідний URL', 'code', { span: 3, sortable: true }),
        col('redirect_target', 'Ціль', 'words-list', { 
            span: 2, 
            sortable: true, 
            filterable: true, 
            filterType: 'values', 
            extraClass: 'c-secondary' 
        }),
        col('redirect_entity', 'Сутність', 'text', { span: 2, sortable: true })
    ];
}

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
            rowActions: () => '',
            getRowId: (row) => row.redirect_id,
            emptyState: { message: 'Редиректи не знайдено' },
            withContainer: true, // ВИПРАВЛЕНО: Ядро саме створить потрібні div-обгортки
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
        // ВИПРАВЛЕНО: words-list вимагає масив. Конвертуємо рядок з CSV у масив.
        dataTransform: (data) => {
            return data.map(item => ({
                ...item,
                redirect_target: typeof item.redirect_target === 'string' ? [item.redirect_target] : item.redirect_target
            }));
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'redirects'
    });

    redirectTargetState.tableAPI = _redirectsManagedTable.tableAPI;
    redirectTargetState.managedTable = _redirectsManagedTable;
}

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

export function init(state) {
    registerRedirectPlugin('onInit', () => {
        renderRedirectsTable();
    });
    registerRedirectPlugin('onRender', () => {
        if (redirectTargetState.managedTable) {
            redirectTargetState.managedTable.refilter();
        }
    });
}