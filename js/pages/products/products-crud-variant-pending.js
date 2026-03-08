// js/pages/products/products-crud-variant-pending.js

/**
 * PRODUCTS CRUD — PENDING ВАРІАНТИ
 *
 * Дані + простий список для варіантів нового (ще не збереженого) товару.
 * Редагування — через стандартний variant-edit модал.
 * При створенні товару автоматично створюється 1 дефолтний варіант.
 * Видалити останній варіант не можна.
 */

import { addProductVariant } from './variants-data.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { resolveNameFromCharsAndSpecs, computeVariantGeneratedNames } from './products-crud-variant-names.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _pendingVariants = [];
let _pendingCounter = 0;

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
    if (_pendingVariants.length <= 1) {
        showToast('Потрібен хоча б один варіант', 'warning');
        return;
    }
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
// RENDER — простий список
// ═══════════════════════════════════════════════════════════════════════════

export function renderPendingList() {
    const container = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (!container) return;

    container.style.display = '';
    if (table) table.style.display = 'none';

    const canDelete = _pendingVariants.length > 1;

    let html = '<div class="content-bloc-container">';
    _pendingVariants.forEach((pv, i) => {
        const name = pv.name_ua || `Варіант ${i + 1}`;
        const isDefault = !pv.name_ua && !Object.keys(pv.variant_chars || {}).length;
        const hint = isDefault ? '<span class="label-s"> — базовий варіант (без смаку/розміру)</span>' : '';

        html += `
            <div class="content-bloc" data-pending-id="${pv._pendingId}">
                <div class="content-line">
                    <span class="body-s">${escapeHtml(name)}${hint}</span>
                    <button type="button" class="btn-icon ci-action" data-pending-edit="${pv._pendingId}" data-tooltip="Редагувати" data-tooltip-always>
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    ${canDelete
                        ? `<button type="button" class="btn-icon ci-action" data-pending-delete="${pv._pendingId}" data-tooltip="Видалити" data-tooltip-always><span class="material-symbols-outlined">close</span></button>`
                        : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;

    // Delete handlers (edit handled via event delegation in variants module)
    container.querySelectorAll('[data-pending-delete]').forEach(btn => {
        btn.addEventListener('click', () => removePendingVariant(btn.dataset.pendingDelete));
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT / DISCARD
// ═══════════════════════════════════════════════════════════════════════════

export async function commitPendingVariantChanges(productId, productData, populateProductVariants) {
    if (_pendingVariants.length === 0) return;

    for (const pv of _pendingVariants) {
        // Resolve name if not already set
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

    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
    if (table) table.style.display = '';

    if (populateProductVariants) populateProductVariants(productId);
}

export function discardPendingVariantChanges() {
    _pendingVariants = [];
    _pendingCounter = 0;

    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
}

// Backward compat stub
export function syncAccordionFormToState() {}
