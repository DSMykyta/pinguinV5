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
import { createManagedTable, col } from '../../components/table/table-main.js';
import { showModal, closeModal, showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { getCharacteristics, getOptions, loadCharacteristics, loadOptions } from '../mapper/mapper-data-own.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { runHook } from './products-plugins.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { initVariantPhotoSection, setVariantPhotoUrls, getVariantPhotoUrls, clearVariantPhotos } from './products-crud-variant-photos.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _getCurrentProductId = null;
let _currentVariantId = null;

// Pending variants (до збереження товару)
let _pendingVariants = [];
let _pendingCounter = 0;

// Managed table (existing variants)
let _variantsManagedTable = null;
let _actionCleanup = null;

// Managed table (pending variants — new product accordion)
let _pendingManagedTable = null;
let _pendingActionCleanup = null;

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

    // Reset pending managed table from previous session
    if (_pendingManagedTable) {
        _pendingManagedTable.destroy?.();
        _pendingManagedTable = null;
    }
    if (_pendingActionCleanup) {
        _pendingActionCleanup();
        _pendingActionCleanup = null;
    }

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
// MANAGED TABLE (єдина система для існуючих варіантів)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Резолвить ім'я варіанту з variant_chars + spec JSON (без DOM).
 * spec per-char має пріоритет над option name. Parent chars пропускаються.
 * @param {Object} variantChars - { charId: optionId }
 * @param {string} [specUaJson] - JSON string { charId: "value" }
 * @param {string} [specRuJson] - JSON string { charId: "value" }
 * @returns {{ ua: string, ru: string }}
 */
function _resolveNameFromCharsAndSpecs(variantChars, specUaJson, specRuJson) {
    if (!variantChars || typeof variantChars !== 'object') return { ua: '', ru: '' };
    const allOptions = getOptions();
    const allChars = getCharacteristics();
    const parentChildMap = buildParentChildMap(allChars, allOptions);
    const parentCharIds = new Set(parentChildMap.values());
    const specUa = _parseSpecJson(specUaJson);
    const specRu = _parseSpecJson(specRuJson);

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

function _getVariantColumns() {
    return [
        col('product_name', 'Назва', 'text', { span: 3 }),
        col('variant_display', 'Варіант', 'text', { span: 2 }),
        col('price', 'Ціна', 'tag', { span: 2, align: 'center', color: 'c-secondary' }),
        col('old_price', 'Стара ціна', 'tag', { span: 2, align: 'center', color: 'c-secondary' }),
        col('stock', 'Кількість', 'tag', { span: 1, align: 'center', color: 'c-tertiary' }),
    ];
}

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

    // Transform data for table
    const tableData = variants.map(v => ({
        ...v,
        product_name: productName,
        variant_display: v.name_ua || _resolveNameFromCharsAndSpecs(v.variant_chars, v.spec_ua, v.spec_ru).ua,
    }));

    if (_variantsManagedTable) {
        _variantsManagedTable.updateData(tableData);
    } else {
        _variantsManagedTable = createManagedTable({
            container: 'product-variants-container',
            columns: _getVariantColumns().map(c => ({
                ...c,
                searchable: ['product_name', 'variant_display'].includes(c.id),
                checked: true,
            })),
            data: tableData,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: () => '',
                getRowId: (row) => row.variant_id,
                emptyState: { message: 'Варіанти не знайдено' },
                withContainer: false,
                onAfterRender: (cont) => {
                    if (_actionCleanup) _actionCleanup();
                    _actionCleanup = initActionHandlers(cont, 'product-variants');
                },
                plugins: {
                    sorting: {
                        columnTypes: {
                            product_name: 'string',
                            variant_display: 'string',
                            price: 'number',
                            old_price: 'number',
                            stock: 'number',
                        }
                    },
                    expandable: {
                        renderContent: (row) => _buildExpandContent(row),
                        onExpand: (rowEl, row) => _onVariantExpand(rowEl, row),
                        onSave: (rowEl, row) => _handleRowSave(rowEl),
                    }
                }
            },
            pageSize: null,
            checkboxPrefix: 'product-variants'
        });

        initColumnsCharm();
    }

    // Render block 8 characteristics for each existing variant
    if (product?.category_id) {
        await _renderExistingVariantCharacteristics(product.category_id, variants);
    }
}

