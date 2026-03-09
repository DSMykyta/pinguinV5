// js/pages/products/groups-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GROUPS - CRUD OPERATIONS                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — CRUD операції для груп товарів (створення, редагування, видалення).
 *
 * Модал:
 * ├── Switcher в хедері: Ознака / Деталь / Варіант (product_type)
 * ├── Інпут зі списком ID (можна вписати вручну)
 * ├── Custom select для вибору товарів (додає в інпут + список)
 * ├── Draggable список товарів (порядок = порядок в product_ids)
 * └── Footer: зберегти + закрити (поки не натиснути — нічого не зберігається)
 */

import { getProductGroups, addProductGroup, updateProductGroup, deleteProductGroup } from './groups-data.js';
import { getProducts } from './products-data.js';
import { showModal, closeModal, showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { populateSelect } from '../../components/forms/select.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _currentGroupId = null;
let _groupProductIds = [];
let _groupProductType = 'label';

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT TYPE LABELS
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_LABELS = {
    label: 'Ознака',
    detail: 'Деталь',
    variant: 'Варіант'
};

export function getTypeLabel(type) {
    return TYPE_LABELS[type] || type;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOW MODALS
// ═══════════════════════════════════════════════════════════════════════════

export async function showAddGroupModal() {
    _currentGroupId = null;
    _groupProductIds = [];
    _groupProductType = 'label';

    await showModal('group-edit', null);

    const title = document.getElementById('group-modal-title');
    if (title) title.textContent = 'Нова група';

    setTypeSwitch(_groupProductType);
    syncProductsInput();
    populateProductSelect();
    renderGroupProductsList();
    initModalHandlers();
}

export async function showEditGroupModal(groupId) {
    const group = getProductGroups().find(g => g.group_id === groupId);
    if (!group) {
        showToast('Групу не знайдено', 'error');
        return;
    }

    _currentGroupId = groupId;
    _groupProductIds = [...group.product_ids];
    _groupProductType = group.product_type || 'label';

    await showModal('group-edit', null);

    const title = document.getElementById('group-modal-title');
    if (title) title.textContent = `Група ${groupId}`;

    setTypeSwitch(_groupProductType);
    syncProductsInput();
    populateProductSelect();
    renderGroupProductsList();
    initModalHandlers();
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE SWITCH
// ═══════════════════════════════════════════════════════════════════════════

function setTypeSwitch(type) {
    const radio = document.getElementById(`group-type-${type}`);
    if (radio) radio.checked = true;
}

function getTypeSwitch() {
    const checked = document.querySelector('#group-type-switch input[name="group-type"]:checked');
    return checked?.value || 'label';
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS INPUT (група 1 — текстовий інпут зі списком ID)
// ═══════════════════════════════════════════════════════════════════════════

function syncProductsInput() {
    const input = document.getElementById('group-products-input');
    if (input) input.value = _groupProductIds.join(', ');
}

function initProductsInputHandler() {
    const input = document.getElementById('group-products-input');
    if (!input) return;

    input.addEventListener('change', () => {
        const raw = input.value;
        const ids = raw.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Deduplicate
        const unique = [...new Set(ids)];
        _groupProductIds = unique;

        syncProductsInput();
        populateProductSelect();
        renderGroupProductsList();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM SELECT — PRODUCT PICKER (група 2)
// ═══════════════════════════════════════════════════════════════════════════

function populateProductSelect() {
    const products = getProducts();
    const items = products
        .filter(p => !_groupProductIds.includes(p.product_id))
        .map(p => ({
            value: p.product_id,
            text: p.generated_short_ua || p.name_ua || p.product_id
        }));

    populateSelect('group-product-select', items, {
        placeholder: '— Оберіть товар —',
        reinit: true
    });
}

function initProductSelectHandler() {
    const selectEl = document.getElementById('group-product-select');
    if (!selectEl) return;

    selectEl.addEventListener('change', () => {
        const val = selectEl.value;
        if (!val || _groupProductIds.includes(val)) return;

        _groupProductIds.push(val);
        syncProductsInput();
        renderGroupProductsList();
        populateProductSelect();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP PRODUCTS LIST — DRAGGABLE (група 3)
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

    container.innerHTML = _groupProductIds.map((id, index) => {
        const p = productMap[id];
        const name = p ? escapeHtml(p.generated_short_ua || p.name_ua || id) : escapeHtml(id);

        return `
            <div class="content-bloc" data-group-product-id="${escapeHtml(id)}" data-group-index="${index}">
                <div class="content-line main">
                    <button class="btn-icon ghost drag" tabindex="-1">
                        <span class="material-symbols-outlined">expand_all</span>
                    </button>
                    <div class="content-line-info">
                        <span class="content-line-name">${name}</span>
                        <span class="content-line-label">${escapeHtml(id)}</span>
                    </div>
                    <button type="button" class="btn-icon ci-remove" data-remove-product="${escapeHtml(id)}" data-tooltip="Прибрати">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Remove handlers
    container.querySelectorAll('[data-remove-product]').forEach(btn => {
        btn.onclick = () => {
            const removeId = btn.dataset.removeProduct;
            _groupProductIds = _groupProductIds.filter(id => id !== removeId);
            syncProductsInput();
            renderGroupProductsList();
            populateProductSelect();
        };
    });

    // Sortable.js для drag reorder (handle: .btn-icon.drag)
    if (typeof Sortable !== 'undefined') {
        new Sortable(container, {
            handle: '.btn-icon.drag',
            animation: 150,
            onEnd: () => {
                const newOrder = [];
                container.querySelectorAll('[data-group-product-id]').forEach(el => {
                    newOrder.push(el.dataset.groupProductId);
                });
                _groupProductIds = newOrder;
                syncProductsInput();
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function initModalHandlers() {
    initProductsInputHandler();
    initProductSelectHandler();

    const saveBtn = document.getElementById('btn-save-group');
    if (saveBtn) saveBtn.onclick = () => handleSaveGroup();
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE / DELETE
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveGroup() {
    if (_groupProductIds.length < 2) {
        showToast('Група повинна мати мінімум 2 товари', 'warning');
        return;
    }

    const productType = getTypeSwitch();

    try {
        if (_currentGroupId) {
            await updateProductGroup(_currentGroupId, productType, _groupProductIds);
            showToast('Групу оновлено', 'success');
        } else {
            await addProductGroup(productType, _groupProductIds);
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
