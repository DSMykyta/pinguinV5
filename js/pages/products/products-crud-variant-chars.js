// js/pages/products/products-crud-variant-chars.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — ХАРАКТЕРИСТИКИ ВАРІАНТУ (БЛОК 8)                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендер характеристик блоку 8 (Варіант) у модалі та expandable таблиці.
 * Companion spec fields (уточнення) — per-char текстове поле.
 * Збір даних характеристик і spec значень з DOM.
 * Рендер полів варіанту для expandable рядків (артикул, ціна, вага тощо).
 */

import { getProductById } from './products-data.js';
import { getCharacteristics, getOptions, loadCharacteristics, loadOptions } from '../mapper/mapper-data-own.js';
import { escapeHtml } from '../../_utils/text-utils.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { buildParentChildMap, initParentChildListeners, filterChildOptions } from './products-crud-hierarchy.js';

// ═══════════════════════════════════════════════════════════════════════════
// SPEC JSON PARSER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse spec JSON — backward-compatible with legacy single string
 * @returns {Object} { char_id: "value", ... }
 */
export function parseSpecJson(raw) {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* not JSON */ }
    return {};
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER VARIANT CHARACTERISTICS (block 8)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити характеристики блоку 8 (Варіант) для варіанту
 * @param {string} productId - ID товару (для отримання category_id)
 * @param {Object} savedValues - Збережені значення { char_id: value }
 * @param {Object} variantData - Повні дані варіанту (для spec_ua/spec_ru)
 */
