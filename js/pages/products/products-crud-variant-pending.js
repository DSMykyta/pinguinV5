// js/pages/products/products-crud-variant-pending.js

/**
 * PRODUCTS CRUD — PENDING ВАРІАНТИ
 *
 * Дані + managed table для варіантів нового (ще не збереженого) товару.
 * Та сама таблиця що й для існуючих варіантів (expandable, checkboxes).
 * Редагування — inline або через variant-edit модал.
 * Варіанти додаються вручну через кнопку "+".
 */

import { addProductVariant } from './variants-data.js';
import { showToast } from '../../components/feedback/toast.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { registerActionHandlers, initActionHandlers } from '../../components/actions/actions-main.js';
import { resolveNameFromCharsAndSpecs, computeVariantGeneratedNames, displayName } from './products-crud-variant-names.js';
import { getVariantColumns, buildExpandContent, onVariantExpand, readRowFormValues, renderPendingVariantCharacteristics } from './products-crud-variant-chars.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _pendingVariants = [];
let _pendingCounter = 0;
let _pendingManagedTable = null;
let _pendingActionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// DATA API
// ═══════════════════════════════════════════════════════════════════════════

export function addPendingVariant(data) {
    _pendingCounter++;
    const pv = {
        _pendingId: `pending-${_pendingCounter}`,
        status: data.status || 'active',
        variant_chars: data.variant_chars || {},
        spec_ua: data.spec_ua || '',
        spec_ru: data.spec_ru || '',
        name_ua: data.name_ua || '',
        name_ru: data.name_ru || '',
        article: data.article || '',
        price: data.price || '',
        old_price: data.old_price || '',
        barcode: data.barcode || '',
        weight: data.weight || '',
        stock: data.stock || '',
        image_url: data.image_url || '',
        composition_code_ua: data.composition_code_ua || '',
        composition_code_ru: data.composition_code_ru || '',
        composition_notes_ua: data.composition_notes_ua || '',
        composition_notes_ru: data.composition_notes_ru || '',
        product_text_ua: data.product_text_ua || '',
        product_text_ru: data.product_text_ru || '',
    };
    _pendingVariants.push(pv);
    return pv;
}

export function updatePendingVariant(pendingId, data) {
    const pv = _pendingVariants.find(v => v._pendingId === pendingId);
    if (!pv) return;
    Object.assign(pv, data);
}

export function removePendingVariant(pendingId) {
    _pendingVariants = _pendingVariants.filter(v => v._pendingId !== pendingId);
    renderPendingList();
}

export function getPendingVariantById(pendingId) {
    return _pendingVariants.find(v => v._pendingId === pendingId) || null;
}

export function getPendingVariants() {
    return _pendingVariants;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('pending-variants', {
    edit: (rowId) => {
        document.dispatchEvent(new CustomEvent('pending-variant-edit', { detail: { pendingId: rowId } }));
    },
    delete: (rowId) => removePendingVariant(rowId),
});

// ═══════════════════════════════════════════════════════════════════════════
// RENDER — managed table (та сама структура що й для існуючих варіантів)
// ═══════════════════════════════════════════════════════════════════════════

function _buildTableData() {
    return _pendingVariants.map((pv, i) => {
        const resolvedName = displayName(pv.name_ua);
        return {
            ...pv,
            variant_id: pv._pendingId,
            variant_display: resolvedName || `Варіант ${i + 1}`,
            product_name: '',
        };
    });
}

export function renderPendingList() {
    const container = document.getElementById('product-variants-accordion');
    const existingTable = document.getElementById('product-variants-container');
    if (!container) return;

    container.style.display = '';
    if (existingTable) existingTable.style.display = 'none';

    const tableData = _buildTableData();

    if (_pendingManagedTable) {
        _pendingManagedTable.updateData(tableData);
    } else {
        _pendingManagedTable = createManagedTable({
            container: 'product-variants-accordion',
            columns: getVariantColumns(col).map(c => ({
                ...c,
                searchable: false,
                checked: !['product_name', 'variant_id', 'article', 'image_url'].includes(c.id),
            })),
            data: tableData,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: () => '',
                getRowId: (row) => row.variant_id,
                emptyState: { message: 'Додайте варіант' },
                withContainer: false,
                onAfterRender: (cont) => {
                    if (_pendingActionCleanup) _pendingActionCleanup();
                    _pendingActionCleanup = initActionHandlers(cont, 'pending-variants');
                },
                plugins: {
                    checkboxes: {},
                    expandable: {
                        renderContent: (row) => buildExpandContent(row),
                        onExpand: async (rowEl, row) => {
                            onVariantExpand(rowEl, row);
                            const categoryId = document.getElementById('product-category')?.value || '';
                            if (categoryId) {
                                await renderPendingVariantCharacteristics(categoryId, [row]);
                            }
                        },
                        onSave: (rowEl) => _handlePendingRowSave(rowEl),
                        onOpenFull: (_rowEl, row) => {
                            document.dispatchEvent(new CustomEvent('pending-variant-edit', { detail: { pendingId: row.variant_id } }));
                        },
                    }
                }
            },
            pageSize: null,
            checkboxPrefix: 'pending-variants',
        });
    }
}

