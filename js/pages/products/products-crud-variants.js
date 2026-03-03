// js/pages/products/products-crud-variants.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ВАРІАНТИ                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція варіантів у модалі товару.
 * Вкладена таблиця: SKU, назва, ціна, штрихкод, вага, залишок.
 * Повноцінний модал variant-edit для редагування варіантів.
 */

import { getVariantsByProductId, getVariantById, addProductVariant, updateProductVariant, deleteProductVariant } from './variants-data.js';
import { getProductById } from './products-data.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { showModal, closeModal, showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { getCharacteristics, getOptions, loadCharacteristics, loadOptions } from '../mapper/mapper-data-own.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { runHook } from './products-plugins.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { initVariantPhotoSection, setVariantPhotoUrls, getVariantPhotoUrls, clearVariantPhotos } from './products-crud-variant-photos.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _getCurrentProductId = null;
let _currentVariantId = null;

// Pending variants (до збереження товару)
let _pendingVariants = [];
let _pendingCounter = 0;

// Editors
let _compNotesEditorUa = null;
let _compNotesEditorRu = null;

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати секцію варіантів
 * @param {Function} getProductIdFn - Функція для отримання поточного productId
 */
export function initVariantsSection(getProductIdFn) {
    _getCurrentProductId = getProductIdFn;
    _pendingVariants = [];
    _pendingCounter = 0;

    const addBtn = document.getElementById('btn-add-product-variant');
    if (addBtn) {
        addBtn.onclick = () => {
            const productId = _getCurrentProductId?.();
            if (!productId) {
                // Новий товар: зберегти дані з форм → додати → перерендерити
                _syncAccordionFormToState();
                _addPendingVariant({ status: 'active' });
                _renderPendingAccordion();
            } else {
                showAddVariantModal();
            }
        };
    }

    // Новий товар → створити 1 дефолтний pending варіант
    if (!getProductIdFn()) {
        _addPendingVariant({ status: 'active' });
        _renderPendingAccordion();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('product-variants', {
    edit: (rowId) => showEditVariantModal(rowId),
    delete: (rowId) => {
        // Pending варіант — видалити з пам'яті
        if (String(rowId).startsWith('pending-')) {
            _removePendingVariant(rowId);
            return;
        }
        handleDeleteVariant(rowId);
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// PSEUDO-TABLE (єдина система для нових і існуючих товарів)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Заповнити таблицю варіантів для існуючого товару
 * @param {string} productId
 */
export async function populateProductVariants(productId) {
    const container = document.getElementById('product-variants-container');
    if (!container) return;

    // Hide accordion (pending), show main container
    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) accordion.style.display = 'none';
    container.style.display = '';

    const variants = getVariantsByProductId(productId);
    const product = getProductById(productId);
    const productName = product?.generated_short_ua || '';

    const headerHTML = _buildTableHeaderHTML();

    const rowsHTML = variants.map(v => _buildExistingVariantRowHTML(v, productName)).join('');

    container.innerHTML = headerHTML + rowsHTML;
    _initAccordionEvents(container);

    // Render block 8 characteristics for each existing variant
    if (product?.category_id) {
        await _renderExistingVariantCharacteristics(product.category_id, variants);
    }
}

function _resolveNameFromChars(variantChars) {
    if (!variantChars || typeof variantChars !== 'object') return '';
    const allOptions = getOptions();
    const parts = [];
    for (const optionId of Object.values(variantChars)) {
        if (!optionId) continue;
        const opt = allOptions.find(o => o.id === optionId);
        if (opt?.value_ua) parts.push(opt.value_ua);
    }
    return parts.join(', ');
}

function _buildExistingVariantRowHTML(v, productName) {
    const vid = v.variant_id;
    const priceDisplay = v.price ? `${escapeHtml(v.price)} UAH` : '—';
    const oldPriceDisplay = v.old_price ? `${escapeHtml(v.old_price)} UAH` : '—';
    const stockDisplay = v.stock || '0';
    const variantName = v.name_ua || _resolveNameFromChars(v.variant_chars);

    return `
    <div class="pseudo-table-row" data-variant-id="${escapeHtml(vid)}">
        <div class="pseudo-table-cell col-1">
            <input type="checkbox" data-role="va-checkbox">
            <button type="button" class="btn-icon" data-action="va-edit"><span class="material-symbols-outlined">edit</span></button>
            <button type="button" class="btn-icon u-hidden" data-action="va-save"><span class="material-symbols-outlined">save</span></button>
        </div>
        <div class="pseudo-table-cell col-3" data-display="name">${escapeHtml(productName)}</div>
        <div class="pseudo-table-cell col-2" data-display="variant">${escapeHtml(variantName)}</div>
        <div class="pseudo-table-cell col-2 cell-align-center" data-display="price"><span class="tag c-secondary">${priceDisplay}</span></div>
        <div class="pseudo-table-cell col-2 cell-align-center" data-display="old_price"><span class="tag c-secondary">${oldPriceDisplay}</span></div>
        <div class="pseudo-table-cell col-1 cell-align-center" data-display="stock"><span class="tag c-tertiary">${escapeHtml(stockDisplay)}</span></div>
        <div class="pseudo-table-cell col-1 cell-align-end">
            <button type="button" class="btn-icon u-hidden" data-action="va-close"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="u-reveal">
            <div>
                <div class="grid" style="padding: 12px 16px;">
                    ${_buildVariantFieldsHTML(vid, v)}
                </div>
                <div class="separator-h"></div>
                <div id="${vid}-chars-container" style="padding: 0 16px 12px;"></div>
            </div>
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT MODALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модал додавання варіанту
 */
async function showAddVariantModal() {
    const productId = _getCurrentProductId?.();

    // Якщо товар ще не збережений — додати pending варіант
    if (!productId) {
        _syncAccordionFormToState();
        _addPendingVariant({ status: 'active' });
        _renderPendingAccordion();
        return;
    }

    _currentVariantId = null;

    await showModal('variant-edit', null);

    const title = document.getElementById('variant-modal-title');
    if (title) title.textContent = 'Новий варіант';

    clearVariantForm();
    clearVariantPhotos();
    initVariantEditors();
    initVariantPhotoSection();
    const productIdField = document.getElementById('variant-product-id');
    if (productIdField) productIdField.value = productId;

    await renderVariantCharacteristics(productId, {}, {});
    initVariantSaveHandler();
    initSectionNavigation();
}

/**
 * Показати модал редагування варіанту
 * @param {string} variantId
 */
export async function showEditVariantModal(variantId) {
    const variant = getVariantById(variantId);
    if (!variant) {
        showToast('Варіант не знайдено', 'error');
        return;
    }

    _currentVariantId = variantId;

    await showModal('variant-edit', null);

    const title = document.getElementById('variant-modal-title');
    if (title) title.textContent = `Редагувати ${variant.name_ua || variant.variant_id}`;

    initVariantEditors();
    initVariantPhotoSection();
    fillVariantForm(variant);
    await renderVariantCharacteristics(variant.product_id, variant.variant_chars || {}, variant);
    initVariantSaveHandler();
    initSectionNavigation();
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITORS
// ═══════════════════════════════════════════════════════════════════════════

function initVariantEditors() {
    // 1 порція (br charm)
    const compNotesUa = document.getElementById('variant-composition-notes-ua-editor');
    if (compNotesUa) {
        compNotesUa.innerHTML = '';
        if (_compNotesEditorUa) { _compNotesEditorUa.destroy(); _compNotesEditorUa = null; }
        _compNotesEditorUa = createHighlightEditor(compNotesUa);
    }

    const compNotesRu = document.getElementById('variant-composition-notes-ru-editor');
    if (compNotesRu) {
        compNotesRu.innerHTML = '';
        if (_compNotesEditorRu) { _compNotesEditorRu.destroy(); _compNotesEditorRu = null; }
        _compNotesEditorRu = createHighlightEditor(compNotesRu);
    }
}

function destroyVariantEditors() {
    if (_compNotesEditorUa) { _compNotesEditorUa.destroy(); _compNotesEditorUa = null; }
    if (_compNotesEditorRu) { _compNotesEditorRu.destroy(); _compNotesEditorRu = null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM
// ═══════════════════════════════════════════════════════════════════════════

function clearVariantForm() {
    const fields = [
        'variant-id', 'variant-product-id',
        'variant-sku', 'variant-price', 'variant-old-price', 'variant-barcode', 'variant-weight',
        'variant-stock', 'variant-image-url'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const statusRadio = document.querySelector('input[name="variant-status"][value="active"]');
    if (statusRadio) statusRadio.checked = true;

    const charsContainer = document.getElementById('variant-characteristics-container');
    if (charsContainer) charsContainer.innerHTML = '';

    // Spec fields очищаються разом з charsContainer (вони всередині нього)
}

function fillVariantForm(variant) {
    const idField = document.getElementById('variant-id');
    if (idField) idField.value = variant.variant_id || '';

    const productIdField = document.getElementById('variant-product-id');
    if (productIdField) productIdField.value = variant.product_id || '';

    const sku = document.getElementById('variant-sku');
    if (sku) sku.value = variant.sku || '';

    const price = document.getElementById('variant-price');
    if (price) price.value = variant.price || '';

    const oldPrice = document.getElementById('variant-old-price');
    if (oldPrice) oldPrice.value = variant.old_price || '';

    const barcode = document.getElementById('variant-barcode');
    if (barcode) barcode.value = variant.barcode || '';

    const weight = document.getElementById('variant-weight');
    if (weight) weight.value = variant.weight || '';

    const stock = document.getElementById('variant-stock');
    if (stock) stock.value = variant.stock || '';

    // Фото: JSON масив або одиночний URL
    const rawImageUrl = variant.image_url || '';
    let photoUrls = [];
    if (rawImageUrl) {
        try {
            const parsed = JSON.parse(rawImageUrl);
            if (Array.isArray(parsed)) photoUrls = parsed;
            else photoUrls = [rawImageUrl];
        } catch {
            photoUrls = [rawImageUrl];
        }
    }
    setVariantPhotoUrls(photoUrls);

    const statusRadio = document.querySelector(`input[name="variant-status"][value="${variant.status || 'active'}"]`);
    if (statusRadio) statusRadio.checked = true;

    // Editors
    if (_compNotesEditorUa) _compNotesEditorUa.setValue(variant.composition_notes_ua || '');
    if (_compNotesEditorRu) _compNotesEditorRu.setValue(variant.composition_notes_ru || '');
}

function getVariantFormData() {
    return {
        product_id: document.getElementById('variant-product-id')?.value.trim() || '',
        sku: document.getElementById('variant-sku')?.value.trim() || '',
        price: document.getElementById('variant-price')?.value.trim() || '',
        old_price: document.getElementById('variant-old-price')?.value.trim() || '',
        barcode: document.getElementById('variant-barcode')?.value.trim() || '',
        weight: document.getElementById('variant-weight')?.value.trim() || '',
        stock: document.getElementById('variant-stock')?.value.trim() || '',
        image_url: document.getElementById('variant-image-url')?.value.trim() || '',
        status: document.querySelector('input[name="variant-status"]:checked')?.value || 'active',
        variant_chars: getVariantCharsData(),
        spec_ua: getSpecFieldValue('ua'),
        spec_ru: getSpecFieldValue('ru'),
        composition_notes_ua: _compNotesEditorUa ? _compNotesEditorUa.getValue() : '',
        composition_notes_ru: _compNotesEditorRu ? _compNotesEditorRu.getValue() : '',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PARENT-CHILD MAP (generic, no hardcoded IDs)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Сканує опції характеристик. Якщо опція має parent_option_id →
 * знаходить батьківську характеристику. Повертає Map<childCharId, parentCharId>.
 */
function buildParentChildMap(chars, options) {
    const childToParent = new Map();
    const optionById = new Map();
    options.forEach(o => optionById.set(o.id, o));

    const charIds = new Set(chars.map(c => c.id));

    for (const o of options) {
        if (!o.parent_option_id || !charIds.has(o.characteristic_id)) continue;
        const parentOpt = optionById.get(o.parent_option_id);
        if (!parentOpt || !charIds.has(parentOpt.characteristic_id)) continue;

        const childCharId = o.characteristic_id;
        const parentCharId = parentOpt.characteristic_id;
        if (childCharId === parentCharId) continue;

        if (!childToParent.has(childCharId)) {
            childToParent.set(childCharId, parentCharId);
        }
    }

    return childToParent;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARENT-CHILD LISTENERS (auto-fill + cascading filter)
// ═══════════════════════════════════════════════════════════════════════════

function initVariantParentChildListeners(container) {
    container.addEventListener('change', (e) => {
        const select = e.target.closest('select[data-vchar-id]');
        if (!select) return;

        if (select.dataset.parentCharId) {
            autoFillVariantParent(container, select);
        }

        if (select.dataset.parentOf) {
            const childCharIds = select.dataset.parentOf.split(',');
            childCharIds.forEach(childCharId => {
                const childSelect = container.querySelector(`select[data-vchar-id="${childCharId}"]`);
                if (childSelect) filterVariantChildOptions(childSelect, select.value);
            });
        }
    });
}

function autoFillVariantParent(container, childSelect) {
    const parentCharId = childSelect.dataset.parentCharId;
    if (!parentCharId) return;

    const selectedOption = childSelect.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return;

    const parentOptionId = selectedOption.dataset.parentOptionId;
    if (!parentOptionId) return;

    const parentSelect = container.querySelector(`select[data-vchar-id="${parentCharId}"]`);
    if (!parentSelect || parentSelect.value === parentOptionId) return;

    parentSelect.value = parentOptionId;
    parentSelect.dispatchEvent(new Event('change', { bubbles: true }));

    if (parentSelect.customSelect) {
        parentSelect.customSelect._updateSelection();
    }

    const parentOptText = parentSelect.selectedOptions[0]?.textContent || '';
    showToast(`${parentOptText} обрано автоматично`, 'info');
}

function filterVariantChildOptions(childSelect, parentOptionId) {
    const customSelect = childSelect.customSelect;
    if (!customSelect) return;

    customSelect.optionsList.querySelectorAll('.custom-select-option').forEach(optEl => {
        const nativeOpt = Array.from(childSelect.options).find(o => o.value === optEl.dataset.value);
        if (nativeOpt?.dataset.parentOptionId) {
            const show = !parentOptionId || nativeOpt.dataset.parentOptionId === parentOptionId;
            optEl.style.display = show ? '' : 'none';
        }
    });

    customSelect.optionsList.querySelectorAll('.custom-select-group-label').forEach(label => {
        let hasVisible = false;
        let next = label.nextElementSibling;
        while (next && next.classList.contains('custom-select-option-grouped')) {
            if (next.style.display !== 'none') hasVisible = true;
            next = next.nextElementSibling;
        }
        label.style.display = hasVisible ? '' : 'none';
    });

    if (parentOptionId && childSelect.value) {
        const selectedOpt = childSelect.querySelector(`option[value="${childSelect.value}"]`);
        if (selectedOpt?.dataset.parentOptionId && selectedOpt.dataset.parentOptionId !== parentOptionId) {
            childSelect.value = '';
            childSelect.dispatchEvent(new Event('change', { bubbles: true }));
            customSelect._updateSelection();
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 8 CHARACTERISTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити характеристики блоку 8 (Варіант) для варіанту
 * @param {string} productId - ID товару (для отримання category_id)
 * @param {Object} savedValues - Збережені значення { char_id: value }
 * @param {Object} variantData - Повні дані варіанту (для spec_ua/spec_ru)
 */
async function renderVariantCharacteristics(productId, savedValues, variantData) {
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
                <label class="label-l">Характеристики варіанту</label>
            </div>
    `;

    // Build parent-child map для ієрархічних опцій
    const parentChildMap = buildParentChildMap(block8Chars, options);

    block8Chars.forEach(c => {
        const charOptions = options.filter(o => o.characteristic_id === c.id);
        charOptions.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
        const savedVal = savedValues[c.id] || '';
        const colSize = c.col_size || '4';
        html += renderVariantCharField(c, charOptions, savedVal, colSize, parentChildMap, options, variantData);
    });

    html += '</div>';
    container.innerHTML = html;

    initCustomSelects(container);

    // Event delegation: авто-заповнення батька + каскадний фільтр
    if (parentChildMap.size > 0) {
        initVariantParentChildListeners(container);

        // Застосувати початковий фільтр для збережених значень
        for (const [childCharId, parentCharId] of parentChildMap) {
            const parentSelect = container.querySelector(`select[data-vchar-id="${parentCharId}"]`);
            if (parentSelect?.value) {
                const childSelect = container.querySelector(`select[data-vchar-id="${childCharId}"]`);
                if (childSelect) filterVariantChildOptions(childSelect, parentSelect.value);
            }
        }
    }
}

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

    // Companion spec field — для дочірніх ComboBox з parent_option_id
    let companionHtml = '';
    const isChildCombo = parentChildMap?.has(char.id) && (char.type === 'ComboBox' || char.type === 'Select');
    if (isChildCombo) {
        const specUa = variantData?.spec_ua || '';
        const specRu = variantData?.spec_ru || '';
        companionHtml = `
            <div class="group column col-4" data-spec-for="${char.id}">
                <label class="label-l">Уточнення ${label}</label>
                <div class="content-bloc-container">
                    <div class="content-bloc">
                        <div class="content-line">
                            <div class="input-box">
                                <input type="text" data-spec-field="ua"
                                    value="${escapeHtml(specUa)}"
                                    placeholder="Уточнення українською">
                                <span class="tag c-secondary">UA</span>
                            </div>
                        </div>
                    </div>
                    <div class="content-bloc">
                        <div class="content-line">
                            <div class="input-box">
                                <input type="text" data-spec-field="ru"
                                    value="${escapeHtml(specRu)}"
                                    placeholder="Уточнення російською">
                                <span class="tag c-secondary">RU</span>
                            </div>
                        </div>
                    </div>
                </div>
                <label class="label-s">Якщо порожнє — використовується обрана опція</label>
            </div>
        `;
    }

    return `
        <div class="group column col-${colSize}">
            <label for="${id}" class="label-l">${label}</label>
            ${fieldHtml}
            ${hint}
        </div>
        ${companionHtml}
    `;
}

/**
 * Отримати значення spec поля
 */
function getSpecFieldValue(lang) {
    const container = document.getElementById('variant-characteristics-container');
    if (!container) return '';
    const input = container.querySelector(`input[data-spec-field="${lang}"]`);
    return input ? input.value.trim() : '';
}

/**
 * Зібрати дані характеристик варіанту
 * @returns {Object} { char_id: value }
 */
function resolveVariantName() {
    const container = document.getElementById('variant-characteristics-container');
    if (!container) return { ua: '', ru: '' };

    const allOptions = getOptions();
    const parts_ua = [];
    const parts_ru = [];

    container.querySelectorAll('select[data-vchar-id]').forEach(select => {
        const val = select.value;
        if (!val) return;
        const opt = allOptions.find(o => o.id === val);
        if (opt) {
            if (opt.value_ua) parts_ua.push(opt.value_ua);
            if (opt.value_ru) parts_ru.push(opt.value_ru);
        }
    });

    return { ua: parts_ua.join(', '), ru: parts_ru.join(', ') };
}

function getVariantCharsData() {
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
// SECTION NAVIGATION (scroll spy)
// ═══════════════════════════════════════════════════════════════════════════

function initSectionNavigation() {
    const nav = document.getElementById('variant-section-navigator');
    const contentArea = document.querySelector('.modal-fullscreen-content');
    initSectionNav(nav, contentArea);
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT GENERATED NAMES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обчислити згенеровані назви для варіанту
 * Використовує дані товару (brand, line, name, label, detail, variation, text_before/after)
 * + назву самого варіанту
 */
function computeVariantGeneratedNames(productId, variantNameUa, variantNameRu) {
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

// ═══════════════════════════════════════════════════════════════════════════
// SAVE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

function initVariantSaveHandler() {
    const saveBtn = document.getElementById('btn-save-variant');
    if (saveBtn) saveBtn.onclick = () => handleSaveVariant(false);

    const saveCloseBtn = document.getElementById('save-close-variant');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleSaveVariant(true);
}

async function handleSaveVariant(shouldClose = true) {
    const formData = getVariantFormData();
    const productId = formData.product_id;

    // Авто-генерація name_ua/name_ru: spec → обрана опція → пусто
    const autoName = resolveVariantName();
    formData.name_ua = formData.spec_ua || autoName.ua;
    formData.name_ru = formData.spec_ru || autoName.ru;

    // Обчислити згенеровані назви
    const genNames = computeVariantGeneratedNames(productId, formData.name_ua, formData.name_ru);
    Object.assign(formData, genNames);

    try {
        if (_currentVariantId) {
            await updateProductVariant(_currentVariantId, formData);
            showToast('Варіант оновлено', 'success');
            runHook('onVariantUpdate', _currentVariantId);
        } else {
            const newVariant = await addProductVariant(formData);
            _currentVariantId = newVariant?.variant_id || null;
            showToast('Варіант додано', 'success');
            runHook('onVariantAdd', newVariant);
        }

        // Оновити таблицю варіантів у модалі товару
        if (productId) populateProductVariants(productId);

        if (shouldClose) closeModal();
    } catch (error) {
        console.error('Помилка збереження варіанту:', error);
        showToast('Помилка збереження варіанту', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════

async function handleDeleteVariant(variantId) {
    const variant = getVariantById(variantId);
    if (!variant) return;

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'варіант',
        name: variant.name_ua || variant.variant_id,
    });
    if (!confirmed) return;

    const productId = _getCurrentProductId?.();

    try {
        await deleteProductVariant(variantId);
        showToast(`Варіант ${variant.name_ua || variant.variant_id} видалено`, 'success');
        runHook('onVariantDelete', variantId);
        if (productId) populateProductVariants(productId);
    } catch (error) {
        showToast('Помилка видалення варіанту', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING VARIANTS — ACCORDION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function _addPendingVariant(data) {
    _pendingCounter++;
    _pendingVariants.push({
        _pendingId: `pending-${_pendingCounter}`,
        sku: data.sku || '',
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

function _removePendingVariant(pendingId) {
    _syncAccordionFormToState();
    _pendingVariants = _pendingVariants.filter(v => v._pendingId !== pendingId);
    _renderPendingAccordion();
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCORDION RENDERING (pseudo-table + u-reveal)
// ═══════════════════════════════════════════════════════════════════════════

function _getProductDisplayName() {
    const shortUa = document.getElementById('product-short-name-ua');
    return shortUa?.value?.trim() || '';
}

function _buildTableHeaderHTML() {
    return `
        <div class="pseudo-table-header">
            <div class="pseudo-table-cell col-1"></div>
            <div class="pseudo-table-cell col-3">Назва</div>
            <div class="pseudo-table-cell col-2">Варіант</div>
            <div class="pseudo-table-cell col-2 cell-align-center">Ціна</div>
            <div class="pseudo-table-cell col-2 cell-align-center">Стара ціна</div>
            <div class="pseudo-table-cell col-1 cell-align-center">Кількість</div>
            <div class="pseudo-table-cell col-1"></div>
        </div>`;
}

function _renderPendingAccordion() {
    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (!accordion) return;

    // Show accordion, hide table
    accordion.style.display = '';
    if (table) table.style.display = 'none';

    const productName = _getProductDisplayName();
    const headerHTML = _buildTableHeaderHTML();

    const rowsHTML = _pendingVariants.map((pv, i) =>
        _buildAccordionItemHTML(pv, i, productName)
    ).join('');

    accordion.innerHTML = headerHTML + rowsHTML;

    _initAccordionEvents(accordion);
}

function _buildAccordionItemHTML(pv, index, productName) {
    const pid = pv._pendingId;
    const isFirst = index === 0 && _pendingVariants.length === 1;
    const openClass = isFirst ? 'is-open' : '';

    const priceDisplay = pv.price ? `${escapeHtml(pv.price)} UAH` : '—';
    const oldPriceDisplay = pv.old_price ? `${escapeHtml(pv.old_price)} UAH` : '—';
    const stockDisplay = pv.stock || '0';
    const variantName = pv.name_ua || '';

    return `
    <div class="pseudo-table-row" data-pending-id="${escapeHtml(pid)}">
        <div class="pseudo-table-cell col-1">
            <input type="checkbox" data-role="va-checkbox" ${isFirst ? 'class="u-hidden"' : ''}>
            <button type="button" class="btn-icon ${isFirst ? 'u-hidden' : ''}" data-action="va-edit"><span class="material-symbols-outlined">edit</span></button>
            <button type="button" class="btn-icon ${isFirst ? '' : 'u-hidden'}" data-action="va-save"><span class="material-symbols-outlined">save</span></button>
        </div>
        <div class="pseudo-table-cell col-3" data-display="name">${escapeHtml(productName || '')}</div>
        <div class="pseudo-table-cell col-2" data-display="variant">${escapeHtml(variantName)}</div>
        <div class="pseudo-table-cell col-2 cell-align-center" data-display="price"><span class="tag c-secondary">${priceDisplay}</span></div>
        <div class="pseudo-table-cell col-2 cell-align-center" data-display="old_price"><span class="tag c-secondary">${oldPriceDisplay}</span></div>
        <div class="pseudo-table-cell col-1 cell-align-center" data-display="stock"><span class="tag c-tertiary">${escapeHtml(stockDisplay)}</span></div>
        <div class="pseudo-table-cell col-1 cell-align-end">
            <button type="button" class="btn-icon ${isFirst ? '' : 'u-hidden'}" data-action="va-close"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="u-reveal ${openClass}">
            <div>
                <div class="grid" style="padding: 12px 16px;">
                    ${_buildVariantFieldsHTML(pid, pv)}
                </div>
                <div class="separator-h"></div>
                <div id="${pid}-chars-container" style="padding: 0 16px 12px;"></div>
            </div>
        </div>
    </div>`;
}

function _buildVariantFieldsHTML(pid, pv) {
    return `
        <div class="group column col-4">
            <label for="${pid}-sku" class="label-l">SKU</label>
            <div class="content-bloc"><div class="content-line"><div class="input-box">
                <input type="text" id="${pid}-sku" data-field="sku" placeholder="Артикул" value="${escapeHtml(pv.sku || '')}">
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

// ═══════════════════════════════════════════════════════════════════════════
// ACCORDION EVENTS (pseudo-table toggle)
// ═══════════════════════════════════════════════════════════════════════════

function _initAccordionEvents(container) {
    container.addEventListener('click', (e) => {
        const row = e.target.closest('.pseudo-table-row');
        if (!row) return;

        // Edit → open reveal
        if (e.target.closest('[data-action="va-edit"]')) {
            _toggleVariantRow(row, true);
            return;
        }

        // Save → sync form + close reveal (API for existing, state for pending)
        if (e.target.closest('[data-action="va-save"]')) {
            _handleRowSave(row);
            return;
        }

        // Close → discard and close reveal
        if (e.target.closest('[data-action="va-close"]')) {
            _toggleVariantRow(row, false);
            return;
        }

        // Delete pending variant
        const deleteBtn = e.target.closest('[data-action="delete-pending"]');
        if (deleteBtn) {
            e.stopPropagation();
            _removePendingVariant(row.dataset.pendingId);
            return;
        }
    });
}

function _toggleVariantRow(row, open) {
    const checkbox = row.querySelector('[data-role="va-checkbox"]');
    const saveBtn = row.querySelector('[data-action="va-save"]');
    const editBtn = row.querySelector('[data-action="va-edit"]');
    const closeBtn = row.querySelector('[data-action="va-close"]');
    const body = row.querySelector('.u-reveal');

    if (open) {
        checkbox?.classList.add('u-hidden');
        saveBtn?.classList.remove('u-hidden');
        editBtn?.classList.add('u-hidden');
        closeBtn?.classList.remove('u-hidden');
        body?.classList.add('is-open');
    } else {
        checkbox?.classList.remove('u-hidden');
        saveBtn?.classList.add('u-hidden');
        editBtn?.classList.remove('u-hidden');
        closeBtn?.classList.add('u-hidden');
        body?.classList.remove('is-open');
    }
}

/** Read form fields from row into an object */
function _readRowFormValues(row) {
    const data = {};
    row.querySelectorAll('[data-field]').forEach(el => {
        data[el.dataset.field] = el.value.trim();
    });
    // Variant chars from chars-container
    const rowId = row.dataset.pendingId || row.dataset.variantId;
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
        // Spec fields
        const specUa = charsContainer.querySelector('input[data-spec-field="ua"]');
        const specRu = charsContainer.querySelector('input[data-spec-field="ru"]');
        if (specUa) data.spec_ua = specUa.value.trim();
        if (specRu) data.spec_ru = specRu.value.trim();
    }
    return data;
}

/** Update display cells from data */
function _updateRowDisplayCells(row, data) {
    const priceDisplay = data.price ? `${escapeHtml(data.price)} UAH` : '—';
    const oldPriceDisplay = data.old_price ? `${escapeHtml(data.old_price)} UAH` : '—';
    const stockDisplay = data.stock || '0';

    const priceCell = row.querySelector('[data-display="price"]');
    const oldPriceCell = row.querySelector('[data-display="old_price"]');
    const stockCell = row.querySelector('[data-display="stock"]');

    if (priceCell) priceCell.innerHTML = `<span class="tag c-secondary">${priceDisplay}</span>`;
    if (oldPriceCell) oldPriceCell.innerHTML = `<span class="tag c-secondary">${oldPriceDisplay}</span>`;
    if (stockCell) stockCell.innerHTML = `<span class="tag c-tertiary">${escapeHtml(stockDisplay)}</span>`;
}

/** Handle save for both pending and existing variant rows */
async function _handleRowSave(row) {
    const variantId = row.dataset.variantId;
    const pendingId = row.dataset.pendingId;
    const formData = _readRowFormValues(row);

    if (variantId) {
        // Existing variant → API update
        try {
            await updateProductVariant(variantId, formData);
            _updateRowDisplayCells(row, formData);
            _toggleVariantRow(row, false);
            showToast('Варіант оновлено', 'success');
        } catch (error) {
            console.error('Помилка збереження варіанту:', error);
            showToast('Помилка збереження варіанту', 'error');
        }
    } else if (pendingId) {
        // Pending variant → sync to state
        const pv = _pendingVariants.find(v => v._pendingId === pendingId);
        if (pv) {
            Object.assign(pv, formData);
            _updateRowDisplayCells(row, pv);
            const nameCell = row.querySelector('[data-display="name"]');
            if (nameCell) nameCell.textContent = _getProductDisplayName();
        }
        _toggleVariantRow(row, false);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC FORM → STATE
// ═══════════════════════════════════════════════════════════════════════════

function _syncSingleRowToState(row, pv) {
    const formData = _readRowFormValues(row);
    Object.assign(pv, formData);
}

function _syncAccordionFormToState() {
    for (const pv of _pendingVariants) {
        const row = document.querySelector(`.pseudo-table-row[data-pending-id="${pv._pendingId}"]`);
        if (!row) continue;
        _syncSingleRowToState(row, pv);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING VARIANT CHARACTERISTICS (block 8)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити характеристики варіантів (block 8) для pending accordion items
 * Викликається при зміні категорії товару
 */
export async function renderPendingVariantCharacteristics(categoryId) {
    if (!categoryId || _pendingVariants.length === 0) return;

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

    for (const pv of _pendingVariants) {
        const container = document.getElementById(`${pv._pendingId}-chars-container`);
        if (!container) continue;

        if (block8Chars.length === 0) { container.innerHTML = ''; continue; }

        let html = '<label class="label-l">Характеристики варіанту</label><div class="grid">';
        block8Chars.forEach(c => {
            const charOptions = options.filter(o => o.characteristic_id === c.id);
            charOptions.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
            const savedVal = (pv.variant_chars || {})[c.id] || '';
            const colSize = c.col_size || '4';
            html += renderVariantCharField(c, charOptions, savedVal, colSize, parentChildMap, options, pv);
        });
        html += '</div>';
        container.innerHTML = html;

        initCustomSelects(container);
        if (parentChildMap.size > 0) {
            initVariantParentChildListeners(container);
        }
    }
}

/**
 * Рендерити характеристики блоку 8 для existing варіантів
 */
async function _renderExistingVariantCharacteristics(categoryId, variants) {
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

        let html = '<div class="grid">';
        block8Chars.forEach(c => {
            const charOptions = options.filter(o => o.characteristic_id === c.id);
            charOptions.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
            const savedVal = (v.variant_chars || {})[c.id] || '';
            const colSize = c.col_size || '4';
            html += renderVariantCharField(c, charOptions, savedVal, colSize, parentChildMap, options, v);
        });
        html += '</div>';
        container.innerHTML = html;

        initCustomSelects(container);
        if (parentChildMap.size > 0) {
            initVariantParentChildListeners(container);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING CHANGES (draft manager)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зберегти pending варіанти до БД (після створення товару)
 */
export async function commitPendingVariantChanges(productId, productData) {
    _syncAccordionFormToState();
    if (_pendingVariants.length === 0) return;

    for (const pv of _pendingVariants) {
        await addProductVariant({
            product_id: productId,
            name_ua: productData?.generated_short_ua || '',
            name_ru: productData?.generated_short_ru || '',
            generated_short_ua: productData?.generated_short_ua || '',
            generated_short_ru: productData?.generated_short_ru || '',
            generated_full_ua: productData?.generated_full_ua || '',
            generated_full_ru: productData?.generated_full_ru || '',
            sku: pv.sku || '',
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

    // Hide accordion, show table
    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (accordion) accordion.style.display = 'none';
    if (table) table.style.display = '';

    populateProductVariants(productId);
}

/**
 * Відкинути pending зміни
 */
export function discardPendingVariantChanges() {
    _currentVariantId = null;
    _pendingVariants = [];
    _pendingCounter = 0;

    destroyVariantEditors();
    clearVariantPhotos();

    // Clean up accordion
    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
}
