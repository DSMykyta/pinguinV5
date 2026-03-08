// js/pages/products/products-crud-characteristics.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ХАРАКТЕРИСТИКИ                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція характеристик у модалі товару.
 * Завантажує характеристики з маппера за обраною категорією,
 * групує по block_number, рендерить КОЖЕН блок як окрему <section>.
 *
 * Типи полів (з маппера):
 *   ComboBox         → select (1 значення)
 *   List / ListValues→ switches (кілька значень зі списку)
 *   CheckBoxGroup    → switches (кілька значень з набору)
 *   CheckBoxGroupValues → switches (кілька значень з набору)
 *   Checkbox         → switch Так/Ні
 *   Integer          → input[number] step=1
 *   Decimal          → input[number] step=0.01
 *   TextInput        → input[text]
 *   MultiText        → input[text]
 *   TextArea         → textarea
 */

import { getCharacteristics, loadCharacteristics, getOptions, loadOptions } from '../mapper/mapper-data-own.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { buildParentChildMap, initParentChildListeners } from './products-crud-hierarchy.js';

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK NAMES (з маппера — mapper-characteristic-edit.html:128-139)
// ═══════════════════════════════════════════════════════════════════════════

export const BLOCK_NAMES = {
    '1': 'Скільки цього?',
    '2': 'Яке Це?',
    '3': 'Кому це?',
    '4': 'Навіщо це?',
    '5': 'Звідки це?',
    '6': 'Куди це?',
    '8': 'Варіант',
    '9': 'Інше',
};

const BLOCK_ICONS = {
    '1': 'scale',
    '2': 'category',
    '3': 'group',
    '4': 'target',
    '5': 'public',
    '6': 'local_shipping',
    '9': 'more_horiz',
};

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити характеристики для обраної категорії.
 * Кожен блок = окрема <section id="section-product-block-{N}">
 *
 * @param {string} categoryId - ID категорії
 * @param {Object} savedValues - Збережені значення характеристик { char_id: value }
 * @returns {string[]} Масив номерів блоків що були відрендерені (для sidebar nav)
 */
export async function renderCharacteristicsForCategory(categoryId, savedValues = {}) {
    const container = document.getElementById('product-characteristics-sections');
    const emptyState = document.getElementById('product-characteristics-empty');
    if (!container) return [];

    if (!categoryId) {
        container.innerHTML = '';
        if (emptyState) {
            emptyState.innerHTML = renderAvatarState('empty', {
                message: 'Оберіть категорію для відображення характеристик',
                size: 'medium',
                containerClass: 'empty-state',
                avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message',
                showMessage: true
            });
            emptyState.classList.remove('u-hidden');
        }
        return [];
    }

    // Завантажити дані якщо ще не завантажені
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

    // Фільтрувати характеристики за категорією (або глобальні)
    const relevant = chars.filter(c => {
        if (c.is_global === 'TRUE' || c.is_global === true) return true;
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });

    if (relevant.length === 0) {
        container.innerHTML = '';
        if (emptyState) {
            emptyState.innerHTML = renderAvatarState('empty', {
                message: 'Немає характеристик для цієї категорії',
                size: 'medium',
                containerClass: 'empty-state',
                avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message',
                showMessage: true
            });
            emptyState.classList.remove('u-hidden');
        }
        return [];
    }

    if (emptyState) emptyState.classList.add('u-hidden');

    // Сортувати і згрупувати по block_number
    relevant.sort((a, b) => {
        const blockDiff = (parseInt(a.block_number) || 99) - (parseInt(b.block_number) || 99);
        if (blockDiff !== 0) return blockDiff;
        return (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0);
    });

    const blocks = {};
    relevant.forEach(c => {
        // Блок 8 (Варіант) — пропускаємо, це для variant_chars
        if (c.block_number === '8') return;

        const blockNum = c.block_number || '9';
        if (!blocks[blockNum]) blocks[blockNum] = [];
        blocks[blockNum].push(c);
    });

    // Build parent-child map для ієрархічних опцій
    const parentChildMap = buildParentChildMap(relevant, options);

    // Рендер — кожен блок як окрема <section>
    let html = '';
    const renderedBlocks = [];

    Object.keys(blocks).sort((a, b) => parseInt(a) - parseInt(b)).forEach(blockNum => {
        const blockChars = blocks[blockNum];
        const blockName = BLOCK_NAMES[blockNum] || `Блок ${blockNum}`;
        renderedBlocks.push(blockNum);

        html += `
            <section id="section-product-block-${blockNum}">
                <div class="section-header">
                    <div class="section-name-block">
                        <div class="section-name">
                            <h2 class="section-upper">${escapeHtml(blockName)}</h2>
                        </div>
                    </div>
                </div>
                <div class="section-content">
                    <div class="grid">
        `;

        blockChars.forEach(c => {
            const charOptions = options.filter(o => o.characteristic_id === c.id);
            charOptions.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));

            const savedVal = savedValues[c.id] || '';
            const colSize = c.col_size || '4';

            html += renderCharField(c, charOptions, savedVal, colSize, parentChildMap, options);
        });

        html += `
                    </div>
                </div>
            </section>
        `;
    });

    container.innerHTML = html;

    // Ініціалізувати custom selects
    initCustomSelects(container);

    // Event delegation: авто-заповнення батька + каскадний фільтр
    if (parentChildMap.size > 0) {
        initParentChildListeners(container);
    }

    return renderedBlocks;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD RENDERING — ALL 9 TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити поле характеристики за типом
 */