function _handlePendingRowSave(rowEl) {
    const pendingId = rowEl.dataset.rowId;
    if (!pendingId) return;

    const formData = readRowFormValues(rowEl);

    // Resolve variant name
    const resolved = resolveNameFromCharsAndSpecs(formData.variant_chars, formData.spec_ua, formData.spec_ru);
    formData.name_ua = resolved.ua;
    formData.name_ru = resolved.ru;

    updatePendingVariant(pendingId, formData);
    renderPendingList();
    showToast('Варіант оновлено', 'success');
}

export function destroyPendingTable() {
    if (_pendingManagedTable) {
        _pendingManagedTable.destroy();
        _pendingManagedTable = null;
    }
    if (_pendingActionCleanup) {
        _pendingActionCleanup();
        _pendingActionCleanup = null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT / DISCARD
// ═══════════════════════════════════════════════════════════════════════════

export async function commitPendingVariantChanges(productId, productData, populateProductVariants) {
    if (_pendingVariants.length === 0) return;

    for (const pv of _pendingVariants) {
        const resolved = pv.name_ua
            ? { ua: pv.name_ua, ru: pv.name_ru }
            : resolveNameFromCharsAndSpecs(pv.variant_chars, pv.spec_ua, pv.spec_ru);
        const genNames = computeVariantGeneratedNames(productId, resolved.ua, resolved.ru, pv.variant_chars);

        await addProductVariant({
            product_id: productId,
            name_ua: resolved.ua,
            name_ru: resolved.ru,
            ...genNames,
            article: pv.article || '',
            barcode: pv.barcode || '',
            price: pv.price || '',
            old_price: pv.old_price || '',
            weight: pv.variant_chars?.['char-000022'] || pv.weight || '',
            stock: pv.stock || '',
            variant_chars: pv.variant_chars || {},
            image_url: pv.image_url || '',
            composition_code_ua: pv.composition_code_ua || '',
            composition_code_ru: pv.composition_code_ru || '',
            composition_notes_ua: pv.composition_notes_ua || '',
            composition_notes_ru: pv.composition_notes_ru || '',
            product_text_ua: pv.product_text_ua || '',
            product_text_ru: pv.product_text_ru || '',
            status: pv.status || productData?.status || 'active',
        });
    }

    _pendingVariants = [];
    _pendingCounter = 0;
    destroyPendingTable();

    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
    if (table) table.style.display = '';

    if (populateProductVariants) populateProductVariants(productId);
}

export function discardPendingVariantChanges() {
    _pendingVariants = [];
    _pendingCounter = 0;
    destroyPendingTable();

    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
}

// Backward compat stub
export function syncAccordionFormToState() {}
