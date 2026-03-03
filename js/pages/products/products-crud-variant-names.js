// js/pages/products/products-crud-variant-names.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — РЕЗОЛВІНГ НАЗВ ВАРІАНТІВ                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Формування назв варіантів з характеристик блоку 8.
 * spec/уточнення має пріоритет над назвою опції.
 * Батьківські характеристики виключаються з назви.
 */

import { getCharacteristics, getOptions } from '../mapper/mapper-data-own.js';
import { getProductById } from './products-data.js';
import { buildParentChildMap } from './products-crud-hierarchy.js';
import { parseSpecJson } from './products-crud-variant-chars.js';

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVE FROM DATA (без DOM)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Резолвить ім'я варіанту з variant_chars + spec JSON (без DOM).
 * spec per-char має пріоритет над option name. Parent chars пропускаються.
 * @param {Object} variantChars - { charId: optionId }
 * @param {string} [specUaJson] - JSON string { charId: "value" }
 * @param {string} [specRuJson] - JSON string { charId: "value" }
 * @returns {{ ua: string, ru: string }}
 */
export function resolveNameFromCharsAndSpecs(variantChars, specUaJson, specRuJson) {
    if (!variantChars || typeof variantChars !== 'object') return { ua: '', ru: '' };
    const allOptions = getOptions();
    const allChars = getCharacteristics();
    const parentChildMap = buildParentChildMap(allChars, allOptions);
    const parentCharIds = new Set(parentChildMap.values());
    const specUa = parseSpecJson(specUaJson);
    const specRu = parseSpecJson(specRuJson);

    const parts_ua = [];
    const parts_ru = [];
    for (const [charId, optionId] of Object.entries(variantChars)) {
        if (!optionId) continue;
        if (parentCharIds.has(charId)) continue;

        if (specUa[charId]) {
            parts_ua.push(specUa[charId]);
        } else {
            const opt = allOptions.find(o => o.id === optionId);
            if (opt?.value_ua) parts_ua.push(opt.value_ua);
        }

        if (specRu[charId]) {
            parts_ru.push(specRu[charId]);
        } else {
            const opt = allOptions.find(o => o.id === optionId);
            if (opt?.value_ru) parts_ru.push(opt.value_ru);
        }
    }
    return { ua: parts_ua.join(', '), ru: parts_ru.join(', ') };
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVE FROM DOM (модал варіанту)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Резолвити назву варіанту з DOM (модал variant-edit)
 * @returns {{ ua: string, ru: string }}
 */
export function resolveVariantName() {
    const container = document.getElementById('variant-characteristics-container');
    if (!container) return { ua: '', ru: '' };

    const allOptions = getOptions();
    const parts_ua = [];
    const parts_ru = [];

    container.querySelectorAll('select[data-vchar-id]').forEach(select => {
        // Skip parent characteristics — they don't form variant name
        if (select.dataset.parentOf) return;

        const charId = select.dataset.vcharId;
        const val = select.value;
        if (!val) return;

        // Per-char spec takes priority over option name
        const specUaInput = container.querySelector(`input[data-spec-char-id="${charId}"][data-spec-lang="ua"]`);
        const specRuInput = container.querySelector(`input[data-spec-char-id="${charId}"][data-spec-lang="ru"]`);
        const specUa = specUaInput?.value?.trim();
        const specRu = specRuInput?.value?.trim();

        if (specUa) {
            parts_ua.push(specUa);
        } else {
            const opt = allOptions.find(o => o.id === val);
            if (opt?.value_ua) parts_ua.push(opt.value_ua);
        }

        if (specRu) {
            parts_ru.push(specRu);
        } else {
            const opt = allOptions.find(o => o.id === val);
            if (opt?.value_ru) parts_ru.push(opt.value_ru);
        }
    });

    return { ua: parts_ua.join(', '), ru: parts_ru.join(', ') };
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATED NAMES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обчислити згенеровані назви для варіанту
 * Використовує дані товару (generated_short/full) + назву самого варіанту
 * @param {string} productId
 * @param {string} variantNameUa
 * @param {string} variantNameRu
 */
export function computeVariantGeneratedNames(productId, variantNameUa, variantNameRu) {
    const product = getProductById(productId);
    if (!product) return { generated_short_ua: '', generated_short_ru: '', generated_full_ua: '', generated_full_ru: '' };

    const pShortUa = product.generated_short_ua || '';
    const pShortRu = product.generated_short_ru || '';
    const pFullUa = product.generated_full_ua || '';
    const pFullRu = product.generated_full_ru || '';

    const shortUa = variantNameUa ? (pShortUa ? `${pShortUa} - ${variantNameUa}` : variantNameUa) : pShortUa;
    const shortRu = variantNameRu ? (pShortRu ? `${pShortRu} - ${variantNameRu}` : variantNameRu) : pShortRu;
    const fullUa = variantNameUa ? (pFullUa ? `${pFullUa} - ${variantNameUa}` : variantNameUa) : pFullUa;
    const fullRu = variantNameRu ? (pFullRu ? `${pFullRu} - ${variantNameRu}` : variantNameRu) : pFullRu;

    return {
        generated_short_ua: shortUa,
        generated_short_ru: shortRu,
        generated_full_ua: fullUa,
        generated_full_ru: fullRu,
    };
}
