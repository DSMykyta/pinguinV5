// js/engine/entity-table.js

/**
 * ENTITY TABLE — Universal table plugin
 *
 * Creates a managed table from config. Replaces all *-table.js files.
 */

import { createManagedTable, col } from '../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../components/actions/actions-main.js';
import { initColumnsCharm } from '../components/charms/charm-columns.js';

/**
 * Create a universal table plugin for an entity
 *
 * @param {Object} config - Full entity config
 * @param {Object} data - Entity data layer (from createEntityData)
 * @param {Object} state - Page state
 * @param {Object} plugins - Plugin registry
 * @returns {{ init: Function }}
 */
export function createEntityTablePlugin(config, data, state, plugins) {
    const { table: tableConfig, name, dataSource } = config;

    let _managedTable = null;
    let _actionCleanup = null;

    // Build columns from config
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

    // Build sorting column types from config
    function buildSortingTypes() {
        const types = {};
        tableConfig.columns.forEach(c => {
            if (c.sortable) {
                types[c.id] = c.sortType || 'string';
            }
        });
        return types;
    }

    // Build filter columns from config
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

    // Determine visible columns
    function getVisibleCols() {
        return tableConfig.visibleColumns ||
            tableConfig.columns.map(c => c.id);
    }

    // Determine search columns
    function getSearchCols() {
        return tableConfig.searchColumns ||
            tableConfig.columns.map(c => c.id);
    }

    // Build row actions HTML
    function buildRowActions(row) {
        // Allow full override via function
        if (typeof tableConfig.rowActions === 'function') {
            return tableConfig.rowActions(row, dataSource.idField, name);
        }

        const actions = tableConfig.actions || ['edit'];
        const idField = dataSource.idField;

        return actions.map(action => {
            if (typeof action === 'string') {
                return actionButton({
                    action,
                    rowId: row[idField],
                    context: name
                });
            }
            return actionButton({
                ...action,
                rowId: row[idField],
                context: name
            });
        }).join('');
    }

    // Initialize the managed table
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

    // Render table (init or update)
    function renderTable() {
        if (!_managedTable) {
            if (!document.getElementById(tableConfig.containerId)) return;
            initTable();
            return;
        }
        _managedTable.updateData(data.getAll());
    }

    // Refilter without reloading data
    function refilterTable() {
        if (_managedTable) {
            _managedTable.refilter();
        } else {
            renderTable();
        }
    }

    // Reset table
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
            // Register action handlers — config-provided take priority
            const actionHandlers = {};

            // Auto-generate edit handler if CRUD is present
            if (config.crud) {
                actionHandlers.edit = async (rowId) => {
                    const crudModule = state._crudModule;
                    if (crudModule) crudModule.showEdit(rowId);
                };
            }

            // Merge with custom handlers from config (override auto-generated)
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