function renderCharField(char, options, savedValue, colSize, parentChildMap, allOptions) {
    const id = `product-char-${char.id}`;
    const label = escapeHtml(char.name_ua || char.id);
    const hint = char.hint ? `<label class="label-s">${escapeHtml(char.hint)}</label>` : '';
    const unit = char.unit ? `<span class="tag c-tertiary">${escapeHtml(char.unit)}</span>` : '';

    let fieldHtml = '';

    switch (char.type) {
        // ── ComboBox — одне значення зі списку ──────────────────────────
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
                    <select id="${id}" data-custom-select data-char-id="${char.id}" data-parent-char-id="${escapeHtml(parentCharId)}">
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
                    <select id="${id}" data-custom-select data-char-id="${char.id}"${parentOfAttr}>
                        <option value="">— Оберіть —</option>
                        ${options.map(o => `<option value="${escapeHtml(o.id)}" ${savedValue === o.id ? 'selected' : ''}>${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                    </select>
                `;
            }
            break;
        }

        // ── List / ListValues — мультиселект (кілька значень зі списку) ──
        case 'List':
        case 'ListValues': {
            const savedArr = parseSavedArray(savedValue);
            fieldHtml = `
                <select id="${id}" multiple data-custom-select data-char-id="${char.id}">
                    ${options.map(o => `<option value="${escapeHtml(o.id)}" ${savedArr.includes(o.id) ? 'selected' : ''}>${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                </select>
            `;
            break;
        }

        // ── CheckBoxGroup / CheckBoxGroupValues — switches ─────────────
        case 'CheckBoxGroup':
        case 'CheckBoxGroupValues': {
            const savedArr = parseSavedArray(savedValue);
            fieldHtml = `<div class="group column" data-char-id="${char.id}" data-char-type="checkboxgroup">`;
            options.forEach(o => {
                const optId = `${id}-opt-${o.id}`;
                const isChecked = savedArr.includes(o.id);
                fieldHtml += `
                    <div class="switch switch-fit">
                        <input type="radio" id="${optId}-no" name="${optId}" value="" ${!isChecked ? 'checked' : ''}>
                        <label for="${optId}-no" class="switch-label">Ні</label>
                        <input type="radio" id="${optId}-yes" name="${optId}" value="${escapeHtml(o.id)}" ${isChecked ? 'checked' : ''}>
                        <label for="${optId}-yes" class="switch-label">${escapeHtml(o.value_ua || o.id)}</label>
                    </div>
                `;
            });
            fieldHtml += `</div>`;
            break;
        }

        // ── Checkbox (bool — Так/Ні) ────────────────────────────────────
        case 'Checkbox':
            fieldHtml = `
                <div class="switch switch-fit" data-char-id="${char.id}">
                    <input type="radio" id="${id}-no" name="${id}" value="" ${!savedValue ? 'checked' : ''}>
                    <label for="${id}-no" class="switch-label">Ні</label>
                    <input type="radio" id="${id}-yes" name="${id}" value="true" ${savedValue === 'true' ? 'checked' : ''}>
                    <label for="${id}-yes" class="switch-label">Так</label>
                </div>
            `;
            break;

        // ── Integer ─────────────────────────────────────────────────────
        case 'Integer':
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="number" step="1" id="${id}" data-char-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;

        // ── Decimal ─────────────────────────────────────────────────────
        case 'Decimal':
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="number" step="0.01" id="${id}" data-char-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;

        // ── TextArea (двомовне: UA/RU) ─────────────────────────────────
        case 'TextArea': {
            const parsed = parseBilingualValue(savedValue);
            fieldHtml = `
                <div class="content-bloc-container">
                    <div class="content-bloc">
                        <div class="content-line">
                            <div class="input-box">
                                <textarea id="${id}-ua" data-char-id="${char.id}" data-char-lang="ua" rows="3"
                                    placeholder="${escapeHtml(char.name_ua || '')} (UA)">${escapeHtml(parsed.ua)}</textarea>
                                <span class="tag c-secondary">UA</span>
                            </div>
                        </div>
                    </div>
                    <div class="content-bloc">
                        <div class="content-line">
                            <div class="input-box">
                                <textarea id="${id}-ru" data-char-id="${char.id}" data-char-lang="ru" rows="3"
                                    placeholder="${escapeHtml(char.name_ua || '')} (RU)">${escapeHtml(parsed.ru)}</textarea>
                                <span class="tag c-secondary">RU</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
        }

        // ── TextInput (двомовне: UA/RU) ──────────────────────────────────
        case 'TextInput': {
            const parsed = parseBilingualValue(savedValue);
            fieldHtml = `
                <div class="content-bloc-container">
                    <div class="content-bloc">
                        <div class="content-line">
                            <div class="input-box">
                                <input type="text" id="${id}-ua" data-char-id="${char.id}" data-char-lang="ua"
                                    value="${escapeHtml(parsed.ua)}"
                                    placeholder="${escapeHtml(char.name_ua || '')} (UA)">
                                <span class="tag c-secondary">UA</span>
                            </div>
                        </div>
                    </div>
                    <div class="content-bloc">
                        <div class="content-line">
                            <div class="input-box">
                                <input type="text" id="${id}-ru" data-char-id="${char.id}" data-char-lang="ru"
                                    value="${escapeHtml(parsed.ru)}"
                                    placeholder="${escapeHtml(char.name_ua || '')} (RU)">
                                <span class="tag c-secondary">RU</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
        }

        // ── MultiText / default ───────────────────────────────────────────
        case 'MultiText':
        default:
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="text" id="${id}" data-char-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;
    }

    return `
        <div class="group column col-${colSize}">
            <label for="${id}" class="label-l">${label}</label>
            ${fieldHtml}
            ${hint}
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Парсити збережене двомовне значення
 * @param {string} val - JSON {"ua":"...","ru":"..."} або простий рядок
 * @returns {{ ua: string, ru: string }}
 */
function parseBilingualValue(val) {
    if (!val) return { ua: '', ru: '' };
    if (typeof val === 'object' && !Array.isArray(val)) return { ua: val.ua || '', ru: val.ru || '' };
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return { ua: parsed.ua || '', ru: parsed.ru || '' };
            }
        } catch { /* not JSON — treat as UA-only */ }
        return { ua: val, ru: '' };
    }
    return { ua: '', ru: '' };
}

/**
 * Парсити збережене значення як масив (для CheckBoxGroup)
 */
function parseSavedArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
        } catch { /* ignore */ }
        return val.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// GET / SET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати значення всіх характеристик
 * @returns {Object} { char_id: value }
 */
