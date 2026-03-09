// js/pages/products/products-crud-variant-pending.js

/**
 * PRODUCTS CRUD — PENDING ВАРІАНТИ
 *
 * In-memory дані для варіантів нового (ще не збереженого) товару.
 * Рендеринг — через ту саму managed table в products-crud-variants.js.
 * Редагування — inline (expandable) або через variant-edit модал.
 */

import { addProductVariant } from './variants-data.js';
import { resolveNameFromCharsAndSpecs, computeVariantGeneratedNames, displayName } from './products-crud-variant-names.js';

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
    _pendingVariants = _pendingVariants.filter(v => v._pendingId !== pendingId);
}

export function getPendingVariantById(pendingId) {
    return _pendingVariants.find(v => v._pendingId === pendingId) || null;
}

export function getPendingVariants() {
    return _pendingVariants;
}

/**
 * Перетворити pending варіанти в формат для managed table
 */
export function getPendingTableData() {
    return _pendingVariants.map((pv) => {
        const resolvedName = displayName(pv.name_ua);
        return {
            ...pv,
            variant_id: pv._pendingId,
            variant_display: resolvedName || '',
            product_name: '',
        };
    });
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
        const genNames = computeVariantGeneratedNames(productId, resolved.ua, resolved.ru, pv.variant_chars, pv.weight);

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

    if (populateProductVariants) populateProductVariants(productId);
}

export function discardPendingVariantChanges() {
    _pendingVariants = [];
    _pendingCounter = 0;
}

// Backward compat stub
export function syncAccordionFormToState() {}
