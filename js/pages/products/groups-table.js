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
import { createBatchActionsBar } from '../../components/actions/actions-batch.js';
import { getTypeLabel } from './groups-crud.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('groups-page', {
    edit: async (rowId) => {
        const { showEditGroupModal } = await import('./groups-crud.js');
        await showEditGroupModal(rowId);
    },
});

let _groupsPageManagedTable = null;
let _groupsBatchBar = null;
let _actionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

function getColumns() {
    return [
        col('group_id', 'ID', 'tag', { span: 2 }),
        col('products_list', 'Товари', 'text', { span: 6 }),
        col('product_type_label', 'Тип', 'tag', { span: 2 }),
        col('products_count', 'Кількість', 'binding-chip', { span: 1 }),
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initGroupsPageTable() {
    const visibleCols = ['group_id', 'products_list', 'product_type_label', 'products_count'];
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
                        product_type_label: 'string',
                        products_count: 'binding-chip',
                    }
                },
                checkboxes: {
                    batchBar: () => _groupsBatchBar
                }
            }
        },
        dataTransform: (data) => {
            const products = getProducts();
            const productMap = {};
            products.forEach(p => {
                productMap[p.product_id] = p.generated_short_ua || p.name_ua || p.product_id;
            });

            return data.map(g => {
                const productNames = g.product_ids.map(id => productMap[id] || id);
                return {
                    ...g,
                    products_list: g.name || productNames.join(', '),
                    product_type_label: getTypeLabel(g.product_type),
                    products_count: {
                        count: g.product_ids.length,
                        tooltip: productNames.join('\n')
                    }
                };
            });
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'groups-page'
    });

    // Batch actions bar
    _groupsBatchBar = createBatchActionsBar({
        tabId: 'groups-page',
        actions: [
            {
                id: 'delete',
                label: 'Видалити',
                icon: 'delete',
                dangerous: true,
                handler: async (selectedIds) => {
                    const { deleteProductGroup } = await import('./groups-data.js');
                    const { showToast } = await import('../../components/feedback/toast.js');
                    const { showConfirmModal } = await import('../../components/modal/modal-main.js');
                    const confirmed = await showConfirmModal({ action: 'видалити', entity: `${selectedIds.length} груп(у)` });
                    if (!confirmed) return;
                    try {
                        for (const id of selectedIds) {
                            await deleteProductGroup(id);
                        }
                        _groupsBatchBar.deselectAll();
                        renderGroupsTable();
                        showToast(`Видалено ${selectedIds.length} груп(у)`, 'success');
                    } catch (error) {
                        console.error('Batch delete error:', error);
                        showToast('Помилка видалення', 'error');
                    }
                }
            }
        ]
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
