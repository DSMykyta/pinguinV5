// js/pages/marketplaces/marketplaces-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES - TABLE RENDERING                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг таблиці для сторінки Маркетплейсів.
 * Одна таблиця (без табів).
 */

import { registerHook, runHook } from './marketplaces-plugins.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import { createManagedTable } from '../../components/table/table-managed.js';
import { col } from '../../components/table/table-main.js';
import { getBatchBar } from '../../components/actions/actions-batch.js';
import { registerActionHandlers, initActionHandlers, actionButton } from '../../components/actions/actions-main.js';
import { escapeHtml } from '../../utils/utils-text.js';

let _state = null;

export function init(state) {
    _state = state;
    registerHook('onDataLoaded', () => {
        initMarketplacesTable();
        renderMarketplacesTable();
    });
    registerHook('onDataChanged', () => {
        renderMarketplacesTable();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('marketplaces', {
    edit: async (rowId) => {
        const { showEditMarketplaceModal } = await import('./marketplaces-crud.js');
        await showEditMarketplaceModal(rowId);
    },
    view: async (rowId) => {
        const { showMarketplaceDataModal } = await import('./marketplaces-crud.js');
        await showMarketplaceDataModal(rowId);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DATA TRANSFORM
// ═══════════════════════════════════════════════════════════════════════════

function transformMarketplaces(data) {
    return data.map(mp => ({
        ...mp,
        is_active: String(mp.is_active ?? '').toLowerCase() === 'true' ? 'active' : 'inactive',
        _editable: true
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export function getMarketplacesColumns() {
    return [
        { ...col('id', 'ID', 'tag'), searchable: true },
        { ...col('name', 'Назва', 'name', { span: 4 }), searchable: true },
        { ...col('slug', 'Slug', 'code', { span: 3 }), searchable: true },
        col('is_active', 'Активний', 'status-dot', { span: 2, filterable: true })
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER COLUMNS CONFIG
// ═══════════════════════════════════════════════════════════════════════════

function getFilterColumnsConfig() {
    return [
        { id: 'is_active', label: 'Активний', filterType: 'values', labelMap: { 'active': 'Активний', 'inactive': 'Неактивний' } }
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKBOX INIT (onAfterRender)
// ═══════════════════════════════════════════════════════════════════════════

let _checkboxHandler = null;

function initTableCheckboxes(container) {
    const selectAllCheckbox = container.querySelector('.select-all-checkbox');
    const rowCheckboxes = container.querySelectorAll('.row-checkbox');
    if (!selectAllCheckbox || rowCheckboxes.length === 0) return;

    const selectedSet = _state.selectedRows;
    const batchBarId = 'marketplaces';
    const batchBar = getBatchBar(batchBarId);

    // Отримати ID з DOM
    const pageIds = [...rowCheckboxes].map(cb => cb.dataset.rowId);

    // Відновити стан чекбоксів
    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = selectedSet.has(checkbox.dataset.rowId);
    });

    const updateSelectAllState = () => {
        const allSelected = pageIds.length > 0 && pageIds.every(id => selectedSet.has(id));
        const someSelected = pageIds.some(id => selectedSet.has(id));
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
    };

    updateSelectAllState();

    // Sync batch bar
    if (batchBar) {
        const batchSelected = new Set(batchBar.getSelected());
        selectedSet.forEach(id => { if (!batchSelected.has(id)) batchBar.selectItem(id); });
        batchSelected.forEach(id => { if (!selectedSet.has(id)) batchBar.deselectItem(id); });
    }

    // Event delegation
    if (_checkboxHandler) container.removeEventListener('change', _checkboxHandler);

    const delegationHandler = (e) => {
        const target = e.target;

        if (target.classList.contains('select-all-checkbox') && target.dataset.tab === 'marketplaces') {
            const currentBatchBar = getBatchBar(batchBarId);
            if (target.checked) {
                pageIds.forEach(id => selectedSet.add(id));
                container.querySelectorAll('.row-checkbox').forEach(cb => { cb.checked = true; });
                if (currentBatchBar) pageIds.forEach(id => currentBatchBar.selectItem(id));
            } else {
                pageIds.forEach(id => selectedSet.delete(id));
                container.querySelectorAll('.row-checkbox').forEach(cb => { cb.checked = false; });
                if (currentBatchBar) pageIds.forEach(id => currentBatchBar.deselectItem(id));
            }
            runHook('onRowSelect', Array.from(selectedSet));
            return;
        }

        if (target.classList.contains('row-checkbox') && target.dataset.tab === 'marketplaces') {
            const rowId = target.dataset.rowId;
            const currentBatchBar = getBatchBar(batchBarId);
            if (target.checked) {
                selectedSet.add(rowId);
                if (currentBatchBar) currentBatchBar.selectItem(rowId);
            } else {
                selectedSet.delete(rowId);
                if (currentBatchBar) currentBatchBar.deselectItem(rowId);
            }

            const allSelected = pageIds.length > 0 && pageIds.every(id => selectedSet.has(id));
            const someSelected = pageIds.some(id => selectedSet.has(id));
            const selectAll = container.querySelector('.select-all-checkbox');
            if (selectAll) {
                selectAll.checked = allSelected;
                selectAll.indeterminate = someSelected && !allSelected;
            }
            runHook('onRowSelect', Array.from(selectedSet));
        }
    };

    _checkboxHandler = delegationHandler;
    container.addEventListener('change', delegationHandler);
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

let _managedTable = null;
let _actionCleanup = null;

const marketplacesColumnTypes = {
    id: 'string',
    name: 'string',
    slug: 'string',
    is_active: 'string',
};

function createMarketplacesManagedTable(rawData) {
    const columns = getMarketplacesColumns();

    // Визначити видимі колонки зі state
    const stateVisible = _state.visibleColumns;
    if (stateVisible?.length > 0) {
        columns.forEach(c => { c.checked = stateVisible.includes(c.id); });
    }

    const mt = createManagedTable({
        container: 'marketplaces-table-container',
        columns: columns,
        data: rawData,
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: `<input type="checkbox" class="select-all-checkbox" data-tab="marketplaces">`,
            rowActions: (row) => `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="marketplaces">
                ${actionButton({ action: 'edit', rowId: row.id, context: 'marketplaces' })}
            `,
            getRowId: (row) => row.id,
            emptyState: { message: 'Маркетплейси відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(cont, 'marketplaces');
                initTableCheckboxes(cont);
            },
            plugins: {
                sorting: {
                    columnTypes: marketplacesColumnTypes,
                    initialSort: _state.sortState || null
                },
                filters: {
                    filterColumns: getFilterColumnsConfig(),
                    initialFilters: _state.columnFilters || null
                }
            }
        },
        dataTransform: transformMarketplaces,
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'marketplaces'
    });

    _managedTable = mt;
    return mt;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати managed table (при першому рендері після завантаження даних)
 */
export function initMarketplacesTable() {
    if (!_managedTable) {
        createMarketplacesManagedTable(getMarketplaces());
    }
}

/**
 * Рендерити таблицю (оновити дані)
 */
export function renderMarketplacesTable() {
    if (!_managedTable) {
        initMarketplacesTable();
        return;
    }
    _managedTable.updateData(getMarketplaces());
}

/**
 * Оновити тільки рядки (refilter)
 */
export function renderMarketplacesTableRowsOnly() {
    if (!_managedTable) {
        renderMarketplacesTable();
        return;
    }
    _managedTable.refilter();
}

/**
 * Скинути managed table API
 */
export function resetMarketplacesTableAPI() {
    if (_managedTable) {
        _managedTable.destroy();
        _managedTable = null;
    }
}

/**
 * Отримати managed table інстанцію
 */
export function getMarketplacesManagedTable() {
    return _managedTable || null;
}
