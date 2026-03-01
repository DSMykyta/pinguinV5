// js/pages/products/products-crud-characteristics.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ХАРАКТЕРИСТИКИ                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція характеристик у модалі товару.
 * Завантажує характеристики з маппера за обраною категорією,
 * групує по block_number, рендерить поля за типом.
 */

import { getCharacteristics, loadCharacteristics, getOptions, loadOptions } from '../mapper/mapper-data-own.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { initCustomSelects } from '../../components/forms/select.js';

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK NAMES
// ═══════════════════════════════════════════════════════════════════════════

const BLOCK_NAMES = {
    '1': 'Загальні',
    '2': 'Склад та форма',
    '3': 'Дозування',
    '4': 'Додатково',
    '5': 'Упаковка',
    '6': 'Застосування',
    '7': 'Попередження',
    '8': 'Варіанти',
    '9': 'Інше',
};

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити характеристики для обраної категорії
 * @param {string} categoryId - ID категорії
 * @param {Object} savedValues - Збережені значення характеристик { char_id: value }
 */
export async function renderCharacteristicsForCategory(categoryId, savedValues = {}) {
    const container = document.getElementById('product-characteristics-container');
    const emptyState = document.getElementById('product-characteristics-empty');
    if (!container) return;

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
        return;
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
        return;
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
        // Блок 8 (Варіанти) — пропускаємо, це для variant_chars
        if (c.block_number === '8') return;

        const blockNum = c.block_number || '9';
        if (!blocks[blockNum]) blocks[blockNum] = [];
        blocks[blockNum].push(c);
    });

    // Рендер
    let html = '';

    Object.keys(blocks).sort((a, b) => parseInt(a) - parseInt(b)).forEach(blockNum => {
        const blockChars = blocks[blockNum];
        const blockName = BLOCK_NAMES[blockNum] || `Блок ${blockNum}`;

        html += `
            <div class="section-header">
                <div class="section-name-block">
                    <div class="section-name">
                        <h2 class="body-l">${escapeHtml(blockName)}</h2>
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

            html += renderCharField(c, charOptions, savedVal, colSize);
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Прив'язати getCharacteristicsData до контейнера
    container._getCharacteristicsData = () => getCharacteristicsData();

    // Ініціалізувати custom selects
    initCustomSelects(container);
}

/**
 * Рендерити поле характеристики за типом
 */
function renderCharField(char, options, savedValue, colSize) {
    const id = `product-char-${char.id}`;
    const label = escapeHtml(char.name_ua || char.id);
    const hint = char.hint ? `<span class="body-s">${escapeHtml(char.hint)}</span>` : '';
    const unit = char.unit ? `<span class="tag c-tertiary">${escapeHtml(char.unit)}</span>` : '';

    let fieldHtml = '';

    switch (char.type) {
        case 'Select':
            fieldHtml = `
                <select id="${id}" data-custom-select data-char-id="${char.id}">
                    <option value="">— Оберіть —</option>
                    ${options.map(o => `<option value="${escapeHtml(o.id)}" ${savedValue === o.id ? 'selected' : ''}>${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                </select>
            `;
            break;

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

        case 'TextInput':
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
            ${hint}
            ${fieldHtml}
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET / SET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати значення всіх характеристик
 * @returns {Object} { char_id: value }
 */
export function getCharacteristicsData() {
    const container = document.getElementById('product-characteristics-container');
    if (!container) return {};

    const data = {};

    // TextInput fields
    container.querySelectorAll('input[data-char-id]').forEach(input => {
        const charId = input.dataset.charId;
        const val = input.value.trim();
        if (val) data[charId] = val;
    });

    // Select fields
    container.querySelectorAll('select[data-char-id]').forEach(select => {
        const charId = select.dataset.charId;
        const val = select.value;
        if (val) data[charId] = val;
    });

    // Checkbox (switch) fields
    container.querySelectorAll('.switch[data-char-id]').forEach(switchEl => {
        const charId = switchEl.dataset.charId;
        const checked = switchEl.querySelector('input:checked');
        if (checked && checked.value) data[charId] = checked.value;
    });

    return data;
}
