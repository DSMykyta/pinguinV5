// js/pages/products/groups-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GROUPS - TABLE RENDERING (PAGE TAB)                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Таблиця груп товарів на вкладці "Групування".
 */

import { getProductGroups, addProductGroup, updateProductGroup, deleteProductGroup } from './groups-data.js';
import { getProducts } from './products-data.js';
import { productsState } from './products-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { showModal, closeModal, showConfirmModal } from '../../components/modal/modal-main.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../utils/text-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('groups-page', {
    edit: (rowId) => showEditGroupModal(rowId),
    delete: (rowId) => handleDeleteGroup(rowId),
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
    if (addBtn) addBtn.onclick = () => showAddGroupModal();
}

// ═══════════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════════

let _currentGroupId = null;
let _groupProductIds = [];

async function showAddGroupModal() {
    _currentGroupId = null;
    _groupProductIds = [];

    await showModal('group-edit', null);

    const title = document.getElementById('group-modal-title');
    if (title) title.textContent = 'Нова група';

    renderGroupProductsList();
    initGroupSearch();
    initGroupSaveHandler();
}

async function showEditGroupModal(groupId) {
    const group = getProductGroups().find(g => g.group_id === groupId);
    if (!group) {
        showToast('Групу не знайдено', 'error');
        return;
    }

    _currentGroupId = groupId;
    _groupProductIds = [...group.product_ids];

    await showModal('group-edit', null);

    const title = document.getElementById('group-modal-title');
    if (title) title.textContent = `Група ${groupId}`;

    renderGroupProductsList();
    initGroupSearch();
    initGroupSaveHandler();
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP PRODUCTS LIST (renders product cards with remove button)
// ═══════════════════════════════════════════════════════════════════════════

function renderGroupProductsList() {
    const container = document.getElementById('group-products-list');
    if (!container) return;

    const products = getProducts();
    const productMap = {};
    products.forEach(p => { productMap[p.product_id] = p; });

    if (_groupProductIds.length === 0) {
        container.innerHTML = '<span class="body-s">Товари ще не додані</span>';
        return;
    }

    container.innerHTML = _groupProductIds.map(id => {
        const p = productMap[id];
        const name = p ? escapeHtml(p.generated_short_ua || p.name_ua || id) : escapeHtml(id);
        const variation = p?.variation_ua ? ` <span class="tag c-tertiary">${escapeHtml(p.variation_ua)}</span>` : '';

        return `
            <div class="content-bloc" data-group-product-id="${escapeHtml(id)}">
                <div class="content-line">
                    <div class="input-box">
                        <span class="body-s">${name}</span>
                        ${variation}
                    </div>
                    <button type="button" class="btn-icon ci-action danger" data-remove-product="${escapeHtml(id)}" aria-label="Прибрати">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Remove listeners
    container.querySelectorAll('[data-remove-product]').forEach(btn => {
        btn.onclick = () => {
            const removeId = btn.dataset.removeProduct;
            _groupProductIds = _groupProductIds.filter(id => id !== removeId);
            renderGroupProductsList();
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH / ADD PRODUCT
// ═══════════════════════════════════════════════════════════════════════════

function initGroupSearch() {
    const input = document.getElementById('group-product-search');
    const suggestions = document.getElementById('group-product-suggestions');
    const addBtn = document.getElementById('btn-add-product-to-group');
    if (!input || !suggestions) return;

    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = input.value.trim().toLowerCase();
            if (query.length < 2) {
                suggestions.innerHTML = '';
                return;
            }
            renderSuggestions(query, suggestions);
        }, 200);
    });

    // Додати по кнопці (якщо ввели prod-XXXXXX)
    if (addBtn) {
        addBtn.onclick = () => {
            const val = input.value.trim();
            if (val.startsWith('prod-') && !_groupProductIds.includes(val)) {
                _groupProductIds.push(val);
                input.value = '';
                suggestions.innerHTML = '';
                renderGroupProductsList();
            }
        };
    }
}

function renderSuggestions(query, container) {
    const products = getProducts();
    const matches = products.filter(p => {
        if (_groupProductIds.includes(p.product_id)) return false;
        const name = (p.generated_short_ua || p.name_ua || '').toLowerCase();
        const id = p.product_id.toLowerCase();
        return name.includes(query) || id.includes(query);
    }).slice(0, 8);

    if (matches.length === 0) {
        container.innerHTML = '<span class="body-s">Нічого не знайдено</span>';
        return;
    }

    container.innerHTML = matches.map(p => {
        const name = escapeHtml(p.generated_short_ua || p.name_ua || p.product_id);
        const variation = p.variation_ua ? ` <span class="tag c-tertiary">${escapeHtml(p.variation_ua)}</span>` : '';

        return `
            <div class="content-line" data-suggestion-id="${escapeHtml(p.product_id)}">
                <div class="input-box">
                    <span class="tag c-secondary">${escapeHtml(p.product_id)}</span>
                    <span class="body-s">${name}</span>
                    ${variation}
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('[data-suggestion-id]').forEach(el => {
        el.onclick = () => {
            const id = el.dataset.suggestionId;
            if (!_groupProductIds.includes(id)) {
                _groupProductIds.push(id);
                renderGroupProductsList();
            }
            const input = document.getElementById('group-product-search');
            if (input) input.value = '';
            container.innerHTML = '';
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE / DELETE
// ═══════════════════════════════════════════════════════════════════════════

function initGroupSaveHandler() {
    const saveBtn = document.getElementById('btn-save-group');
    if (saveBtn) saveBtn.onclick = () => handleSaveGroup();
}

async function handleSaveGroup() {
    if (_groupProductIds.length < 2) {
        showToast('Група повинна мати мінімум 2 товари', 'warning');
        return;
    }

    try {
        if (_currentGroupId) {
            await updateProductGroup(_currentGroupId, _groupProductIds);
            showToast('Групу оновлено', 'success');
        } else {
            await addProductGroup(_groupProductIds);
            showToast('Групу створено', 'success');
        }

        renderGroupsTable();
        closeModal();
    } catch (error) {
        console.error('Помилка збереження групи:', error);
        showToast('Помилка збереження групи', 'error');
    }
}

async function handleDeleteGroup(groupId) {
    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'групу',
        name: groupId,
    });
    if (!confirmed) return;

    try {
        await deleteProductGroup(groupId);
        showToast(`Групу ${groupId} видалено`, 'success');
        renderGroupsTable();
    } catch (error) {
        showToast('Помилка видалення групи', 'error');
    }
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