export async function renderVariantCharacteristics(productId, savedValues, variantData) {
    const container = document.getElementById('variant-characteristics-container');
    if (!container) return;

    const product = getProductById(productId);
    const categoryId = product?.category_id;

    if (!categoryId) {
        container.innerHTML = '';
        return;
    }

    let chars = getCharacteristics();
    if (chars.length === 0) {
        await loadCharacteristics();
        chars = getCharacteristics();
    }

    let options = getOptions();
    if (options.length === 0) {
        await loadOptions();
        options = getOptions();
    }

    // Фільтр: тільки блок 8 + відповідна категорія
    const block8Chars = chars.filter(c => {
        if (c.block_number !== '8') return false;
        if (c.is_global === 'TRUE' || c.is_global === true) return true;
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });

    if (block8Chars.length === 0) {
        container.innerHTML = '';
        return;
    }

    block8Chars.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));

    let html = `
        <div class="grid">
            <div class="group column col-12">
            </div>
    `;

    // Build parent-child map для ієрархічних опцій
    const parentChildMap = buildParentChildMap(block8Chars, options);

    // Parse spec JSON from name_ua/name_ru (which now stores JSON {charId: "value"})
    // Fallback to legacy spec_ua/spec_ru for backward compatibility
    const enrichedVariantData = {
        ...variantData,
        _parsedSpecUa: parseSpecJson(variantData?.name_ua) || parseSpecJson(variantData?.spec_ua),
        _parsedSpecRu: parseSpecJson(variantData?.name_ru) || parseSpecJson(variantData?.spec_ru)
    };

    block8Chars.forEach(c => {
        const charOptions = options.filter(o => o.characteristic_id === c.id);
        charOptions.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
        const savedVal = savedValues[c.id] || '';
        const colSize = c.col_size || '4';
        html += renderVariantCharField(c, charOptions, savedVal, colSize, parentChildMap, options, enrichedVariantData);
    });

    html += '</div>';
    container.innerHTML = html;

    initCustomSelects(container);

    // Event delegation: авто-заповнення батька + каскадний фільтр
    if (parentChildMap.size > 0) {
        initParentChildListeners(container, 'data-vchar-id');

        // Застосувати початковий фільтр для збережених значень
        for (const [childCharId, parentCharId] of parentChildMap) {
            const parentSelect = container.querySelector(`select[data-vchar-id="${parentCharId}"]`);
            if (parentSelect?.value) {
                const childSelect = container.querySelector(`select[data-vchar-id="${childCharId}"]`);
                if (childSelect) filterChildOptions(childSelect, parentSelect.value);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER VARIANT CHAR FIELD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити поле характеристики варіанту
 */
function renderVariantCharField(char, options, savedValue, colSize, parentChildMap, allOptions, variantData) {
    const id = `variant-char-${char.id}`;
    const label = escapeHtml(char.name_ua || char.id);
    const hint = char.hint ? `<label class="label-s">${escapeHtml(char.hint)}</label>` : '';
    const unit = char.unit ? `<span class="tag c-tertiary">${escapeHtml(char.unit)}</span>` : '';

    let fieldHtml = '';

    switch (char.type) {
        case 'ComboBox':
        case 'Select': {
            const parentCharId = parentChildMap?.get(char.id);
            if (parentCharId) {
                // Child char → optgroup по батьківським опціям
                const parentCharOptions = (allOptions || []).filter(o => o.characteristic_id === parentCharId);
                const parentOptById = new Map(parentCharOptions.map(o => [o.id, o]));

                const groups = new Map();
                const ungrouped = [];
                options.forEach(o => {
                    if (o.parent_option_id && parentOptById.has(o.parent_option_id)) {
                        if (!groups.has(o.parent_option_id)) {
                            const parentOpt = parentOptById.get(o.parent_option_id);
                            groups.set(o.parent_option_id, { label: parentOpt.value_ua || o.parent_option_id, options: [] });
                        }
                        groups.get(o.parent_option_id).options.push(o);
                    } else {
                        ungrouped.push(o);
                    }
                });

                let selectInner = `<option value="">— Оберіть —</option>`;
                ungrouped.forEach(o => {
                    selectInner += `<option value="${escapeHtml(o.id)}" ${savedValue === o.id ? 'selected' : ''}>${escapeHtml(o.value_ua || o.id)}</option>`;
                });
                for (const [parentOptId, group] of groups) {
                    selectInner += `<optgroup label="${escapeHtml(group.label)}">`;
                    group.options.forEach(o => {
                        selectInner += `<option value="${escapeHtml(o.id)}" data-parent-option-id="${escapeHtml(parentOptId)}" ${savedValue === o.id ? 'selected' : ''}>${escapeHtml(o.value_ua || o.id)}</option>`;
                    });
                    selectInner += `</optgroup>`;
                }

                fieldHtml = `
                    <select id="${id}" data-custom-select data-vchar-id="${char.id}" data-parent-char-id="${escapeHtml(parentCharId)}">
                        ${selectInner}
                    </select>
                `;
            } else {
                // Перевіряємо чи цей char є батьком інших
                const childCharIds = [];
                if (parentChildMap) {
                    for (const [childId, pId] of parentChildMap) {
                        if (pId === char.id) childCharIds.push(childId);
                    }
                }
                const parentOfAttr = childCharIds.length > 0
                    ? ` data-parent-of="${childCharIds.join(',')}"` : '';

                fieldHtml = `
                    <select id="${id}" data-custom-select data-vchar-id="${char.id}"${parentOfAttr}>
                        <option value="">— Оберіть —</option>
                        ${options.map(o => `<option value="${escapeHtml(o.id)}" ${savedValue === o.id ? 'selected' : ''}>${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                    </select>
                `;
            }
            break;
        }

        case 'List':
        case 'ListValues':
            fieldHtml = `
                <select id="${id}" data-custom-select data-vchar-id="${char.id}">
                    <option value="">— Оберіть —</option>
                    ${options.map(o => `<option value="${escapeHtml(o.id)}" ${savedValue === o.id ? 'selected' : ''}>${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                </select>
            `;
            break;

        case 'Integer':
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="number" step="1" id="${id}" data-vchar-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'Decimal':
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="number" step="0.01" id="${id}" data-vchar-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'TextInput':
        case 'MultiText':
        default:
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="text" id="${id}" data-vchar-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;
    }

    // Companion spec field — уточнення (не для батьківських характеристик)
    const isParentChar = parentChildMap && [...parentChildMap.values()].includes(char.id);

    const specUaObj = variantData?._parsedSpecUa || {};
    const specRuObj = variantData?._parsedSpecRu || {};
    const specUaVal = specUaObj[char.id] || '';
    const specRuVal = specRuObj[char.id] || '';

    const companionHtml = isParentChar ? '' : `
        <div class="group column col-4" data-spec-for="${char.id}">
            <label class="label-l">Уточнення ${label}</label>
            <div class="content-bloc-container">
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="text" data-spec-char-id="${char.id}" data-spec-lang="ua"
                                value="${escapeHtml(specUaVal)}"
                                placeholder="Уточнення українською">
                            <span class="tag c-secondary">UA</span>
                        </div>
                    </div>
                </div>
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="text" data-spec-char-id="${char.id}" data-spec-lang="ru"
                                value="${escapeHtml(specRuVal)}"
                                placeholder="Уточнення російською">
                            <span class="tag c-secondary">RU</span>
                        </div>
                    </div>
                </div>
            </div>
            <label class="label-s">Якщо порожнє — використовується обрана опція</label>
        </div>
    `;

    return `
        <div class="group column col-${colSize}">
            <label for="${id}" class="label-l">${label}</label>
            ${fieldHtml}
            ${hint}
        </div>
        ${companionHtml}
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET DATA FROM DOM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зібрати spec values з per-char inputs → JSON string
 */
export function getSpecFieldValue(lang) {
    const container = document.getElementById('variant-characteristics-container');
    if (!container) return '';
    const specs = {};
    container.querySelectorAll(`input[data-spec-lang="${lang}"]`).forEach(input => {
        const charId = input.dataset.specCharId;
        const val = input.value.trim();
        if (charId && val) specs[charId] = val;
    });
    return Object.keys(specs).length > 0 ? JSON.stringify(specs) : '';
}

/**
 * Зібрати дані характеристик варіанту
 * @returns {Object} { char_id: value }
 */
export function getVariantCharsData() {
    const container = document.getElementById('variant-characteristics-container');
    if (!container) return {};

    const data = {};

    // Text / number inputs
    container.querySelectorAll('input[data-vchar-id]').forEach(input => {
        const charId = input.dataset.vcharId;
        const val = input.value.trim();
        if (val) data[charId] = val;
    });

    // Selects
    container.querySelectorAll('select[data-vchar-id]').forEach(select => {
        const charId = select.dataset.vcharId;
        const val = select.value;
        if (val) data[charId] = val;
    });

    return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANDABLE ROW — VARIANT FIELDS HTML
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Побудувати HTML полів варіанту для expandable рядка
 * @param {string} pid - row ID (variant_id або _pendingId)
 * @param {Object} pv - дані варіанту
 */
export function buildVariantFieldsHTML(pid, pv) {
    return `
        <div class="group column col-4">
            <label for="${pid}-article" class="label-l">Артикул</label>
            <div class="content-bloc"><div class="content-line"><div class="input-box">
                <input type="text" id="${pid}-article" data-field="article" placeholder="Артикул" value="${escapeHtml(pv.article || '')}">
            </div></div></div>
        </div>
        <div class="group column col-4">
            <label for="${pid}-barcode" class="label-l">Штрихкод</label>
            <div class="content-bloc"><div class="content-line"><div class="input-box">
                <input type="text" id="${pid}-barcode" data-field="barcode" placeholder="Barcode" value="${escapeHtml(pv.barcode || '')}">
            </div></div></div>
        </div>
        <div class="group column col-4">
            <label for="${pid}-price" class="label-l">Ціна</label>
            <div class="content-bloc"><div class="content-line"><div class="input-box">
                <input type="number" step="0.01" id="${pid}-price" data-field="price" placeholder="0.00" value="${escapeHtml(pv.price || '')}">
                <span class="tag c-tertiary">UAH</span>
            </div></div></div>
        </div>
        <div class="group column col-4">
            <label for="${pid}-old_price" class="label-l">Стара ціна</label>
            <div class="content-bloc"><div class="content-line"><div class="input-box">
                <input type="number" step="0.01" id="${pid}-old_price" data-field="old_price" placeholder="0.00" value="${escapeHtml(pv.old_price || '')}">
                <span class="tag c-tertiary">UAH</span>
            </div></div></div>
        </div>
        <div class="group column col-4">
            <label for="${pid}-weight" class="label-l">Вага</label>
            <div class="content-bloc"><div class="content-line"><div class="input-box">
                <input type="text" id="${pid}-weight" data-field="weight" placeholder="Вага" value="${escapeHtml(pv.weight || '')}">
                <span class="tag c-tertiary">г</span>
            </div></div></div>
        </div>
        <div class="group column col-4">
            <label for="${pid}-stock" class="label-l">Залишок</label>
            <div class="content-bloc"><div class="content-line"><div class="input-box">
                <input type="number" step="1" id="${pid}-stock" data-field="stock" placeholder="0" value="${escapeHtml(pv.stock || '')}">
                <span class="tag c-tertiary">шт</span>
            </div></div></div>
        </div>
    `;
}

/**
 * Побудувати HTML expandable контенту для рядка варіанту
 */
export function buildExpandContent(row) {
    const id = row.variant_id || row._pendingId;
    return `
        <div class="grid" style="padding: 12px 16px;">
            ${buildVariantFieldsHTML(id, row)}
        </div>
        <div class="separator-h"></div>
        <div id="${id}-chars-container" style="padding: 0 16px 12px;"></div>
    `;
}

/**
 * Callback при розкритті expandable рядка — ініціалізація custom selects
 */
export function onVariantExpand(rowEl, row) {
    const id = row.variant_id || row._pendingId;
    const charsContainer = document.getElementById(`${id}-chars-container`);
    if (charsContainer) {
        initCustomSelects(charsContainer);
    }
}

/**
 * Зчитати значення полів з expandable рядка
 * @param {HTMLElement} row - DOM елемент рядка
 * @returns {Object} дані форми
 */
export function readRowFormValues(row) {
    const data = {};
    row.querySelectorAll('[data-field]').forEach(el => {
        data[el.dataset.field] = el.value.trim();
    });
    const rowId = row.dataset.rowId;
    const charsContainer = document.getElementById(`${rowId}-chars-container`);
    if (charsContainer) {
        const chars = {};
        charsContainer.querySelectorAll('input[data-vchar-id]').forEach(input => {
            if (input.value.trim()) chars[input.dataset.vcharId] = input.value.trim();
        });
        charsContainer.querySelectorAll('select[data-vchar-id]').forEach(select => {
            if (select.value) chars[select.dataset.vcharId] = select.value;
        });
        data.variant_chars = chars;
        // Per-char specs → JSON
        const specUa = {};
        const specRu = {};
        charsContainer.querySelectorAll('input[data-spec-char-id]').forEach(input => {
            const charId = input.dataset.specCharId;
            const lang = input.dataset.specLang;
            const val = input.value.trim();
            if (charId && val) {
                if (lang === 'ua') specUa[charId] = val;
                else if (lang === 'ru') specRu[charId] = val;
            }
        });
        if (Object.keys(specUa).length > 0) data.spec_ua = JSON.stringify(specUa);
        if (Object.keys(specRu).length > 0) data.spec_ru = JSON.stringify(specRu);
    }
    return data;
}

/**
 * Отримати визначення колонок таблиці варіантів
 */
export function getVariantColumns(col) {
    return [
        col('variant_id', 'ID', 'tag', { span: 1 }),
        col('article', 'Артикул', 'text', { span: 1 }),
        col('product_name', 'Товар', 'text', { span: 1 }),
        col('variant_display', 'Варіант', 'name', { span: 1 }),
        col('price', 'Ціна', 'tag', { span: 1, color: 'c-secondary' }),
        col('old_price', 'Стара ціна', 'tag', { span: 1, color: 'c-secondary' }),
        col('stock', 'Кількість', 'tag', { span: 1, color: 'c-tertiary' }),
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER CHARS FOR EXISTING / PENDING VARIANTS (expandable rows)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити характеристики варіантів (block 8) для pending accordion items
 * @param {string} categoryId
 * @param {Array} pendingVariants - масив pending варіантів
 */
export async function renderPendingVariantCharacteristics(categoryId, pendingVariants) {
    if (!categoryId || pendingVariants.length === 0) return;

    let chars = getCharacteristics();
    if (chars.length === 0) { await loadCharacteristics(); chars = getCharacteristics(); }
    let options = getOptions();
    if (options.length === 0) { await loadOptions(); options = getOptions(); }

    const block8Chars = chars.filter(c => {
        if (c.block_number !== '8') return false;
        if (c.is_global === 'TRUE' || c.is_global === true) return true;
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });

    block8Chars.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
    const parentChildMap = buildParentChildMap(block8Chars, options);

    for (const pv of pendingVariants) {
        const container = document.getElementById(`${pv._pendingId}-chars-container`);
        if (!container) continue;

        if (block8Chars.length === 0) { container.innerHTML = ''; continue; }

        const enrichedPv = { ...pv, _parsedSpecUa: parseSpecJson(pv.spec_ua), _parsedSpecRu: parseSpecJson(pv.spec_ru) };
        let html = '<label class="label-l">Характеристики варіанту</label><div class="grid">';
        block8Chars.forEach(c => {
            const charOptions = options.filter(o => o.characteristic_id === c.id);
            charOptions.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
            const savedVal = (pv.variant_chars || {})[c.id] || '';
            const colSize = c.col_size || '4';
            html += renderVariantCharField(c, charOptions, savedVal, colSize, parentChildMap, options, enrichedPv);
        });
        html += '</div>';
        container.innerHTML = html;

        initCustomSelects(container);
        if (parentChildMap.size > 0) {
            initParentChildListeners(container, 'data-vchar-id');
        }
    }
}

/**
 * Рендерити характеристики блоку 8 для existing варіантів
 * @param {string} categoryId
 * @param {Array} variants
 */
export async function renderExistingVariantCharacteristics(categoryId, variants) {
    let chars = getCharacteristics();
    if (chars.length === 0) { await loadCharacteristics(); chars = getCharacteristics(); }
    let options = getOptions();
    if (options.length === 0) { await loadOptions(); options = getOptions(); }

    const block8Chars = chars.filter(c => {
        if (c.block_number !== '8') return false;
        if (c.is_global === 'TRUE' || c.is_global === true) return true;
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });

    block8Chars.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
    const parentChildMap = buildParentChildMap(block8Chars, options);

    for (const v of variants) {
        const container = document.getElementById(`${v.variant_id}-chars-container`);
        if (!container) continue;

        if (block8Chars.length === 0) { container.innerHTML = ''; continue; }

        const enrichedV = { ...v, _parsedSpecUa: parseSpecJson(v.spec_ua), _parsedSpecRu: parseSpecJson(v.spec_ru) };
        let html = '<div class="grid">';
        block8Chars.forEach(c => {
            const charOptions = options.filter(o => o.characteristic_id === c.id);
            charOptions.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
            const savedVal = (v.variant_chars || {})[c.id] || '';
            const colSize = c.col_size || '4';
            html += renderVariantCharField(c, charOptions, savedVal, colSize, parentChildMap, options, enrichedV);
        });
        html += '</div>';
        container.innerHTML = html;

        initCustomSelects(container);
        if (parentChildMap.size > 0) {
            initParentChildListeners(container, 'data-vchar-id');
        }
    }
}
