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

import { getCharacteristics, getOptions } from '../../data/entities-data.js';
import { getProductById } from './products-data.js';
import { buildParentChildMap } from './products-crud-hierarchy.js';
import { parseSpecJson } from '../../utils/utils-json.js';
import { applyFilter } from './products-plugins.js';
/**
 * Утиліта: перетворити name_ua/name_ru (JSON або рядок) на текст для відображення.
 * Якщо це JSON об'єкт — бере Object.values() і з'єднує через ", ".
 * Якщо це звичайний рядок — повертає як є (зворотна сумісність).
 * @param {string} nameValue
 * @returns {string}
 */
export function displayName(nameValue) {
    if (!nameValue) return '';
    if (typeof nameValue === 'string') {
        const trimmed = nameValue.trim();
        if (trimmed.startsWith('{')) {
            try {
                const obj = JSON.parse(trimmed);
                return Object.values(obj).filter(Boolean).join(', ');
            } catch (e) { /* fallback */ }
        }
        return nameValue;
    }
    return String(nameValue);
}

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

    const obj_ua = {};
    const obj_ru = {};
    for (const [charId, value] of Object.entries(variantChars)) {
        if (!value) continue;
        if (parentCharIds.has(charId)) continue;

        const opt = allOptions.find(o => o.id === value);

        if (specUa[charId]) {
            obj_ua[charId] = specUa[charId];
        } else if (opt?.value_ua) {
            obj_ua[charId] = opt.value_ua;
        } else {
            obj_ua[charId] = value;
        }

        if (specRu[charId]) {
            obj_ru[charId] = specRu[charId];
        } else if (opt?.value_ru) {
            obj_ru[charId] = opt.value_ru;
        } else {
            obj_ru[charId] = value;
        }
    }
    return {
        ua: Object.keys(obj_ua).length ? JSON.stringify(obj_ua) : '',
        ru: Object.keys(obj_ru).length ? JSON.stringify(obj_ru) : ''
    };
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
    const obj_ua = {};
    const obj_ru = {};

    // Select characteristics — resolve option names + spec overrides
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
            obj_ua[charId] = specUa;
        } else {
            const opt = allOptions.find(o => o.id === val);
            if (opt?.value_ua) obj_ua[charId] = opt.value_ua;
        }

        if (specRu) {
            obj_ru[charId] = specRu;
        } else {
            const opt = allOptions.find(o => o.id === val);
            if (opt?.value_ru) obj_ru[charId] = opt.value_ru;
        }
    });

    // Bilingual text inputs (TextInput/TextArea) — UA and RU values
    container.querySelectorAll('input[data-vchar-id][data-vchar-lang="ua"]').forEach(input => {
        const charId = input.dataset.vcharId;
        const valUa = input.value.trim();
        if (!valUa) return;
        obj_ua[charId] = valUa;

        const ruInput = container.querySelector(`input[data-vchar-id="${charId}"][data-vchar-lang="ru"]`);
        obj_ru[charId] = ruInput?.value?.trim() || valUa;
    });

    // Non-bilingual inputs (Integer/Decimal) — same value for both langs
    container.querySelectorAll('input[data-vchar-id]:not([data-vchar-lang])').forEach(input => {
        const charId = input.dataset.vcharId;
        const val = input.value.trim();
        if (!val) return;
        obj_ua[charId] = val;
        obj_ru[charId] = val;
    });

    return {
        ua: Object.keys(obj_ua).length ? JSON.stringify(obj_ua) : '',
        ru: Object.keys(obj_ru).length ? JSON.stringify(obj_ru) : ''
    };
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
export function computeVariantGeneratedNames(productId, variantNameUa, variantNameRu, variantChars = {}, weight = '') {
    const product = getProductById(productId);
    if (!product) return { generated_short_ua: '', generated_short_ru: '', generated_full_ua: '', generated_full_ru: '' };

    // name_ua/ru може бути JSON — витягуємо текстове представлення
    const nameUaDisplay = displayName(variantNameUa);
    const nameRuDisplay = displayName(variantNameRu);

    const pShortUa = product.generated_short_ua || '';
    const pShortRu = product.generated_short_ru || '';
    const pFullUa = product.generated_full_ua || '';
    const pFullRu = product.generated_full_ru || '';

    const shortUa = nameUaDisplay ? (pShortUa ? `${pShortUa} - ${nameUaDisplay}` : nameUaDisplay) : pShortUa;
    const shortRu = nameRuDisplay ? (pShortRu ? `${pShortRu} - ${nameRuDisplay}` : nameRuDisplay) : pShortRu;
    const fullUa = nameUaDisplay ? (pFullUa ? `${pFullUa} - ${nameUaDisplay}` : nameUaDisplay) : pFullUa;
    const fullRu = nameRuDisplay ? (pFullRu ? `${pFullRu} - ${nameRuDisplay}` : nameRuDisplay) : pFullRu;

    const defaultNames = {
        generated_short_ua: shortUa,
        generated_short_ru: shortRu,
        generated_full_ua: fullUa,
        generated_full_ru: fullRu,
    };

    // Фільтр дозволяє плагінам перезаписати імена (наприклад, використавши вагу з variant_chars)
    return applyFilter('onComputeVariantNames', defaultNames, {
        product,
        variantChars,
        weight,
        nameUaDisplay,
        nameRuDisplay
    });
}