function _buildExpandContent(row) {
    const id = row.variant_id || row._pendingId;
    return `
        <div class="grid" style="padding: 12px 16px;">
            ${_buildVariantFieldsHTML(id, row)}
        </div>
        <div class="separator-h"></div>
        <div id="${id}-chars-container" style="padding: 0 16px 12px;"></div>
    `;
}

function _onVariantExpand(rowEl, row) {
    const id = row.variant_id || row._pendingId;
    const charsContainer = document.getElementById(`${id}-chars-container`);
    if (charsContainer) {
        initCustomSelects(charsContainer);
    }
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

    // Parse spec JSON (backward-compatible with legacy single string)
    const enrichedVariantData = { ...variantData, _parsedSpecUa: _parseSpecJson(variantData?.spec_ua), _parsedSpecRu: _parseSpecJson(variantData?.spec_ru) };

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

    // Companion spec field — уточнення для кожної характеристики
    // spec_ua/spec_ru зберігаються як JSON { char_id: "value" }
    const specUaObj = variantData?._parsedSpecUa || {};
    const specRuObj = variantData?._parsedSpecRu || {};
    const specUaVal = specUaObj[char.id] || '';
    const specRuVal = specRuObj[char.id] || '';

    const companionHtml = `
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

/**
 * Parse spec JSON — backward-compatible with legacy single string
 * @returns {Object} { char_id: "value", ... }
 */
function _parseSpecJson(raw) {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* not JSON */ }
    return {};
}

/**
 * Зібрати spec values з per-char inputs → JSON string
 */
function getSpecFieldValue(lang) {
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
function resolveVariantName() {
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

    // Авто-генерація name_ua/name_ru: resolveVariantName вже враховує per-char spec
    const autoName = resolveVariantName();
    formData.name_ua = autoName.ua;
    formData.name_ru = autoName.ru;

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
        spec_ua: data.spec_ua || '',
        spec_ru: data.spec_ru || '',
    });
}

function _removePendingVariant(pendingId) {
    _syncAccordionFormToState();
    _pendingVariants = _pendingVariants.filter(v => v._pendingId !== pendingId);

    if (_pendingManagedTable && _pendingVariants.length > 0) {
        const productName = _getProductDisplayName();
        _pendingManagedTable.updateData(_pendingVariants.map(pv => ({
            ...pv,
            product_name: productName,
            variant_display: pv.name_ua || '',
        })));
    } else {
        _renderPendingAccordion();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCORDION RENDERING (pseudo-table + u-reveal)
// ═══════════════════════════════════════════════════════════════════════════

function _getProductDisplayName() {
    const shortUa = document.getElementById('product-short-name-ua');
    return shortUa?.value?.trim() || '';
}


function _renderPendingAccordion() {
    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (!accordion) return;

    // Show accordion, hide table
    accordion.style.display = '';
    if (table) table.style.display = 'none';

    const productName = _getProductDisplayName();

    const tableData = _pendingVariants.map(pv => ({
        ...pv,
        product_name: productName,
        variant_display: pv.name_ua || '',
    }));

    if (_pendingManagedTable) {
        _pendingManagedTable.updateData(tableData);
    } else {
        _pendingManagedTable = createManagedTable({
            container: 'product-variants-accordion',
            columns: _getVariantColumns().map(c => ({
                ...c,
                searchable: false,
                checked: true,
            })),
            data: tableData,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: (row) => actionButton({ action: 'delete', rowId: row._pendingId }),
                getRowId: (row) => row._pendingId,
                emptyState: { message: 'Додайте варіант' },
                withContainer: false,
                onAfterRender: (cont) => {
                    if (_pendingActionCleanup) _pendingActionCleanup();
                    _pendingActionCleanup = initActionHandlers(cont, 'product-variants');
                },
                plugins: {
                    expandable: {
                        renderContent: (row) => _buildExpandContent(row),
                        onExpand: (rowEl, row) => _onVariantExpand(rowEl, row),
                        onSave: (rowEl, row) => _onPendingVariantSave(rowEl, row),
                    }
                }
            },
            pageSize: null,
        });
    }

    // Auto-expand first row if only one variant
    if (_pendingVariants.length === 1) {
        const firstRow = accordion.querySelector('.pseudo-table-row');
        const expandBtn = firstRow?.querySelector('[data-action="expand-edit"]');
        if (expandBtn) expandBtn.click();
    }

    // Render characteristics for pending variants if category is selected
    const categoryId = document.getElementById('product-category')?.value;
    if (categoryId) renderPendingVariantCharacteristics(categoryId);
}

function _onPendingVariantSave(rowEl, row) {
    const pv = _pendingVariants.find(v => v._pendingId === row._pendingId);
    if (pv) _syncSingleRowToState(rowEl, pv);
    showToast('Дані варіанту збережено', 'info');
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
// INLINE SAVE (expandable plugin callback)
// ═══════════════════════════════════════════════════════════════════════════

/** Read form fields from row into an object */
function _readRowFormValues(row) {
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

/** Handle save for existing variant row (expandable onSave callback) */
async function _handleRowSave(rowEl) {
    const variantId = rowEl.dataset.rowId;
    if (!variantId) return;

    const formData = _readRowFormValues(rowEl);

    // Resolve variant name from chars + per-char specs
    const resolved = _resolveNameFromCharsAndSpecs(formData.variant_chars, formData.spec_ua, formData.spec_ru);
    formData.name_ua = resolved.ua;
    formData.name_ru = resolved.ru;

    // Compute generated names
    const productId = _getCurrentProductId?.();
    if (productId) {
        const genNames = computeVariantGeneratedNames(productId, resolved.ua, resolved.ru);
        Object.assign(formData, genNames);
    }

    try {
        await updateProductVariant(variantId, formData);
        showToast('Варіант оновлено', 'success');

        if (productId) populateProductVariants(productId);
    } catch (error) {
        console.error('Помилка збереження варіанту:', error);
        showToast('Помилка збереження варіанту', 'error');
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
    const accordion = document.getElementById('product-variants-accordion');
    if (!accordion) return;
    for (const pv of _pendingVariants) {
        const row = accordion.querySelector(`.pseudo-table-row[data-row-id="${pv._pendingId}"]`);
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

        const enrichedPv = { ...pv, _parsedSpecUa: _parseSpecJson(pv.spec_ua), _parsedSpecRu: _parseSpecJson(pv.spec_ru) };
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

        const enrichedV = { ...v, _parsedSpecUa: _parseSpecJson(v.spec_ua), _parsedSpecRu: _parseSpecJson(v.spec_ru) };
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
        // Resolve variant name from chars + per-char specs
        const resolved = _resolveNameFromCharsAndSpecs(pv.variant_chars, pv.spec_ua, pv.spec_ru);
        const genNames = computeVariantGeneratedNames(productId, resolved.ua, resolved.ru);

        await addProductVariant({
            product_id: productId,
            name_ua: resolved.ua,
            name_ru: resolved.ru,
            ...genNames,
            sku: pv.sku || '',
            barcode: pv.barcode || '',
            price: pv.price || '',
            old_price: pv.old_price || '',
            weight: pv.weight || '',
            stock: pv.stock || '',
            variant_chars: pv.variant_chars || {},
            spec_ua: pv.spec_ua || '',
            spec_ru: pv.spec_ru || '',
            status: pv.status || productData?.status || 'active',
        });
    }

    _pendingVariants = [];
    _pendingCounter = 0;

    // Destroy pending managed table
    if (_pendingManagedTable) {
        _pendingManagedTable.destroy?.();
        _pendingManagedTable = null;
    }
    if (_pendingActionCleanup) {
        _pendingActionCleanup();
        _pendingActionCleanup = null;
    }

    // Hide accordion, show table
    const accordion = document.getElementById('product-variants-accordion');
    const table = document.getElementById('product-variants-container');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
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

    // Destroy managed tables
    if (_pendingManagedTable) {
        _pendingManagedTable.destroy?.();
        _pendingManagedTable = null;
    }
    if (_pendingActionCleanup) {
        _pendingActionCleanup();
        _pendingActionCleanup = null;
    }
    if (_variantsManagedTable) {
        _variantsManagedTable = null; // DOM destroyed with modal
    }
    if (_actionCleanup) {
        _actionCleanup = null;
    }

    // Clean up accordion
    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) { accordion.innerHTML = ''; accordion.style.display = 'none'; }
}
