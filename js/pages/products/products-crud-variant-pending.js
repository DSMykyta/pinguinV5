// js/pages/products/products-crud-variant-pending.js

/**
 * PRODUCTS CRUD — PENDING ВАРІАНТИ (КАРТКИ)
 *
 * Прості картки для створення варіантів нового товару.
 * Кожна картка = характеристики блоку 8 (з батьком + уточненням).
 * Ціна/вага/залишок — заповнюються потім через variant-edit модал.
 *
 * Commit до БД після створення товару.
 */

import { addProductVariant } from './variants-data.js';
import { showToast } from '../../components/feedback/toast.js';
import { renderPendingVariantCharacteristics } from './products-crud-variant-chars.js';
import { resolveNameFromCharsAndSpecs, computeVariantGeneratedNames } from './products-crud-variant-names.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _pendingVariants = [];
let _pendingCounter = 0;

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
        status: data.status || 'active',
        variant_chars: data.variant_chars || {},
        spec_ua: data.spec_ua || '',
        spec_ru: data.spec_ru || '',
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
    renderPendingAccordion();
}

/**
 * Отримати pending варіанти
 */
export function getPendingVariants() {
    return _pendingVariants;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER — прості картки
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити pending картки
 */
export function renderPendingAccordion() {
    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (!accordion) return;

    accordion.style.display = '';
    if (table) table.style.display = 'none';

    const canDelete = _pendingVariants.length > 1;

    let html = '<div class="content-bloc-container">';
    _pendingVariants.forEach((pv, i) => {
        html += `
            <div class="content-bloc" data-pending-id="${pv._pendingId}">
                <div class="content-line">
                    <span class="body-s">Варіант ${i + 1}</span>
                    ${canDelete
                        ? `<button type="button" class="btn-icon ci-action" data-pending-delete="${pv._pendingId}" data-tooltip="Видалити" data-tooltip-always><span class="material-symbols-outlined">close</span></button>`
                        : ''}
                </div>
                <div id="${pv._pendingId}-chars-container"></div>
            </div>
        `;
    });
    html += '</div>';
    accordion.innerHTML = html;

    // Delete handlers
    accordion.querySelectorAll('[data-pending-delete]').forEach(btn => {
        btn.addEventListener('click', () => removePendingVariant(btn.dataset.pendingDelete));
    });

    // Render characteristics (block 8)
    const categoryId = document.getElementById('product-category')?.value;
    if (categoryId) renderPendingVariantCharacteristics(categoryId, _pendingVariants);
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC — зчитати дані з DOM → state
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Синхронізувати дані з карток → state
 */
export function syncAccordionFormToState() {
    for (const pv of _pendingVariants) {
        const container = document.getElementById(`${pv._pendingId}-chars-container`);
        if (!container) continue;

        // Variant chars
        const chars = {};
        container.querySelectorAll('select[data-vchar-id]').forEach(s => {
            if (s.value) chars[s.dataset.vcharId] = s.value;
        });
        container.querySelectorAll('input[data-vchar-id]').forEach(i => {
            if (i.dataset.vcharLang === 'ru') return;
            if (i.value.trim()) chars[i.dataset.vcharId] = i.value.trim();
        });
        pv.variant_chars = chars;

        // Specs (уточнення)
        const specUa = {}, specRu = {};
        container.querySelectorAll('input[data-spec-char-id]').forEach(i => {
            const val = i.value.trim();
            if (!val) return;
            if (i.dataset.specLang === 'ua') specUa[i.dataset.specCharId] = val;
            else if (i.dataset.specLang === 'ru') specRu[i.dataset.specCharId] = val;
        });
        pv.spec_ua = Object.keys(specUa).length ? JSON.stringify(specUa) : '';
        pv.spec_ru = Object.keys(specRu).length ? JSON.stringify(specRu) : '';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT / DISCARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зберегти pending варіанти до БД (після створення товару)
 */
export async function commitPendingVariantChanges(productId, productData, populateProductVariants) {
    syncAccordionFormToState();
    if (_pendingVariants.length === 0) return;

    for (const pv of _pendingVariants) {
        const resolved = resolveNameFromCharsAndSpecs(pv.variant_chars, pv.spec_ua, pv.spec_ru);
        const genNames = computeVariantGeneratedNames(productId, resolved.ua, resolved.ru);

        await addProductVariant({
            product_id: productId,
            name_ua: resolved.ua,
            name_ru: resolved.ru,
            ...genNames,
            variant_chars: pv.variant_chars || {},
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

/**
 * Відкинути pending зміни
 */
export function discardPendingVariantChanges() {
    _pendingVariants = [];
    _pendingCounter = 0;

    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
}
