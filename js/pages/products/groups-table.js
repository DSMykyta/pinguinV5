// js/pages/products/groups-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GROUPS - TABLE RENDERING (PAGE TAB)                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Таблиця груп товарів на вкладці "Групування".
 */

import { getProductGroups } from './groups-data.js';
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

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('groups-page', {
    edit: async (rowId) => {
        const { showEditGroupModal } = await import('./groups-crud.js');
        await showEditGroupModal(rowId);
    },
    delete: async (rowId) => {
        const { handleDeleteGroup } = await import('./groups-crud.js');
        await handleDeleteGroup(rowId);
    },
});

let _groupsPageManagedTable = null;
let _actionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

function getColumns() {
    return [
        col('group_id', 'ID', 'tag', { span: 2 }),
        col('products_list', 'Товари', 'text', { span: 8 }),
        col('products_count', 'Кількість', 'text', { span: 1, align: 'right' }),
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initGroupsPageTable() {
    const visibleCols = ['group_id', 'products_list', 'products_count'];
    const searchCols = ['group_id', 'products_list'];

    _groupsPageManagedTable = createManagedTable({
        container: 'groups-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getProductGroups(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => `
                ${actionButton({ action: 'edit', rowId: row.group_id, context: 'groups-page' })}
                ${actionButton({ action: 'delete', rowId: row.group_id, context: 'groups-page', icon: 'close' })}
            `,
            getRowId: (row) => row.group_id,
            emptyState: { message: 'Групи не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'groups-page');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        group_id: 'id-text',
                        products_list: 'string',
                        products_count: 'number',
                    }
                }
            }
        },
        dataTransform: (data) => {
            const products = getProducts();
            const productMap = {};
            products.forEach(p => {
                productMap[p.product_id] = p.generated_short_ua || p.name_ua || p.product_id;
            });

            return data.map(g => ({
                ...g,
                products_list: g.product_ids
                    .map(id => productMap[id] || id)
                    .join(', '),
                products_count: g.product_ids.length,
            }));
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'groups-page'
    });

    initColumnsCharm();

    // Кнопка додавання
    const addBtn = document.getElementById('btn-add-group');
    if (addBtn) addBtn.onclick = async () => {
        const { showAddGroupModal } = await import('./groups-crud.js');
        showAddGroupModal();
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

export function renderGroupsTable() {
    if (!_groupsPageManagedTable) {
        if (!document.getElementById('groups-table-container')) return;
        if (!window.isAuthorized) return;
        initGroupsPageTable();
        return;
    }
    _groupsPageManagedTable.updateData(getProductGroups());
}

export function resetGroupsTableAPI() {
    if (_groupsPageManagedTable) {
        _groupsPageManagedTable.destroy();
        _groupsPageManagedTable = null;
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
        if (productsState.activeTab === 'groups') renderGroupsTable();
    });
}
