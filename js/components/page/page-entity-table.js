// js/components/page/page-entity-table.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGE ENTITY TABLE — Універсальний table plugin        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Створює managed table з конфігурації.                         ║
 * ║  Замінює всі *-table.js файли для простих сутностей.                    ║
 * ║                                                                          ║
 * ║  🎯 Використання:                                                        ║
 * ║  Викликається автоматично з page-entity.js — не імпортувати напряму.    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createManagedTable, col } from '../table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../actions/actions-main.js';
import { initColumnsCharm } from '../charms/charm-columns.js';

/**
 * Створити table plugin для сутності
 *
 * @param {Object} config — Повна конфігурація сутності
 * @param {Object} data — Data layer (з createEntityData)
 * @param {Object} state — State об'єкт
 * @param {Object} plugins — Plugin registry
 * @returns {{ init, renderTable, refilterTable, resetTable }}
 */
export function createEntityTable(config, data, state, plugins) {
    const { table: tableConfig, name, dataSource } = config;

    let _managedTable = null;
    let _actionCleanup = null;

    function buildColumns() {
        return tableConfig.columns.map(c =>
            col(c.id, c.label, c.type, {
                span: c.span || 1,
                sortable: c.sortable ?? false,
                filterable: c.filterable ?? false,
                ...(c.render ? { render: c.render } : {})
            })
        );
    }

    function buildSortingTypes() {
        const types = {};
        tableConfig.columns.forEach(c => {
            if (c.sortable) {
                types[c.id] = c.sortType || 'string';
            }
        });
        return types;
    }

    function buildFilterColumns() {
        return tableConfig.columns
            .filter(c => c.filterable)
            .map(c => ({
                id: c.id,
                label: c.label,
                filterType: c.filterType || 'values',
                ...(c.labelMap ? { labelMap: c.labelMap } : {})
            }));
    }

    function getVisibleCols() {
        return tableConfig.visibleColumns || tableConfig.columns.map(c => c.id);
    }

    function getSearchCols() {
        return tableConfig.searchColumns || tableConfig.columns.map(c => c.id);
    }

    function buildRowActions(row) {
        if (typeof tableConfig.rowActions === 'function') {
            return tableConfig.rowActions(row, dataSource.idField, name);
        }

        const actions = tableConfig.actions || ['edit'];
        const idField = dataSource.idField;

        return actions.map(action => {
            if (typeof action === 'string') {
                return actionButton({ action, rowId: row[idField], context: name });
            }
            return actionButton({ ...action, rowId: row[idField], context: name });
        }).join('');
    }

    function initTable() {
        const containerId = tableConfig.containerId;
        if (!document.getElementById(containerId)) return;

        const columns = buildColumns();
        const visibleCols = getVisibleCols();
        const searchCols = getSearchCols();

        _managedTable = createManagedTable({
            container: containerId,
            columns: columns.map(c => ({
                ...c,
                searchable: searchCols.includes(c.id) || c.searchable === true,
                checked: visibleCols.includes(c.id)
            })),
            data: data.getAll(),
            statsId: tableConfig.statsId ?? null,
            paginationId: tableConfig.paginationId ?? null,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: (row) => buildRowActions(row),
                getRowId: (row) => row[dataSource.idField],
                emptyState: { message: tableConfig.emptyMessage || 'Дані не знайдено' },
                withContainer: false,
                onAfterRender: (container) => {
                    if (_actionCleanup) _actionCleanup();
                    _actionCleanup = initActionHandlers(container, name);
                },
                plugins: {
                    sorting: { columnTypes: buildSortingTypes() },
                    filters: { filterColumns: buildFilterColumns() },
                    ...(tableConfig.expandable ? { expandable: tableConfig.expandable } : {})
                }
            },
            preFilter: tableConfig.preFilter ?? null,
            pageSize: tableConfig.pageSize ?? null,
            checkboxPrefix: tableConfig.checkboxPrefix ?? name,
            ...(tableConfig.dataTransform ? { dataTransform: tableConfig.dataTransform } : {})
        });

        state.tableAPI = _managedTable.tableAPI;
        state.managedTable = _managedTable;
        initColumnsCharm();
    }

    function renderTable() {
        if (!_managedTable) {
            if (!document.getElementById(tableConfig.containerId)) return;
            initTable();
            return;
        }
        _managedTable.updateData(data.getAll());
    }

    function refilterTable() {
        if (_managedTable) {
            _managedTable.refilter();
        } else {
            renderTable();
        }
    }

    function resetTable() {
        if (_managedTable) {
            _managedTable.destroy();
            _managedTable = null;
        }
        state.tableAPI = null;
        state.managedTable = null;
    }

    return {
        init() {
            const actionHandlers = {};

            if (config.crud) {
                actionHandlers.edit = async (rowId) => {
                    const crudModule = state._crudModule;
                    if (crudModule) crudModule.showEdit(rowId);
                };
            }

            if (tableConfig.actionHandlers) {
                Object.assign(actionHandlers, tableConfig.actionHandlers);
            }

            registerActionHandlers(name, actionHandlers);

            plugins.registerHook('onInit', () => renderTable());
            plugins.registerHook('onRender', () => refilterTable());
        },
        renderTable,
        refilterTable,
        resetTable,
    };
}