export function getCharacteristicsData() {
    const container = document.getElementById('product-characteristics-sections');
    if (!container) return {};

    const data = {};

    // TextInput / Integer / Decimal / MultiText fields (non-bilingual)
    container.querySelectorAll('input[data-char-id]:not([data-char-lang])').forEach(input => {
        const charId = input.dataset.charId;
        const val = input.value.trim();
        if (val) data[charId] = val;
    });

    // TextArea fields (non-bilingual)
    container.querySelectorAll('textarea[data-char-id]:not([data-char-lang])').forEach(textarea => {
        const charId = textarea.dataset.charId;
        const val = textarea.value.trim();
        if (val) data[charId] = val;
    });

    // Bilingual fields (TextInput / TextArea with data-char-lang)
    const bilingualMap = {};
    container.querySelectorAll('[data-char-id][data-char-lang]').forEach(el => {
        const charId = el.dataset.charId;
        const lang = el.dataset.charLang;
        const val = el.value.trim();
        if (!bilingualMap[charId]) bilingualMap[charId] = {};
        if (val) bilingualMap[charId][lang] = val;
    });
    for (const [charId, langs] of Object.entries(bilingualMap)) {
        if (Object.keys(langs).length > 0) {
            data[charId] = JSON.stringify(langs);
        }
    }

    // Select fields — single (ComboBox) and multiple (List, ListValues)
    container.querySelectorAll('select[data-char-id]').forEach(select => {
        const charId = select.dataset.charId;
        if (select.multiple) {
            const selected = Array.from(select.selectedOptions).map(o => o.value).filter(Boolean);
            if (selected.length > 0) data[charId] = JSON.stringify(selected);
        } else {
            const val = select.value;
            if (val) data[charId] = val;
        }
    });

    // Checkbox (switch) fields — single bool
    container.querySelectorAll('.switch[data-char-id]').forEach(switchEl => {
        const charId = switchEl.dataset.charId;
        const checked = switchEl.querySelector('input:checked');
        if (checked && checked.value) data[charId] = checked.value;
    });

    // CheckBoxGroup — multiple selected options → JSON array
    container.querySelectorAll('[data-char-type="checkboxgroup"]').forEach(groupEl => {
        const charId = groupEl.dataset.charId;
        const selected = [];
        groupEl.querySelectorAll('.switch input[type="radio"]:checked').forEach(radio => {
            if (radio.value) selected.push(radio.value);
        });
        if (selected.length > 0) data[charId] = JSON.stringify(selected);
    });

    return data;
}
