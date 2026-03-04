// js/pages/products/groups-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GROUPS - CRUD OPERATIONS                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — CRUD операції для груп товарів (створення, редагування, видалення).
 */

import { getProductGroups, addProductGroup, updateProductGroup, deleteProductGroup } from './groups-data.js';
import { getProducts } from './products-data.js';
import { showModal, closeModal, showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../_utils/text-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _currentGroupId = null;
let _groupProductIds = [];

// ═══════════════════════════════════════════════════════════════════════════
// SHOW MODALS
// ═══════════════════════════════════════════════════════════════════════════

export async function showAddGroupModal() {
    _currentGroupId = null;
    _groupProductIds = [];

    await showModal('group-edit', null);

    const title = document.getElementById('group-modal-title');
    if (title) title.textContent = 'Нова група';

    renderGroupProductsList();
    initGroupSearch();
    initGroupSaveHandler();
}

export async function showEditGroupModal(groupId) {
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
// GROUP PRODUCTS LIST
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

        const { renderGroupsTable } = await import('./groups-table.js');
        renderGroupsTable();
        closeModal();
    } catch (error) {
        console.error('Помилка збереження групи:', error);
        showToast('Помилка збереження групи', 'error');
    }
}

export async function handleDeleteGroup(groupId) {
    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'групу',
        name: groupId,
    });
    if (!confirmed) return;

    try {
        await deleteProductGroup(groupId);
        showToast(`Групу ${groupId} видалено`, 'success');
        const { renderGroupsTable } = await import('./groups-table.js');
        renderGroupsTable();
    } catch (error) {
        showToast('Помилка видалення групи', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) { }
