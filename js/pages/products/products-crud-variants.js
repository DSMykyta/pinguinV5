// js/pages/products/products-crud-variants.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ВАРІАНТИ                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція варіантів у модалі товару.
 * Вкладена таблиця: SKU, назва, ціна, штрихкод, вага, залишок.
 */

import { productsState } from './products-state.js';
import { getVariantsByProductId, addProductVariant, updateProductVariant, deleteProductVariant } from './variants-data.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _variantsManagedTable = null;
let _actionCleanup = null;
let _getCurrentProductId = null;

// Pending changes (draft manager pattern)
const pendingChanges = {
    added: [],
    updated: [],
    deleted: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати секцію варіантів
 * @param {Function} getProductIdFn - Функція для отримання поточного productId
 */
export function initVariantsSection(getProductIdFn) {
    _getCurrentProductId = getProductIdFn;

    const addBtn = document.getElementById('btn-add-product-variant');
    if (addBtn) {
        addBtn.onclick = () => showAddVariantModal();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('product-variants', {
    edit: (rowId) => showEditVariantModal(rowId),
    delete: (rowId) => handleDeleteVariant(rowId),
});

// ═══════════════════════════════════════════════════════════════════════════
// TABLE
// ═══════════════════════════════════════════════════════════════════════════

function getVariantColumns() {
    return [
        col('variant_id', 'ID', 'tag', { span: 1 }),
        col('sku', 'SKU', 'text', { span: 1 }),
        col('name_ua', 'Назва', 'name'),
        col('price', 'Ціна', 'text', { span: 1, align: 'right' }),
        col('stock', 'Залишок', 'text', { span: 1, align: 'right' }),
        col('status', 'Статус', 'status-dot'),
    ];
}

/**
 * Заповнити таблицю варіантів для товару
 * @param {string} productId
 */
export function populateProductVariants(productId) {
    const variants = getVariantsByProductId(productId);

    if (!_variantsManagedTable) {
        const container = document.getElementById('product-variants-container');
        if (!container) return;

        _variantsManagedTable = createManagedTable({
            container: 'product-variants-container',
            columns: getVariantColumns().map(c => ({
                ...c,
                searchable: ['variant_id', 'sku', 'name_ua'].includes(c.id),
                checked: true
            })),
            data: variants,
            statsId: null,
            paginationId: null,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: (row) => `
                    ${actionButton({ action: 'edit', rowId: row.variant_id, context: 'product-variants' })}
                    ${actionButton({ action: 'delete', rowId: row.variant_id, context: 'product-variants', icon: 'close' })}
                `,
                getRowId: (row) => row.variant_id,
                emptyState: { message: 'Варіанти відсутні' },
                withContainer: false,
                onAfterRender: (container) => {
                    if (_actionCleanup) _actionCleanup();
                    _actionCleanup = initActionHandlers(container, 'product-variants');
                },
                plugins: {
                    sorting: {
                        columnTypes: {
                            variant_id: 'id-text',
                            sku: 'string',
                            name_ua: 'string',
                            price: 'number',
                            stock: 'number',
                            status: 'string',
                        }
                    }
                }
            },
            preFilter: null,
            pageSize: null,
            checkboxPrefix: 'product-variants'
        });
    } else {
        _variantsManagedTable.updateData(variants);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT MODALS (inline — використовуємо modal-confirm як просту форму)
// ═══════════════════════════════════════════════════════════════════════════

async function showAddVariantModal() {
    const productId = _getCurrentProductId?.();
    if (!productId) {
        showToast('Спочатку збережіть товар', 'warning');
        return;
    }

    try {
        const variant = await addProductVariant({
            product_id: productId,
            name_ua: 'Новий варіант',
            status: 'active',
        });

        showToast('Варіант додано', 'success');
        populateProductVariants(productId);
    } catch (error) {
        showToast('Помилка додавання варіанту', 'error');
    }
}

async function showEditVariantModal(variantId) {
    // TODO: повноцінний модал редагування варіанту
    // Поки що — просте inline редагування через prompt
    const { getVariantById } = await import('./variants-data.js');
    const variant = getVariantById(variantId);
    if (!variant) return;

    showToast(`Редагування варіанту ${variant.name_ua} — в розробці`, 'info');
}

async function handleDeleteVariant(variantId) {
    const { getVariantById } = await import('./variants-data.js');
    const variant = getVariantById(variantId);
    if (!variant) return;

    const productId = _getCurrentProductId?.();

    try {
        await deleteProductVariant(variantId);
        showToast(`Варіант ${variant.name_ua} видалено`, 'info');
        if (productId) populateProductVariants(productId);
    } catch (error) {
        showToast('Помилка видалення варіанту', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING CHANGES (draft manager)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зберегти pending зміни варіантів
 */
export async function commitPendingVariantChanges() {
    // Поки що — прямі зміни без буферизації
    // Можна додати batch операції пізніше
}

/**
 * Відкинути pending зміни
 */
export function discardPendingVariantChanges() {
    pendingChanges.added = [];
    pendingChanges.updated = [];
    pendingChanges.deleted = [];

    if (_variantsManagedTable) {
        _variantsManagedTable.destroy();
        _variantsManagedTable = null;
    }
    if (_actionCleanup) {
        _actionCleanup();
        _actionCleanup = null;
    }
}
