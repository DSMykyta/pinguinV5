// js/pages/products/products-crud-variant-pending.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — PENDING ВАРІАНТИ (ACCORDION)                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Система pending варіантів для нового товару (ще не збереженого).
 * Managed table з expandable рядками, inline save,
 * commit до БД після створення товару.
 */

import { addProductVariant } from './variants-data.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { initCustomSelects } from '../../components/forms/select.js';
import {
    buildExpandContent,
    onVariantExpand,
    readRowFormValues,
    getVariantColumns,
    renderPendingVariantCharacteristics,
    parseSpecJson
} from './products-crud-variant-chars.js';
import { resolveNameFromCharsAndSpecs, computeVariantGeneratedNames, displayName } from './products-crud-variant-names.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _pendingVariants = [];
let _pendingCounter = 0;
let _pendingManagedTable = null;
let _pendingActionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Додати pending варіант
 */
export function addPendingVariant(data) {
    _pendingCounter++;
    _pendingVariants.push({
        _pendingId: `pending-${_pendingCounter}`,
        article: data.article || '',
        barcode: data.barcode || '',
        price: data.price || '',
        old_price: data.old_price || '',
        weight: data.weight || '',
        stock: data.stock || '',
        name_ua: data.name_ua || '',
        status: data.status || 'active',
        variant_chars: data.variant_chars || {},
    });
}

/**
 * Видалити pending варіант
 */
export function removePendingVariant(pendingId) {
    if (_pendingVariants.length <= 1) {
        showToast('Потрібен хоча б один варіант', 'warning');
        return;
    }
    syncAccordionFormToState();
    _pendingVariants = _pendingVariants.filter(v => v._pendingId !== pendingId);

    if (_pendingManagedTable && _pendingVariants.length > 0) {
        const productName = _getProductDisplayName();
        _pendingManagedTable.updateData(_pendingVariants.map(pv => ({
            ...pv,
            product_name: productName,
            variant_display: displayName(pv.name_ua) || '',
        })));
    } else {
        renderPendingAccordion();
    }
}

/**
 * Отримати pending варіанти
 */
export function getPendingVariants() {
    return _pendingVariants;
}

/**
 * Синхронізувати дані з форм accordion → state
 */
export function syncAccordionFormToState() {
    const accordion = document.getElementById('product-variants-accordion');
    if (!accordion) return;
    for (const pv of _pendingVariants) {
        const row = accordion.querySelector(`.pseudo-table-row[data-row-id="${pv._pendingId}"]`);
        if (!row) continue;
        _syncSingleRowToState(row, pv);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCORDION RENDERING (managed table + expandable)
// ═══════════════════════════════════════════════════════════════════════════

function _getProductDisplayName() {
    const shortUa = document.getElementById('product-short-name-ua');
    return shortUa?.value?.trim() || '';
}

/**
 * Рендерити pending accordion (managed table)
 */
export function renderPendingAccordion() {
    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (!accordion) return;

    // Show accordion, hide table
    accordion.style.display = '';
    if (table) table.style.display = 'none';

    const productName = _getProductDisplayName();

    const tableData = _pendingVariants.map(pv => ({
        ...pv,
        product_name: productName,
        variant_display: displayName(pv.name_ua) || '',
    }));

    if (_pendingManagedTable) {
        _pendingManagedTable.updateData(tableData);
    } else {
        _pendingManagedTable = createManagedTable({
            container: 'product-variants-accordion',
            columns: getVariantColumns(col).map(c => ({
                ...c,
                searchable: false,
                checked: true,
            })),
            data: tableData,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: (row) => actionButton({ action: 'delete', rowId: row._pendingId }),
                getRowId: (row) => row._pendingId,
                emptyState: { message: 'Додайте варіант' },
                withContainer: false,
                onAfterRender: (cont) => {
                    if (_pendingActionCleanup) _pendingActionCleanup();
                    _pendingActionCleanup = initActionHandlers(cont, 'product-variants');
                },
                plugins: {
                    expandable: {
                        renderContent: (row) => buildExpandContent(row),
                        onExpand: (rowEl, row) => onVariantExpand(rowEl, row),
                        onSave: (rowEl, row) => _onPendingVariantSave(rowEl, row),
                    }
                }
            },
            pageSize: null,
            checkboxPrefix: 'product-variants'
        });
    }

    // Auto-expand first row if only one variant
    if (_pendingVariants.length === 1) {
        const firstRow = accordion.querySelector('.pseudo-table-row');
        const expandBtn = firstRow?.querySelector('[data-action="expand-edit"]');
        if (expandBtn) expandBtn.click();
    }

    // Render characteristics for pending variants if category is selected
    const categoryId = document.getElementById('product-category')?.value;
    if (categoryId) renderPendingVariantCharacteristics(categoryId, _pendingVariants);
}

function _onPendingVariantSave(rowEl, row) {
    const pv = _pendingVariants.find(v => v._pendingId === row._pendingId);
    if (pv) _syncSingleRowToState(rowEl, pv);
    showToast('Дані варіанту збережено', 'info');
}

function _syncSingleRowToState(row, pv) {
    const formData = readRowFormValues(row);
    Object.assign(pv, formData);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT / DISCARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зберегти pending варіанти до БД (після створення товару)
 * @param {string} productId
 * @param {Object} productData - дані товару (для status fallback)
 * @param {Function} populateProductVariants - callback для оновлення таблиці
 */
export async function commitPendingVariantChanges(productId, productData, populateProductVariants) {
    syncAccordionFormToState();
    if (_pendingVariants.length === 0) return;

    for (const pv of _pendingVariants) {
        // Resolve variant name from chars + per-char specs
        const resolved = resolveNameFromCharsAndSpecs(pv.variant_chars, pv.spec_ua, pv.spec_ru);
        const genNames = computeVariantGeneratedNames(productId, resolved.ua, resolved.ru);

        await addProductVariant({
            product_id: productId,
            name_ua: resolved.ua,
            name_ru: resolved.ru,
            ...genNames,
            article: pv.article || '',
            barcode: pv.barcode || '',
            price: pv.price || '',
            old_price: pv.old_price || '',
            weight: pv.weight || '',
            stock: pv.stock || '',
            variant_chars: pv.variant_chars || {},
            status: pv.status || productData?.status || 'active',
        });
    }

    _pendingVariants = [];
    _pendingCounter = 0;

    // Destroy pending managed table
    if (_pendingManagedTable) {
        _pendingManagedTable.destroy?.();
        _pendingManagedTable = null;
    }
    if (_pendingActionCleanup) {
        _pendingActionCleanup();
        _pendingActionCleanup = null;
    }

    // Hide accordion, show table
    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
    if (table) table.style.display = '';

    if (populateProductVariants) populateProductVariants(productId);
}

/**
 * Відкинути pending зміни (cleanup)
 */
export function discardPendingVariantChanges() {
    _pendingVariants = [];
    _pendingCounter = 0;

    if (_pendingManagedTable) {
        _pendingManagedTable.destroy?.();
        _pendingManagedTable = null;
    }
    if (_pendingActionCleanup) {
        _pendingActionCleanup();
        _pendingActionCleanup = null;
    }

    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
}
